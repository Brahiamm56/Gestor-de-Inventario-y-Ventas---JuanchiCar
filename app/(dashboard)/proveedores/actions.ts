"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { proveedorSchema } from "@/schemas/proveedor"

export async function crearProveedor(formData: unknown) {
    const parsed = proveedorSchema.safeParse(formData)
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()
    const { error } = await supabase.from("proveedores").insert({
        nombre: parsed.data.nombre,
        contacto: parsed.data.contacto || null,
        telefono: parsed.data.telefono || null,
        email: parsed.data.email || null,
    })

    if (error) {
        console.error("Error creating proveedor:", error)
        return { error: `Error al crear el proveedor: ${error.message}` }
    }

    revalidatePath("/proveedores")
    return { success: true }
}

export async function editarProveedor(id: string, formData: unknown) {
    const parsed = proveedorSchema.safeParse(formData)
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from("proveedores")
        .update({
            nombre: parsed.data.nombre,
            contacto: parsed.data.contacto || null,
            telefono: parsed.data.telefono || null,
            email: parsed.data.email || null,
        })
        .eq("id", id)

    if (error) {
        console.error("Error editing proveedor:", error)
        return { error: `Error al editar el proveedor: ${error.message}` }
    }

    revalidatePath("/proveedores")
    return { success: true }
}

export async function eliminarProveedor(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from("proveedores").delete().eq("id", id)

    if (error) {
        console.error("Error deleting proveedor:", error)
        return { error: "Error al eliminar el proveedor. Puede tener productos asociados." }
    }

    revalidatePath("/proveedores")
    return { success: true }
}
