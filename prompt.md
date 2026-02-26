# PROMPT — Implementación Login + Dashboard
## Gestor de Stock — Taller Mecánico

> Pegá este prompt completo en Claude Code. Lee el CLAUDE.md del proyecto antes de empezar.

---

## 🎯 CONTEXTO

Estás implementando el Login y el Dashboard de un gestor de stock para un taller mecánico.
Lee el archivo `CLAUDE.md` de la raíz del proyecto antes de escribir una sola línea de código.
Respetá absolutamente todas las reglas definidas ahí.

---

## 📦 DEPENDENCIAS REQUERIDAS

Antes de codear, verificá que estén instaladas. Si no, instalálas:

```bash
npx shadcn@latest init
npx shadcn@latest add button input card badge separator skeleton
npm install @supabase/ssr @supabase/supabase-js
npm install react-hook-form @hookform/resolvers zod
npm install recharts
npm install lucide-react
npm install zustand
npm install next/font
```

---

## 🔐 PARTE 1 — LOGIN (`/app/auth/login/page.tsx`)

### Objetivo
Pantalla de inicio de sesión. Un solo usuario, sin registro público. Solo email + password.

### Diseño EXACTO que debe tener

**Layout:** Pantalla dividida en DOS columnas en desktop (50/50). En mobile, solo la columna del formulario.

**Columna izquierda — Branding:**
- Fondo: `#1E3A5F` (azul oscuro profundo) con un patrón SVG sutil de engranajes/herramientas superpuesto en opacity 0.05
- Logo del taller centrado: ícono `Wrench` de lucide-react tamaño 48px en blanco + nombre del taller en fuente `DM Sans` (importar via next/font/google), bold, blanco, tamaño 2xl
- Debajo del logo: texto tagline "Control total de tu taller, en un solo lugar" en blanco con opacity 0.7, tamaño sm
- En la parte inferior izquierda: 3 bullet points con íconos pequeños en color `#60A5FA` listando: "Inventario en tiempo real", "Registro de ventas", "Historial de clientes"
- Animación de entrada: fade-in + slide desde la izquierda con CSS `@keyframes`, duration 0.6s ease-out

**Columna derecha — Formulario:**
- Fondo: `#F8FAFC` (blanco ligeramente azulado, NO puro blanco)
- Perfectamente centrado vertical y horizontalmente
- Card del formulario: fondo blanco `#FFFFFF`, border `1px solid #E2E8F0`, border-radius `16px`, padding `40px`, shadow `0 4px 24px rgba(0,0,0,0.06)`
- Título: "Bienvenido" en `DM Sans` bold, tamaño 2xl, color `#0F172A`
- Subtítulo: "Ingresá tus credenciales para continuar" en gris `#64748B`, tamaño sm
- Campo email con ícono `Mail` de lucide a la izquierda del input
- Campo password con ícono `Lock` + botón de mostrar/ocultar contraseña (`Eye`/`EyeOff`) a la derecha
- Botón submit: ancho completo, fondo `#1E3A5F`, texto blanco, hover `#1e4d8c`, height 44px, border-radius 10px, con spinner de loading cuando está procesando
- Texto de error de Supabase mostrado en un alert rojo debajo del formulario (si falla el login)
- Animación de entrada del card: fade-in + slide desde abajo, delay 0.2s

**Estados del formulario:**
- Validación con Zod: email válido obligatorio, password mínimo 6 caracteres
- Mensajes de error en rojo debajo de cada campo, en español
- Mientras hace fetch: deshabilitar inputs + mostrar spinner en el botón
- Si Supabase retorna error: "Credenciales incorrectas. Intentá de nuevo."
- Si login es exitoso: redirigir a `/dashboard` con `router.push`

**Archivo de schema Zod a crear en `/schemas/auth.ts`:**
```ts
import { z } from 'zod'
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})
export type LoginFormData = z.infer<typeof loginSchema>
```

---

## 🏗️ PARTE 2 — MIDDLEWARE (`/middleware.ts`)

Proteger todas las rutas del dashboard. Si no hay sesión activa de Supabase → redirigir a `/auth/login`.
Si hay sesión y entra a `/auth/login` → redirigir a `/dashboard`.

```ts
// Usar createServerClient de @supabase/ssr
// Proteger matcher: ['/((?!auth|_next/static|_next/image|favicon.ico).*)']
```

---

## 🖼️ PARTE 3 — LAYOUT PRINCIPAL (`/app/(dashboard)/layout.tsx`)

### Navbar Superior (NO sidebar lateral)

El nav va **arriba**, fixed, ancho completo. Diseño:

