import { z } from "zod"

export const turnoSchema = z.object({
    cliente_id: z.string().optional(),
    auto_id: z.string().optional(),
    descripcion: z.string().optional(),
    estado: z.enum(["pendiente", "en_progreso", "completado", "cancelado"]),
    fecha_turno: z.string().min(1, "La fecha del turno es obligatoria"),
    fecha_entrega: z.string().optional(),
    notas: z.string().min(1, "El problema del cliente es obligatorio"),
})

export type TurnoFormData = z.infer<typeof turnoSchema>
