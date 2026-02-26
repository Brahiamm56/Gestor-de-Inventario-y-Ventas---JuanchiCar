"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { compraSchema } from "@/schemas/compra"

export async function crearCompra(formData: unknown) {
  const parsed = compraSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { items, ...compraData } = parsed.data
  const total = items.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0)

  const supabase = await createClient()

  // Crear la compra
  const { data: compra, error: compraError } = await supabase
    .from("compras")
    .insert({
      proveedor_id: compraData.proveedor_id,
      notas: compraData.notas || null,
      total,
    })
    .select("id")
    .single()

  if (compraError || !compra) {
    return { error: "Error al crear la compra" }
  }

  // Crear los items
  const compraItems = items.map((item) => ({
    compra_id: compra.id,
    producto_id: item.producto_id,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
  }))

  const { error: itemsError } = await supabase.from("compra_items").insert(compraItems)
  if (itemsError) {
    await supabase.from("compras").delete().eq("id", compra.id)
    return { error: "Error al crear los items de la compra" }
  }

  // Incrementar stock de cada producto
  for (const item of items) {
    const { data: producto } = await supabase
      .from("productos")
      .select("stock")
      .eq("id", item.producto_id)
      .single()

    if (producto) {
      await supabase
        .from("productos")
        .update({
          stock: producto.stock + item.cantidad,
          precio_costo: item.precio_unitario,
        })
        .eq("id", item.producto_id)
    }
  }

  revalidatePath("/compras")
  revalidatePath("/stock")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function eliminarCompra(compraId: string) {
  const supabase = await createClient()

  // Obtener items para devolver stock
  const { data: items } = await supabase
    .from("compra_items")
    .select("producto_id, cantidad")
    .eq("compra_id", compraId)

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
          .update({ stock: Math.max(0, producto.stock - item.cantidad) })
          .eq("id", item.producto_id)
      }
    }
  }

  const { error } = await supabase.from("compras").delete().eq("id", compraId)
  if (error) return { error: "Error al eliminar la compra" }

  revalidatePath("/compras")
  revalidatePath("/stock")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function obtenerDetallesCompra(compraId: string) {
  const supabase = await createClient()

  const { data: compra, error: compraError } = await supabase
    .from("compras")
    .select(`
      *,
      proveedores (id, nombre, contacto, telefono, email)
    `)
    .eq("id", compraId)
    .single()

  if (compraError || !compra) {
    return { error: "Compra no encontrada" }
  }

  const { data: items, error: itemsError } = await supabase
    .from("compra_items")
    .select(`
      *,
      productos (id, nombre, codigo)
    `)
    .eq("compra_id", compraId)

  if (itemsError) {
    return { error: "Error al obtener items de la compra" }
  }

  return {
    success: true,
    data: {
      ...compra,
      items: items ?? [],
    },
  }
}