- Altura: 60px
- Fondo: `#1E3A5F` (mismo azul del login, consistencia total)
- Padding horizontal: 24px
- Contenido de izquierda a derecha:
  1. Ícono `Wrench` blanco 20px + nombre del taller en blanco, font-weight 600, DM Sans
  2. Links de navegación centrados (o corridos a la derecha en desktop): `Dashboard`, `Stock`, `Ventas`, `Clientes`, `Proveedores` — texto blanco opacity 0.75, al hover opacity 1 + underline animado, el link activo con fondo `rgba(255,255,255,0.15)` y opacity 1, border-radius 8px
  3. A la derecha: badge con la fecha actual formato "Mié, 25 Feb" + botón `LogOut` con ícono y tooltip, color blanco opacity 0.75 hover opacity 1

**En mobile:** menú hamburguesa que abre un drawer lateral con los links.

### Área de contenido
- Background: `#F1F5F9` (gris azulado muy suave — NO blanco puro)
- Padding: `24px` en desktop, `16px` en mobile
- El contenido empieza 60px abajo del navbar (padding-top)

---

## 📊 PARTE 4 — DASHBOARD (`/app/(dashboard)/dashboard/page.tsx`)

**IMPORTANTE:** Este es un Server Component que fetchea datos reales de Supabase.
Usá `createServerClient` para obtener los datos. NO uses `useEffect` ni client-side fetching.

### Datos a fetchear de Supabase (queries reales):

```ts
// 1. Total ventas del mes actual
// 2. Total stock disponible (suma de todos los productos.stock)
// 3. Cantidad de clientes activos (count de clientes)
// 4. Ingresos del mes (suma de ventas.total donde estado = 'confirmada' y fecha del mes)
// 5. Ventas por mes (últimos 6 meses) para el gráfico de barras
// 6. Productos con stock bajo (stock <= stock_minimo) — máximo 5
// 7. Últimas 5 ventas realizadas
```

### Header del Dashboard
- Texto: "Dashboard" en `DM Sans` bold 28px, color `#0F172A`
- Subtítulo: "Resumen general · [mes actual en español]"
- A la derecha: botón "Nueva Venta" con ícono `Plus` en color `#1E3A5F`

### Sección 1 — Métricas (4 cards en grid 4 columnas, 2 en mobile)

Cada card debe tener:
- Fondo blanco `#FFFFFF`
- Border `1px solid #E2E8F0`
- Border-radius `12px`
- Padding `20px`
- Sombra `0 1px 4px rgba(0,0,0,0.04)`
- **Animación de entrada:** cada card con `animation-delay` escalonado (0ms, 100ms, 200ms, 300ms), fade-in + translateY(12px → 0)
- **Hover:** `transform: translateY(-2px)`, shadow levemente mayor, transition 200ms

Contenido de cada card:
```
Card 1 — Ventas del Mes
  Ícono: TrendingUp color #3B82F6
  Label: "Ventas del Mes"
  Valor: "$XX.XXX,XX" (formato ARS)
  Detalle: "+X% vs mes anterior" en verde si sube, rojo si baja

Card 2 — Stock Disponible
  Ícono: Package color #8B5CF6
  Label: "Stock Disponible"
  Valor: "XXX unidades"
  Detalle: "X productos con stock bajo" en naranja si hay alertas

Card 3 — Clientes Activos
  Ícono: Users color #10B981
  Label: "Clientes Activos"
  Valor: "XX"
  Detalle: "+X este mes"

Card 4 — Ingresos del Mes
  Ícono: DollarSign color #F59E0B
  Label: "Ingresos del Mes"
  Valor: "$XX.XXX,XX"
  Detalle: "Meta mensual: $XX.XXX"
```

Cada card tiene una barra de color de 3px en el borde superior izquierdo (border-left) con el color del ícono correspondiente.

### Sección 2 — Gráficos (grid 2 columnas, 1 en mobile)

**Gráfico 1 — "Ventas por Mes" (BarChart de Recharts)**
- Datos: últimos 6 meses de la tabla `ventas`
- Barras color: `#1E3A5F` con gradiente vertical usando `<defs><linearGradient>`
- Grid horizontal con líneas punteadas muy suaves `#E2E8F0`
- Tooltip personalizado: card blanco con shadow, muestra mes + monto formateado en ARS
- Animación: `animationBegin={200}` `animationDuration={800}` en las barras
- Responsive: usar `<ResponsiveContainer width="100%" height={260}>`
- Eje Y: formato `$XX.XXX` en español

**Gráfico 2 — "Ganancias por Mes" (LineChart de Recharts)**
- Datos: últimos 6 meses (ventas - compras por mes)
- Línea color `#3B82F6` con `strokeWidth={2.5}`
- Punto en cada valor: `dot={{ fill: '#3B82F6', r: 4 }}`
- Area bajo la línea: `<Area>` con fill `rgba(59, 130, 246, 0.08)`
- Tooltip igual que el anterior
- Animación: `animationBegin={400}` `animationDuration={1000}`

