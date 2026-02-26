import Navbar from "@/components/layout/Navbar"
import StockNotificationProvider from "@/components/shared/StockNotificationProvider"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Obtener cantidad de productos con stock bajo para notificaciones
  const { data: productos } = await supabase
    .from("productos")
    .select("stock, stock_minimo")

  const stockBajoCount = (productos ?? []).filter(
    (p) => p.stock <= p.stock_minimo
  ).length

  return (
    <StockNotificationProvider stockBajoCount={stockBajoCount}>
      <div className="min-h-screen bg-slate-100">
        <Navbar />
        <main className="pt-[60px] px-4 md:px-6 py-6">
          {children}
        </main>
      </div>
    </StockNotificationProvider>
  )
}
