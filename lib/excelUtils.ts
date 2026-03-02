/**
 * Utilidades para importación de archivos Excel/CSV
 * Funciones puras sin dependencias de DOM o xlsx — se pueden usar en cliente y servidor
 */

// Aliases de nombres de columnas (español, inglés y variantes comunes)
const ALIASES: Record<string, string[]> = {
  nombre: [
    "nombre", "nombre producto", "producto", "artículo", "articulo",
    "descripcion producto", "name", "item",
  ],
  codigo: [
    "codigo", "código", "cod", "sku", "barcode", "codigo de barras",
    "código de barras", "codigo_barras", "código_barras", "codigo barras",
    "ref", "referencia",
  ],
  categoria: [
    "categoria", "categoría", "category", "cat", "rubro", "tipo",
    "familia", "grupo",
  ],
  precio_venta: [
    "precio venta", "precio_venta", "pventa", "precio de venta", "precio",
    "venta", "sale price", "p venta", "precio final", "p. venta",
  ],
  stock: [
    "stock", "stock actual", "stock_actual", "cantidad", "qty",
    "quantity", "existencia", "existencias", "inventario",
  ],
  stock_minimo: [
    "stock minimo", "stock_minimo", "stock mínimo", "mínimo", "minimo",
    "min stock", "stock min", "min", "stock mínimo reorden",
  ],
  descripcion: [
    "descripcion", "descripción", "notas", "notes", "observaciones",
    "detalle", "obs",
  ],
  ubicacion_fisica: [
    "ubicacion fisica", "ubicación física", "ubicacion", "ubicación",
    "location", "estante", "deposito", "depósito", "pasillo", "sector",
    "shelf", "bin", "slot",
  ],

}

// ─────────────────────────────────────────────
// Tipos exportados
// ─────────────────────────────────────────────

/** Fila cruda leída del Excel — todos los valores posibles de SheetJS */
export type ExcelRow = Record<string, string | number | boolean | null | undefined>

/** Producto parseado desde una fila Excel (campos pueden ser undefined si no se encontraron) */
export interface FilaProducto {
  nombre: string
  codigo?: string
  categoria?: string
  precio_venta?: number
  stock?: number
  stock_minimo?: number
  ubicacion_fisica?: string
  descripcion?: string
}

/** Resultado de validar una fila */
export interface FilaValidada {
  /** Número de fila en el Excel (1-based, donde 1 es el encabezado) */
  fila: number
  datos: FilaProducto
  errores: string[]
  valida: boolean
  duplicadoInterno: boolean
}

/** Producto listo para enviar al servidor (campos requeridos ya validados) */
export interface ProductoParaImportar {
  nombre: string
  codigo?: string
  categoria?: string
  precio_venta: number
  stock: number
  stock_minimo: number
  ubicacion_fisica?: string
  descripcion?: string
}

// ─────────────────────────────────────────────
// Detección de columnas
// ─────────────────────────────────────────────

/** Normaliza un encabezado para comparación (sin tildes, minúsculas, sin guiones) */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\-.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Detecta a qué campo de la DB corresponde un encabezado de columna */
export function detectarCampo(header: string): keyof typeof ALIASES | null {
  const normalized = normalizeHeader(header)
  for (const [field, aliases] of Object.entries(ALIASES)) {
    for (const alias of aliases) {
      const normalizedAlias = normalizeHeader(alias)
      if (normalized === normalizedAlias || normalized.includes(normalizedAlias)) {
        return field as keyof typeof ALIASES
      }
    }
  }
  return null
}

/**
 * Construye el mapeo { campo → nombre_columna_excel } a partir de los encabezados.
 * Si un campo tiene múltiples columnas candidatas, se queda con la primera.
 */
export function construirMapeo(headers: string[]): Record<string, string> {
  const mapeo: Record<string, string> = {}
  for (const header of headers) {
    const campo = detectarCampo(header)
    if (campo && !mapeo[campo]) {
      mapeo[campo] = header
    }
  }
  return mapeo
}

/** Retorna los campos de la DB que no pudieron mapearse */
export function camposSinMapeo(mapeo: Record<string, string>): string[] {
  const requeridos = ["nombre", "precio_venta"]
  return requeridos.filter((c) => !mapeo[c])
}

// ─────────────────────────────────────────────
// Parseo de valores
// ─────────────────────────────────────────────

/**
 * Parsea un valor numérico con soporte para formatos argentinos/europeos/americanos.
 * Soporta: $1.234,56 | 1,234.56 | 1234,56 | 1.234.567 | "850.00"
 */
