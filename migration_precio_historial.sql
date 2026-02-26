-- migration_precio_historial.sql

-- 1. Crear tabla para el historial de precios
CREATE TABLE public.precio_historial (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  producto_id uuid NOT NULL,
  precio_costo numeric(12, 2) NOT NULL,
  precio_venta numeric(12, 2) NOT NULL,
  fecha timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT precio_historial_pkey PRIMARY KEY (id),
  CONSTRAINT precio_historial_producto_id_fkey FOREIGN KEY (producto_id)
    REFERENCES public.productos (id)
    ON DELETE CASCADE
);

-- 2. Habilitar RLS en la tabla
ALTER TABLE public.precio_historial ENABLE ROW LEVEL SECURITY;

-- 3. Crear política para permitir acceso a autenticados en precio_historial
CREATE POLICY "Permitir todo a autenticados en precio_historial"
  ON public.precio_historial
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Crear un trigger para registrar automáticamente los cambios de precio
CREATE OR REPLACE FUNCTION public.registrar_cambio_precio()
RETURNS trigger AS $$
BEGIN
  IF (OLD.precio_venta IS DISTINCT FROM NEW.precio_venta) OR
     (OLD.precio_costo IS DISTINCT FROM NEW.precio_costo) THEN
    INSERT INTO public.precio_historial (producto_id, precio_costo, precio_venta)
    VALUES (NEW.id, COALESCE(NEW.precio_costo, 0), NEW.precio_venta);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_registrar_cambio_precio
AFTER UPDATE OF precio_venta, precio_costo ON public.productos
FOR EACH ROW
EXECUTE FUNCTION public.registrar_cambio_precio();

-- 5. Registrar los precios iniciales para los productos que ya existen
INSERT INTO public.precio_historial (producto_id, precio_costo, precio_venta)
SELECT id, COALESCE(precio_costo, 0), precio_venta
FROM public.productos;
