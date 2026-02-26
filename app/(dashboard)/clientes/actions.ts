"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { clienteSchema, autoSchema } from "@/schemas/cliente"

export async function crearCliente(formData: unknown) {
  const parsed = clienteSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("clientes").insert({
    nombre: parsed.data.nombre,
    telefono: parsed.data.telefono || null,
    email: parsed.data.email || null,
  })

  if (error) return { error: "Error al crear el cliente" }

  revalidatePath("/clientes")
  return { success: true }
}

export async function editarCliente(id: string, formData: unknown) {
  const parsed = clienteSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("clientes")
    .update({
      nombre: parsed.data.nombre,
      telefono: parsed.data.telefono || null,
      email: parsed.data.email || null,
    })
    .eq("id", id)

  if (error) return { error: "Error al editar el cliente" }

  revalidatePath("/clientes")
  return { success: true }
}

export async function eliminarCliente(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("clientes").delete().eq("id", id)

  if (error) return { error: "Error al eliminar el cliente. Puede tener ventas asociadas." }

  revalidatePath("/clientes")
  return { success: true }
}

export async function crearAuto(clienteId: string, formData: unknown) {
  const parsed = autoSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("autos").insert({
    cliente_id: clienteId,
    patente: parsed.data.patente.toUpperCase(),
    marca: parsed.data.marca || null,
    modelo: parsed.data.modelo || null,
    anio: parsed.data.anio ?? null,
  })

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un vehículo con esa patente" }
    }
    return { error: "Error al crear el vehículo" }
  }

  revalidatePath("/clientes")
  return { success: true }
}

export async function editarAuto(id: string, formData: unknown) {
  const parsed = autoSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("autos")
    .update({
      patente: parsed.data.patente.toUpperCase(),
      marca: parsed.data.marca || null,
      modelo: parsed.data.modelo || null,
      anio: parsed.data.anio ?? null,
    })
    .eq("id", id)

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un vehículo con esa patente" }
    }
    return { error: "Error al editar el vehículo" }
  }

  revalidatePath("/clientes")
  return { success: true }
}

export async function eliminarAuto(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("autos").delete().eq("id", id)

  if (error) return { error: "Error al eliminar el vehículo" }

  revalidatePath("/clientes")
  return { success: true }
}
