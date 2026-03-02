/**
 * Migración: Crear tablas compras y compra_items
 * Ejecutar: npx tsx tests/migrate-compras.ts <db_password>
 */

import postgres from "postgres"

const projectRef = "lvhdyvlqaqzdbixnwixq"
const dbPassword = process.argv[2] || process.env.SUPABASE_DB_PASSWORD

if (!dbPassword) {
  console.error("❌ Uso: npx tsx tests/migrate-compras.ts <db_password>")
  process.exit(1)
}

const MIGRATION_SQL = `-- SQL para ejecutar manualmente en Supabase Studio si falla la conexión --`

const regions = ["us-east-1", "us-east-2", "us-west-1", "eu-west-1", "eu-central-1", "sa-east-1", "ap-southeast-1", "ap-northeast-1"]

async function findConnection(): Promise<ReturnType<typeof postgres>> {
  // Probar pooler en diferentes regiones
  for (const region of regions) {
    const url = `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-${region}.pooler.supabase.com:6543/postgres`
    const candidate = postgres(url, { ssl: "require", connect_timeout: 5, idle_timeout: 3, max: 1 })
    try {
      await candidate`SELECT 1`
      console.log(`✅ Conectado via pooler (región: ${region})`)
      return candidate
    } catch {
      await candidate.end().catch(() => {})
    }
  }

  // Probar conexión directa
  const directUrl = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`
  const direct = postgres(directUrl, { ssl: "require", connect_timeout: 10, idle_timeout: 3, max: 1 })
  try {
    await direct`SELECT 1`
    console.log("✅ Conectado via conexión directa")
    return direct
  } catch {
    await direct.end().catch(() => {})
  }

  throw new Error("No se pudo conectar a PostgreSQL")
}

async function main() {
  console.log("🔧 Migración: compras + compra_items\n")
  console.log("Buscando conexión a PostgreSQL...")

  let sql: ReturnType<typeof postgres>
  try {
    sql = await findConnection()
  } catch {
    console.error("\n❌ No se pudo conectar a PostgreSQL en ninguna región.")
    console.error("   Verificá que la contraseña de la base de datos sea correcta.")
    console.error("\n📋 Copiá y pegá este SQL en Supabase Studio > SQL Editor:\n")
    const { readFileSync } = await import("fs")
    const { resolve } = await import("path")
    console.log(readFileSync(resolve(__dirname, "migration.sql"), "utf-8"))
    process.exit(1)
  }

  try {
    // Crear tabla compras
    await sql`
      CREATE TABLE IF NOT EXISTS compras (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        proveedor_id uuid REFERENCES proveedores(id),
        fecha timestamptz DEFAULT now(),
        total numeric NOT NULL DEFAULT 0,
        notas text,
        created_at timestamptz DEFAULT now()
      )
    `
    console.log("✅ Tabla 'compras' creada/verificada")

    // Crear tabla compra_items
    await sql`
      CREATE TABLE IF NOT EXISTS compra_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        compra_id uuid REFERENCES compras(id) ON DELETE CASCADE,
        producto_id uuid REFERENCES productos(id),
        cantidad integer NOT NULL,
        precio_unitario numeric NOT NULL
      )
    `
    console.log("✅ Tabla 'compra_items' creada/verificada")

    // Habilitar RLS
    await sql`ALTER TABLE compras ENABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE compra_items ENABLE ROW LEVEL SECURITY`
    console.log("✅ RLS habilitado")

    // Políticas para compras
    const comprasPolicies = await sql`SELECT policyname FROM pg_policies WHERE tablename = 'compras'`
    const existingCompras = new Set(comprasPolicies.map((p) => p.policyname))

    if (!existingCompras.has("compras_select_auth"))
      await sql`CREATE POLICY compras_select_auth ON compras FOR SELECT TO authenticated USING (true)`
    if (!existingCompras.has("compras_insert_auth"))
      await sql`CREATE POLICY compras_insert_auth ON compras FOR INSERT TO authenticated WITH CHECK (true)`
    if (!existingCompras.has("compras_update_auth"))
      await sql`CREATE POLICY compras_update_auth ON compras FOR UPDATE TO authenticated USING (true) WITH CHECK (true)`
    if (!existingCompras.has("compras_delete_auth"))
      await sql`CREATE POLICY compras_delete_auth ON compras FOR DELETE TO authenticated USING (true)`
    console.log("✅ Políticas RLS para 'compras' configuradas")

    // Políticas para compra_items
    const itemsPolicies = await sql`SELECT policyname FROM pg_policies WHERE tablename = 'compra_items'`
    const existingItems = new Set(itemsPolicies.map((p) => p.policyname))

    if (!existingItems.has("compra_items_select_auth"))
      await sql`CREATE POLICY compra_items_select_auth ON compra_items FOR SELECT TO authenticated USING (true)`
    if (!existingItems.has("compra_items_insert_auth"))
      await sql`CREATE POLICY compra_items_insert_auth ON compra_items FOR INSERT TO authenticated WITH CHECK (true)`
    if (!existingItems.has("compra_items_update_auth"))
      await sql`CREATE POLICY compra_items_update_auth ON compra_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true)`
    if (!existingItems.has("compra_items_delete_auth"))
      await sql`CREATE POLICY compra_items_delete_auth ON compra_items FOR DELETE TO authenticated USING (true)`
    console.log("✅ Políticas RLS para 'compra_items' configuradas")

    console.log("\n✅ Migración completada exitosamente")
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`\n❌ Error durante migración: ${msg}`)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main()
