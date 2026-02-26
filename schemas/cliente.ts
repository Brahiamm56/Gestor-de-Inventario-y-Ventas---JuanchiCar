import { z } from "zod"

export const clienteSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
})

export const autoSchema = z.object({
  patente: z.string().min(1, "La patente es obligatoria"),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  anio: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
})

export type ClienteFormData = z.infer<typeof clienteSchema>
export type AutoFormData = z.infer<typeof autoSchema>
