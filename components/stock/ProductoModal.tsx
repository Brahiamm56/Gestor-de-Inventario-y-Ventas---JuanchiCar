"use client"

import { useEffect, useState, useTransition, useRef, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Loader2,
  Package,
  PlusCircle,
  Scan,
  AlertTriangle,
  CheckCircle2,
  MapPin,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { productoSchema, type ProductoFormData } from "@/schemas/producto"
import { crearProducto, editarProducto } from "@/app/(dashboard)/stock/actions"
import { createClient } from "@/lib/supabase/client"
import type { Producto, Proveedor } from "@/types/database"

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────

const SIN_CATEGORIA = "Sin categoría"

const CATEGORIAS_PREDEFINIDAS = [
  SIN_CATEGORIA,
  "Filtros",
  "Frenos",
  "Motor",
  "Suspensión",
  "Eléctrico",
  "Carrocería",
  "Otro",
]

interface ProductoModalProps {
  open: boolean
  onClose: () => void
  producto?: Producto | null
  proveedores: Proveedor[]
}

// Info del producto duplicado encontrado en la DB
interface DuplicadoInfo {
  id: string
  nombre: string
}

// ─────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────

export default function ProductoModal({
  open,
  onClose,
  producto,
  proveedores,
}: ProductoModalProps) {
  const [isPending, startTransition] = useTransition()
  const [isCustomCategory, setIsCustomCategory] = useState(false)

  // Estado del escáner / validación de código
  const [duplicado, setDuplicado] = useState<DuplicadoInfo | null>(null)
  const [checkingCodigo, setCheckingCodigo] = useState(false)
  // Último código consultado — para evitar re-queries innecesarias en onBlur
  const lastCheckedRef = useRef<string>("")

  const isEditing = !!producto

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setFocus,
    formState: { errors },
  } = useForm<ProductoFormData>({
    resolver: zodResolver(productoSchema) as never,
    defaultValues: {
      nombre: "",
      categoria: "",
      codigo: "",
      precio_venta: "" as unknown as number,
      stock: 0,
      stock_minimo: 5,
      ubicacion_fisica: "",
      proveedor_id: "",
      descripcion: "",
    },
  })

  const categoryValue = watch("categoria")
  const proveedorValue = watch("proveedor_id")

  // ── Poblar el form al editar / resetear al crear ────────────────────────
  useEffect(() => {
    if (producto) {
      const isPredefined = CATEGORIAS_PREDEFINIDAS.includes(producto.categoria ?? "")
      setIsCustomCategory(!isPredefined && !!producto.categoria)

      reset({
        nombre: producto.nombre,
        categoria: producto.categoria ?? "",
        codigo: producto.codigo ?? "",
        precio_venta: producto.precio_venta,
        stock: producto.stock,
        stock_minimo: producto.stock_minimo,
        ubicacion_fisica: producto.ubicacion_fisica ?? "",
        proveedor_id: producto.proveedor_id ?? "",
        descripcion: producto.descripcion ?? "",
      })
    } else {
      setIsCustomCategory(false)
      reset({
        nombre: "",
        categoria: SIN_CATEGORIA,
        codigo: "",
        precio_venta: "" as unknown as number,
        stock: 0,
        stock_minimo: 5,
        ubicacion_fisica: "",
        proveedor_id: "",
        descripcion: "",
      })
    }

    // Limpiar estado del escáner al cambiar de producto
    setDuplicado(null)
    lastCheckedRef.current = ""
  }, [producto, reset])

  // ── Auto-focus en el campo Código al abrir la modal ────────────────────
  // El delay de 200ms espera a que termine la animación de apertura del Dialog
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      setFocus("codigo")
    }, 200)
    return () => clearTimeout(timer)
  }, [open, setFocus])

  // ── Verificación de código duplicado en la DB ──────────────────────────
  const verificarCodigo = useCallback(
    async (codigo: string): Promise<DuplicadoInfo | null> => {
      const trimmed = codigo.trim()

      // No consultar si el código no cambió desde la última vez
      if (trimmed === lastCheckedRef.current) return duplicado
      lastCheckedRef.current = trimmed

      if (!trimmed) {
        setDuplicado(null)
        return null
      }

      setCheckingCodigo(true)
      try {
        const supabase = createClient()
        let query = supabase
          .from("productos")
          .select("id, nombre")
          .eq("codigo", trimmed)

        // Al editar, excluir el producto actual para no marcarlo como duplicado
        if (producto?.id) {
          query = query.neq("id", producto.id)
        }

        const { data } = await query.maybeSingle()

        const info = data ? { id: data.id, nombre: data.nombre } : null
        setDuplicado(info)
        return info
      } catch {
        // Si falla la consulta, no bloqueamos el flujo
        setDuplicado(null)
        return null
      } finally {
        setCheckingCodigo(false)
      }
    },
    [producto?.id, duplicado]
  )

  // ── Manejador de Enter en el campo Código ─────────────────────────────
  // Las lectoras de barras envían los dígitos + Enter al final.
  // Al detectar Enter: verificamos duplicado y si OK movemos al nombre.
  async function handleCodigoKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return
    e.preventDefault() // Evitar submit accidental del form

    const codigo = (e.target as HTMLInputElement).value
    const dup = await verificarCodigo(codigo)

    if (!dup) {
      // Código libre → saltar al campo Nombre para que el usuario lo complete
      setFocus("nombre")
    }
    // Si hay duplicado, el aviso aparece debajo del campo y el foco permanece aquí
  }

  // ── Verificación pasiva al salir del campo (onBlur) ───────────────────
  async function handleCodigoBlur(e: React.FocusEvent<HTMLInputElement>) {
    await verificarCodigo(e.target.value)
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  function onSubmit(data: ProductoFormData) {
    const finalData = {
      ...data,
      proveedor_id: data.proveedor_id === "" ? null : data.proveedor_id,
    }

    startTransition(async () => {
      const result = isEditing
        ? await editarProducto(producto!.id, finalData as unknown as Parameters<typeof editarProducto>[1])
        : await crearProducto(finalData as unknown as Parameters<typeof crearProducto>[0])

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(isEditing ? "Producto actualizado" : "Producto creado")
      onClose()
    })
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  // Prop `ref` de register — para poder hacer focus via setFocus necesitamos que
  // el ref de register esté registrado en el DOM. Con React Hook Form v7 esto
  // sucede automáticamente al hacer {...register("campo")}. No necesitamos
  // gestionar refs manualmente; setFocus("codigo") resuelve el campo por nombre.

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="size-5 text-purple-600" />
            {isEditing ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* ── Nombre ── */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                placeholder="Nombre del producto"
                {...register("nombre")}
              />
              {errors.nombre && (
                <p className="text-xs text-red-500">{errors.nombre.message}</p>
              )}
            </div>

            {/* ── Código (con soporte de escáner) ── */}
            <div className="space-y-1.5">
              <Label htmlFor="codigo" className="flex items-center gap-1.5">
                Código
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-normal text-slate-400 bg-slate-100 rounded px-1.5 py-0.5"
                  title="El foco se posiciona aquí automáticamente al abrir la modal para uso con lectora"
                >
                  <Scan className="size-3" />
                  Escáner listo
                </span>
              </Label>
              <div className="relative">
                <Input
                  id="codigo"
                  placeholder="Escanear o escribir código"
                  autoComplete="off"
                  {...register("codigo")}
                  onKeyDown={handleCodigoKeyDown}
                  onBlur={handleCodigoBlur}
                  className={
                    duplicado
                      ? "border-amber-400 focus-visible:ring-amber-300"
                      : undefined
                  }
                />
                {/* Indicador de consulta en progreso */}
                {checkingCodigo && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-slate-400" />
                )}
                {/* Código verificado sin duplicados */}
                {!checkingCodigo && !duplicado && lastCheckedRef.current && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-green-500" />
                )}
              </div>

              {/* Aviso de duplicado */}
              {duplicado && (
                <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-700">
                  <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                  <span>
                    <span className="font-semibold">Código en uso:</span>{" "}
                    &ldquo;{duplicado.nombre}&rdquo; ya tiene este código.
                    Podés igualmente guardar para editar el existente desde la
                    tabla.
                  </span>
                </div>
              )}
              {errors.codigo && (
                <p className="text-xs text-red-500">{errors.codigo.message}</p>
              )}
            </div>

            {/* ── Categoría ── */}
            <div className="space-y-1.5">
              <Label htmlFor="categoria">Categoría</Label>
              {!isCustomCategory ? (
                <Select
                  value={
                    CATEGORIAS_PREDEFINIDAS.includes(categoryValue ?? "")
                      ? (categoryValue ?? "")
                      : ""
                  }
                  onValueChange={(v) => {
                    if (v === "NEW") {
                      setIsCustomCategory(true)
                      setValue("categoria", "")
                    } else {
                      setValue("categoria", v)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_PREDEFINIDAS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                    <SelectItem value="NEW" className="text-purple-600 font-medium">
                      <div className="flex items-center gap-2">
                        <PlusCircle className="size-4" />
                        Nueva categoría...
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id="categoria"
                    placeholder="Nombre de la categoría"
                    autoFocus
                    {...register("categoria")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCustomCategory(false)
                      setValue("categoria", "")
                    }}
                  >
                    ✕
                  </Button>
                </div>
              )}
            </div>

            {/* ── Precio Venta ── */}
            <div className="space-y-1.5">
              <Label htmlFor="precio_venta">Precio Venta *</Label>
              <Input
                id="precio_venta"
                type="number"
                step="0.01"
                placeholder="$ 0,00"
                {...register("precio_venta")}
              />
              {errors.precio_venta && (
                <p className="text-xs text-red-500">{errors.precio_venta.message}</p>
              )}
            </div>

            {/* ── Stock / Stock Mínimo / Ubicación — 3 columnas ── */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="stock">Stock Actual *</Label>
                <Input
                  id="stock"
                  type="number"
                  placeholder="0"
                  {...register("stock")}
                />
                {errors.stock && (
                  <p className="text-xs text-red-500">{errors.stock.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stock_minimo">Stock Mínimo</Label>
                <Input
                  id="stock_minimo"
                  type="number"
                  placeholder="5"
                  {...register("stock_minimo")}
                />
                {errors.stock_minimo && (
                  <p className="text-xs text-red-500">
                    {errors.stock_minimo.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ubicacion_fisica" className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-slate-400" />
                  Ubicación
                </Label>
                <Input
                  id="ubicacion_fisica"
                  placeholder="Ej: Estante A1, Cajón B3"
                  {...register("ubicacion_fisica")}
                />
                {errors.ubicacion_fisica && (
                  <p className="text-xs text-red-500">
                    {errors.ubicacion_fisica.message}
                  </p>
                )}
              </div>
            </div>

            {/* ── Descripción ── */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                placeholder="Notas adicionales sobre el producto..."
                className="resize-none"
                maxLength={200}
                {...register("descripcion")}
              />
              <p className="text-[10px] text-slate-400 text-right">
                Máximo 200 caracteres
              </p>
            </div>

            {/* ── Proveedor ── */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Proveedor</Label>
              <Select
                value={proveedorValue || "none"}
                onValueChange={(v) =>
                  setValue("proveedor_id", v === "none" ? "" : v)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin proveedor</SelectItem>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              style={{ backgroundColor: "#1E3A5F" }}
            >
              {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              {isEditing ? "Guardar cambios" : "Crear producto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
