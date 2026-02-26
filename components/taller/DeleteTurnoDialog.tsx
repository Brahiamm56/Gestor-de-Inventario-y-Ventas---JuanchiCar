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
import { eliminarTurno } from "@/app/(dashboard)/taller/actions"
import type { TurnoConDetalles } from "@/types/database"

interface DeleteTurnoDialogProps {
    turno: TurnoConDetalles | null
    onClose: () => void
}

export default function DeleteTurnoDialog({ turno, onClose }: DeleteTurnoDialogProps) {
    const [isPending, startTransition] = useTransition()

    function handleDelete() {
        if (!turno) return
        startTransition(async () => {
            const result = await eliminarTurno(turno.id)
            if (result.error) {
                toast.error(result.error)
                return
            }
            toast.success("Turno eliminado")
            onClose()
        })
    }

    return (
        <Dialog open={!!turno} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Eliminar Turno</DialogTitle>
                    <DialogDescription>
                        ¿Estás seguro de que querés eliminar el turno de{" "}
                        <strong>{turno?.clientes?.nombre || "Sin cliente"}</strong> para el trabajo de{" "}
                        <strong>{turno?.descripcion}</strong>? Esta acción no se puede deshacer.
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
