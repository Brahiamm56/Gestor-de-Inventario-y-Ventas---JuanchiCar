"use client"

import { useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { eliminarProveedor } from "@/app/(dashboard)/proveedores/actions"
import type { Proveedor } from "@/types/database"

interface DeleteProveedorDialogProps {
    proveedor: Proveedor | null
    onClose: () => void
}

export default function DeleteProveedorDialog({ proveedor, onClose }: DeleteProveedorDialogProps) {
    const [isPending, startTransition] = useTransition()

    function handleDelete() {
        if (!proveedor) return
        startTransition(async () => {
            const result = await eliminarProveedor(proveedor.id)
            if (result.error) {
                toast.error(result.error)
                return
            }
            toast.success("Proveedor eliminado")
            onClose()
        })
    }

    return (
        <Dialog open={!!proveedor} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Eliminar Proveedor</DialogTitle>
                    <DialogDescription>
                        ¿Estás seguro de que querés eliminar a <strong>{proveedor?.nombre}</strong>?
                        Esta acción no se puede deshacer.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isPending}
                    >
                        {isPending && <Loader2 className="size-4 animate-spin" />}
                        Eliminar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
