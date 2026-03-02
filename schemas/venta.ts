import { z } from "zod"

export const ventaItemSchema = z.object({
  producto_id: z.string().min(1, "Seleccioná un producto"),
  cantidad: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  precio_unitario: z.coerce.number().positive("El precio debe ser mayor a 0"),
})

export const servicioItemSchema = z.object({
  descripcion: z.string().min(1, "La descripción del servicio es obligatoria"),
  precio: z.coerce.number().min(0, "El precio no puede ser negativo"),
})

export const ventaSchema = z.object({
  cliente_id: z.string().optional(),
  auto_id: z.string().optional(),
  estado: z.enum(["presupuesto", "confirmada", "cancelada"]),
  metodo_pago: z.enum(["efectivo", "transferencia", "tarjeta"]).optional(),
  notas: z.string().optional(),
  items: z.array(ventaItemSchema),
  servicios: z.array(servicioItemSchema).optional().default([]),
}).refine(
  (data) => data.items.length > 0 || (data.servicios && data.servicios.length > 0),
  { message: "Agregá al menos un producto o servicio", path: ["items"] }
)

export type VentaFormData = z.infer<typeof ventaSchema>
export type VentaItemFormData = z.infer<typeof ventaItemSchema>
export type ServicioItemFormData = z.infer<typeof servicioItemSchema>
