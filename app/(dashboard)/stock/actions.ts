"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { productoSchema } from "@/schemas/producto"
import type { ProductoParaImportar } from "@/lib/excelUtils"

export async function crearProducto(formData: unknown) {
  const parsed = productoSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("productos").insert({
    nombre: parsed.data.nombre,
    categoria: parsed.data.categoria || null,
    codigo: parsed.data.codigo || null,
    precio_venta: parsed.data.precio_venta,
    stock: parsed.data.stock,
    stock_minimo: parsed.data.stock_minimo,
    ubicacion_fisica: parsed.data.ubicacion_fisica || null,
    proveedor_id: parsed.data.proveedor_id || null,
    descripcion: parsed.data.descripcion || null,
  })

  if (error) {
    console.error("Error creating product:", error)
    if (error.code === "23505") {
      return { error: "Ya existe un producto con ese código" }
    }
    return { error: `Error al crear el producto: ${error.message}` }
  }

  revalidatePath("/stock")
  return { success: true }
}

export async function editarProducto(id: string, formData: unknown) {
  const parsed = productoSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("productos")
    .update({
      nombre: parsed.data.nombre,
      categoria: parsed.data.categoria || null,
      codigo: parsed.data.codigo || null,
      precio_venta: parsed.data.precio_venta,
      stock: parsed.data.stock,
      stock_minimo: parsed.data.stock_minimo,
      ubicacion_fisica: parsed.data.ubicacion_fisica || null,
      proveedor_id: parsed.data.proveedor_id || null,
      descripcion: parsed.data.descripcion || null,
    })
    .eq("id", id)

  if (error) {
    console.error("Error editing product:", error)
    if (error.code === "23505") {
      return { error: "Ya existe un producto con ese código" }
    }
    return { error: `Error al editar el producto: ${error.message}` }
  }

  revalidatePath("/stock")
  return { success: true }
}

export async function eliminarProducto(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("productos").update({ is_active: false }).eq("id", id)

  if (error) {
    return { error: "Error al eliminar el producto" }
  }

  revalidatePath("/stock")
  return { success: true }
}

/**
 * Importa productos en lote desde un archivo Excel/CSV parseado en el cliente.
 * Verifica duplicados de código en la DB e intenta mapear proveedores por nombre.
 */
export async function importarProductos(filas: ProductoParaImportar[]): Promise<
  | { error: string }
  | {
    success: true
    importados: number
    omitidos: number
    detalleOmitidos: Array<{ fila: number; motivo: string }>
  }
> {
  if (!filas || filas.length === 0) {
    return { error: "No se recibieron productos para importar" }
  }

  const supabase = await createClient()

  // ── Verificar códigos ya existentes en la DB ──────────────────────────
  const codigos = filas
    .map((f) => f.codigo)
    .filter((c): c is string => !!c)

  const codigosExistentesEnDB = new Set<string>()
  if (codigos.length > 0) {
    const { data: existentes } = await supabase
      .from("productos")
      .select("codigo")
      .in("codigo", codigos)
    existentes?.forEach((r) => {
      if (r.codigo) codigosExistentesEnDB.add(r.codigo)
    })
  }

  // ── Intentar resolver proveedores por nombre ──────────────────────────
  const nombresProveedor = [
    ...new Set(filas.map((f) => f.proveedor).filter((p): p is string => !!p)),
  ]
  const proveedorMap = new Map<string, string>()
  if (nombresProveedor.length > 0) {
    const { data: proveedoresData } = await supabase
      .from("proveedores")
      .select("id, nombre")
    proveedoresData?.forEach((p) => {
      proveedorMap.set(p.nombre.toLowerCase(), p.id)
    })
  }

  // ── Separar válidos de omitidos ───────────────────────────────────────
  const detalleOmitidos: Array<{ fila: number; motivo: string }> = []
  const paraInsertar: Array<{
    nombre: string
    codigo: string | null
    categoria: string | null
    precio_venta: number
    stock: number
    stock_minimo: number
    ubicacion_fisica: string | null
    descripcion: string | null
    proveedor_id: string | null
  }> = []

  filas.forEach((f, i) => {
    // Fila 2 = primera fila de datos (fila 1 es encabezado)
    const numerFila = i + 2

    if (f.codigo && codigosExistentesEnDB.has(f.codigo)) {
      detalleOmitidos.push({
        fila: numerFila,
        motivo: `El código "${f.codigo}" ya existe en el sistema`,
      })
      return
    }

    const proveedorId = f.proveedor
      ? (proveedorMap.get(f.proveedor.toLowerCase()) ?? null)
      : null

    paraInsertar.push({
      nombre: f.nombre,
      codigo: f.codigo ?? null,
      categoria: f.categoria ?? null,
      precio_venta: f.precio_venta,
      stock: f.stock,
      stock_minimo: f.stock_minimo,
      ubicacion_fisica: f.ubicacion_fisica ?? null,
      descripcion: f.descripcion ?? null,
      proveedor_id: proveedorId,
    })
  })

  // ── Insertar en lote ──────────────────────────────────────────────────
  let importados = 0
  if (paraInsertar.length > 0) {
    const { error } = await supabase.from("productos").insert(paraInsertar)
    if (error) {
      console.error("Error al importar productos:", error)
      return { error: `Error al importar productos: ${error.message}` }
    }
    importados = paraInsertar.length
  }

  revalidatePath("/stock")
  return {
    success: true,
    importados,
    omitidos: detalleOmitidos.length,
    detalleOmitidos,
  }
}
