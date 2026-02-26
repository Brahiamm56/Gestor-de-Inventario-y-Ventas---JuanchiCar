/**
 * Exporta datos a CSV y descarga el archivo
 */
export function exportarCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: Array<{ key: keyof T; label: string; format?: (value: unknown) => string }>,
  filename: string
) {
  if (data.length === 0) return

  // Header
  const header = columns.map((col) => col.label).join(",")

  // Rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key]
        const formatted = col.format ? col.format(value) : String(value ?? "")
        // Escapar comillas y envolver en comillas si contiene comas
        const escaped = formatted.replace(/"/g, '""')
        return `"${escaped}"`
      })
      .join(",")
  )

  const csv = [header, ...rows].join("\n")

  // BOM para que Excel interprete UTF-8
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
