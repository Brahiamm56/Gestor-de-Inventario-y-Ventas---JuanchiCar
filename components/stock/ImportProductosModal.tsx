"use client"

import { useState, useRef, useCallback, useTransition } from "react"
import * as XLSX from "xlsx"
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { importarProductos } from "@/app/(dashboard)/stock/actions"
import {
  construirMapeo,
  mapearFila,
  validarFilas,
  filtrarFilasVacias,
  type ExcelRow,
  type FilaValidada,
  type ProductoParaImportar,
} from "@/lib/excelUtils"

// ─────────────────────────────────────────────
// Tipos y constantes
// ─────────────────────────────────────────────

type Step = "idle" | "preview" | "done"

const PREVIEW_ROWS = 5

interface ResultadoImportacion {
  importados: number
  omitidos: number
  detalleOmitidos: Array<{ fila: number; motivo: string }>
}

interface ImportProductosModalProps {
  open: boolean
  onClose: () => void
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────

export default function ImportProductosModal({
  open,
  onClose,
}: ImportProductosModalProps) {
  const [step, setStep] = useState<Step>("idle")
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState("")
  const [filasValidadas, setFilasValidadas] = useState<FilaValidada[]>([])
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null)
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const validCount = filasValidadas.filter((f) => f.valida).length
  const invalidCount = filasValidadas.filter((f) => !f.valida).length

  // ── Resetear estado ────────────────────────────────────────────────────
  function resetState() {
    setStep("idle")
    setDragOver(false)
    setFileName("")
    setFilasValidadas([])
    setResultado(null)
    setShowErrorDetails(false)
    if (inputRef.current) inputRef.current.value = ""
  }

  function handleClose() {
    resetState()
    onClose()
  }

