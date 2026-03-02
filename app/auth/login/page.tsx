"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Mail, Lock, Eye, EyeOff, Wrench, Package, Receipt, Users, Loader2 } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { loginSchema, type LoginFormData } from "@/schemas/auth"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setAuthError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      setAuthError("Credenciales incorrectas. Intentá de nuevo.")
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen">
      {/* Columna izquierda — Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 relative overflow-hidden"
        style={{ backgroundColor: "#1E3A5F" }}
      >
        {/* Patrón SVG de fondo */}
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.05 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="gears" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <circle cx="40" cy="40" r="16" fill="none" stroke="white" strokeWidth="2" />
              <circle cx="40" cy="40" r="6" fill="white" />
              <rect x="38" y="10" width="4" height="14" fill="white" rx="2" />
              <rect x="38" y="56" width="4" height="14" fill="white" rx="2" />
              <rect x="10" y="38" width="14" height="4" fill="white" rx="2" />
              <rect x="56" y="38" width="14" height="4" fill="white" rx="2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gears)" />
        </svg>

        {/* Logo y título */}
        <div className="animate-fade-in-left relative z-10 flex-1 flex flex-col items-center justify-center -mt-10">
          <Image
            src="/images/logo1.png"
            alt="JuanchiCar Logo"
            width={400}
            height={150}
            priority
            className="mb-8 w-full max-w-[400px] h-auto object-contain drop-shadow-lg"
          />
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight text-center">
            Gestor Stock y Ventas
          </h1>
        </div>
      </div>

      {/* Columna derecha — Formulario */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center p-6"
        style={{ backgroundColor: "#F8FAFC" }}
      >
        <div
          className="animate-fade-in-up animation-delay-200 w-full max-w-md"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "16px",
            padding: "40px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}
        >
          {/* Header del formulario */}
          <div className="mb-8">
            <h2
              className="text-2xl font-bold"
              style={{ color: "#0F172A" }}
            >
              Bienvenido
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: "#64748B" }}
            >
              Ingresá tus credenciales para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Campo Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium"
                style={{ color: "#0F172A" }}
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
                  style={{ color: "#94A3B8" }}
                />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  className="pl-10 h-11 rounded-lg"
                  disabled={isSubmitting}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs" style={{ color: "#EF4444" }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Campo Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium"
                style={{ color: "#0F172A" }}
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
                  style={{ color: "#94A3B8" }}
                />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 rounded-lg"
                  disabled={isSubmitting}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" style={{ color: "#94A3B8" }} />
                  ) : (
                    <Eye className="size-4" style={{ color: "#94A3B8" }} />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs" style={{ color: "#EF4444" }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Error de autenticación */}
            {authError && (
              <div
                className="text-sm p-3 rounded-lg"
                style={{
                  backgroundColor: "#FEF2F2",
                  color: "#DC2626",
                  border: "1px solid #FECACA",
                }}
              >
                {authError}
              </div>
            )}

            {/* Botón submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 text-white font-medium cursor-pointer"
              style={{
                backgroundColor: isSubmitting ? "#2d5a8a" : "#1E3A5F",
                borderRadius: "10px",
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                "Ingresar"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
