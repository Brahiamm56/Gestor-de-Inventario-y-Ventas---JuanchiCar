export interface Producto {
  id: string
  nombre: string
  categoria: string | null
  codigo: string | null
  precio_venta: number
  precio_costo: number | null
  stock: number
  stock_minimo: number
  proveedor_id: string | null
  descripcion: string | null
  created_at: string
}

export interface Cliente {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  created_at: string
}

export interface Auto {
  id: string
  cliente_id: string
  patente: string
  marca: string | null
  modelo: string | null
  anio: number | null
  created_at: string
}

export type MetodoPago = "efectivo" | "transferencia" | "tarjeta"

export interface Venta {
  id: string
  cliente_id: string | null
  auto_id: string | null
  fecha: string
  total: number
  estado: "presupuesto" | "confirmada" | "cancelada"
  metodo_pago: MetodoPago | null
  notas: string | null
  created_at: string
}

export interface VentaItem {
  id: string
  venta_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
}

export interface Proveedor {
  id: string
  nombre: string
  contacto: string | null
  telefono: string | null
  email: string | null
  created_at: string
}

export interface Compra {
  id: string
  proveedor_id: string
  fecha: string
  total: number
  notas: string | null
  created_at: string
}

export interface CompraItem {
  id: string
  compra_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
}

// Venta con datos del cliente y auto para listados
export interface VentaConCliente extends Venta {
  clientes: Pick<Cliente, "nombre"> | null
  autos: Pick<Auto, "patente" | "marca" | "modelo"> | null
  items?: Array<{
    cantidad: number
    precio_unitario: number
    productos: Pick<Producto, "precio_costo"> | null
  }>
}

// Turnos del taller
export type EstadoTurno = "pendiente" | "en_progreso" | "completado" | "cancelado"

export interface TurnoTaller {
  id: string
  cliente_id: string | null
  auto_id: string | null
  descripcion: string
  estado: EstadoTurno
  fecha_turno: string
  fecha_entrega: string | null
  notas: string | null
  created_at: string
}

export interface TurnoConDetalles extends TurnoTaller {
  clientes: Pick<Cliente, "nombre"> | null
  autos: Pick<Auto, "patente" | "marca" | "modelo"> | null
}