  // ── Procesar archivo ───────────────────────────────────────────────────
  function processFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Formato no válido. Usá archivos .xlsx, .xls o .csv")
      return
    }

    setFileName(file.name)
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          toast.error("No se pudo leer el archivo")
          return
        }

        const wb = XLSX.read(data, { type: "binary" })
        const ws = wb.Sheets[wb.SheetNames[0]]

        // raw: true mantiene los tipos numéricos; defval: null para celdas vacías
        const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(ws, {
          defval: null,
          raw: true,
        })

        if (jsonData.length === 0) {
          toast.error("El archivo está vacío o no tiene filas de datos")
          return
        }

        const headers = Object.keys(jsonData[0])
        const mapeo = construirMapeo(headers)

        // Mapear + filtrar filas vacías + validar
        const filasMapeadas = jsonData.map((row) => mapearFila(row, mapeo))
        const filasSinVacias = filtrarFilasVacias(filasMapeadas)

        if (filasSinVacias.length === 0) {
          toast.error("No se encontraron datos en el archivo")
          return
        }

        const filasVal = validarFilas(filasSinVacias)
        setFilasValidadas(filasVal)
        setStep("preview")
      } catch {
        toast.error("Error al leer el archivo. Verificá que no esté corrupto")
      }
    }

    reader.onerror = () => {
      toast.error("Error al leer el archivo")
    }

    reader.readAsBinaryString(file)
  }

  // ── Drag & Drop handlers ───────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Limpiar para poder seleccionar el mismo archivo de nuevo
    e.target.value = ""
  }

  // ── Importar ───────────────────────────────────────────────────────────
  function handleImport() {
    const filasParaImportar: ProductoParaImportar[] = filasValidadas
      .filter((f) => f.valida)
      .map((f) => ({
        nombre: f.datos.nombre,
        codigo: f.datos.codigo,
        categoria: f.datos.categoria,
        precio_venta: f.datos.precio_venta ?? 0,
        stock: f.datos.stock ?? 0,
        stock_minimo: f.datos.stock_minimo ?? 5,
        descripcion: f.datos.descripcion,
      }))

    if (filasParaImportar.length === 0) {
      toast.error("No hay productos válidos para importar")
      return
    }

    startTransition(async () => {
      const res = await importarProductos(filasParaImportar)

      if ("error" in res) {
        toast.error(res.error)
        return
      }

      setResultado({
        importados: res.importados,
        omitidos: res.omitidos,
        detalleOmitidos: res.detalleOmitidos,
      })
      setStep("done")
    })
  }

  // ── Descargar plantilla Excel ──────────────────────────────────────────
  function descargarTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      [
        "Nombre",
        "Código",
        "Categoría",
        "Precio Venta",
        "Stock",
        "Stock Mínimo",
        "Descripción",
      ],
      ["Aceite 10W40 1L", "ACE-001", "Lubricantes", 850, 10, 3, "Aceite sintético"],
      ["Filtro de Aceite", "FIL-001", "Filtros", 450, 5, 2, ""],
    ])
    ws["!cols"] = [
      { wch: 25 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 8 },
      { wch: 12 },
      { wch: 30 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Productos")
    XLSX.writeFile(wb, "plantilla_productos.xlsx")
  }

  // ── Descargar reporte de errores ───────────────────────────────────────
  function descargarReporte() {
    const erroresValidacion = filasValidadas
      .filter((f) => !f.valida)
      .map((f) => ({
        Fila: f.fila,
        Producto: f.datos.nombre || "(sin nombre)",
        Código: f.datos.codigo || "",
        Error: f.errores.join("; "),
        Acción: "Rechazado en validación",
      }))

    const erroresImportacion = (resultado?.detalleOmitidos ?? []).map((o) => ({
      Fila: o.fila,
      Producto: "",
      Código: "",
      Error: o.motivo,
      Acción: "Omitido (código existente en sistema)",
    }))

    const todos = [...erroresValidacion, ...erroresImportacion]
    if (todos.length === 0) return

    const ws = XLSX.utils.json_to_sheet(todos)
    ws["!cols"] = [
      { wch: 6 },
      { wch: 30 },
      { wch: 12 },
      { wch: 55 },
      { wch: 35 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Errores de importación")
    XLSX.writeFile(wb, "reporte_importacion.xlsx")
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="size-5 text-[#1E3A5F]" />
            Importar productos desde Excel
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Subí un archivo .xlsx, .xls o .csv con múltiples productos
          </DialogDescription>
        </DialogHeader>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ── PASO 1: Subir archivo ── */}
          {step === "idle" && (
            <>
              {/* Zona drag & drop */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
                  dragOver
                    ? "border-[#1E3A5F] bg-blue-50/60 scale-[1.01]"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <Upload
                  className={`size-10 mx-auto mb-3 transition-colors ${
                    dragOver ? "text-[#1E3A5F]" : "text-slate-300"
                  }`}
                />
                <p className="text-sm font-medium text-slate-600">
                  Arrastrá tu archivo aquí, o hacé clic para seleccionar
                </p>
                <p className="text-xs text-slate-400 mt-1.5">
                  Formatos aceptados: .xlsx, .xls, .csv
                </p>
              </div>

              {/* Descarga de plantilla */}
              <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-100">
                <div>
                  <p className="text-xs font-medium text-slate-600">
                    ¿Necesitás el formato correcto?
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Descargá la plantilla con las columnas necesarias
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={descargarTemplate}
                  className="h-8 text-xs gap-1.5 shrink-0"
                >
                  <Download className="size-3.5" />
                  Descargar plantilla
                </Button>
              </div>

              {/* Columnas reconocidas */}
              <div className="text-xs text-slate-400 space-y-1.5">
                <p className="font-medium text-slate-500">
                  Columnas detectadas automáticamente:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Nombre *",
                    "Código",
                    "Categoría",
                    "Precio Venta *",
                    "Stock",
                    "Stock Mínimo",
                    "Descripción",
                  ].map((col) => (
                    <Badge
                      key={col}
                      variant="secondary"
                      className="text-[11px] font-normal bg-slate-100 text-slate-500 border-none"
                    >
                      {col}
                    </Badge>
                  ))}
                </div>
                <p className="text-[11px]">
                  * Obligatorio. Los nombres de columnas se detectan en varios idiomas y formatos.
                </p>
              </div>
            </>
          )}

          {/* ── PASO 2: Vista previa y validación ── */}
          {step === "preview" && (
            <>
              {/* Info del archivo */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <FileSpreadsheet className="size-4 text-slate-400" />
                  <span className="font-medium text-slate-700 truncate max-w-[200px]">
                    {fileName}
                  </span>
                  <span className="text-slate-400 shrink-0">
                    — {filasValidadas.length} filas
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-slate-500 gap-1"
                  onClick={resetState}
                  disabled={isPending}
                >
                  <X className="size-3" />
                  Cambiar archivo
                </Button>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-2xl font-bold text-slate-800">
                    {filasValidadas.length}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Total</p>
                </div>
                <div className="rounded-lg border border-green-100 bg-green-50 p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{validCount}</p>
                  <p className="text-xs text-green-600 mt-0.5">Válidos</p>
                </div>
                <div
                  className={`rounded-lg p-3 text-center border ${
                    invalidCount > 0
                      ? "border-red-100 bg-red-50"
                      : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <p
                    className={`text-2xl font-bold ${
                      invalidCount > 0 ? "text-red-700" : "text-slate-400"
                    }`}
                  >
                    {invalidCount}
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${
                      invalidCount > 0 ? "text-red-600" : "text-slate-400"
                    }`}
                  >
                    Con errores
                  </p>
                </div>
              </div>

              {/* Tabla de vista previa */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">
                  Vista previa — primeras {Math.min(PREVIEW_ROWS, filasValidadas.length)} filas:
                </p>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto max-h-52">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                          <TableHead className="text-xs text-slate-500 w-10">#</TableHead>
                          <TableHead className="text-xs text-slate-500">Nombre</TableHead>
                          <TableHead className="text-xs text-slate-500">Código</TableHead>
                          <TableHead className="text-xs text-slate-500">Categoría</TableHead>
                          <TableHead className="text-xs text-slate-500 text-right">
                            P. Venta
                          </TableHead>
                          <TableHead className="text-xs text-slate-500 text-center">
                            Stock
                          </TableHead>
                          <TableHead className="text-xs text-slate-500">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filasValidadas.slice(0, PREVIEW_ROWS).map((fila) => (
                          <TableRow
                            key={fila.fila}
                            className={
                              fila.valida
                                ? "hover:bg-slate-50/60"
                                : "bg-red-50/40 hover:bg-red-50/60"
                            }
                          >
                            <TableCell className="text-xs text-slate-400 py-3">
                              {fila.fila}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-800 py-3 max-w-[140px] truncate">
                              {fila.datos.nombre || (
                                <span className="text-red-400 italic">vacío</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 py-3">
                              {fila.datos.codigo || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 py-3">
                              {fila.datos.categoria || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-right py-3">
                              {fila.datos.precio_venta !== undefined ? (
                                <span className="text-slate-800">
                                  ${fila.datos.precio_venta.toLocaleString("es-AR")}
                                </span>
                              ) : (
                                <span className="text-red-400">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-center py-3 text-slate-700">
                              {fila.datos.stock ?? 0}
                            </TableCell>
                            <TableCell className="py-3">
                              {fila.valida ? (
                                <Badge className="bg-green-100 text-green-700 border-none text-[10px] px-1.5 py-0.5 font-medium">
                                  OK
                                </Badge>
                              ) : (
                                <span className="text-red-500 text-[10px] leading-tight">
                                  {fila.errores[0]}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {filasValidadas.length > PREVIEW_ROWS && (
                    <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100 bg-slate-50">
                      ... y {filasValidadas.length - PREVIEW_ROWS} fila
                      {filasValidadas.length - PREVIEW_ROWS !== 1 ? "s" : ""} más
                    </div>
                  )}
                </div>
              </div>

              {/* Detalle de errores de validación */}
              {invalidCount > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between text-sm font-medium text-amber-800"
                    onClick={() => setShowErrorDetails((v) => !v)}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4 shrink-0" />
                      <span>
                        {invalidCount} fila{invalidCount !== 1 ? "s" : ""} con errores —
                        serán omitidas
                      </span>
                    </div>
                    {showErrorDetails ? (
                      <ChevronUp className="size-4 shrink-0" />
                    ) : (
                      <ChevronDown className="size-4 shrink-0" />
                    )}
                  </button>
                  {showErrorDetails && (
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {filasValidadas
                        .filter((f) => !f.valida)
                        .map((f) => (
                          <div key={f.fila} className="text-xs text-amber-700">
                            <span className="font-semibold">Fila {f.fila}:</span>{" "}
                            {f.errores.join(" · ")}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sin productos válidos */}
              {validCount === 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2 text-sm text-red-700">
                  <XCircle className="size-4 shrink-0 mt-0.5" />
                  <span>
                    No hay productos válidos para importar. Corregí el archivo y volvé
                    a intentarlo.
                  </span>
                </div>
              )}
            </>
          )}

          {/* ── PASO 3: Resultado ── */}
          {step === "done" && resultado && (
            <>
              {/* Ícono y título */}
              <div className="flex flex-col items-center text-center py-4">
                <CheckCircle2 className="size-12 text-green-500 mb-3" />
                <h3 className="text-lg font-semibold text-slate-800">
                  Importación completada
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Se procesaron {filasValidadas.length} fila
                  {filasValidadas.length !== 1 ? "s" : ""} del archivo
                </p>
              </div>

              {/* Estadísticas finales */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {resultado.importados}
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">Importados</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">
                    {invalidCount + resultado.omitidos}
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">Omitidos</p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-2xl font-bold text-slate-700">
                    {filasValidadas.length}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Total</p>
                </div>
              </div>

              {/* Detalle de omitidos */}
              {(invalidCount > 0 || resultado.detalleOmitidos.length > 0) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between text-sm font-medium text-amber-800"
                    onClick={() => setShowErrorDetails((v) => !v)}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4 shrink-0" />
                      Ver detalle de productos omitidos
                    </div>
                    {showErrorDetails ? (
                      <ChevronUp className="size-4 shrink-0" />
                    ) : (
                      <ChevronDown className="size-4 shrink-0" />
                    )}
                  </button>
                  {showErrorDetails && (
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {filasValidadas
                        .filter((f) => !f.valida)
                        .map((f) => (
                          <div key={`val-${f.fila}`} className="text-xs text-amber-700">
                            <span className="font-semibold">
                              Fila {f.fila} (validación):
                            </span>{" "}
                            {f.errores.join(" · ")}
                          </div>
                        ))}
                      {resultado.detalleOmitidos.map((o) => (
                        <div key={`imp-${o.fila}`} className="text-xs text-amber-700">
                          <span className="font-semibold">
                            Fila {o.fila} (código existente):
                          </span>{" "}
                          {o.motivo}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Descargar reporte de errores */}
              {(invalidCount > 0 || resultado.detalleOmitidos.length > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={descargarReporte}
                  className="w-full gap-2 text-xs h-9"
                >
                  <Download className="size-3.5" />
                  Descargar reporte de errores en Excel
                </Button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4 flex justify-between gap-2">
          {step === "done" ? (
            <Button
              onClick={handleClose}
              className="w-full"
              style={{ backgroundColor: "#1E3A5F" }}
            >
              Cerrar
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancelar
              </Button>

              {step === "preview" && (
                <Button
                  onClick={handleImport}
                  disabled={validCount === 0 || isPending}
                  style={{ backgroundColor: "#1E3A5F" }}
                  className="gap-2"
                >
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  {isPending
                    ? "Importando..."
                    : `Importar ${validCount} producto${validCount !== 1 ? "s" : ""}`}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
