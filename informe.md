# Informe de Revisión Completa — Gestor de Stock (Juanchi Car)

**Fecha:** 25 de Febrero de 2026
**Revisión de:** Sistema completo

---

## 1. Estado Actual del Proyecto

### Módulos Implementados

| Módulo | Estado | CRUD | Observaciones |
|--------|--------|------|---------------|
| Login/Auth | Completo | — | Supabase Auth + middleware de protección |
| Dashboard | Completo | — | KPIs, gráficos (Recharts), actividad reciente |
| Stock/Inventario | Completo | C/R/U/D | Filtros, KPIs, categorías, proveedores |
| Ventas | Completo | C/R/D | Crear, cambiar estado, eliminar, PDF |
| Clientes | Completo | C/R/U/D | Expandible con detalle, vehículos, historial |
| Taller (Turnos) | Completo | C/R/U/D | Estados, fechas, filtros |
| Proveedores | Completo | C/R/U/D | CRUD básico, cards con iconos |
| Comprobante PDF | Completo | — | jsPDF + jspdf-autotable, descarga client-side |

### Arquitectura Implementada
- **34 archivos de código** fuente (sin contar `node_modules` ni `components/ui`)
- **Patrón consistente:** Page (Server) → Table (Client) → Modal (Client) → Server Action
- **Validación:** Zod en 6 schemas, React Hook Form en modales
- **16 componentes shadcn/ui** instalados
- **Middleware** de auth protegiendo todas las rutas

---

## 2. Bugs y Problemas Detectados

### 2.1 Problemas de Código

| # | Archivo | Problema | Severidad |
|---|---------|----------|-----------|
| 1 | `VentaTable.tsx` | Cast `as any` en `generarComprobantePDF(result.data as any)` — no tiene tipado seguro | Baja |
| 2 | `ProductoModal.tsx` | Cast `as any` en `editarProducto(producto!.id, finalData as any)` y `crearProducto(finalData as any)` | Baja |
| 3 | `ClienteTable.tsx` | Fragmento `<>` dentro del `.map()` sin `key` en el fragmento — solo la primera `<TableRow>` tiene key | Media |
| 4 | `DashboardCharts.tsx` | `MetodosPagoChart` tiene datos "hardcodeados" de referencia que siempre se muestran en la leyenda, sin usar datos reales | Baja |
| 5 | `DashboardCharts.tsx` | Título "Recent Activity" está en inglés — debería ser "Actividad Reciente" | Baja |
| 6 | `dashboard/page.tsx` | Las queries de ventas semanales se hacen secuencialmente en un `for` loop en vez de en paralelo con `Promise.all` — impacta performance | Media |
| 7 | `Navbar.tsx` | La fecha se renderiza client-side con `new Date()` — puede causar hydration mismatch | Baja |

### 2.2 Funcionalidad Faltante vs CLAUDE.md

| # | Lo que dice CLAUDE.md | Estado real |
|---|----------------------|-------------|
| 1 | Font: `Inter` via next/font | Se usa `DM_Sans` en vez de Inter |
| 2 | Accent color: `#2563EB` (blue-600) | Se usa `#1E3A5F` (azul oscuro custom) como color principal |
| 3 | No usar Context API salvo para theme | No hay sistema de theme implementado |
| 4 | `/hooks` — Custom hooks reutilizables | Directorio vacío, sin hooks custom |
| 5 | `/store` — Zustand stores | Directorio no existe, Zustand instalado pero sin uso |
| 6 | Estado global con Zustand (ej: notificaciones) | No implementado |

---

## 3. Nuevas Implementaciones Necesarias

### 3.1 Prioridad ALTA — Funcionalidad Core Faltante

#### A) Módulo de Compras a Proveedores
**Estado:** No implementado (solo existe la tabla `compras` y `compra_items` en la DB)

Se necesita:
- `app/(dashboard)/proveedores/compras/` o integrar en la página de proveedores
- CRUD completo de compras (similar a ventas)
- Server actions: `crearCompra`, `editarCompra`, `eliminarCompra`
- Al confirmar compra → **incrementar stock** de los productos comprados
- Schema Zod para validación
- Historial de compras por proveedor
- Tabla de compras con items, fecha, total, proveedor

#### B) Edición de Ventas
**Estado:** Solo se puede crear, cambiar estado y eliminar

