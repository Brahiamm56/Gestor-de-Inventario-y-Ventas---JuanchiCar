# CLAUDE.md — Gestor de Stock para Taller Mecánico

## 📌 Descripción del Proyecto

Aplicación web de gestión integral para un taller mecánico que vende repuestos.
Permite controlar el inventario, registrar ventas, gestionar clientes con historial
por vehículo, y administrar proveedores y compras.

**Usuario final:** Dueño/encargado del taller (usuario único, sin roles múltiples).

---

## 🧱 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 — App Router |
| Lenguaje | TypeScript (strict mode) |
| Estilos | Tailwind CSS + shadcn/ui |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Formularios | React Hook Form + Zod |
| Estado global | Zustand |
| Gráficos | Recharts |
| Deploy | Vercel |

---

## 📁 Estructura del Proyecto

```
/app
  /auth
    /login          → Pantalla de inicio de sesión
  /(dashboard)
    /dashboard      → Resumen general con métricas
    /stock          → Inventario de repuestos
    /ventas         → Ventas y presupuestos
    /clientes       → Clientes + historial por auto
    /proveedores    → Compras y proveedores
/components
  /ui               → Componentes shadcn/ui (no modificar)
  /shared           → Componentes reutilizables del proyecto
  /layout           → Sidebar, Navbar, etc.
/lib
  /supabase.ts      → Cliente de Supabase
  /utils.ts         → Utilidades generales
/types
  /index.ts         → Todos los tipos e interfaces TypeScript
/hooks              → Custom hooks reutilizables
/store              → Zustand stores
/schemas            → Esquemas Zod de validación
```

---

## 🗄️ Esquema de Base de Datos (Supabase)

```sql
-- Productos / Repuestos
productos (
  id uuid PRIMARY KEY,
  nombre text NOT NULL,
  categoria text,
  codigo text UNIQUE,
  precio_venta numeric NOT NULL,
  precio_costo numeric,
  stock integer NOT NULL DEFAULT 0,
  stock_minimo integer DEFAULT 5,
  proveedor_id uuid REFERENCES proveedores(id),
  created_at timestamptz DEFAULT now()
)

-- Clientes
clientes (
  id uuid PRIMARY KEY,
  nombre text NOT NULL,
  telefono text,
  email text,
  created_at timestamptz DEFAULT now()
)

-- Autos por cliente
autos (
  id uuid PRIMARY KEY,
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE,
  patente text UNIQUE NOT NULL,
  marca text,
  modelo text,
  anio integer,
  created_at timestamptz DEFAULT now()
)

-- Ventas / Presupuestos
ventas (
  id uuid PRIMARY KEY,
  cliente_id uuid REFERENCES clientes(id),
  auto_id uuid REFERENCES autos(id),
  fecha timestamptz DEFAULT now(),
  total numeric NOT NULL DEFAULT 0,
  estado text CHECK (estado IN ('presupuesto','confirmada','cancelada')),
  notas text,
  created_at timestamptz DEFAULT now()
)

-- Items de cada venta
venta_items (
  id uuid PRIMARY KEY,
  venta_id uuid REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES productos(id),
  cantidad integer NOT NULL,
  precio_unitario numeric NOT NULL
)

-- Proveedores
proveedores (
  id uuid PRIMARY KEY,
  nombre text NOT NULL,
  contacto text,
  telefono text,
  email text,
  created_at timestamptz DEFAULT now()
)

-- Compras a proveedores
compras (
  id uuid PRIMARY KEY,
  proveedor_id uuid REFERENCES proveedores(id),
  fecha timestamptz DEFAULT now(),
  total numeric NOT NULL DEFAULT 0,
  notas text,
  created_at timestamptz DEFAULT now()
)

-- Items de cada compra
compra_items (
  id uuid PRIMARY KEY,
  compra_id uuid REFERENCES compras(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES productos(id),
  cantidad integer NOT NULL,
  precio_unitario numeric NOT NULL
)
```

---

## 🎨 Sistema de Diseño

