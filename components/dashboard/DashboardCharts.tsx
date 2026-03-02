"use client"

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  AlertTriangle,
  Wrench as WrenchIcon,
  CheckCircle,
  ShoppingCart,
} from "lucide-react"

interface WeeklySalesData {
  semana: string
  total: number
}

interface IngresosMensualesData {
  mes: string
  ingresos: number
}

interface MetodoPagoData {
  nombre: string
  cantidad: number
  monto: number
  color: string
  porcentaje: number
}

interface ActivityItem {
  id: string
  icon: "alert" | "wrench" | "check" | "cart"
  text: string
  time: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; name?: string; dataKey?: string; color?: string }>
  label?: string
}

function formatYAxis(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
  }
  return `$${value}`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value)
}

function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-sm bg-card border border-border shadow-md">
      <p className="font-medium text-card-foreground">{label}</p>
      <p className="text-muted-foreground">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

// -- Ventas Semanales (BarChart) --
export function VentasSemanalesChart({ data }: { data: WeeklySalesData[] }) {
  return (
    <div className="animate-fade-in-up animation-delay-200 p-5 bg-card border border-border rounded-xl shadow-sm">
      <h3 className="text-sm font-semibold mb-4 text-card-foreground">
        Ventas Semanales
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis
            dataKey="semana"
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="total"
            fill="#1E3A5F"
            className="fill-primary"
            radius={[3, 3, 0, 0]}
            animationBegin={200}
            animationDuration={800}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// -- Ingresos Mensuales (LineChart) --
export function IngresosMensualesChart({ data }: { data: IngresosMensualesData[] }) {
  return (
    <div className="animate-fade-in-up animation-delay-300 p-5 bg-card border border-border rounded-xl shadow-sm">
      <h3 className="text-sm font-semibold mb-4 text-card-foreground">
        Ingresos Mensuales
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${v.toLocaleString("es-AR")}`}
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="ingresos"
            stroke="#1E3A5F"
            strokeWidth={2}
            dot={{ fill: "#1E3A5F", r: 3 }}
            activeDot={{ r: 5 }}
            animationBegin={200}
            animationDuration={1000}
            name="Ingresos"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// -- Distribución de Métodos de Pago (Donut) --
export function MetodosPagoChart({ data }: { data: MetodoPagoData[] }) {
  const RADIAN = Math.PI / 180

  // Colores fijos según la captura de referencia
  const referenceData = [
    { name: 'Transferencia', value: 45, color: '#1E3A5F' },
    { name: 'Efectivo', value: 30, color: '#22C55E' },
    { name: 'Tarjeta', value: 25, color: '#F59E0B' },
  ]

  const renderLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={600}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="animate-fade-in-up animation-delay-200 p-5 bg-card border border-border rounded-xl shadow-sm">
      <h3 className="text-sm font-semibold mb-1 text-card-foreground">
        Distribución de Métodos
      </h3>
      <p className="text-xs mb-3 text-muted-foreground">
        de Pago (Mes)
      </p>

      <div className="flex justify-center">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={data.length > 0 ? data : referenceData}
              dataKey={data.length > 0 ? "cantidad" : "value"}
              nameKey={data.length > 0 ? "nombre" : "name"}
              cx="50%"
              cy="50%"
              outerRadius={75}
              innerRadius={30}
              paddingAngle={2}
              strokeWidth={0}
              animationBegin={200}
              animationDuration={800}
              label={renderLabel}
              labelLine={false}
            >
              {(data.length > 0 ? data : referenceData).map((entry: any, index: number) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Leyenda Horizontal (como en la referencia) */}
      <div className="flex justify-center gap-x-3 mt-4">
        {[
          { color: '#1E3A5F', label: 'Transferencia' },
          { color: '#22C55E', label: 'Efectivo' },
          { color: '#F59E0B', label: 'Tarjeta' }
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-[2px]"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[10px] whitespace-nowrap text-muted-foreground">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// -- Recent Activity --
const ACTIVITY_ICONS = {
  alert: { Icon: AlertTriangle, bg: "#FEF2F2", color: "#EF4444" },
  wrench: { Icon: WrenchIcon, bg: "#F1F5F9", color: "#64748B" },
  check: { Icon: CheckCircle, bg: "#F0FDF4", color: "#22C55E" },
  cart: { Icon: ShoppingCart, bg: "#FFF7ED", color: "#F59E0B" },
}

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  // Removing mock data referenceActivity block
  const displayItems = items

  return (
    <div className="animate-fade-in-up animation-delay-300 p-5 bg-card border border-border rounded-xl shadow-sm">
      <h3 className="text-sm font-semibold mb-4 text-card-foreground">
        Actividad Reciente
      </h3>
      <div className="space-y-4">
        {displayItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin actividad reciente</p>
        ) : (
          displayItems.map((item) => {
            const { Icon, bg, color } = ACTIVITY_ICONS[item.icon]
            return (
              <div key={item.id} className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                  style={{ backgroundColor: bg }}
                >
                  <Icon className="size-4" style={{ color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate text-foreground">
                    {item.text}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.time}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

