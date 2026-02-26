"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { turnoSchema } from "@/schemas/turno"
import type { EstadoTurno } from "@/types/database"

export async function crearTurno(formData: unknown) {
    const parsed = turnoSchema.safeParse(formData)
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()
    const { error } = await supabase.from("turnos_taller").insert({
        cliente_id: parsed.data.cliente_id || null,
        auto_id: parsed.data.auto_id || null,
        descripcion: parsed.data.descripcion,
        estado: parsed.data.estado,
        fecha_turno: parsed.data.fecha_turno,
        fecha_entrega: parsed.data.fecha_entrega || null,
        notas: parsed.data.notas || null,
    })

    if (error) {
        console.error("Error creating turno:", error)
        return { error: `Error al crear el turno: ${error.message}` }
    }

    revalidatePath("/taller")
    revalidatePath("/dashboard")
    return { success: true }
}

export async function editarTurno(id: string, formData: unknown) {
    const parsed = turnoSchema.safeParse(formData)
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from("turnos_taller")
        .update({
            cliente_id: parsed.data.cliente_id || null,
            auto_id: parsed.data.auto_id || null,
            descripcion: parsed.data.descripcion,
            estado: parsed.data.estado,
            fecha_turno: parsed.data.fecha_turno,
            fecha_entrega: parsed.data.fecha_entrega || null,
            notas: parsed.data.notas || null,
        })
        .eq("id", id)

    if (error) {
        console.error("Error editing turno:", error)
        return { error: `Error al editar el turno: ${error.message}` }
    }

    revalidatePath("/taller")
    revalidatePath("/dashboard")
    return { success: true }
}

export async function cambiarEstadoTurno(id: string, nuevoEstado: EstadoTurno) {
    const supabase = await createClient()
    const { error } = await supabase
        .from("turnos_taller")
        .update({ estado: nuevoEstado })
        .eq("id", id)

    if (error) {
        console.error("Error changing turno status:", error)
        return { error: `Error al cambiar el estado: ${error.message}` }
    }

    revalidatePath("/taller")
    revalidatePath("/dashboard")
    return { success: true }
}

export async function eliminarTurno(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from("turnos_taller").delete().eq("id", id)

    if (error) {
        console.error("Error deleting turno:", error)
        return { error: "Error al eliminar el turno" }
    }

    revalidatePath("/taller")
    revalidatePath("/dashboard")
    return { success: true }
}
