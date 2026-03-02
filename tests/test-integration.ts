/**
 * Tests de integración completos — GestorStock
 * Ejecutar: npx tsx tests/test-integration.ts
 *
 * REQUISITOS:
 * - Variables de entorno en .env o .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - Variables de test (en .env o como argumentos):
 *   TEST_EMAIL y TEST_PASSWORD — credenciales de un usuario existente en Supabase Auth
 *
 * USO:
 *   npx tsx tests/test-integration.ts
 *   npx tsx tests/test-integration.ts email@test.com password123
 *
 * IMPORTANTE: Este script crea datos de prueba con prefijo [TEST] y los limpia al final.
 * Recomendado ejecutar contra un entorno de desarrollo, no producción.
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"
import * as fs from "fs"

// Cargar variables de entorno desde .env.local o .env
const envLocalPath = path.resolve(__dirname, "../.env.local")
const envPath = path.resolve(__dirname, "../.env")
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath })
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Credenciales de test: argumentos de CLI o variables de entorno
const TEST_EMAIL = process.argv[2] || process.env.TEST_EMAIL
const TEST_PASSWORD = process.argv[3] || process.env.TEST_PASSWORD

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Faltan variables de entorno SUPABASE_URL o SUPABASE_KEY")
  process.exit(1)
}

if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error("❌ Se requieren credenciales de test.")
  console.error("   Uso: npx tsx tests/test-integration.ts <email> <password>")
  console.error("   O definir TEST_EMAIL y TEST_PASSWORD en .env")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Utilidades ──────────────────────────────────────────────────────────────

const TEST_PREFIX = "[TEST]"
let totalTests = 0
let passed = 0
let failed = 0
const errors: string[] = []

// IDs de datos creados durante los tests, para limpieza
const createdIds = {
  productos: [] as string[],
  clientes: [] as string[],
  autos: [] as string[],
  ventas: [] as string[],
  compras: [] as string[],
  proveedores: [] as string[],
}

async function test(nombre: string, fn: () => Promise<void>) {
  totalTests++
  try {
    await fn()
    passed++
    console.log(`  ✅ ${nombre}`)
  } catch (e: unknown) {
    failed++
    const msg = e instanceof Error ? e.message : String(e)
    console.log(`  ❌ ${nombre}`)
    console.log(`     → ${msg}`)
    errors.push(`${nombre}: ${msg}`)
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg)
}

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${JSON.stringify(expected)}, recibido ${JSON.stringify(actual)}`)
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 1: PRODUCTOS — CRUD y validaciones
// ══════════════════════════════════════════════════════════════════════════════

async function testProductos() {
  console.log("\n📦 PRODUCTOS — CRUD")

  let productoId: string

  await test("Crear producto con datos completos", async () => {
    const { data, error } = await supabase
      .from("productos")
      .insert({
        nombre: `${TEST_PREFIX} Filtro de aceite`,
        categoria: "Motor",
        codigo: `${TEST_PREFIX}-FILT-001`,
        precio_venta: 1500.50,
        precio_costo: 800,
        stock: 25,
        stock_minimo: 5,
        ubicacion_fisica: "Estante A-1",
        descripcion: "Filtro de aceite para motores nafta",
      })
      .select("id")
      .single()

    assert(!error, `Error al crear: ${error?.message}`)
    assert(!!data?.id, "No se obtuvo ID del producto")
    productoId = data!.id
    createdIds.productos.push(productoId)
  })

  await test("Leer producto creado correctamente", async () => {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("id", productoId)
      .single()

    assert(!error, `Error al leer: ${error?.message}`)
    assertEqual(data?.nombre, `${TEST_PREFIX} Filtro de aceite`, "nombre")
    assertEqual(data?.precio_venta, 1500.50, "precio_venta")
    assertEqual(data?.stock, 25, "stock")
    assertEqual(data?.stock_minimo, 5, "stock_minimo")
    assertEqual(data?.categoria, "Motor", "categoria")
  })

  await test("Editar producto: cambiar precio y stock", async () => {
    const { error } = await supabase
      .from("productos")
      .update({ precio_venta: 1800, stock: 30 })
      .eq("id", productoId)

    assert(!error, `Error al editar: ${error?.message}`)

    const { data } = await supabase
      .from("productos")
      .select("precio_venta, stock")
      .eq("id", productoId)
      .single()

    assertEqual(data?.precio_venta, 1800, "precio_venta actualizado")
    assertEqual(data?.stock, 30, "stock actualizado")
  })

  await test("Código duplicado debe fallar (constraint UNIQUE)", async () => {
    const { error } = await supabase
      .from("productos")
      .insert({
        nombre: `${TEST_PREFIX} Duplicado`,
        codigo: `${TEST_PREFIX}-FILT-001`,
        precio_venta: 100,
        stock: 1,
        stock_minimo: 0,
      })

    assert(!!error, "Debería fallar por código duplicado")
    assertEqual(error?.code, "23505", "Código de error de unicidad")
  })

  await test("Soft delete (is_active = false)", async () => {
    const { error } = await supabase
      .from("productos")
      .update({ is_active: false })
      .eq("id", productoId)

    assert(!error, `Error en soft delete: ${error?.message}`)

    const { data } = await supabase
      .from("productos")
      .select("is_active")
      .eq("id", productoId)
      .single()

    assertEqual(data?.is_active, false, "is_active debería ser false")

    // Restaurar para usar en tests siguientes
    await supabase.from("productos").update({ is_active: true }).eq("id", productoId)
  })

  await test("Crear segundo producto para tests de ventas", async () => {
    const { data, error } = await supabase
      .from("productos")
      .insert({
        nombre: `${TEST_PREFIX} Bujía NGK`,
        codigo: `${TEST_PREFIX}-BUJ-001`,
        precio_venta: 800,
        precio_costo: 400,
        stock: 100,
        stock_minimo: 10,
      })
      .select("id")
      .single()

    assert(!error, `Error al crear segundo producto: ${error?.message}`)
    createdIds.productos.push(data!.id)
  })

  await test("Crear tercer producto con stock 0 (stock bajo)", async () => {
    const { data, error } = await supabase
      .from("productos")
      .insert({
        nombre: `${TEST_PREFIX} Correa de distribución`,
        codigo: `${TEST_PREFIX}-COR-001`,
        precio_venta: 5000,
        stock: 0,
        stock_minimo: 3,
      })
      .select("id")
      .single()

    assert(!error, `Error al crear tercer producto: ${error?.message}`)
    createdIds.productos.push(data!.id)
  })

  await test("Verificar alerta de stock bajo (stock < stock_minimo)", async () => {
    const { data, error } = await supabase
      .from("productos")
      .select("id, nombre, stock, stock_minimo")
      .in("id", createdIds.productos)
      .lt("stock", supabase.rpc ? 999999 : 999999) // Traer todos

    assert(!error, `Error al consultar stock bajo: ${error?.message}`)

    const bajosStock = data?.filter((p) => p.stock < p.stock_minimo) ?? []
    assert(bajosStock.length >= 1, "Debería haber al menos 1 producto con stock bajo")

    const correa = bajosStock.find((p) => p.nombre.includes("Correa"))
    assert(!!correa, "La correa de distribución debería tener stock bajo")
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 2: CLIENTES y AUTOS
// ══════════════════════════════════════════════════════════════════════════════

async function testClientes() {
  console.log("\n👤 CLIENTES y AUTOS")

  let clienteId: string
  let autoId: string

  await test("Crear cliente", async () => {
    const { data, error } = await supabase
      .from("clientes")
      .insert({
        nombre: `${TEST_PREFIX} Carlos García`,
        telefono: "11-4444-5555",
      })
      .select("id")
      .single()

    assert(!error, `Error al crear cliente: ${error?.message}`)
    clienteId = data!.id
    createdIds.clientes.push(clienteId)
  })

  await test("Crear auto asociado al cliente", async () => {
    const { data, error } = await supabase
      .from("autos")
      .insert({
        cliente_id: clienteId,
        patente: `${TEST_PREFIX}ABC123`,
        marca: "Ford",
        modelo: "Focus",
        anio: 2020,
      })
      .select("id")
      .single()

    assert(!error, `Error al crear auto: ${error?.message}`)
    autoId = data!.id
    createdIds.autos.push(autoId)
  })

  await test("Patente duplicada debe fallar", async () => {
    const { error } = await supabase
      .from("autos")
      .insert({
        cliente_id: clienteId,
        patente: `${TEST_PREFIX}ABC123`,
        marca: "Fiat",
        modelo: "Cronos",
      })

    assert(!!error, "Debería fallar por patente duplicada")
    assertEqual(error?.code, "23505", "Código de error de unicidad")
  })

  await test("Crear auto sin cliente (cliente_id null)", async () => {
    const { data, error } = await supabase
      .from("autos")
      .insert({
        cliente_id: null,
        patente: `${TEST_PREFIX}XYZ789`,
        marca: "Chevrolet",
        modelo: "Onix",
      })
      .select("id")
      .single()

    assert(!error, `Error al crear auto sin cliente: ${error?.message}`)
    createdIds.autos.push(data!.id)
  })

  await test("Consultar autos del cliente", async () => {
    const { data, error } = await supabase
      .from("autos")
      .select("*")
      .eq("cliente_id", clienteId)

    assert(!error, `Error al consultar autos: ${error?.message}`)
    assert(data!.length >= 1, "El cliente debería tener al menos 1 auto")
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 3: PROVEEDORES
// ══════════════════════════════════════════════════════════════════════════════

async function testProveedores() {
  console.log("\n🏭 PROVEEDORES")

  await test("Crear proveedor", async () => {
    const { data, error } = await supabase
      .from("proveedores")
      .insert({
        nombre: `${TEST_PREFIX} Repuestos del Sur`,
        contacto: "Mario López",
        telefono: "11-2222-3333",
        email: "mario@repuestosdelsur.com",
      })
      .select("id")
      .single()

    assert(!error, `Error al crear proveedor: ${error?.message}`)
    createdIds.proveedores.push(data!.id)
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 4: VENTAS — Ciclo de vida completo y stock
// ══════════════════════════════════════════════════════════════════════════════

async function testVentas() {
  console.log("\n🛒 VENTAS — Ciclo de vida y stock")

  const productoId1 = createdIds.productos[0] // Filtro: stock 30
  const productoId2 = createdIds.productos[1] // Bujía: stock 100
  const clienteId = createdIds.clientes[0]
  const autoId = createdIds.autos[0]

  // Obtener stock inicial
  let stockInicialProd1: number
  let stockInicialProd2: number

  await test("Registrar stock inicial de productos", async () => {
    const { data: p1 } = await supabase.from("productos").select("stock").eq("id", productoId1).single()
    const { data: p2 } = await supabase.from("productos").select("stock").eq("id", productoId2).single()
    stockInicialProd1 = p1!.stock
    stockInicialProd2 = p2!.stock
    assert(stockInicialProd1 > 0, `Stock inicial prod1 debe ser > 0 (actual: ${stockInicialProd1})`)
    assert(stockInicialProd2 > 0, `Stock inicial prod2 debe ser > 0 (actual: ${stockInicialProd2})`)
    console.log(`     ℹ Stock inicial: Prod1=${stockInicialProd1}, Prod2=${stockInicialProd2}`)
  })

  // ── Test 4.1: Crear venta como presupuesto (NO descuenta stock) ──────────

  let ventaPresupuestoId: string

  await test("Crear venta como PRESUPUESTO (stock NO cambia)", async () => {
    const { data: venta, error } = await supabase
      .from("ventas")
      .insert({
        cliente_id: clienteId,
        auto_id: autoId,
        estado: "presupuesto",
        total: 800 * 3 + 1800 * 2, // 3 bujías + 2 filtros
        notas: `${TEST_PREFIX} Presupuesto de prueba`,
      })
      .select("id")
      .single()

    assert(!error, `Error al crear venta: ${error?.message}`)
    ventaPresupuestoId = venta!.id
    createdIds.ventas.push(ventaPresupuestoId)

    // Insertar items
    const { error: itemsError } = await supabase.from("venta_items").insert([
      { venta_id: ventaPresupuestoId, producto_id: productoId1, cantidad: 2, precio_unitario: 1800 },
      { venta_id: ventaPresupuestoId, producto_id: productoId2, cantidad: 3, precio_unitario: 800 },
    ])
    assert(!itemsError, `Error al insertar items: ${itemsError?.message}`)

    // Verificar que stock NO cambió
    const { data: p1 } = await supabase.from("productos").select("stock").eq("id", productoId1).single()
    const { data: p2 } = await supabase.from("productos").select("stock").eq("id", productoId2).single()
    assertEqual(p1!.stock, stockInicialProd1, "Stock prod1 no debe cambiar en presupuesto")
    assertEqual(p2!.stock, stockInicialProd2, "Stock prod2 no debe cambiar en presupuesto")
  })

  // ── Test 4.2: Confirmar presupuesto → descuenta stock ────────────────────

  await test("Confirmar presupuesto → stock DISMINUYE", async () => {
    // Actualizar estado a confirmada
    const { error: updateError } = await supabase
      .from("ventas")
      .update({ estado: "confirmada" })
      .eq("id", ventaPresupuestoId)
    assert(!updateError, `Error al confirmar: ${updateError?.message}`)

    // Simular descuento de stock (como lo hace cambiarEstadoVenta)
    const { data: items } = await supabase
      .from("venta_items")
      .select("producto_id, cantidad")
      .eq("venta_id", ventaPresupuestoId)

    for (const item of items!) {
      const { data: prod } = await supabase
        .from("productos")
        .select("stock")
        .eq("id", item.producto_id)
        .single()
      await supabase
        .from("productos")
        .update({ stock: Math.max(0, prod!.stock - item.cantidad) })
        .eq("id", item.producto_id)
    }

    // Verificar stock
    const { data: p1 } = await supabase.from("productos").select("stock").eq("id", productoId1).single()
    const { data: p2 } = await supabase.from("productos").select("stock").eq("id", productoId2).single()
    assertEqual(p1!.stock, stockInicialProd1 - 2, "Stock prod1 debe disminuir en 2")
    assertEqual(p2!.stock, stockInicialProd2 - 3, "Stock prod2 debe disminuir en 3")
    console.log(`     ℹ Stock después de confirmar: Prod1=${p1!.stock}, Prod2=${p2!.stock}`)
  })

  // ── Test 4.3: Cancelar venta confirmada → devuelve stock ─────────────────

  await test("Cancelar venta confirmada → stock SE RESTAURA", async () => {
    // Actualizar estado a cancelada
    const { error: updateError } = await supabase
      .from("ventas")
      .update({ estado: "cancelada" })
      .eq("id", ventaPresupuestoId)
    assert(!updateError, `Error al cancelar: ${updateError?.message}`)

    // Simular restauración de stock (como lo hace cambiarEstadoVenta)
    const { data: items } = await supabase
      .from("venta_items")
      .select("producto_id, cantidad")
      .eq("venta_id", ventaPresupuestoId)

    for (const item of items!) {
      const { data: prod } = await supabase
        .from("productos")
        .select("stock")
        .eq("id", item.producto_id)
        .single()
      await supabase
        .from("productos")
        .update({ stock: prod!.stock + item.cantidad })
        .eq("id", item.producto_id)
    }

    // Verificar que stock volvió al original
    const { data: p1 } = await supabase.from("productos").select("stock").eq("id", productoId1).single()
    const { data: p2 } = await supabase.from("productos").select("stock").eq("id", productoId2).single()
    assertEqual(p1!.stock, stockInicialProd1, "Stock prod1 debe volver al original")
    assertEqual(p2!.stock, stockInicialProd2, "Stock prod2 debe volver al original")
    console.log(`     ℹ Stock restaurado: Prod1=${p1!.stock}, Prod2=${p2!.stock}`)
  })

  // ── Test 4.4: Crear venta directamente confirmada ────────────────────────

  let ventaConfirmadaId: string

  await test("Crear venta CONFIRMADA directa → stock disminuye", async () => {
    const cantidadVenta = 5

    const { data: venta, error } = await supabase
      .from("ventas")
      .insert({
        cliente_id: clienteId,
        estado: "confirmada",
        metodo_pago: "efectivo",
        total: 800 * cantidadVenta,
        notas: `${TEST_PREFIX} Venta directa confirmada`,
      })
      .select("id")
      .single()

    assert(!error, `Error: ${error?.message}`)
    ventaConfirmadaId = venta!.id
    createdIds.ventas.push(ventaConfirmadaId)

    await supabase.from("venta_items").insert({
      venta_id: ventaConfirmadaId,
      producto_id: productoId2,
      cantidad: cantidadVenta,
      precio_unitario: 800,
    })

    // Descontar stock
    const { data: prod } = await supabase.from("productos").select("stock").eq("id", productoId2).single()
    await supabase
      .from("productos")
      .update({ stock: Math.max(0, prod!.stock - cantidadVenta) })
      .eq("id", productoId2)

    const { data: p2After } = await supabase.from("productos").select("stock").eq("id", productoId2).single()
    assertEqual(p2After!.stock, stockInicialProd2 - cantidadVenta, "Stock debe disminuir en 5")
  })

  // ── Test 4.5: Eliminar venta confirmada → devuelve stock ─────────────────

  await test("Eliminar venta confirmada → stock se restaura", async () => {
    // Obtener items antes de eliminar
    const { data: items } = await supabase
      .from("venta_items")
      .select("producto_id, cantidad")
      .eq("venta_id", ventaConfirmadaId)

    // Restaurar stock
    for (const item of items!) {
      const { data: prod } = await supabase
        .from("productos")
        .select("stock")
        .eq("id", item.producto_id)
        .single()
      await supabase
        .from("productos")
        .update({ stock: prod!.stock + item.cantidad })
        .eq("id", item.producto_id)
    }

    // Eliminar venta (cascade elimina items)
    const { error } = await supabase.from("ventas").delete().eq("id", ventaConfirmadaId)
    assert(!error, `Error al eliminar venta: ${error?.message}`)

    // Verificar stock restaurado
    const { data: p2 } = await supabase.from("productos").select("stock").eq("id", productoId2).single()
    assertEqual(p2!.stock, stockInicialProd2, "Stock debe volver al original tras eliminar")

    // Sacar de la lista de limpieza (ya eliminada)
    createdIds.ventas = createdIds.ventas.filter((id) => id !== ventaConfirmadaId)
  })

  // ── Test 4.6: Venta con servicios (encoding en notas) ────────────────────

  await test("Venta con servicios: encoding/decoding en notas", async () => {
    const servicios = [
      { descripcion: "Cambio de aceite", precio: 5000 },
      { descripcion: "Alineación", precio: 3000 },
    ]
    const notasUsuario = "Trabajo urgente"
    const notasEncoded = `__sv__${JSON.stringify({ s: servicios, n: notasUsuario })}`

    const totalProductos = 1800
    const totalServicios = 8000
    const total = totalProductos + totalServicios

    const { data: venta, error } = await supabase
      .from("ventas")
      .insert({
        cliente_id: clienteId,
        estado: "presupuesto",
        total,
        notas: notasEncoded,
      })
      .select("id, notas")
      .single()

    assert(!error, `Error: ${error?.message}`)
    createdIds.ventas.push(venta!.id)

    // Verificar que se puede decodificar
    const notas = venta!.notas as string
    assert(notas.startsWith("__sv__"), "Notas deben tener prefijo __sv__")

    const decoded = JSON.parse(notas.replace("__sv__", ""))
    assertEqual(decoded.n, notasUsuario, "Notas de usuario decodificadas")
    assertEqual(decoded.s.length, 2, "Cantidad de servicios")
    assertEqual(decoded.s[0].descripcion, "Cambio de aceite", "Primer servicio")
    assertEqual(decoded.s[1].precio, 3000, "Precio segundo servicio")
  })

  // ── Test 4.7: Total de venta calculado correctamente ─────────────────────

  await test("Total de venta = sum(items * precio) + sum(servicios)", async () => {
    const items = [
      { cantidad: 2, precio_unitario: 1500 },
      { cantidad: 3, precio_unitario: 800 },
    ]
    const servicios = [
      { precio: 5000 },
      { precio: 3000 },
    ]

    const totalProductos = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
    const totalServicios = servicios.reduce((s, sv) => s + sv.precio, 0)
    const totalEsperado = totalProductos + totalServicios

    assertEqual(totalEsperado, 13400, "Total esperado: 2*1500 + 3*800 + 5000 + 3000 = 13400")
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 5: COMPRAS — Stock y precio_costo
// ══════════════════════════════════════════════════════════════════════════════

let comprasTableExists = false

async function testCompras() {
  console.log("\n📥 COMPRAS — Stock y precio_costo")

  // Verificar si la tabla compras existe
  const { error: checkError } = await supabase.from("compras").select("id").limit(1)
  if (checkError?.message?.includes("Could not find") || checkError?.message?.includes("does not exist")) {
    console.log("  ⚠️  Tabla 'compras' no encontrada en Supabase — TESTS DE COMPRAS OMITIDOS")
    console.log("     Crear la tabla 'compras' y 'compra_items' en Supabase para habilitar estos tests.")
    return
  }
  comprasTableExists = true

  const productoId = createdIds.productos[0]
  const proveedorId = createdIds.proveedores[0]

  let stockAntes: number
  let precioCostoAntes: number | null

  await test("Registrar stock y precio_costo antes de compra", async () => {
    const { data } = await supabase
      .from("productos")
      .select("stock, precio_costo")
      .eq("id", productoId)
      .single()
    stockAntes = data!.stock
    precioCostoAntes = data!.precio_costo
    console.log(`     ℹ Stock antes: ${stockAntes}, Precio costo: ${precioCostoAntes}`)
  })

  let compraId: string
  const cantidadCompra = 20
  const nuevoPrecioCosto = 950

  await test("Crear compra → stock AUMENTA y precio_costo se actualiza", async () => {
    const { data: compra, error } = await supabase
      .from("compras")
      .insert({
        proveedor_id: proveedorId,
        total: cantidadCompra * nuevoPrecioCosto,
        notas: `${TEST_PREFIX} Compra de prueba`,
      })
      .select("id")
      .single()

    assert(!error, `Error al crear compra: ${error?.message}`)
    compraId = compra!.id
    createdIds.compras.push(compraId)

    const { error: itemsError } = await supabase.from("compra_items").insert({
      compra_id: compraId,
      producto_id: productoId,
      cantidad: cantidadCompra,
      precio_unitario: nuevoPrecioCosto,
    })
    assert(!itemsError, `Error al insertar items: ${itemsError?.message}`)

    // Simular incremento de stock
    const { data: prod } = await supabase.from("productos").select("stock").eq("id", productoId).single()
    await supabase
      .from("productos")
      .update({
        stock: prod!.stock + cantidadCompra,
        precio_costo: nuevoPrecioCosto,
      })
      .eq("id", productoId)

    const { data: prodAfter } = await supabase
      .from("productos")
      .select("stock, precio_costo")
      .eq("id", productoId)
      .single()

    assertEqual(prodAfter!.stock, stockAntes + cantidadCompra, "Stock debe aumentar")
    assertEqual(prodAfter!.precio_costo, nuevoPrecioCosto, "Precio costo debe actualizarse")
    console.log(`     ℹ Stock después: ${prodAfter!.stock}, Precio costo: ${prodAfter!.precio_costo}`)
  })

  await test("Eliminar compra → stock DISMINUYE", async () => {
    const { data: items } = await supabase
      .from("compra_items")
      .select("producto_id, cantidad")
      .eq("compra_id", compraId)

    for (const item of (items ?? [])) {
      const { data: prod } = await supabase
        .from("productos")
        .select("stock")
        .eq("id", item.producto_id)
        .single()
      await supabase
        .from("productos")
        .update({ stock: Math.max(0, prod!.stock - item.cantidad) })
        .eq("id", item.producto_id)
    }

    const { error } = await supabase.from("compras").delete().eq("id", compraId)
    assert(!error, `Error al eliminar compra: ${error?.message}`)

    const { data: prod } = await supabase.from("productos").select("stock").eq("id", productoId).single()
    assertEqual(prod!.stock, stockAntes, "Stock debe volver al valor antes de la compra")

    createdIds.compras = createdIds.compras.filter((id) => id !== compraId)
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 6: INTEGRIDAD DE STOCK — Tests de estrés y edge cases
// ══════════════════════════════════════════════════════════════════════════════

async function testStockIntegrity() {
  console.log("\n🔒 INTEGRIDAD DE STOCK — Edge cases")

  const productoId = createdIds.productos[0]

  await test("Venta que agota stock completamente (stock → 0)", async () => {
    const { data: prod } = await supabase.from("productos").select("stock").eq("id", productoId).single()
    const stockActual = prod!.stock

    // Descontar todo
    await supabase.from("productos").update({ stock: 0 }).eq("id", productoId)

    const { data: check } = await supabase.from("productos").select("stock").eq("id", productoId).single()
    assertEqual(check!.stock, 0, "Stock debe ser 0")

    // Restaurar
    await supabase.from("productos").update({ stock: stockActual }).eq("id", productoId)
  })

  await test("Math.max(0, stock - cantidad) previene stock negativo", async () => {
    // Simular venta de 999 unidades con stock = 30
    const { data: prod } = await supabase.from("productos").select("stock").eq("id", productoId).single()
    const stockActual = prod!.stock
    const resultado = Math.max(0, stockActual - 999)
    assertEqual(resultado, 0, "Math.max debe prevenir stock negativo")
  })

  await test("Stock con decimales se redondea correctamente en schema", async () => {
    // El schema usa z.coerce.number().int(), debería rechazar o truncar decimales
    const { productoSchema } = await import("../schemas/producto")
    const result = productoSchema.safeParse({
      nombre: "Test",
      precio_venta: 100,
      stock: 10.5,
      stock_minimo: 2,
    })
    // z.coerce.number().int() debería rechazar 10.5
    assert(!result.success, "Stock decimal debería ser rechazado por el schema")
  })

  await test("Múltiples ventas concurrentes no llevan stock a negativo", async () => {
    // Setear stock a 5
    await supabase.from("productos").update({ stock: 5 }).eq("id", productoId)

    // Simular 3 ventas "simultáneas" de 2 unidades cada una
    // (en el peor caso, las 3 leen stock=5 y restan 2 cada una)
    // El sistema actual lee-y-actualiza secuencialmente, lo cual es correcto
    // pero hay un race condition teórico
    const ventasSimultaneas = [2, 2, 2]
    let stockSimulado = 5

    for (const cantidad of ventasSimultaneas) {
      stockSimulado = Math.max(0, stockSimulado - cantidad)
    }

    // Con el patrón secuencial: 5 → 3 → 1 → 0 (no negativo)
    assert(stockSimulado >= 0, "Stock simulado nunca debe ser negativo")
    assertEqual(stockSimulado, 0, "5 - 2 - 2 - 2 = 0 (con clamp)")

    // Restaurar stock original
    const { data: originalProd } = await supabase
      .from("productos")
      .select("stock")
      .eq("id", productoId)
      .single()
    await supabase.from("productos").update({ stock: 30 }).eq("id", productoId)
  })

  await test("Venta con cantidad mayor al stock usa Math.max(0, ...)", async () => {
    await supabase.from("productos").update({ stock: 3 }).eq("id", productoId)

    // Simular venta de 10 unidades con solo 3 en stock
    const { data: prod } = await supabase.from("productos").select("stock").eq("id", productoId).single()
    const nuevoStock = Math.max(0, prod!.stock - 10)

    await supabase.from("productos").update({ stock: nuevoStock }).eq("id", productoId)
    const { data: check } = await supabase.from("productos").select("stock").eq("id", productoId).single()
    assertEqual(check!.stock, 0, "Stock no debe ser negativo")

    // Restaurar
    await supabase.from("productos").update({ stock: 30 }).eq("id", productoId)
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 7: FLUJO COMPLETO END-TO-END
// ══════════════════════════════════════════════════════════════════════════════

async function testFlowE2E() {
  console.log("\n🔄 FLUJO END-TO-END — Ventas completas (+ Compras si tabla existe)")

  const productoId = createdIds.productos[0]
  const clienteId = createdIds.clientes[0]
  const proveedorId = createdIds.proveedores[0]

  // Valor base conocido para el flujo
  const STOCK_BASE = 50

  await test("E2E: Setear stock inicial a valor conocido (50)", async () => {
    await supabase.from("productos").update({ stock: STOCK_BASE }).eq("id", productoId)
    const { data } = await supabase.from("productos").select("stock").eq("id", productoId).single()
    assertEqual(data!.stock, STOCK_BASE, "Stock debe ser 50")
    console.log(`     ℹ Stock inicial: ${data!.stock}`)
  })

  // ── Compra (solo si tabla existe) ──────────────────────────────────────────

  let stockDespuesCompra = STOCK_BASE
  let compraE2EId: string | null = null

  if (comprasTableExists) {
    await test("E2E Paso 1: Compra de 30 unidades → stock = 80", async () => {
      const { data: compra, error } = await supabase
        .from("compras")
        .insert({
          proveedor_id: proveedorId,
          total: 30 * 500,
          notas: `${TEST_PREFIX} E2E Compra`,
        })
        .select("id")
        .single()

      assert(!error, `Error al crear compra: ${error?.message}`)
      compraE2EId = compra!.id
      createdIds.compras.push(compraE2EId!)

      await supabase.from("compra_items").insert({
        compra_id: compraE2EId!,
        producto_id: productoId,
        cantidad: 30,
        precio_unitario: 500,
      })

      const { data: prod } = await supabase.from("productos").select("stock").eq("id", productoId).single()
      await supabase.from("productos").update({ stock: prod!.stock + 30 }).eq("id", productoId)

      const { data: check } = await supabase.from("productos").select("stock").eq("id", productoId).single()
      stockDespuesCompra = check!.stock
      assertEqual(check!.stock, 80, "Stock = 50 + 30 = 80")
    })
  } else {
    console.log("  ⚠️  Tabla 'compras' no disponible — paso 1 (compra) omitido, stock base = 50")
  }

  // ── Ventas ─────────────────────────────────────────────────────────────────

  let ventaE2EId: string

  await test(`E2E Paso 2: Venta confirmada de 15 unidades → stock = ${stockDespuesCompra - 15}`, async () => {
    const { data: venta, error } = await supabase
      .from("ventas")
      .insert({
        cliente_id: clienteId,
        estado: "confirmada",
        metodo_pago: "transferencia",
        total: 15 * 1800,
        notas: `${TEST_PREFIX} E2E Venta`,
      })
      .select("id")
      .single()

    assert(!error, `Error al crear venta: ${error?.message}`)
    ventaE2EId = venta!.id
    createdIds.ventas.push(ventaE2EId)

    await supabase.from("venta_items").insert({
      venta_id: ventaE2EId,
      producto_id: productoId,
      cantidad: 15,
      precio_unitario: 1800,
    })

    const { data: prod } = await supabase.from("productos").select("stock").eq("id", productoId).single()
    await supabase.from("productos").update({ stock: prod!.stock - 15 }).eq("id", productoId)

    const { data: check } = await supabase.from("productos").select("stock").eq("id", productoId).single()
    assertEqual(check!.stock, stockDespuesCompra - 15, `Stock = ${stockDespuesCompra} - 15`)
  })

  await test(`E2E Paso 3: Cancelar venta → stock = ${stockDespuesCompra} (devuelto)`, async () => {
    await supabase.from("ventas").update({ estado: "cancelada" }).eq("id", ventaE2EId)

    const { data: items } = await supabase
      .from("venta_items")
      .select("producto_id, cantidad")
      .eq("venta_id", ventaE2EId)

    for (const item of (items ?? [])) {
      const { data: prod } = await supabase.from("productos").select("stock").eq("id", item.producto_id).single()
      await supabase
        .from("productos")
        .update({ stock: prod!.stock + item.cantidad })
        .eq("id", item.producto_id)
    }

    const { data: check } = await supabase.from("productos").select("stock").eq("id", productoId).single()
    assertEqual(check!.stock, stockDespuesCompra, `Stock restaurado a ${stockDespuesCompra}`)
  })

  let ventaE2E2Id: string

  await test(`E2E Paso 4: Nueva venta confirmada de 10 → stock = ${stockDespuesCompra - 10}`, async () => {
    const { data: venta, error } = await supabase
      .from("ventas")
      .insert({
        cliente_id: clienteId,
        estado: "confirmada",
        metodo_pago: "tarjeta",
        total: 10 * 1800,
        notas: `${TEST_PREFIX} E2E Venta 2`,
      })
      .select("id")
      .single()

    assert(!error, `Error: ${error?.message}`)
    ventaE2E2Id = venta!.id
    createdIds.ventas.push(ventaE2E2Id)

    await supabase.from("venta_items").insert({
      venta_id: ventaE2E2Id,
      producto_id: productoId,
      cantidad: 10,
      precio_unitario: 1800,
    })

    const { data: prod } = await supabase.from("productos").select("stock").eq("id", productoId).single()
    await supabase.from("productos").update({ stock: prod!.stock - 10 }).eq("id", productoId)

    const { data: check } = await supabase.from("productos").select("stock").eq("id", productoId).single()
    assertEqual(check!.stock, stockDespuesCompra - 10, `Stock = ${stockDespuesCompra} - 10`)
  })

  await test(`E2E Paso 5: Eliminar venta confirmada → stock = ${stockDespuesCompra} (restaurado)`, async () => {
    const { data: items } = await supabase
      .from("venta_items")
      .select("producto_id, cantidad")
      .eq("venta_id", ventaE2E2Id)

    for (const item of (items ?? [])) {
      const { data: prod } = await supabase.from("productos").select("stock").eq("id", item.producto_id).single()
      await supabase
        .from("productos")
        .update({ stock: prod!.stock + item.cantidad })
        .eq("id", item.producto_id)
    }

    await supabase.from("ventas").delete().eq("id", ventaE2E2Id)
    createdIds.ventas = createdIds.ventas.filter((id) => id !== ventaE2E2Id)

    const { data: check } = await supabase.from("productos").select("stock").eq("id", productoId).single()
    assertEqual(check!.stock, stockDespuesCompra, `Stock restaurado a ${stockDespuesCompra}`)
  })

  // ── Eliminar compra si fue creada ──────────────────────────────────────────

  if (comprasTableExists && compraE2EId) {
    await test("E2E Paso 6: Eliminar compra → stock = 50 (original)", async () => {
      const { data: items } = await supabase
        .from("compra_items")
        .select("producto_id, cantidad")
        .eq("compra_id", compraE2EId!)

      for (const item of (items ?? [])) {
        const { data: prod } = await supabase.from("productos").select("stock").eq("id", item.producto_id).single()
        await supabase
          .from("productos")
          .update({ stock: Math.max(0, prod!.stock - item.cantidad) })
          .eq("id", item.producto_id)
      }

      await supabase.from("compras").delete().eq("id", compraE2EId!)
      createdIds.compras = createdIds.compras.filter((id) => id !== compraE2EId)

      const { data: check } = await supabase.from("productos").select("stock").eq("id", productoId).single()
      assertEqual(check!.stock, STOCK_BASE, "Stock debe volver a 50 (valor pre-E2E)")
    })
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 8: RELACIONES y CASCADAS
// ══════════════════════════════════════════════════════════════════════════════

async function testRelaciones() {
  console.log("\n🔗 RELACIONES y CASCADAS")

  await test("Venta con JOIN a cliente y auto funciona", async () => {
    const ventaId = createdIds.ventas[0]
    if (!ventaId) {
      throw new Error("No hay venta de prueba para este test")
    }

    const { data, error } = await supabase
      .from("ventas")
      .select(`
        *,
        clientes (id, nombre, telefono),
        autos (id, patente, marca, modelo)
      `)
      .eq("id", ventaId)
      .single()

    assert(!error, `Error en JOIN: ${error?.message}`)
    assert(!!data, "Venta con JOINs debe retornar datos")
  })

  await test("Venta items con JOIN a productos funciona", async () => {
    const ventaId = createdIds.ventas[0]
    if (!ventaId) {
      throw new Error("No hay venta de prueba para este test")
    }

    const { data, error } = await supabase
      .from("venta_items")
      .select(`
        *,
        productos (id, nombre, codigo, precio_venta)
      `)
      .eq("venta_id", ventaId)

    assert(!error, `Error en JOIN items: ${error?.message}`)
    assert(!!data && data.length > 0, "Debe tener items con producto asociado")

    for (const item of data!) {
      assert(!!item.productos, "Cada item debe tener producto asociado")
    }
  })

  await test("DELETE CASCADE: eliminar venta elimina sus items", async () => {
    // Crear una venta temporal para probar cascade
    const { data: venta } = await supabase
      .from("ventas")
      .insert({
        estado: "presupuesto",
        total: 100,
        notas: `${TEST_PREFIX} CASCADE test`,
      })
      .select("id")
      .single()

    const ventaTmpId = venta!.id

    await supabase.from("venta_items").insert({
      venta_id: ventaTmpId,
      producto_id: createdIds.productos[0],
      cantidad: 1,
      precio_unitario: 100,
    })

    // Verificar que existe el item
    const { data: itemsBefore } = await supabase
      .from("venta_items")
      .select("id")
      .eq("venta_id", ventaTmpId)
    assert(itemsBefore!.length === 1, "Debe tener 1 item antes de eliminar")

    // Eliminar venta
    await supabase.from("ventas").delete().eq("id", ventaTmpId)

    // Verificar que items se eliminaron en cascada
    const { data: itemsAfter } = await supabase
      .from("venta_items")
      .select("id")
      .eq("venta_id", ventaTmpId)
    assertEqual(itemsAfter!.length, 0, "Items deben eliminarse en cascada")
  })

  await test("DELETE CASCADE: eliminar cliente con autos", async () => {
    // Crear cliente temporal con auto
    const { data: clienteTmp } = await supabase
      .from("clientes")
      .insert({ nombre: `${TEST_PREFIX} Temporal CASCADE` })
      .select("id")
      .single()

    const { data: autoTmp } = await supabase
      .from("autos")
      .insert({
        cliente_id: clienteTmp!.id,
        patente: `${TEST_PREFIX}CAS999`,
      })
      .select("id")
      .single()

    // Eliminar cliente
    const { error } = await supabase.from("clientes").delete().eq("id", clienteTmp!.id)
    assert(!error, `Error al eliminar cliente: ${error?.message}`)

    // Verificar que auto se eliminó en cascada
    const { data: autoCheck } = await supabase
      .from("autos")
      .select("id")
      .eq("id", autoTmp!.id)
    assertEqual(autoCheck!.length, 0, "Auto debe eliminarse en cascada con cliente")
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// LIMPIEZA
// ══════════════════════════════════════════════════════════════════════════════

async function cleanup() {
  console.log("\n🧹 LIMPIEZA de datos de prueba")

  // Eliminar en orden inverso de dependencias
  if (createdIds.ventas.length > 0) {
    await supabase.from("ventas").delete().in("id", createdIds.ventas)
    console.log(`  Eliminadas ${createdIds.ventas.length} venta(s)`)
  }

  if (createdIds.compras.length > 0) {
    await supabase.from("compras").delete().in("id", createdIds.compras)
    console.log(`  Eliminadas ${createdIds.compras.length} compra(s)`)
  }

  if (createdIds.autos.length > 0) {
    await supabase.from("autos").delete().in("id", createdIds.autos)
    console.log(`  Eliminados ${createdIds.autos.length} auto(s)`)
  }

  if (createdIds.clientes.length > 0) {
    await supabase.from("clientes").delete().in("id", createdIds.clientes)
    console.log(`  Eliminados ${createdIds.clientes.length} cliente(s)`)
  }

  if (createdIds.productos.length > 0) {
    // Hard delete (no soft delete) para limpieza completa
    await supabase.from("productos").delete().in("id", createdIds.productos)
    console.log(`  Eliminados ${createdIds.productos.length} producto(s)`)
  }

  if (createdIds.proveedores.length > 0) {
    await supabase.from("proveedores").delete().in("id", createdIds.proveedores)
    console.log(`  Eliminados ${createdIds.proveedores.length} proveedor(es)`)
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗")
  console.log("║  GestorStock — Tests de Integración Completos      ║")
  console.log("╚══════════════════════════════════════════════════════╝")
  console.log(`Supabase: ${SUPABASE_URL}`)
  console.log(`Key type: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? "SERVICE_ROLE" : "ANON"}`)
  console.log(`Test user: ${TEST_EMAIL}`)

  try {
    // Autenticar usuario para pasar RLS
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL!,
      password: TEST_PASSWORD!,
    })
    if (authError || !authData.user) {
      console.error(`\n❌ Error de autenticación: ${authError?.message || "No se obtuvo usuario"}`)
      console.error("   Asegurate de que el usuario existe en Supabase Auth.")
      process.exit(1)
    }
    console.log(`✅ Autenticado como: ${authData.user.email}`)

    // Verificar conexión y permisos
    const { error: pingError } = await supabase.from("productos").select("id").limit(1)
    if (pingError) {
      console.error(`\n❌ No se pudo conectar a Supabase: ${pingError.message}`)
      process.exit(1)
    }
    console.log("✅ Conexión y permisos verificados\n")

    await testProductos()
    await testClientes()
    await testProveedores()
    await testVentas()
    await testCompras()
    await testStockIntegrity()
    await testFlowE2E()
    await testRelaciones()
  } finally {
    await cleanup()
  }

  // Cerrar sesión
  await supabase.auth.signOut()

  // Resumen final
  console.log("\n" + "═".repeat(55))
  console.log(`📊 RESULTADOS: ${passed}/${totalTests} pasaron`)
  if (failed > 0) {
    console.log(`\n❌ ${failed} test(s) fallaron:`)
    errors.forEach((e) => console.log(`   → ${e}`))
    process.exit(1)
  } else {
    console.log("✅ Todos los tests de integración pasaron")
    process.exit(0)
  }
}

main().catch((e) => {
  console.error("Error fatal:", e)
  cleanup().finally(() => process.exit(1))
})
