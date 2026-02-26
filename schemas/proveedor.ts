import { z } from "zod"

export const proveedorSchema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio"),
    contacto: z.string().optional(),
    telefono: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
})

export type ProveedorFormData = z.infer<typeof proveedorSchema>