export function parsearNumero(
  value: string | number | boolean | null | undefined
): number | undefined {
  if (value === null || value === undefined || value === "") return undefined
  if (typeof value === "boolean") return undefined
  if (typeof value === "number") return isNaN(value) ? undefined : value

  // Eliminar $, espacios y caracteres no numéricos excepto . , -
  let clean = String(value)
    .replace(/[$\s]/g, "")
    .trim()

  if (!clean) return undefined

  const hasComma = clean.includes(",")
  const hasDot = clean.includes(".")

  if (hasComma && hasDot) {
    const lastCommaIdx = clean.lastIndexOf(",")
    const lastDotIdx = clean.lastIndexOf(".")
    if (lastCommaIdx > lastDotIdx) {
      // Formato europeo/argentino: 1.234,56
      clean = clean.replace(/\./g, "").replace(",", ".")
    } else {
      // Formato americano: 1,234.56
      clean = clean.replace(/,/g, "")
    }
  } else if (hasComma) {
    const parts = clean.split(",")
    if (parts.length === 2 && parts[1].length <= 2) {
      // Separador decimal con coma: 1234,56
      clean = clean.replace(",", ".")
    } else {
      // Separador de miles con coma: 1,234
      clean = clean.replace(/,/g, "")
    }
  } else if ((clean.match(/\./g) ?? []).length > 1) {
    // Múltiples puntos = separadores de miles: 1.234.567
    clean = clean.replace(/\./g, "")
  }

  const num = parseFloat(clean)
  return isNaN(num) ? undefined : num
}

/** Parsea un valor como entero (redondea) */
export function parsearEntero(
  value: string | number | boolean | null | undefined
): number | undefined {
  const num = parsearNumero(value)
  if (num === undefined) return undefined
  return Math.round(num)
}

/** Limpia y normaliza un texto (quita espacios múltiples) */
export function limpiarTexto(
  value: string | number | boolean | null | undefined
): string | undefined {
  if (value === null || value === undefined) return undefined
  const str = String(value)
    .replace(/\s+/g, " ")
    .trim()
  return str === "" ? undefined : str
}

// ─────────────────────────────────────────────
// Mapeo y validación
// ─────────────────────────────────────────────

/** Mapea una fila cruda de Excel a FilaProducto usando el mapeo de columnas */
export function mapearFila(row: ExcelRow, mapeo: Record<string, string>): FilaProducto {
  const get = (field: string): ExcelRow[string] =>
    mapeo[field] !== undefined ? row[mapeo[field]] : undefined

  return {
    nombre: limpiarTexto(get("nombre")) ?? "",
    codigo: limpiarTexto(get("codigo")),
    categoria: limpiarTexto(get("categoria")),
    precio_venta: parsearNumero(get("precio_venta")),
    stock: parsearEntero(get("stock")),
    stock_minimo: parsearEntero(get("stock_minimo")),
    ubicacion_fisica: limpiarTexto(get("ubicacion_fisica")),
    descripcion: limpiarTexto(get("descripcion")),
  }
}

/**
 * Valida un array de FilaProducto y detecta duplicados internos.
 * Devuelve FilaValidada[] con errores por fila.
 */
export function validarFilas(filas: FilaProducto[]): FilaValidada[] {
  // Mapa de código → número de fila donde se vio por primera vez
  const codigosVistos = new Map<string, number>()

  return filas.map((datos, i) => {
    // La fila 1 del Excel es el encabezado, los datos empiezan en fila 2
    const fila = i + 2
    const errores: string[] = []
    let duplicadoInterno = false

    // ── Nombre ──────────────────────────────
    if (!datos.nombre || datos.nombre.trim() === "") {
      errores.push("El nombre es obligatorio")
    } else if (datos.nombre.length > 200) {
      errores.push("El nombre no puede superar 200 caracteres")
    }

    // ── Precio de venta ─────────────────────
    if (datos.precio_venta === undefined || datos.precio_venta === null) {
      errores.push("El precio de venta es obligatorio")
    } else if (datos.precio_venta <= 0) {
      errores.push("El precio de venta debe ser mayor a 0")
    }

    // ── Stock ────────────────────────────────
    if (datos.stock !== undefined && datos.stock < 0) {
      errores.push("El stock no puede ser negativo")
    }

    // ── Stock mínimo ─────────────────────────
    if (datos.stock_minimo !== undefined && datos.stock_minimo < 0) {
      errores.push("El stock mínimo no puede ser negativo")
    }

    // ── Descripción ──────────────────────────
    if (datos.descripcion && datos.descripcion.length > 200) {
      errores.push("La descripción no puede superar 200 caracteres")
    }

    // ── Duplicado interno ────────────────────
    if (datos.codigo) {
      const prev = codigosVistos.get(datos.codigo)
      if (prev !== undefined) {
        errores.push(`Código "${datos.codigo}" duplicado (también en fila ${prev})`)
        duplicadoInterno = true
      } else {
        codigosVistos.set(datos.codigo, fila)
      }
    }

    return {
      fila,
      datos,
      errores,
      valida: errores.length === 0,
      duplicadoInterno,
    }
  })
}

/** Filtra filas vacías (sin nombre ni código ni precio) */
export function filtrarFilasVacias(filas: FilaProducto[]): FilaProducto[] {
  return filas.filter(
    (f) =>
      (f.nombre && f.nombre.trim() !== "") ||
      f.codigo ||
      f.precio_venta !== undefined
  )
}
