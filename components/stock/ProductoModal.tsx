"use client"

import { useEffect, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Package, PlusCircle } from "lucide-react"
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
import type { Producto, Proveedor } from "@/types/database"

interface ProductoModalProps {
  open: boolean
  onClose: () => void
  producto?: Producto | null
  proveedores: Proveedor[]
}

const CATEGORIAS_PREDEFINIDAS = [
  "Filtros",
  "Frenos",
  "Motor",
  "Suspensión",
  "Eléctrico",
  "Carrocería",
  "Otro"
]

export default function ProductoModal({ open, onClose, producto, proveedores }: ProductoModalProps) {
  const [isPending, startTransition] = useTransition()
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const isEditing = !!producto

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductoFormData>({
    resolver: zodResolver(productoSchema) as any,
    defaultValues: {
      nombre: "",
      categoria: "",
      codigo: "",
      precio_venta: "" as unknown as number,
      precio_costo: "" as unknown as number,
      stock: 0,
      stock_minimo: 5,
      proveedor_id: "",
      descripcion: "",
    },
  })

  const categoryValue = watch("categoria")
  const proveedorValue = watch("proveedor_id")

  useEffect(() => {
    if (producto) {
      const isPredefined = CATEGORIAS_PREDEFINIDAS.includes(producto.categoria ?? "")
      setIsCustomCategory(!isPredefined && !!producto.categoria)

      reset({
        nombre: producto.nombre,
        categoria: producto.categoria ?? "",
        codigo: producto.codigo ?? "",
        precio_venta: producto.precio_venta,
        precio_costo: producto.precio_costo ?? 0,
        stock: producto.stock,
        stock_minimo: producto.stock_minimo,
        proveedor_id: producto.proveedor_id ?? "",
        descripcion: producto.descripcion ?? "",
      })
    } else {
      setIsCustomCategory(false)
      reset({
        nombre: "",
        categoria: "",
        codigo: "",
        precio_venta: "" as unknown as number,
        precio_costo: "" as unknown as number,
        stock: 0,
        stock_minimo: 5,
        proveedor_id: "",
        descripcion: "",
      })
    }
  }, [producto, reset])

  function onSubmit(data: ProductoFormData) {
    // Si es "Sin proveedor", mandamos null
    const finalData = {
      ...data,
      proveedor_id: data.proveedor_id === "" ? null : data.proveedor_id
    }

    startTransition(async () => {
      const result = isEditing
        ? await editarProducto(producto!.id, finalData as any)
        : await crearProducto(finalData as any)

      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(isEditing ? "Producto actualizado" : "Producto creado")
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="size-5 text-purple-600" />
            {isEditing ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" placeholder="Nombre del producto" {...register("nombre")} />
              {errors.nombre && <p className="text-xs text-red-500">{errors.nombre.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="codigo">Código</Label>
              <Input id="codigo" placeholder="Ej: REP-001" {...register("codigo")} />
              {errors.codigo && <p className="text-xs text-red-500">{errors.codigo.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="categoria">Categoría</Label>
              {!isCustomCategory ? (
                <Select
                  value={CATEGORIAS_PREDEFINIDAS.includes(categoryValue ?? "") ? categoryValue : ""}
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
                      <SelectItem key={c} value={c}>{c}</SelectItem>
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
                    placeholder="Nombre categoría"
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
                    X
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="precio_venta">Precio Venta *</Label>
              <Input id="precio_venta" type="number" step="0.01" placeholder="$ 0,00" {...register("precio_venta")} />
              {errors.precio_venta && <p className="text-xs text-red-500">{errors.precio_venta.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="precio_costo">Precio Costo</Label>
              <Input id="precio_costo" type="number" step="0.01" placeholder="$ 0,00" {...register("precio_costo")} />
              {errors.precio_costo && <p className="text-xs text-red-500">{errors.precio_costo.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stock">Stock *</Label>
              <Input id="stock" type="number" placeholder="0" {...register("stock")} />
              {errors.stock && <p className="text-xs text-red-500">{errors.stock.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stock_minimo">Stock Mínimo</Label>
              <Input id="stock_minimo" type="number" placeholder="5" {...register("stock_minimo")} />
              {errors.stock_minimo && <p className="text-xs text-red-500">{errors.stock_minimo.message}</p>}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                placeholder="Notas adicionales sobre el producto..."
                className="resize-none"
                maxLength={200}
                {...register("descripcion")}
              />
              <p className="text-[10px] text-slate-400 text-right">Máximo 200 caracteres</p>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Proveedor</Label>
              <Select
                value={proveedorValue || "none"}
                onValueChange={(v) => setValue("proveedor_id", v === "none" ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin proveedor</SelectItem>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} style={{ backgroundColor: "#1E3A5F" }}>
              {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              {isEditing ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
