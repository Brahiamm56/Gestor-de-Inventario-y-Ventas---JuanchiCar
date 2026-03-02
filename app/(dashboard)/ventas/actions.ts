"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { ventaSchema } from "@/schemas/venta"
import { clienteSchema } from "@/schemas/cliente"

// Crea un cliente rápido desde la modal de ventas y devuelve su id
export async function crearClienteRapido(formData: unknown) {
  const parsed = clienteSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      nombre: parsed.data.nombre,
      telefono: parsed.data.telefono || null,
    })
    .select("id, nombre")
    .single()

  if (error) return { error: "Error al crear el cliente" }

  revalidatePath("/clientes")
  revalidatePath("/ventas")
  return { success: true, cliente: data }
}

// Codifica servicios en el campo notas para no requerir migración de DB
function encodeNotasConServicios(
  notas: string | undefined,
  servicios: { descripcion: string; precio: number }[] | undefined
): string | null {
  if (!servicios || servicios.length === 0) return notas || null
  return `__sv__${JSON.stringify({ s: servicios, n: notas || "" })}`
}

export async function crearVenta(formData: unknown) {
  const parsed = ventaSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { items, servicios, ...ventaData } = parsed.data
  const totalProductos = items.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0)
  const totalServicios = (servicios ?? []).reduce((sum, s) => sum + s.precio, 0)
  const total = totalProductos + totalServicios

  const supabase = await createClient()

  // Crear la venta
  const { data: venta, error: ventaError } = await supabase
    .from("ventas")
    .insert({
      cliente_id: ventaData.cliente_id || null,
      auto_id: ventaData.auto_id || null,
      estado: ventaData.estado,
      metodo_pago: ventaData.metodo_pago || null,
      notas: encodeNotasConServicios(ventaData.notas, servicios),
      total,
    })
    .select("id")
    .single()

  if (ventaError || !venta) {
    return { error: "Error al crear la venta" }
  }

  // Crear los items de productos
  if (items.length > 0) {
    const ventaItems = items.map((item) => ({
      venta_id: venta.id,
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
    }))

    const { error: itemsError } = await supabase.from("venta_items").insert(ventaItems)
    if (itemsError) {
      await supabase.from("ventas").delete().eq("id", venta.id)
      return { error: "Error al crear los items de la venta" }
    }
  }

  // Si es confirmada, descontar stock
  if (ventaData.estado === "confirmada") {
    for (const item of items) {
      await supabase.rpc("decrementar_stock", {
        p_producto_id: item.producto_id,
        p_cantidad: item.cantidad,
      }).then(({ error }) => {
        // Si no existe el RPC, hacemos update manual
        if (error) {
          return supabase
            .from("productos")
            .select("stock")
            .eq("id", item.producto_id)
            .single()
            .then(({ data }) => {
              if (data) {
                return supabase
                  .from("productos")
                  .update({ stock: Math.max(0, data.stock - item.cantidad) })
                  .eq("id", item.producto_id)
              }
            })
        }
      })
    }
  }

  revalidatePath("/ventas")
  revalidatePath("/stock")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function cambiarEstadoVenta(
  ventaId: string,
  nuevoEstado: "presupuesto" | "confirmada" | "cancelada"
) {
  const supabase = await createClient()

  // Obtener venta actual con sus items
  const { data: venta } = await supabase
    .from("ventas")
    .select("estado")
    .eq("id", ventaId)
    .single()

  if (!venta) return { error: "Venta no encontrada" }

  const estadoAnterior = venta.estado

  // Actualizar estado
  const { error } = await supabase
    .from("ventas")
    .update({ estado: nuevoEstado })
    .eq("id", ventaId)

  if (error) return { error: "Error al cambiar el estado" }

  // Obtener items de la venta
  const { data: items } = await supabase
    .from("venta_items")
    .select("producto_id, cantidad")
    .eq("venta_id", ventaId)

  if (items && items.length > 0) {
    // presupuesto → confirmada: descontar stock
    if (estadoAnterior === "presupuesto" && nuevoEstado === "confirmada") {
      for (const item of items) {
        const { data: producto } = await supabase
          .from("productos")
          .select("stock")
          .eq("id", item.producto_id)
          .single()
        if (producto) {
          await supabase
            .from("productos")
            .update({ stock: Math.max(0, producto.stock - item.cantidad) })
            .eq("id", item.producto_id)
        }
      }
    }
    // confirmada → cancelada: devolver stock
    if (estadoAnterior === "confirmada" && nuevoEstado === "cancelada") {
      for (const item of items) {
        const { data: producto } = await supabase
          .from("productos")
          .select("stock")
          .eq("id", item.producto_id)
          .single()
        if (producto) {
          await supabase
            .from("productos")
            .update({ stock: producto.stock + item.cantidad })
            .eq("id", item.producto_id)
        }
      }
    }
  }

  revalidatePath("/ventas")
  revalidatePath("/stock")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function eliminarVenta(ventaId: string) {
  const supabase = await createClient()

  // Si estaba confirmada, devolver stock
  const { data: venta } = await supabase
    .from("ventas")
    .select("estado")
    .eq("id", ventaId)
    .single()

  if (venta?.estado === "confirmada") {
    const { data: items } = await supabase
      .from("venta_items")
      .select("producto_id, cantidad")
      .eq("venta_id", ventaId)

    if (items) {
      for (const item of items) {
        const { data: producto } = await supabase
          .from("productos")
          .select("stock")
          .eq("id", item.producto_id)
          .single()
        if (producto) {
          await supabase
            .from("productos")
            .update({ stock: producto.stock + item.cantidad })
            .eq("id", item.producto_id)
        }
      }
    }
  }

  const { error } = await supabase.from("ventas").delete().eq("id", ventaId)
  if (error) return { error: "Error al eliminar la venta" }

  revalidatePath("/ventas")
  revalidatePath("/stock")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function editarVenta(ventaId: string, formData: unknown) {
  const parsed = ventaSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { items, servicios, ...ventaData } = parsed.data
  const totalProductos = items.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0)
  const totalServicios = (servicios ?? []).reduce((sum, s) => sum + s.precio, 0)
  const total = totalProductos + totalServicios

  const supabase = await createClient()

  // Verificar que la venta existe y es un presupuesto
  const { data: ventaActual } = await supabase
    .from("ventas")
    .select("estado")
    .eq("id", ventaId)
    .single()

  if (!ventaActual) return { error: "Venta no encontrada" }
  if (ventaActual.estado !== "presupuesto") {
    return { error: "Solo se pueden editar presupuestos" }
  }

  // Actualizar la venta
  const { error: ventaError } = await supabase
    .from("ventas")
    .update({
      cliente_id: ventaData.cliente_id || null,
      auto_id: ventaData.auto_id || null,
      estado: ventaData.estado,
      metodo_pago: ventaData.metodo_pago || null,
      notas: encodeNotasConServicios(ventaData.notas, servicios),
      total,
    })
    .eq("id", ventaId)

  if (ventaError) return { error: "Error al actualizar la venta" }

  // Eliminar items anteriores y crear los nuevos
  await supabase.from("venta_items").delete().eq("venta_id", ventaId)

  if (items.length > 0) {
    const ventaItems = items.map((item) => ({
      venta_id: ventaId,
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
    }))

    const { error: itemsError } = await supabase.from("venta_items").insert(ventaItems)
    if (itemsError) return { error: "Error al actualizar los items" }
  }

  // Si cambia a confirmada, descontar stock
  if (ventaData.estado === "confirmada") {
    for (const item of items) {
      const { data: producto } = await supabase
        .from("productos")
        .select("stock")
        .eq("id", item.producto_id)
        .single()
      if (producto) {
        await supabase
          .from("productos")
          .update({ stock: Math.max(0, producto.stock - item.cantidad) })
          .eq("id", item.producto_id)
      }
    }
  }

  revalidatePath("/ventas")
  revalidatePath("/stock")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function obtenerDetallesVenta(ventaId: string) {
  const supabase = await createClient()

  // Obtener venta con relaciones
  const { data: venta, error: ventaError } = await supabase
    .from("ventas")
    .select(`
      *,
      clientes (id, nombre, telefono, email),
      autos (id, patente, marca, modelo, anio)
    `)
    .eq("id", ventaId)
    .single()

  if (ventaError || !venta) {
    return { error: "Venta no encontrada" }
  }

  // Obtener items de la venta con productos
  const { data: items, error: itemsError } = await supabase
    .from("venta_items")
    .select(`
      *,
      productos (id, nombre, codigo)
    `)
    .eq("venta_id", ventaId)

  if (itemsError) {
    return { error: "Error al obtener items de la venta" }
  }

  return {
    success: true,
    data: {
      ...venta,
      items: items ?? [],
    },
  }
}