**Estilo:** Light, limpio y minimalista — inspirado en Linear/Notion.

### Paleta de colores
```
Background:    #FFFFFF / #F9FAFB (gray-50)
Surface:       #FFFFFF con border gray-200
Text primary:  #111827 (gray-900)
Text secondary:#6B7280 (gray-500)
Accent:        #2563EB (blue-600) ← color principal de acciones
Danger:        #EF4444 (red-500)
Success:       #22C55E (green-500)
Warning:       #F59E0B (amber-500)
```

### Tipografía
- Font: `Inter` (via next/font)
- Tamaños: escala estándar de Tailwind

### Componentes base (shadcn/ui)
Siempre usar los componentes de shadcn/ui como base:
`Button`, `Input`, `Card`, `Table`, `Dialog`, `Badge`, `Select`, `Form`, etc.

### Reglas de diseño
- Bordes redondeados: `rounded-lg` como mínimo
- Sombras: solo `shadow-sm` — nunca sombras pesadas
- Espaciado generoso entre secciones
- Iconos: `lucide-react` exclusivamente
- No usar colores de fondo saturados en cards — solo grises muy suaves
- Tablas con hover sutil: `hover:bg-gray-50`

---

## 🏗️ Reglas de Arquitectura

### Componentes
- **Server Components por defecto** — usar `"use client"` solo cuando sea necesario (interactividad, hooks)
- Un componente = una responsabilidad
- Props siempre tipadas con TypeScript (nunca `any`)
- Nombres en PascalCase para componentes, camelCase para funciones/variables

### Data Fetching
- Datos en Server Components con `async/await` directamente
- Mutaciones con **Server Actions** de Next.js 14
- Nunca llamar a Supabase desde el cliente directamente en producción
- Usar el cliente de Supabase server-side: `createServerClient` de `@supabase/ssr`

### Formularios
- Siempre React Hook Form + Zod
- Schema de validación definido en `/schemas/`
- Mensajes de error en español

### Estado
- Estado local con `useState`/`useReducer`
- Estado global (ej: notificaciones, user) con Zustand
- No usar Context API salvo para el theme

### Manejo de errores
- Siempre manejar errores de Supabase con try/catch
- Mostrar toasts para feedback de acciones (éxito/error)
- Loading states en todos los botones de acción

---

## 🔐 Autenticación

- Supabase Auth con email + password
- Ruta protegida mediante middleware de Next.js (`middleware.ts`)
- Si no hay sesión → redirigir a `/auth/login`
- Si hay sesión en `/auth/login` → redirigir a `/dashboard`
- No implementar registro público (usuario único, se crea desde Supabase Studio)

---

## 📋 Reglas Generales del Agente

1. **Siempre TypeScript strict** — sin `any`, sin `@ts-ignore`
2. **Siempre en español** — labels, mensajes, placeholders, toasts
3. **Siempre shadcn/ui** para componentes UI base — no reinventar la rueda
4. **Siempre lucide-react** para iconos — nunca otros paquetes de iconos
5. **Mobile-first** — aunque sea web, el responsive es obligatorio
6. **No hardcodear datos** — todo viene de Supabase
7. **Comentarios en español** en lógica compleja
8. **Consistencia visual** — respetar la paleta y el sistema de diseño definido
9. **Accesibilidad básica** — labels en inputs, aria donde corresponda
10. **Performance** — preferir Server Components, evitar re-renders innecesarios

---

## 🚀 Orden de Implementación

- [x] Definición del proyecto y stack
- [ ] **Login** — pantalla de auth con Supabase
- [ ] Layout principal — sidebar + navbar
- [ ] Dashboard — métricas y resumen
- [ ] Stock — CRUD de productos + alertas
- [ ] Ventas — registro y historial
- [ ] Clientes — ficha + autos
- [ ] Proveedores — compras

---

## 🔧 Variables de Entorno Requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

*Este archivo debe estar en la raíz del proyecto y mantenerse actualizado
a medida que el proyecto evoluciona.*