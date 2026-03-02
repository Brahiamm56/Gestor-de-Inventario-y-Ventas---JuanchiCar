/**
 * Tests de validación de schemas Zod
 * Ejecutar: npx tsx tests/test-schemas.ts
 *
 * Estos tests verifican que los schemas de validación acepten datos correctos
 * y rechacen datos inválidos, previniendo problemas antes de llegar a la DB.
 */

import { productoSchema } from "../schemas/producto"
import { ventaSchema } from "../schemas/venta"
import { compraSchema } from "../schemas/compra"
import { clienteSchema, autoSchema } from "../schemas/cliente"
import { loginSchema } from "../schemas/auth"

// ── Utilidades de test ──────────────────────────────────────────────────────

let totalTests = 0
let passed = 0
let failed = 0

function test(nombre: string, fn: () => void) {
  totalTests++
  try {
    fn()
    passed++
    console.log(`  ✅ ${nombre}`)
  } catch (e: unknown) {
    failed++
    const msg = e instanceof Error ? e.message : String(e)
    console.log(`  ❌ ${nombre}`)
    console.log(`     → ${msg}`)
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg)
}

function assertValid(schema: { safeParse: (d: unknown) => { success: boolean } }, data: unknown) {
  const result = schema.safeParse(data)
  assert(result.success, `Se esperaba válido pero falló: ${JSON.stringify(data)}`)
}

function assertInvalid(schema: { safeParse: (d: unknown) => { success: boolean } }, data: unknown) {
  const result = schema.safeParse(data)
  assert(!result.success, `Se esperaba inválido pero pasó: ${JSON.stringify(data)}`)
}

// ── Tests de productoSchema ────────────────────────────────────────────────

console.log("\n📦 PRODUCTO SCHEMA")

test("Producto válido con campos mínimos", () => {
  assertValid(productoSchema, {
    nombre: "Filtro de aceite",
    precio_venta: 1500,
    stock: 10,
    stock_minimo: 2,
  })
})

test("Producto válido con todos los campos", () => {
  assertValid(productoSchema, {
    nombre: "Bujía NGK",
    categoria: "Motor",
    codigo: "BUJ-001",
    precio_venta: 800,
    precio_costo: 500,
    stock: 50,
    stock_minimo: 10,
    ubicacion_fisica: "Estante A-3",
    proveedor_id: "550e8400-e29b-41d4-a716-446655440000",
    descripcion: "Bujía de iridio para motores nafteros",
  })
})

test("Producto inválido: sin nombre", () => {
  assertInvalid(productoSchema, {
    nombre: "",
    precio_venta: 1500,
    stock: 10,
    stock_minimo: 2,
  })
})

test("Producto inválido: precio_venta 0", () => {
  assertInvalid(productoSchema, {
    nombre: "Test",
    precio_venta: 0,
    stock: 10,
    stock_minimo: 2,
  })
})

test("Producto inválido: precio_venta negativo", () => {
  assertInvalid(productoSchema, {
    nombre: "Test",
    precio_venta: -100,
    stock: 10,
    stock_minimo: 2,
  })
})

test("Producto inválido: stock negativo", () => {
  assertInvalid(productoSchema, {
    nombre: "Test",
    precio_venta: 1500,
    stock: -1,
    stock_minimo: 2,
  })
})

test("Producto inválido: stock_minimo negativo", () => {
  assertInvalid(productoSchema, {
    nombre: "Test",
    precio_venta: 1500,
    stock: 10,
    stock_minimo: -5,
  })
})

test("Producto válido: precio_costo puede ser 0", () => {
  assertValid(productoSchema, {
    nombre: "Gratis",
    precio_venta: 100,
    precio_costo: 0,
    stock: 1,
    stock_minimo: 0,
  })
})

test("Producto inválido: precio_costo negativo", () => {
  assertInvalid(productoSchema, {
    nombre: "Test",
    precio_venta: 100,
    precio_costo: -50,
    stock: 1,
    stock_minimo: 0,
  })
})

test("Producto válido: ubicacion_fisica con 100 caracteres", () => {
  assertValid(productoSchema, {
    nombre: "Test",
    precio_venta: 100,
    stock: 1,
    stock_minimo: 0,
    ubicacion_fisica: "A".repeat(100),
  })
})

test("Producto inválido: ubicacion_fisica con 101 caracteres", () => {
  assertInvalid(productoSchema, {
    nombre: "Test",
    precio_venta: 100,
    stock: 1,
    stock_minimo: 0,
    ubicacion_fisica: "A".repeat(101),
  })
})

