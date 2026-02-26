import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useAppStore } from "@/store/useAppStore"

interface VentaParaPDF {
  id: string
  fecha: string
  total: number
  estado: string
  metodo_pago: string | null
  notas: string | null
  clientes: {
    nombre: string
    telefono: string | null
    email: string | null
  } | null
  autos: {
    patente: string
    marca: string | null
    modelo: string | null
    anio: number | null
  } | null
  items: Array<{
    cantidad: number
    precio_unitario: number
    productos: {
      nombre: string
      codigo: string | null
    } | null
  }>
}

export function generarComprobantePDF(venta: VentaParaPDF) {
  const settings = useAppStore.getState().settings
  const doc = new jsPDF()

  // Configuración de colores
  const primaryColor: [number, number, number] = [30, 58, 95] // #1E3A5F
  const grayColor: [number, number, number] = [100, 116, 139] // #64748B
  const lightGrayColor: [number, number, number] = [248, 250, 252] // #F8FAFC

  // --- ENCABEZADO ---
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 210, 40, "F")

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(26)
  doc.setFont("helvetica", "bold")
  doc.text(settings.name.toUpperCase(), 105, 18, { align: "center" })

  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text("COMPROBANTE DE VENTA", 105, 27, { align: "center" })

  doc.setFontSize(9)
  doc.text(`${settings.address} | CUIT: ${settings.cuit}`, 105, 34, { align: "center" })

  // --- INFORMACIÓN DE LA VENTA ---
  let yPos = 50

  doc.setTextColor(...primaryColor)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("Datos de la Venta", 15, yPos)

  yPos += 8
  doc.setTextColor(...grayColor)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")

  const estadoLabels: Record<string, string> = {
    confirmada: "Confirmada",
    presupuesto: "Presupuesto",
    cancelada: "Cancelada",
  }

  const metodoPagoLabels: Record<string, string> = {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    tarjeta: "Tarjeta",
  }

  const infoVenta = [
    { label: "N° Venta:", value: venta.id.substring(0, 8).toUpperCase() },
    {
      label: "Fecha:",
      value: new Date(venta.fecha).toLocaleDateString("es-AR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    { label: "Estado:", value: estadoLabels[venta.estado] ?? venta.estado },
    {
      label: "Método de Pago:",
      value: venta.metodo_pago ? metodoPagoLabels[venta.metodo_pago] ?? venta.metodo_pago : "No especificado",
    },
  ]

  infoVenta.forEach((info) => {
    doc.setFont("helvetica", "bold")
    doc.text(info.label, 15, yPos)
    doc.setFont("helvetica", "normal")
    doc.text(info.value, 55, yPos)
    yPos += 6
  })

  // --- INFORMACIÓN DEL CLIENTE ---
  yPos += 5
  doc.setTextColor(...primaryColor)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("Cliente", 15, yPos)

  yPos += 8
  doc.setTextColor(...grayColor)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")

  if (venta.clientes) {
    const infoCliente = [
      { label: "Nombre:", value: venta.clientes.nombre },
      { label: "Teléfono:", value: venta.clientes.telefono ?? "No especificado" },
      { label: "Email:", value: venta.clientes.email ?? "No especificado" },
    ]

    infoCliente.forEach((info) => {
      doc.setFont("helvetica", "bold")
      doc.text(info.label, 15, yPos)
      doc.setFont("helvetica", "normal")
      doc.text(info.value, 55, yPos)
      yPos += 6
    })
  } else {
    doc.text("Sin cliente asignado", 15, yPos)
    yPos += 6
  }

  // --- INFORMACIÓN DEL VEHÍCULO ---
  if (venta.autos) {
    yPos += 5
    doc.setTextColor(...primaryColor)
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("Vehículo", 15, yPos)

    yPos += 8
    doc.setTextColor(...grayColor)
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")

    const infoAuto = [
      { label: "Patente:", value: venta.autos.patente },
      { label: "Marca:", value: venta.autos.marca ?? "—" },
      { label: "Modelo:", value: venta.autos.modelo ?? "—" },
      { label: "Año:", value: venta.autos.anio ? venta.autos.anio.toString() : "—" },
    ]

    infoAuto.forEach((info) => {
      doc.setFont("helvetica", "bold")
      doc.text(info.label, 15, yPos)
      doc.setFont("helvetica", "normal")
      doc.text(info.value, 55, yPos)
      yPos += 6
    })
  }

  // --- TABLA DE PRODUCTOS ---
  yPos += 5

  const tableData = venta.items.map((item) => [
    item.productos?.nombre ?? "Producto desconocido",
    item.productos?.codigo ?? "—",
    item.cantidad.toString(),
    `$ ${item.precio_unitario.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `$ ${(item.cantidad * item.precio_unitario).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  ])

  autoTable(doc, {
    startY: yPos,
    head: [["Producto", "Código", "Cant.", "Precio Unit.", "Subtotal"]],
    body: tableData,
    theme: "plain",
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: lightGrayColor,
      textColor: primaryColor,
      fontStyle: "bold",
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 30, halign: "center" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 35, halign: "right" },
    },
    alternateRowStyles: {
      fillColor: [252, 252, 253],
    },
  })

  // --- TOTAL ---
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 20

  doc.setFillColor(...lightGrayColor)
  doc.rect(130, finalY + 5, 65, 15, "F")

  doc.setTextColor(...primaryColor)
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("TOTAL:", 135, finalY + 14)

  doc.setFontSize(16)
  doc.text(
    `$ ${venta.total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    190,
    finalY + 14,
    { align: "right" }
  )

  // --- NOTAS ---
  if (venta.notas) {
    const notasY = finalY + 30
    doc.setTextColor(...primaryColor)
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("Notas:", 15, notasY)

    doc.setTextColor(...grayColor)
    doc.setFont("helvetica", "normal")
    const notasLines = doc.splitTextToSize(venta.notas, 180)
    doc.text(notasLines, 15, notasY + 6)
  }

  // --- FOOTER ---
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setTextColor(...grayColor)
  doc.text(`${settings.name} - ${settings.address} - Tel: ${settings.phone}`, 105, pageHeight - 15, { align: "center" })
  doc.text(
    `Generado el ${new Date().toLocaleDateString("es-AR")} a las ${new Date().toLocaleTimeString("es-AR")}`,
    105,
    pageHeight - 10,
    { align: "center" }
  )

  // Descargar PDF
  const fileName = `comprobante-venta-${venta.id.substring(0, 8)}-${new Date().toISOString().split("T")[0]}.pdf`
  doc.save(fileName)
}

export interface CompraParaPDF {
  id: string
  fecha: string
  total: number
  notas: string | null
  proveedores: {
    nombre: string
    contacto: string | null
    telefono: string | null
    email: string | null
  } | null
  items: Array<{
    cantidad: number
    precio_unitario: number
    productos: {
      nombre: string
      codigo: string | null
    } | null
  }>
}

export function generarComprobanteCompraPDF(compra: CompraParaPDF) {
  const settings = useAppStore.getState().settings
  const doc = new jsPDF()

  // Configuración de colores
  const primaryColor: [number, number, number] = [30, 58, 95] // #1E3A5F
  const grayColor: [number, number, number] = [100, 116, 139] // #64748B
  const lightGrayColor: [number, number, number] = [248, 250, 252] // #F8FAFC

  // --- ENCABEZADO ---
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 210, 40, "F")

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(26)
  doc.setFont("helvetica", "bold")
  doc.text(settings.name.toUpperCase(), 105, 18, { align: "center" })

  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text("ORDEN DE COMPRA", 105, 27, { align: "center" })

  doc.setFontSize(9)
  doc.text(`${settings.address} | CUIT: ${settings.cuit}`, 105, 34, { align: "center" })

  // --- INFORMACIÓN DE LA COMPRA ---
  let yPos = 50

  doc.setTextColor(...primaryColor)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("Datos de la Compra", 15, yPos)

  yPos += 8
  doc.setTextColor(...grayColor)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")

  const infoCompra = [
    { label: "N° Compra:", value: compra.id.substring(0, 8).toUpperCase() },
    {
      label: "Fecha:",
      value: new Date(compra.fecha).toLocaleDateString("es-AR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }
  ]

  infoCompra.forEach((info) => {
    doc.setFont("helvetica", "bold")
    doc.text(info.label, 15, yPos)
    doc.setFont("helvetica", "normal")
    doc.text(info.value, 55, yPos)
    yPos += 6
  })

  // --- INFORMACIÓN DEL PROVEEDOR ---
  yPos += 5
  doc.setTextColor(...primaryColor)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("Proveedor", 15, yPos)

  yPos += 8
  doc.setTextColor(...grayColor)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")

  if (compra.proveedores) {
    const infoProveedor = [
      { label: "Nombre:", value: compra.proveedores.nombre },
      { label: "Contacto:", value: compra.proveedores.contacto ?? "No especificado" },
      { label: "Teléfono:", value: compra.proveedores.telefono ?? "No especificado" },
      { label: "Email:", value: compra.proveedores.email ?? "No especificado" },
    ]

    infoProveedor.forEach((info) => {
      doc.setFont("helvetica", "bold")
      doc.text(info.label, 15, yPos)
      doc.setFont("helvetica", "normal")
      doc.text(info.value, 55, yPos)
      yPos += 6
    })
  } else {
    doc.text("Sin proveedor especificado", 15, yPos)
    yPos += 6
  }

  // --- TABLA DE PRODUCTOS ---
  yPos += 5

  const tableData = compra.items.map((item) => [
    item.productos?.nombre ?? "Producto desconocido",
    item.productos?.codigo ?? "—",
    item.cantidad.toString(),
    `$ ${item.precio_unitario.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `$ ${(item.cantidad * item.precio_unitario).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  ])

  autoTable(doc, {
    startY: yPos,
    head: [["Producto", "Código", "Cant.", "Precio Unit.", "Subtotal"]],
    body: tableData,
    theme: "plain",
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: lightGrayColor,
      textColor: primaryColor,
      fontStyle: "bold",
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 30, halign: "center" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 35, halign: "right" },
    },
    alternateRowStyles: {
      fillColor: [252, 252, 253],
    },
  })

  // --- TOTAL ---
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 20

  doc.setFillColor(...lightGrayColor)
  doc.rect(130, finalY + 5, 65, 15, "F")

  doc.setTextColor(...primaryColor)
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("TOTAL:", 135, finalY + 14)

  doc.setFontSize(16)
  doc.text(
    `$ ${compra.total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    190,
    finalY + 14,
    { align: "right" }
  )

  // --- NOTAS ---
  if (compra.notas) {
    const notasY = finalY + 30
    doc.setTextColor(...primaryColor)
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("Notas:", 15, notasY)

    doc.setTextColor(...grayColor)
    doc.setFont("helvetica", "normal")
    const notasLines = doc.splitTextToSize(compra.notas, 180)
    doc.text(notasLines, 15, notasY + 6)
  }

  // --- FOOTER ---
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setTextColor(...grayColor)
  doc.text(`${settings.name} - ${settings.address} - Tel: ${settings.phone}`, 105, pageHeight - 15, { align: "center" })
  doc.text(
    `Generado el ${new Date().toLocaleDateString("es-AR")} a las ${new Date().toLocaleTimeString("es-AR")}`,
    105,
    pageHeight - 10,
    { align: "center" }
  )

  const fileName = `comprobante-compra-${compra.id.substring(0, 8)}-${new Date().toISOString().split("T")[0]}.pdf`
  doc.save(fileName)
}
