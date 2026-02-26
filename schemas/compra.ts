import { z } from "zod"

export const compraItemSchema = z.object({
  producto_id: z.string().min(1, "Seleccioná un producto"),
  cantidad: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  precio_unitario: z.coerce.number().positive("El precio debe ser mayor a 0"),
})

export const compraSchema = z.object({
  proveedor_id: z.string().min(1, "Seleccioná un proveedor"),
  notas: z.string().optional(),
  items: z.array(compraItemSchema).min(1, "Agregá al menos un producto"),
})

export type CompraFormData = z.infer<typeof compraSchema>
export type CompraItemFormData = z.infer<typeof compraItemSchema>