Se necesita:
- Botón "Editar" en VentaTable para modificar una venta existente
- Editar items (agregar/quitar productos, cambiar cantidades/precios)
- Editar cliente, vehículo, notas, método de pago
- Server action `editarVenta` con lógica de ajuste de stock
- Solo debería ser editable si estado = "presupuesto" (no confirmadas)

#### C) Edición de Vehículos (Autos)
**Estado:** Solo se pueden crear y eliminar, no editar

Se necesita:
- Botón editar en las cards de vehículos en ClienteDetail
- Modal para editar patente, marca, modelo, año
- Server action `editarAuto`

---

### 3.2 Prioridad MEDIA — Mejoras Importantes

#### D) Paginación en Tablas
**Estado:** Todas las tablas cargan todos los registros sin paginación

Se necesita:
- Paginación server-side o client-side en: Stock, Ventas, Clientes, Turnos
- Mostrar "Página 1 de N" con botones anterior/siguiente
- Límite de 20-30 registros por página
- Importante para cuando el negocio crezca y tenga +100 registros

#### E) Detalle/Vista de Venta Individual
**Estado:** No existe vista detallada de una venta

Se necesita:
- Dialog o página que muestre todos los detalles de una venta
- Items con nombres de productos, cantidades, precios
- Datos del cliente y vehículo
- Alternativa al PDF para vista rápida en pantalla

#### F) Búsqueda Global / Barra de Búsqueda en Navbar
**Estado:** Cada módulo tiene su propia búsqueda, no hay búsqueda centralizada

Se necesita:
- Barra de búsqueda en el Navbar
- Buscar por: productos, clientes, patentes, ventas
- Resultados agrupados por categoría con links directos

#### G) Notificaciones de Stock Bajo
**Estado:** Solo se muestra en Dashboard como KPI estático

Se necesita:
- Notificación visual (badge/dot) en el link de Stock del Navbar cuando hay stock crítico
- Opcionalmente: panel de alertas en el Dashboard con productos a reponer
- Zustand store para estado de notificaciones (según CLAUDE.md)

#### H) Exportación de Datos
**Estado:** Solo existe PDF de comprobante individual

Se necesita:
- Exportar listado de stock a CSV/Excel
- Exportar listado de ventas a CSV/Excel
- Exportar listado de clientes a CSV/Excel
- Botón "Exportar" en cada tabla

---

### 3.3 Prioridad BAJA — Nice-to-have

#### I) Dashboard: Filtros de Período
**Estado:** Dashboard muestra solo mes actual y últimos 6 meses fijos

Se necesita:
- Selector de período: "Este mes", "Mes anterior", "Últimos 3 meses", "Este año"
- Actualización de KPIs y gráficos según período seleccionado

#### J) Perfil de Usuario / Configuración del Taller
**Estado:** No existe configuración

Se necesita:
- Página de configuración `/settings` o modal
- Nombre del taller (actualmente hardcodeado como "Juanchi Car" y "JUANCHI CAR")
- Datos del taller para el PDF (dirección, teléfono, CUIT)
- Cambio de contraseña
- Logo del taller

#### K) Historial de Precios de Productos
**Estado:** No se guarda historial de cambios de precio

Se necesita:
- Tabla `precio_historial` en la DB
- Registrar cada cambio de precio_venta y precio_costo
- Visualización en la ficha del producto

#### L) Sidebar en vez de Navbar
**Estado:** Se usa Navbar horizontal, CLAUDE.md menciona Sidebar

Según CLAUDE.md la estructura incluye:
```
/components/layout → Sidebar, Navbar, etc.
```
Actualmente solo hay Navbar. Evaluar si se quiere agregar Sidebar para mejor UX en desktop.

#### M) Indicadores de Ganancia por Venta
**Estado:** No se calcula ganancia por venta

Se necesita:
- Agregar columna "Ganancia" en VentaTable (precio_venta - precio_costo por item)
- KPI de margen de ganancia en Dashboard
- Requiere que los productos tengan precio_costo cargado

#### N) Dark Mode
**Estado:** No implementado

- `next-themes` ya está instalado como dependencia
- Implementar toggle en Navbar/Settings
- Adaptar paleta de colores para modo oscuro

---

## 4. Deuda Técnica