test("Producto válido: descripcion con 200 caracteres", () => {
  assertValid(productoSchema, {
    nombre: "Test",
    precio_venta: 100,
    stock: 1,
    stock_minimo: 0,
    descripcion: "B".repeat(200),
  })
})

test("Producto inválido: descripcion con 201 caracteres", () => {
  assertInvalid(productoSchema, {
    nombre: "Test",
    precio_venta: 100,
    stock: 1,
    stock_minimo: 0,
    descripcion: "B".repeat(201),
  })
})

test("Producto: coerción de string a número (precio_venta)", () => {
  const result = productoSchema.safeParse({
    nombre: "Test",
    precio_venta: "1500",
    stock: "10",
    stock_minimo: "2",
  })
  assert(result.success, "Debería coercionar strings a números")
})

// ── Tests de ventaSchema ───────────────────────────────────────────────────

console.log("\n🛒 VENTA SCHEMA")

test("Venta válida con productos", () => {
  assertValid(ventaSchema, {
    estado: "presupuesto",
    items: [
      { producto_id: "abc-123", cantidad: 2, precio_unitario: 1500 },
    ],
  })
})

test("Venta válida con servicios solamente", () => {
  assertValid(ventaSchema, {
    estado: "confirmada",
    items: [],
    servicios: [
      { descripcion: "Cambio de aceite", precio: 5000 },
    ],
  })
})

test("Venta válida con productos y servicios", () => {
  assertValid(ventaSchema, {
    estado: "confirmada",
    cliente_id: "uuid-cliente",
    auto_id: "uuid-auto",
    metodo_pago: "efectivo",
    notas: "Entrega el viernes",
    items: [
      { producto_id: "uuid-prod", cantidad: 1, precio_unitario: 2000 },
    ],
    servicios: [
      { descripcion: "Mano de obra", precio: 3000 },
    ],
  })
})

test("Venta inválida: sin items ni servicios", () => {
  assertInvalid(ventaSchema, {
    estado: "presupuesto",
    items: [],
    servicios: [],
  })
})

test("Venta inválida: items vacíos y sin servicios", () => {
  assertInvalid(ventaSchema, {
    estado: "presupuesto",
    items: [],
  })
})

test("Venta inválida: estado inválido", () => {
  assertInvalid(ventaSchema, {
    estado: "pagada",
    items: [
      { producto_id: "abc", cantidad: 1, precio_unitario: 100 },
    ],
  })
})

test("Venta inválida: cantidad 0", () => {
  assertInvalid(ventaSchema, {
    estado: "presupuesto",
    items: [
      { producto_id: "abc", cantidad: 0, precio_unitario: 100 },
    ],
  })
})

test("Venta inválida: cantidad negativa", () => {
  assertInvalid(ventaSchema, {
    estado: "presupuesto",
    items: [
      { producto_id: "abc", cantidad: -1, precio_unitario: 100 },
    ],
  })
})

test("Venta inválida: precio_unitario 0", () => {
  assertInvalid(ventaSchema, {
    estado: "presupuesto",
    items: [
      { producto_id: "abc", cantidad: 1, precio_unitario: 0 },
    ],
  })
})

test("Venta inválida: producto_id vacío", () => {
  assertInvalid(ventaSchema, {
    estado: "presupuesto",
    items: [
      { producto_id: "", cantidad: 1, precio_unitario: 100 },
    ],
  })
})

test("Venta inválida: servicio sin descripción", () => {
  assertInvalid(ventaSchema, {
    estado: "presupuesto",
    items: [],
    servicios: [
      { descripcion: "", precio: 1000 },
    ],
  })
})

test("Venta válida: servicio con precio 0 (gratis)", () => {
  assertValid(ventaSchema, {
    estado: "presupuesto",
    items: [],
    servicios: [
      { descripcion: "Revisión gratuita", precio: 0 },
    ],
  })
})

test("Venta inválida: servicio con precio negativo", () => {
  assertInvalid(ventaSchema, {
    estado: "presupuesto",
    items: [],
    servicios: [
      { descripcion: "Descuento", precio: -500 },
    ],
  })
})

test("Venta válida: metodo_pago efectivo", () => {
  assertValid(ventaSchema, {
    estado: "confirmada",
    metodo_pago: "efectivo",
    items: [{ producto_id: "x", cantidad: 1, precio_unitario: 100 }],
  })
})

test("Venta válida: metodo_pago transferencia", () => {
  assertValid(ventaSchema, {
    estado: "confirmada",
    metodo_pago: "transferencia",
    items: [{ producto_id: "x", cantidad: 1, precio_unitario: 100 }],
  })
})

