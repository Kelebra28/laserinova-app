import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";
import sharp from "sharp";

export async function generateQuotePDF(quoteOrQuotes: any | any[]): Promise<Buffer> {
  const doc = new jsPDF();
  const quotes = Array.isArray(quoteOrQuotes) ? quoteOrQuotes : [quoteOrQuotes];
  const pageWidth = doc.internal.pageSize.width;

  const drawHeader = (d: jsPDF, isFirstPage: boolean = false) => {
    try {
      const logoPath = path.join(process.cwd(), "public", "logo_pdf.png");
      const logoBuffer = fs.readFileSync(logoPath);
      const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
      d.addImage(logoBase64, "PNG", 14, 10, 50, 15);
    } catch (error) {
      if (isFirstPage) console.error("No se pudo cargar el logo para el PDF", error);
      d.setFont("helvetica", "bolditalic");
      d.setFontSize(24);
      d.setTextColor(0, 0, 0);
      d.text("LASER INOVA", 14, 22);
    }
    d.setFont("helvetica", "bold");
    d.setFontSize(22);
    d.setTextColor(0, 0, 0);
    d.text("COTIZACIÓN", pageWidth / 2, 22, { align: "center" });
    d.setDrawColor(0);
    d.setLineWidth(0.5);
    d.line(14, 30, pageWidth - 14, 30);
  };

  const drawFooter = (d: jsPDF) => {
    const pHeight = d.internal.pageSize.height;
    const footerY = pHeight - 30;
    d.setDrawColor(0);
    d.setLineWidth(0.5);
    d.line(14, footerY, pageWidth - 14, footerY);
    d.setFont("helvetica", "bold");
    d.setFontSize(9);
    d.setTextColor(0);
    d.text("www.laserinova.com", 14, footerY + 6);
    d.text("info@laserinova.com", pageWidth - 14, footerY + 6, { align: "right" });
  };

  for (let qIndex = 0; qIndex < quotes.length; qIndex++) {
    const quote = quotes[qIndex];
    if (qIndex > 0) {
      doc.addPage();
    }

    // Initial header for this quote
    drawHeader(doc, qIndex === 0);

    // Top Right Details (Fecha & Folio)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const formattedDate = new Date(quote.createdAt).toLocaleDateString("es-MX");
    doc.text(`Fecha:   ${formattedDate}`, pageWidth - 14, 38, { align: "right" });

    let folioText = quote.folio;
    if (quotes.length > 1 && quote.versionName) {
      folioText += ` (${quote.versionName})`;
    }
    doc.text(`No. de Cotización:   ${folioText}`, pageWidth - 14, 44, { align: "right" });

    // Top Left Details (Client & Project)
    let currentY = 38;

    // Show registered client OR prospect name
    const displayName = quote.client?.name || quote.prospectName;
    const displayCompany = quote.client?.company;

    if (displayName) {
      doc.setFont("helvetica", "normal");
      doc.text("PARA:", 14, currentY);
      doc.setFont("helvetica", "bold");
      doc.text(displayName, 35, currentY);
      currentY += 6;
      if (displayCompany) {
        doc.setFont("helvetica", "normal");
        doc.text(displayCompany, 35, currentY);
        currentY += 6;
      }
      if (!quote.client && quote.prospectName) {
        currentY += 2;
      }
    }

    doc.setFont("helvetica", "normal");
    doc.text("Proyecto:", 14, currentY);
    doc.text(quote.project || "", 35, currentY);
    currentY += 12;

    // Description (General)
    let tableStartY = currentY;
    if (quote.description) {
      doc.setFont("helvetica", "normal");
      const splitDesc = doc.splitTextToSize(quote.description, pageWidth - 28);
      doc.text(splitDesc, 14, currentY);
      tableStartY = currentY + (splitDesc.length * 5) + 5;
    }

    // Concepts Table — headers: Descripción | Cant | Detalles | Importe Unitario | Importe
    const tableColumn = ["Descripción", "Cant", "Detalles", "Importe Unitario", "Importe"];
    const tableRows: any[][] = [];
    const fmt = (n: number) =>
      `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    quote.concepts.forEach((concept: any) => {
      let detalles = concept.details || "";
      if (!detalles) {
        const parts = [];
        if (concept.conceptType === "CORTE" || concept.conceptType === "GRABADO") {
          parts.push(`Servicio de ${concept.conceptType.toLowerCase()}`);
          if (concept.material) parts.push(`en ${concept.material.name}`);
          if (concept.width && concept.height) parts.push(`Medidas: ${concept.width}x${concept.height}cm`);
          if (concept.clientProvidesMaterial) parts.push(`(Material proporcionado por el cliente)`);
        } else if (concept.conceptType === "RESALE") {
          parts.push("Artículo de reventa");
        }
        detalles = parts.join(". ") + (parts.length > 0 ? "." : "");
      }

      let unitPrice = concept.finalUnitPrice ?? 0;
      let total = unitPrice * concept.quantity;

      const conceptsSum = quote.concepts.reduce((sum: number, c: any) => sum + ((c.finalUnitPrice ?? 0) * c.quantity), 0);
      const isOldFormat = quote.taxable && Math.abs(conceptsSum - quote.total) < 0.05;

      // Si la cotización es de formato anterior (con IVA incluido en conceptos), mostramos los importes divididos por el taxFactor
      if (isOldFormat && quote.subtotal > 0) {
        const taxFactor = quote.total / quote.subtotal;
        unitPrice = unitPrice / taxFactor;
        total = total / taxFactor;
      }

      tableRows.push([
        concept.description,
        concept.quantity.toString(),
        detalles,
        fmt(unitPrice),
        fmt(total),
      ]);
    });

    // We only hook didDrawPage for this specific table rendering
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: tableStartY,
      theme: "striped",
      headStyles: { fillColor: [100, 100, 100], textColor: 255, fontSize: 10, fontStyle: "bold" },
      bodyStyles: { fontSize: 9, textColor: 50 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 15, halign: "center" },
        2: { cellWidth: "auto" },
        3: { cellWidth: 30, halign: "right" },
        4: { cellWidth: 30, halign: "right" }
      },
      margin: { top: 35, bottom: 40 },
      didDrawPage: (data) => {
        // Prevent drawing header twice on the first page of this quote
        if (data.pageNumber > 1 && data.cursor?.y === data.settings.margin.top) {
          drawHeader(doc);
        }
        drawFooter(doc);
      }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || tableStartY + 20;

    // Totals Section (Right aligned)
    const totalsY = finalY + 10;
    doc.setFontSize(11);

    doc.setFont("helvetica", "bold");
    doc.text("Subtotal:", pageWidth - 45, totalsY, { align: "right" });
    doc.text(fmt(quote.subtotal), pageWidth - 14, totalsY, { align: "right" });

    doc.text("IVA:", pageWidth - 45, totalsY + 8, { align: "right" });
    doc.text(fmt(quote.tax), pageWidth - 14, totalsY + 8, { align: "right" });

    doc.setFontSize(13);
    doc.text(fmt(quote.total), pageWidth - 14, totalsY + 20, { align: "right" });

    // Footer / Consideraciones
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0);

    const rawConsiderations = quote.visibleConsiderations ||
      "- Tiempo de entrega: de 4 a 5 días hábiles.\n- Formato de diseño: Se solicita que el cliente proporcione los diseños en formato vectorial (AI, CDR, SVG, PDF), o en alta resolución (JPG, PNG) si no es vectorial, para garantizar la calidad del grabado, corte e impresión.\n- 50% anticipo, 50% al programar envío o entrega.\n- El costo puede variar si hay cambios en medidas o diseño.\n- No incluye gastos de envío.\n- Vigencia de cotización 7 días.";

    const considerationsLines = [
      "- Consideraciones:",
      ...rawConsiderations.split("\n")
    ];

    const maxWidth = pageWidth - 28;
    const wrappedLines: string[] = [];
    considerationsLines.forEach(line => {
      const split = doc.splitTextToSize(line, maxWidth);
      if (Array.isArray(split)) {
        wrappedLines.push(...split);
      } else {
        wrappedLines.push(split);
      }
    });

    const pageHeight = doc.internal.pageSize.height;
    const marginThreshold = pageHeight - 35;
    let currentTextY = totalsY + 30;

    if (currentTextY > marginThreshold - 10) {
      doc.addPage();
      drawHeader(doc);
      drawFooter(doc);
      currentTextY = 40;
    }

    wrappedLines.forEach(line => {
      if (currentTextY > marginThreshold) {
        doc.addPage();
        drawHeader(doc);
        drawFooter(doc);
        currentTextY = 40;
      }

      if (line.includes("- Consideraciones:")) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        // Resaltar un poco más la palabra
        doc.text(line, 14, currentTextY);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(line, 14, currentTextY);
      }
      currentTextY += 5;
    });

    // Anexo de Imágenes en Grid
    const parsedImages = quote.images ? (typeof quote.images === 'string' ? JSON.parse(quote.images) : quote.images) : [];
    const images: string[] = Array.isArray(parsedImages) ? parsedImages : [];

    if (images.length > 0) {
      currentTextY += 10;

      if (currentTextY > pageHeight - 40) {
        doc.addPage();
        drawHeader(doc);
        drawFooter(doc);
        currentTextY = 40;
      }

      const drawImageNote = (y: number) => {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("* Imágenes de referencia con fines ilustrativos", 68, y);
        doc.setTextColor(0);
      };

      drawImageNote(currentTextY);
      currentTextY += 5;

      const columns = 4;
      const gap = 4;
      const marginX = 14;
      const usableWidth = pageWidth - (marginX * 2);
      const imgW_single = (usableWidth - (gap * (columns - 1))) / columns;

      let currentCol = 0;
      let maxRowH = 0;

      for (let i = 0; i < images.length; i++) {
        try {
          const imgUrl = images[i];
          let imageBuffer: Buffer | null = null;

          if (imgUrl.startsWith("data:image/")) {
            const base64Data = imgUrl.split(",")[1];
            imageBuffer = Buffer.from(base64Data, "base64");
          } else {
            const imgPath = path.join(process.cwd(), "public", imgUrl);
            if (fs.existsSync(imgPath)) {
              imageBuffer = fs.readFileSync(imgPath);
            }
          }

          if (imageBuffer) {
            const metadata = await sharp(imageBuffer).metadata();
            const originalWidth = metadata.width || 1;
            const originalHeight = metadata.height || 1;
            const aspectRatio = originalWidth / originalHeight;

            let span = 1;
            if (aspectRatio > 1.25 && aspectRatio <= 2.25) {
              span = 2;
            } else if (aspectRatio > 2.25 && aspectRatio <= 3.25) {
              span = 3;
            } else if (aspectRatio > 3.25) {
              span = 4;
            }

            const renderW = (imgW_single * span) + (gap * (span - 1));
            const renderH = renderW / aspectRatio;

            if (currentCol + span > 4) {
              currentTextY += maxRowH + gap;
              currentCol = 0;
              maxRowH = 0;
            }

            if (currentTextY + renderH > pageHeight - 30) {
              doc.addPage();
              drawHeader(doc);
              drawFooter(doc);
              currentTextY = 40;
              currentCol = 0;
              maxRowH = 0;
              
              drawImageNote(currentTextY);
              currentTextY += 5;
            }

            const pngBuffer = await sharp(imageBuffer)
              .resize(Math.round(renderW * 3), Math.round(renderH * 3), { fit: "inside" })
              .png()
              .toBuffer();
            const base64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;

            const currentX = marginX + currentCol * (imgW_single + gap);
            doc.addImage(base64, "PNG", currentX, currentTextY, renderW, renderH);

            currentCol += span;
            maxRowH = Math.max(maxRowH, renderH);

            if (currentCol >= 4) {
              currentCol = 0;
              currentTextY += maxRowH + gap;
              maxRowH = 0;
            }
          }
        } catch (err) {
          console.error("Error rendering quote image in PDF:", err);
        }
      }
    }
  }

  const buffer = Buffer.from(doc.output("arraybuffer"));
  return buffer;
}

export async function generateMonthlyReportPDF(quotes: any[], month: number, year: number): Promise<Buffer> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  // Header
  try {
    const logoPath = path.join(process.cwd(), "public", "logo_pdf.png");
    const logoBuffer = fs.readFileSync(logoPath);
    const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
    doc.addImage(logoBase64, "PNG", 14, 10, 40, 12);
  } catch (error) {
    doc.setFontSize(18);
    doc.text("LASER INOVA", 14, 20);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`REPORTE MENSUAL: ${monthNames[month - 1].toUpperCase()} ${year}`, pageWidth / 2, 25, { align: "center" });

  doc.setDrawColor(200);
  doc.line(14, 30, pageWidth - 14, 30);

  // Stats Summary
  const activeQuotes = quotes.filter(q => q.status !== "CANCELLED" && q.status !== "REJECTED");
  const totalAmount = activeQuotes.reduce((sum, q) => sum + q.total, 0);
  const totalCollected = quotes.reduce((sum, q) => sum + (q.realAmountCollected || 0), 0);
  const totalUtility = activeQuotes.reduce((sum, q) => sum + (q.realUtilityTotal || 0), 0);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Total Cotizaciones: ${quotes.length}`, 14, 40);
  doc.text(`Total Cotizado: $${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 14, 46);
  doc.text(`Cobrado Real: $${totalCollected.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 80, 40);
  doc.text(`Utilidad Estimada Total: $${totalUtility.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 80, 46);

  // Table
  const tableColumn = ["Folio", "Fecha", "Cliente", "Estatus", "Total", "Utilidad"];
  const tableRows = quotes.map(q => [
    q.folio,
    new Date(q.createdAt).toLocaleDateString("es-MX"),
    q.client?.name || "Sin cliente",
    q.status,
    `$${q.total.toFixed(2)}`,
    `$${(q.realUtilityTotal || 0).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 55,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38] }, // Red-600
    styles: { fontSize: 8 },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;
  const totalCosts = totalCollected - totalUtility;

  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.5);
  doc.rect(14, finalY, pageWidth - 28, 40);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("RESUMEN DE RESULTADOS", pageWidth / 2, finalY + 10, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Total Ingresos (Cobrado Real):", 20, finalY + 20);
  doc.setFont("helvetica", "bold");
  doc.text(`$${totalCollected.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY + 20, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.text("Total Gastos Operativos:", 20, finalY + 27);
  doc.setFont("helvetica", "bold");
  doc.text(`$${totalCosts.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY + 27, { align: "right" });

  doc.setDrawColor(200);
  doc.line(20, finalY + 31, pageWidth - 20, finalY + 31);

  doc.setFontSize(11);
  doc.setTextColor(220, 38, 38);
  doc.text("UTILIDAD REAL NETA:", 20, finalY + 36);
  doc.text(`$${totalUtility.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY + 36, { align: "right" });

  const buffer = Buffer.from(doc.output("arraybuffer"));
  return buffer;
}
