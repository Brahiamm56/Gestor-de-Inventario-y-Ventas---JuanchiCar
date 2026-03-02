-- Migración: Crear tablas compras y compra_items
-- Proyecto: GestorStock

-- Crear tabla compras si no existe
CREATE TABLE IF NOT EXISTS compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id uuid REFERENCES proveedores(id),
  fecha timestamptz DEFAULT now(),
  total numeric NOT NULL DEFAULT 0,
  notas text,
  created_at timestamptz DEFAULT now()
);

-- Crear tabla compra_items si no existe
CREATE TABLE IF NOT EXISTS compra_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid REFERENCES compras(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES productos(id),
  cantidad integer NOT NULL,
  precio_unitario numeric NOT NULL
);

-- Habilitar RLS
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE compra_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para compras (acceso completo para usuarios autenticados)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compras' AND policyname = 'compras_select_auth') THEN
    CREATE POLICY compras_select_auth ON compras FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compras' AND policyname = 'compras_insert_auth') THEN
    CREATE POLICY compras_insert_auth ON compras FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compras' AND policyname = 'compras_update_auth') THEN
    CREATE POLICY compras_update_auth ON compras FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compras' AND policyname = 'compras_delete_auth') THEN
    CREATE POLICY compras_delete_auth ON compras FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- Políticas RLS para compra_items
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compra_items' AND policyname = 'compra_items_select_auth') THEN
    CREATE POLICY compra_items_select_auth ON compra_items FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compra_items' AND policyname = 'compra_items_insert_auth') THEN
    CREATE POLICY compra_items_insert_auth ON compra_items FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compra_items' AND policyname = 'compra_items_update_auth') THEN
    CREATE POLICY compra_items_update_auth ON compra_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compra_items' AND policyname = 'compra_items_delete_auth') THEN
    CREATE POLICY compra_items_delete_auth ON compra_items FOR DELETE TO authenticated USING (true);
  END IF;
END $$;
