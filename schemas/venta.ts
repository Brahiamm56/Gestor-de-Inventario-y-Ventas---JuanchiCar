import { z } from "zod"

export const ventaItemSchema = z.object({
  producto_id: z.string().min(1, "Seleccioná un producto"),
  cantidad: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  precio_unitario: z.coerce.number().positive("El precio debe ser mayor a 0"),
})

export const ventaSchema = z.object({
  cliente_id: z.string().optional(),
  auto_id: z.string().optional(),
  estado: z.enum(["presupuesto", "confirmada", "cancelada"]),
  metodo_pago: z.enum(["efectivo", "transferencia", "tarjeta"]).optional(),
  notas: z.string().optional(),
  items: z.array(ventaItemSchema).min(1, "Agregá al menos un producto"),
})

export type VentaFormData = z.infer<typeof ventaSchema>
export type VentaItemFormData = z.infer<typeof ventaItemSchema>
