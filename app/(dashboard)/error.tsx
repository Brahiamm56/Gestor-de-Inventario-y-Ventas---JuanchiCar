"use client"

import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-24 px-4 text-center">
            <div
                className="flex items-center justify-center w-16 h-16 rounded-full mb-6"
                style={{ backgroundColor: "#FEE2E2" }}
            >
                <AlertTriangle className="size-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
                Algo salió mal
            </h2>
            <p className="text-sm text-slate-500 mb-6 max-w-md">
                Ocurrió un error al cargar esta página. Podés intentar de nuevo o volver al inicio.
            </p>
            <div className="flex gap-3">
                <Button
                    onClick={reset}
                    className="gap-2 bg-[#1E3A5F] text-white hover:bg-[#2d4a6f]"
                >
                    <RotateCcw className="size-4" />
                    Reintentar
                </Button>
                <Button variant="outline" asChild>
                    <a href="/dashboard">Ir al Dashboard</a>
                </Button>
            </div>
            {error.digest && (
                <p className="text-[10px] text-slate-300 mt-6 font-mono">
                    Error ID: {error.digest}
                </p>
            )}
        </div>
    )
}
