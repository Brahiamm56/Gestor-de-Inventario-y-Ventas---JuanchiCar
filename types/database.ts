export interface Producto {
  id: string
  nombre: string
  categoria: string | null
  codigo: string | null
  precio_venta: number
  precio_costo: number | null
  stock: number
  stock_minimo: number
  ubicacion_fisica: string | null
  proveedor_id: string | null
  descripcion: string | null
  is_active: boolean
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
  cliente_id: string | null
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

export interface Database {
  public: {
    Tables: {
      productos: { Row: Producto; Insert: Partial<Producto>; Update: Partial<Producto> }
      clientes: { Row: Cliente; Insert: Partial<Cliente>; Update: Partial<Cliente> }
      autos: { Row: Auto; Insert: Partial<Auto>; Update: Partial<Auto> }
      ventas: { Row: Venta; Insert: Partial<Venta>; Update: Partial<Venta> }
      venta_items: { Row: VentaItem; Insert: Partial<VentaItem>; Update: Partial<VentaItem> }
      proveedores: { Row: Proveedor; Insert: Partial<Proveedor>; Update: Partial<Proveedor> }
      compras: { Row: Compra; Insert: Partial<Compra>; Update: Partial<Compra> }
      compra_items: { Row: CompraItem; Insert: Partial<CompraItem>; Update: Partial<CompraItem> }
      turnos_taller: { Row: TurnoTaller; Insert: Partial<TurnoTaller>; Update: Partial<TurnoTaller> }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_stock_bajo_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