| # | Tema | Detalle |
|---|------|---------|
| 1 | **Inline styles excesivos** | Muchos componentes usan `style={{}}` en vez de clases Tailwind. Debería migrarse a clases para consistencia y mantainability |
| 2 | **Sin tests** | No hay tests unitarios ni de integración. Considerar Vitest + React Testing Library |
| 3 | **Sin error boundaries** | No hay `error.tsx` ni `loading.tsx` en las rutas del App Router |
| 4 | **Sin `loading.tsx`** | No hay estados de carga a nivel de ruta (Suspense boundaries) |
| 5 | **Sin `not-found.tsx`** | No hay página 404 personalizada |
| 6 | **ProveedorTable usa `<table>` HTML nativo** | Debería usar componente `Table` de shadcn/ui como el resto |
| 7 | **TurnoTable usa `<table>` HTML nativo** | Mismo caso que ProveedorTable |
| 8 | **Carpeta `/hooks` vacía** | Oportunidades: `useDebounce`, `useMediaQuery`, `useLocalStorage` |
| 9 | **Zustand sin uso** | Instalado pero no usado. Ideal para: notificaciones, estado del usuario, preferencias |
| 10 | **Nombre del taller hardcodeado** | "Juanchi Car" aparece en Navbar y PDF. Debería ser configurable |

---

## 5. Resumen de Prioridades

### Hacer ahora (Alta prioridad)
1. Módulo de Compras a Proveedores (funcionalidad core del negocio)
2. Edición de Ventas (presupuestos editables)
3. Edición de Vehículos

### Hacer pronto (Media prioridad)
4. Paginación en tablas
5. Vista detallada de venta
6. Notificaciones de stock bajo
7. Exportación CSV/Excel
8. Búsqueda global

### Hacer eventualmente (Baja prioridad)
9. Filtros de período en Dashboard
10. Configuración del taller
11. Historial de precios
12. Dark mode
13. Migrar inline styles a Tailwind
14. Agregar loading/error states
15. Unificar tablas con shadcn/ui Table

---

## 6. Archivos del Proyecto (Inventario)

```
Raíz:
├── CLAUDE.md
├── middleware.ts
├── package.json
├── next.config.ts

App:
├── app/layout.tsx
├── app/page.tsx (redirect → /dashboard)
├── app/auth/login/page.tsx
├── app/(dashboard)/layout.tsx
├── app/(dashboard)/dashboard/page.tsx
├── app/(dashboard)/stock/page.tsx
├── app/(dashboard)/stock/actions.ts
├── app/(dashboard)/ventas/page.tsx
├── app/(dashboard)/ventas/actions.ts
├── app/(dashboard)/clientes/page.tsx
├── app/(dashboard)/clientes/actions.ts
├── app/(dashboard)/proveedores/page.tsx
├── app/(dashboard)/proveedores/actions.ts
├── app/(dashboard)/taller/page.tsx
├── app/(dashboard)/taller/actions.ts

Components:
├── components/layout/Navbar.tsx
├── components/stock/ProductoTable.tsx
├── components/stock/ProductoModal.tsx
├── components/stock/DeleteProductoDialog.tsx
├── components/ventas/VentaTable.tsx
├── components/ventas/VentaModal.tsx
├── components/ventas/VentaItems.tsx
├── components/clientes/ClienteTable.tsx
├── components/clientes/ClienteModal.tsx
├── components/clientes/AutoModal.tsx
├── components/clientes/ClienteDetail.tsx
├── components/proveedores/ProveedorTable.tsx
├── components/proveedores/ProveedorModal.tsx
├── components/proveedores/DeleteProveedorDialog.tsx
├── components/taller/TurnoTable.tsx
├── components/taller/TurnoModal.tsx
├── components/taller/DeleteTurnoDialog.tsx
├── components/dashboard/DashboardCharts.tsx
├── components/ui/ (16 componentes shadcn/ui)

Lib:
├── lib/supabase/server.ts
├── lib/supabase/client.ts
├── lib/utils.ts
├── lib/pdf-generator.ts

Types & Schemas:
├── types/database.ts
├── schemas/auth.ts
├── schemas/producto.ts
├── schemas/venta.ts
├── schemas/cliente.ts
├── schemas/proveedor.ts
├── schemas/turno.ts
```

**Total: ~50 archivos de código fuente** (excluyendo components/ui y config)

---

*Informe generado tras revisión completa de todos los archivos del sistema.*
