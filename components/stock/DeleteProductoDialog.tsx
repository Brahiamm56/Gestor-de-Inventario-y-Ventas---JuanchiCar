"use client"

import { useTransition } from "react"
import { Loader2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { eliminarProducto } from "@/app/(dashboard)/stock/actions"

interface DeleteProductoDialogProps {
  open: boolean
  onClose: () => void
  productoId: string
  productoNombre: string
}

export default function DeleteProductoDialog({
  open,
  onClose,
  productoId,
  productoNombre,
}: DeleteProductoDialogProps) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await eliminarProducto(productoId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Producto eliminado")
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-500" />
            Eliminar Producto
          </DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que querés eliminar <strong>{productoNombre}</strong>? Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Eliminar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