test("Venta válida: metodo_pago tarjeta", () => {
  assertValid(ventaSchema, {
    estado: "confirmada",
    metodo_pago: "tarjeta",
    items: [{ producto_id: "x", cantidad: 1, precio_unitario: 100 }],
  })
})

test("Venta inválida: metodo_pago desconocido", () => {
  assertInvalid(ventaSchema, {
    estado: "confirmada",
    metodo_pago: "bitcoin",
    items: [{ producto_id: "x", cantidad: 1, precio_unitario: 100 }],
  })
})

// ── Tests de compraSchema ──────────────────────────────────────────────────

console.log("\n📥 COMPRA SCHEMA")

test("Compra válida", () => {
  assertValid(compraSchema, {
    proveedor_id: "uuid-proveedor",
    items: [
      { producto_id: "uuid-prod", cantidad: 10, precio_unitario: 500 },
    ],
  })
})

test("Compra válida con notas", () => {
  assertValid(compraSchema, {
    proveedor_id: "uuid-proveedor",
    notas: "Pedido urgente",
    items: [
      { producto_id: "uuid-prod", cantidad: 10, precio_unitario: 500 },
    ],
  })
})

test("Compra inválida: sin proveedor", () => {
  assertInvalid(compraSchema, {
    proveedor_id: "",
    items: [
      { producto_id: "uuid-prod", cantidad: 10, precio_unitario: 500 },
    ],
  })
})

test("Compra inválida: sin items", () => {
  assertInvalid(compraSchema, {
    proveedor_id: "uuid-proveedor",
    items: [],
  })
})

test("Compra inválida: item con cantidad 0", () => {
  assertInvalid(compraSchema, {
    proveedor_id: "uuid-proveedor",
    items: [
      { producto_id: "uuid-prod", cantidad: 0, precio_unitario: 500 },
    ],
  })
})

// ── Tests de clienteSchema ─────────────────────────────────────────────────

console.log("\n👤 CLIENTE SCHEMA")

test("Cliente válido con nombre", () => {
  assertValid(clienteSchema, { nombre: "Juan Pérez" })
})

test("Cliente válido con teléfono", () => {
  assertValid(clienteSchema, { nombre: "María", telefono: "11-5555-1234" })
})

test("Cliente inválido: sin nombre", () => {
  assertInvalid(clienteSchema, { nombre: "" })
})

test("Cliente inválido: nombre faltante", () => {
  assertInvalid(clienteSchema, { telefono: "123" })
})

// ── Tests de autoSchema ────────────────────────────────────────────────────

console.log("\n🚗 AUTO SCHEMA")

test("Auto válido con patente", () => {
  assertValid(autoSchema, { patente: "ABC123" })
})

test("Auto válido completo", () => {
  assertValid(autoSchema, {
    patente: "AD123XY",
    marca: "Ford",
    modelo: "Focus",
    anio: 2020,
  })
})

test("Auto inválido: sin patente", () => {
  assertInvalid(autoSchema, { patente: "" })
})

test("Auto inválido: año muy antiguo", () => {
  assertInvalid(autoSchema, { patente: "ABC123", anio: 1800 })
})

test("Auto inválido: año futuro lejano", () => {
  assertInvalid(autoSchema, { patente: "ABC123", anio: 2030 })
})

test("Auto válido: año próximo (año actual + 1)", () => {
  assertValid(autoSchema, { patente: "ABC123", anio: new Date().getFullYear() + 1 })
})

// ── Tests de loginSchema ───────────────────────────────────────────────────

console.log("\n🔐 LOGIN SCHEMA")

test("Login válido", () => {
  assertValid(loginSchema, { email: "admin@taller.com", password: "123456" })
})

test("Login inválido: email sin @", () => {
  assertInvalid(loginSchema, { email: "admin", password: "123456" })
})

test("Login inválido: password corta (5 chars)", () => {
  assertInvalid(loginSchema, { email: "a@b.com", password: "12345" })
})

test("Login válido: password exacta 6 chars", () => {
  assertValid(loginSchema, { email: "a@b.com", password: "123456" })
})

// ── Resumen ────────────────────────────────────────────────────────────────

console.log("\n" + "═".repeat(50))
console.log(`📊 RESULTADOS: ${passed}/${totalTests} pasaron`)
if (failed > 0) {
  console.log(`❌ ${failed} test(s) fallaron`)
  process.exit(1)
} else {
  console.log("✅ Todos los tests pasaron")
  process.exit(0)
}
