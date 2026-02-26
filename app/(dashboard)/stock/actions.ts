"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { productoSchema } from "@/schemas/producto"

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
    precio_costo: parsed.data.precio_costo ?? null,
    stock: parsed.data.stock,
    stock_minimo: parsed.data.stock_minimo,
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
      precio_costo: parsed.data.precio_costo ?? null,
      stock: parsed.data.stock,
      stock_minimo: parsed.data.stock_minimo,
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
  const { error } = await supabase.from("productos").delete().eq("id", id)

  if (error) {
    return { error: "Error al eliminar el producto" }
  }

  revalidatePath("/stock")
  return { success: true }
}
