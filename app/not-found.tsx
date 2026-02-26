import Link from "next/link"
import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-gray-50">
            <div
                className="flex items-center justify-center w-20 h-20 rounded-full mb-6"
                style={{ backgroundColor: "#DBEAFE" }}
            >
                <FileQuestion className="size-10 text-[#1E3A5F]" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">404</h1>
            <h2 className="text-lg font-semibold text-slate-700 mb-2">
                Página no encontrada
            </h2>
            <p className="text-sm text-slate-500 mb-8 max-w-md">
                La página que buscás no existe o fue movida. Verificá la URL o volvé al inicio.
            </p>
            <Button asChild className="gap-2 bg-[#1E3A5F] text-white hover:bg-[#2d4a6f]">
                <Link href="/dashboard">
                    Volver al Dashboard
                </Link>
            </Button>
        </div>
    )
}
