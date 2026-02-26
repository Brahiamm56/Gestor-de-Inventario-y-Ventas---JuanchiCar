import { z } from "zod"

export const productoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  categoria: z.string().optional(),
  codigo: z.string().optional(),
  precio_venta: z.coerce.number().positive("El precio de venta debe ser mayor a 0"),
  precio_costo: z.coerce.number().min(0, "El precio de costo no puede ser negativo").optional(),
  stock: z.coerce.number().int().min(0, "El stock no puede ser negativo"),
  stock_minimo: z.coerce.number().int().min(0, "El stock mínimo no puede ser negativo"),
  proveedor_id: z.string().optional(),
  descripcion: z.string().max(200, "La descripción no puede superar los 200 caracteres").optional(),
})

export type ProductoFormData = z.infer<typeof productoSchema>