Ambos gráficos en cards con mismo estilo que las métricas.

### Sección 3 — Grid inferior (2 columnas, 1 en mobile)

**Panel izquierdo — "Stock Bajo" (alerta)**
- Título con ícono `AlertTriangle` color `#F59E0B`
- Lista de máximo 5 productos donde `stock <= stock_minimo`
- Por cada producto: nombre | stock actual | stock mínimo | badge "CRÍTICO" en rojo si stock <= 2, "BAJO" en naranja si stock <= stock_minimo
- Si no hay productos con stock bajo: ilustración vacía con texto "Todo el stock está bien ✓" en verde
- Animación de entrada: slide desde la izquierda

**Panel derecho — "Últimas Ventas"**
- Título con ícono `Receipt`
- Lista de últimas 5 ventas con: cliente (o "Sin cliente"), fecha relativa ("hace 2 horas"), monto, badge de estado (Confirmada=verde, Presupuesto=azul, Cancelada=rojo)
- Link "Ver todas →" al final
- Animación de entrada: slide desde la derecha

---

## ⚙️ PARTE 5 — CLIENTE DE SUPABASE

Crear los siguientes archivos base:

**`/lib/supabase/server.ts`**
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
// cliente para Server Components y Server Actions
```

**`/lib/supabase/client.ts`**
```ts
import { createBrowserClient } from '@supabase/ssr'
// cliente para Client Components (usar con moderación)
```

**`/types/database.ts`**
Definir tipos TypeScript para todas las tablas del esquema del CLAUDE.md.

---

## 🎨 REGLAS DE DISEÑO INAMOVIBLES

1. **Fondo general:** `#F1F5F9` — NUNCA `#FFFFFF` puro en el fondo de página
2. **Cards:** siempre `#FFFFFF` con `border: 1px solid #E2E8F0`
3. **Navbar:** siempre `#1E3A5F`, fixed top
4. **Fuente:** `DM Sans` via `next/font/google` — definida en `/app/layout.tsx` y aplicada en `<body>`
5. **Animaciones:** todas las secciones del dashboard deben tener fade-in con stagger. Usar CSS `@keyframes fadeInUp` — NO librerías externas de animación
6. **Bordes:** siempre `rounded-xl` (12px) en cards, `rounded-lg` en inputs/botones
7. **Iconos:** SOLO `lucide-react` — ningún otro paquete
8. **Textos en español:** absolutamente todos los labels, placeholders, mensajes de error y tooltips
9. **Responsive:** mobile-first. El navbar en mobile usa hamburger + drawer
10. **NO usar colores genéricos de Tailwind directamente** — usar las variables de color definidas aquí

---

## 📐 TIPOGRAFÍA

```ts
// /app/layout.tsx
import { DM_Sans } from 'next/font/google'
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
})
// Aplicar: className={`${dmSans.variable} font-sans`} en <body>
```

Agregar en `tailwind.config.ts`:
```ts
fontFamily: {
  sans: ['var(--font-dm-sans)', 'sans-serif'],
}
```

---

## ✅ CHECKLIST DE ENTREGA

Antes de terminar, verificá que:
- [ ] El login redirige correctamente a `/dashboard` tras autenticarse
- [ ] El middleware protege todas las rutas del dashboard
- [ ] El navbar muestra el link activo visualmente diferenciado
- [ ] Los 4 KPI cards muestran datos reales de Supabase
- [ ] Los 2 gráficos se renderizan con datos reales y animaciones
- [ ] El panel de "Stock Bajo" funciona con datos reales
- [ ] Las últimas 5 ventas se muestran en tiempo real
- [ ] Todo funciona en mobile (responsive completo)
- [ ] No hay errores de TypeScript (`npx tsc --noEmit`)
- [ ] Los datos en formato moneda están en ARS (ej: `$27.328,50`)
- [ ] Las animaciones de entrada funcionan al cargar la página

---

## ⚠️ ERRORES COMUNES A EVITAR

- No usar `any` en TypeScript
- No llamar a Supabase desde Client Components innecesariamente
- No usar `useEffect` para data fetching — todo es Server Component
- No instalar librerías de animación (Framer Motion, etc.) — solo CSS
- No usar colores arbitrarios distintos a los definidos en este prompt
- No usar Inter, Roboto ni fonts genéricas — solo DM Sans
- No poner el sidebar a la izquierda — el nav es SUPERIOR horizontal
- Si Supabase no tiene datos aún, mostrar estados vacíos elegantes (no errores)