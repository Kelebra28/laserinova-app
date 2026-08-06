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

export async function generateMonthlyReportPDF(quotes: any[], month: number, year: number, tab: string = 'finanzas'): Promise<Buffer> {
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
  
  const titles: Record<string, string> = {
    'finanzas': 'FINANCIERO',
    'clientes': 'DE CLIENTES',
    'inventario': 'DE INVENTARIO',
    'procesos': 'DE PROCESOS'
  };
  
  doc.text(`REPORTE ${titles[tab] || 'MENSUAL'}: ${monthNames[month - 1].toUpperCase()} ${year}`, pageWidth / 2, 25, { align: "center" });

  doc.setDrawColor(200);
  doc.line(14, 30, pageWidth - 14, 30);

  // Stats Summary
  const activeQuotes = quotes.filter(q => q.status !== "CANCELLED" && q.status !== "REJECTED");
  const totalAmount = activeQuotes.reduce((sum, q) => sum + q.total, 0);
  const totalCollected = quotes.reduce((sum, q) => sum + (q.realAmountCollected || 0), 0);
  const totalUtility = activeQuotes.reduce((sum, q) => sum + (q.realUtilityTotal || 0), 0);

  if (tab === 'finanzas') {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Cotizaciones: ${quotes.length}`, 14, 40);
    doc.text(`Total Cotizado: $${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 14, 46);
    doc.text(`Cobrado Real: $${totalCollected.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 80, 40);
    doc.text(`Utilidad Estimada Total: $${totalUtility.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 80, 46);

    const tableColumn = ["Folio", "Fecha", "Cliente", "Estatus", "Total", "Utilidad"];
    const tableRows = quotes.map(q => [
      q.folio,
      new Date(q.createdAt).toLocaleDateString("es-MX"),
      q.client?.name || q.prospectName || "Sin cliente",
      q.status,
      `$${q.total.toFixed(2)}`,
      `$${(q.realUtilityTotal || 0).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 55,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 8 },
      columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' } }
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
  } 
  else if (tab === 'clientes') {
    const clientsStats = Array.from(quotes.reduce((acc, q) => {
      const cId = q.clientId || `prospect_${q.prospectName || 'unknown'}`;
      if (!acc.has(cId)) acc.set(cId, { name: q.client?.name || q.prospectName || 'Sin Cliente', count: 0, total: 0, utility: 0 });
      const entry = acc.get(cId);
      entry.count += 1;
      if(q.status !== "CANCELLED" && q.status !== "REJECTED") {
        entry.total += q.total;
        entry.utility += (q.realUtilityTotal || 0);
      }
      return acc;
    }, new Map()).values()).sort((a: any, b: any) => b.total - a.total);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Clientes Activos: ${clientsStats.length}`, 14, 40);
    doc.text(`Ingreso Total Generado: $${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 80, 40);

    const tableColumn = ["Cliente / Prospecto", "Cotizaciones", "Ingreso Aprobado", "Utilidad Neta"];
    const tableRows = clientsStats.map((c: any) => [
      c.name,
      c.count.toString(),
      `$${c.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      `$${c.utility.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: 50,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
    });
  }
  else if (tab === 'inventario') {
    const productsStats = Array.from(activeQuotes.reduce((acc, q) => {
      q.concepts.forEach((c: any) => {
        if(c.conceptType === "PRODUCTO" || c.conceptType === "RESALE") {
          const pName = c.description || 'Producto sin nombre';
          if (!acc.has(pName)) acc.set(pName, { name: pName, type: c.conceptType, quantity: 0, revenue: 0, cost: 0 });
          const entry = acc.get(pName);
          entry.quantity += c.quantity;
          entry.revenue += ((c.finalUnitPrice || 0) * c.quantity);
          entry.cost += ((c.realCost || 0));
        }
      });
      return acc;
    }, new Map()).values()).sort((a: any, b: any) => b.revenue - a.revenue);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Productos Únicos: ${productsStats.length}`, 14, 40);

    const tableColumn = ["Producto", "Tipo", "Cantidad", "Ingreso Generado", "Utilidad"];
    const tableRows = productsStats.map((p: any) => [
      p.name,
      p.type === 'RESALE' ? 'Reventa' : 'Propio',
      p.quantity.toString(),
      `$${p.revenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      `$${(p.revenue - p.cost).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: 50,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 8 },
      columnStyles: { 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
    });
  }
  else if (tab === 'procesos') {
    const processesStats = Array.from(activeQuotes.reduce((acc, q) => {
      q.concepts.forEach((c: any) => {
        if(c.conceptType !== "PRODUCTO" && c.conceptType !== "RESALE") {
          const type = c.conceptType;
          if (!acc.has(type)) acc.set(type, { name: type, quantity: 0, revenue: 0, cost: 0, utility: 0 });
          const entry = acc.get(type);
          entry.quantity += c.quantity;
          entry.revenue += ((c.finalUnitPrice || 0) * c.quantity);
          entry.cost += (c.realCost || 0);
          entry.utility += (((c.finalUnitPrice || 0) * c.quantity) - (c.realCost || 0));
        }
      });
      return acc;
    }, new Map()).values()).sort((a: any, b: any) => b.revenue - a.revenue);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Tipos de Procesos Prestados: ${processesStats.length}`, 14, 40);

    const tableColumn = ["Servicio / Proceso", "Contrataciones", "Ingreso Generado", "Utilidad Neta"];
    const tableRows = processesStats.map((p: any) => [
      p.name,
      p.quantity.toString(),
      `$${p.revenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      `$${p.utility.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: 50,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
    });
  }

  const buffer = Buffer.from(doc.output("arraybuffer"));
  return buffer;
}

export async function generateReceiptPDF(receipt: any, showSignatures: boolean = true): Promise<Buffer> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  const drawHeader = (d: jsPDF, isFirstPage: boolean = false) => {
    try {
      const logoPath = path.join(process.cwd(), "public", "logo_pdf.png");
      const logoBuffer = fs.readFileSync(logoPath);
      const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
      d.addImage(logoBase64, "PNG", 14, 10, 50, 15);
    } catch (error) {
      if (isFirstPage) console.error("No se pudo cargar el logo para el PDF", error);
      d.setFont("helvetica", "bold");
      d.setFontSize(24);
      d.setTextColor(0, 0, 0);
      d.text("LASER INOVA", 14, 22);
    }
    d.setFont("helvetica", "bold");
    d.setFontSize(22);
    d.setTextColor(0, 0, 0);
    d.text("NOTA DE PEDIDO", pageWidth / 2, 22, { align: "center" });
    d.setDrawColor(200);
    d.setLineWidth(0.5);
    d.line(14, 30, pageWidth - 14, 30);
  };

  const drawFooter = (d: jsPDF) => {
    const pHeight = d.internal.pageSize.height;
    const footerY = pHeight - 20;
    d.setDrawColor(220);
    d.setLineWidth(0.5);
    d.line(14, footerY, pageWidth - 14, footerY);
    d.setFont("helvetica", "normal");
    d.setFontSize(8);
    d.setTextColor(120);
    d.text("Laser Inova - www.laserinova.com - info@laserinova.com", pageWidth / 2, footerY + 6, { align: "center" });
  };

  const drawWatermark = (d: jsPDF) => {
    d.saveGraphicsState();
    
    // Use low opacity for watermark
    try {
      const GState = (d as any).GState;
      if (GState) {
        d.setGState(new GState({ opacity: 0.06 }));
      }
    } catch (e) {
      // Fallback if GState is not supported
    }

    // Centered light gray logo
    try {
      const logoPath = path.join(process.cwd(), "public", "logo_pdf.png");
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
        d.addImage(logoBase64, "PNG", pageWidth / 2 - 60, pageHeight / 2 - 45, 120, 36);
      }
    } catch (e) {}

    // Diagonal status text
    d.setFont("helvetica", "bold");
    d.setFontSize(50);
    d.setTextColor(220, 220, 220); // Fallback light gray color
    
    const watermarkText = receipt.status === "PAID" ? "PAGADO / LIQUIDADO" : "PENDIENTE DE PAGO";
    d.text(watermarkText, pageWidth / 2, pageHeight / 2 + 15, {
      align: "center",
      angle: 35
    });

    d.restoreGraphicsState();
  };

  // Header and Watermark
  drawHeader(doc, true);
  drawWatermark(doc);

  // Top Right Details (Fecha & Folio & Estatus)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  const formattedDate = new Date(receipt.createdAt).toLocaleDateString("es-MX");
  doc.text(`Fecha:   ${formattedDate}`, pageWidth - 14, 38, { align: "right" });
  doc.text(`No. de Recibo:   ${receipt.folio}`, pageWidth - 14, 44, { align: "right" });
  
  doc.text("Estatus: ", pageWidth - 58, 50, { align: "right" });
  doc.setFont("helvetica", "bold");
  if (receipt.status === "PAID") {
    doc.setTextColor(46, 125, 50); // green
    doc.text("LIQUIDADO", pageWidth - 14, 50, { align: "right" });
  } else {
    doc.setTextColor(211, 47, 47); // red
    doc.text("PENDIENTE", pageWidth - 14, 50, { align: "right" });
  }

  // Top Left Details (Client & Project)
  let currentY = 38;
  doc.setTextColor(0);
  const displayName = receipt.client?.name || receipt.prospectName;
  const displayCompany = receipt.client?.company;

  if (displayName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("PARA:", 14, currentY);
    doc.setFont("helvetica", "bold");
    doc.text(displayName, 35, currentY);
    currentY += 6;
    if (displayCompany) {
      doc.setFont("helvetica", "normal");
      doc.text(displayCompany, 35, currentY);
      currentY += 6;
    }
  }

  doc.setFont("helvetica", "normal");
  doc.text("Proyecto:", 14, currentY);
  doc.setFont("helvetica", "bold");
  doc.text(receipt.project || "", 35, currentY);
  currentY += 12;

  // Description
  let tableStartY = currentY;
  if (receipt.description) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const splitDesc = doc.splitTextToSize(receipt.description, pageWidth - 28);
    doc.text(splitDesc, 14, currentY);
    tableStartY = currentY + (splitDesc.length * 5) + 5;
  }

  // Concepts Table
  const tableColumn = ["Descripción", "Cantidad", "P. Unitario", "Total"];
  const tableRows: any[][] = [];
  const fmt = (n: number) =>
    `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const rawConcepts = receipt.concepts;
  const concepts = Array.isArray(rawConcepts) ? rawConcepts : [];

  concepts.forEach((concept: any, index: number) => {
    const desc = concept.description || `Concepto ${index + 1}`;
    const qty = concept.quantity || 1;
    const unitPrice = concept.unitPrice || concept.finalUnitPrice || 0;
    const totalAmount = unitPrice * qty;
    tableRows.push([
      desc,
      qty.toString(),
      fmt(unitPrice),
      fmt(totalAmount),
    ]);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: tableStartY,
    theme: "striped",
    headStyles: { fillColor: [80, 80, 80], textColor: 255, fontSize: 10, fontStyle: "bold" },
    bodyStyles: { fontSize: 9, textColor: 50 },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 25, halign: "center" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" }
    },
    margin: { top: 35, bottom: 30 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1 && data.cursor?.y === data.settings.margin.top) {
        drawHeader(doc);
        drawWatermark(doc);
      }
      drawFooter(doc);
    }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || tableStartY + 20;

  // Totals & Balance Section
  const totalsY = finalY + 10;
  doc.setFontSize(11);
  doc.setTextColor(0);

  doc.setFont("helvetica", "normal");
  doc.text("Total:", pageWidth - 55, totalsY, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text(fmt(receipt.total), pageWidth - 14, totalsY, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.text("Anticipo / Pagado:", pageWidth - 55, totalsY + 8, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text(fmt(receipt.advance), pageWidth - 14, totalsY + 8, { align: "right" });

  doc.setFontSize(13);
  if (receipt.balance > 0) {
    doc.setTextColor(211, 47, 47); // red color for pending balance
  } else {
    doc.setTextColor(46, 125, 50); // green color for paid
  }
  doc.setFont("helvetica", "bold");
  doc.text("Restante pendiente:", pageWidth - 55, totalsY + 18, { align: "right" });
  doc.text(fmt(receipt.balance), pageWidth - 14, totalsY + 18, { align: "right" });

  // Reset text color
  doc.setTextColor(0);

  // Notes/Considerations
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let currentTextY = totalsY + 28;

  const marginThreshold = pageHeight - 35;

  if (receipt.notes) {
    if (currentTextY > marginThreshold - 10) {
      doc.addPage();
      drawHeader(doc);
      drawWatermark(doc);
      drawFooter(doc);
      currentTextY = 40;
    }
    doc.setFont("helvetica", "bold");
    doc.text("Notas del Pedido:", 14, currentTextY);
    currentTextY += 5;
    doc.setFont("helvetica", "normal");
    const splitNotes = doc.splitTextToSize(receipt.notes, pageWidth - 28);
    doc.text(splitNotes, 14, currentTextY);
    currentTextY += (splitNotes.length * 5) + 5;
  }

  // Firmas si corresponde
  if (showSignatures) {
    if (currentTextY > marginThreshold - 25) {
      doc.addPage();
      drawHeader(doc);
      drawWatermark(doc);
      drawFooter(doc);
      currentTextY = 40;
    }
    currentTextY += 10;
    
    const sigWidth = 60;
    
    // Firma elaboró
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(14, currentTextY, 14 + sigWidth, currentTextY);
    doc.setFont("helvetica", "bold");
    doc.text("Elaboró", 14 + (sigWidth / 2), currentTextY + 5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text(receipt.user?.name || "", 14 + (sigWidth / 2), currentTextY + 9, { align: "center" });

    // Firma cliente
    const rightMarginX = pageWidth - 14 - sigWidth;
    doc.line(rightMarginX, currentTextY, rightMarginX + sigWidth, currentTextY);
    doc.setFont("helvetica", "bold");
    doc.text("Autorización / Recibí de Conformidad", rightMarginX + (sigWidth / 2), currentTextY + 5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text(receipt.client?.name || receipt.prospectName || "", rightMarginX + (sigWidth / 2), currentTextY + 9, { align: "center" });
  }

  const buffer = Buffer.from(doc.output("arraybuffer"));
  return buffer;
}

export async function generateChargeNotePDF(paymentReq: any): Promise<Buffer> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  const drawHeader = (d: jsPDF, isFirstPage: boolean = false) => {
    try {
      const logoPath = path.join(process.cwd(), "public", "logo_pdf.png");
      const logoBuffer = fs.readFileSync(logoPath);
      const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
      d.addImage(logoBase64, "PNG", 14, 10, 50, 15);
    } catch (error) {
      if (isFirstPage) console.error("No se pudo cargar el logo para el PDF", error);
      d.setFont("helvetica", "bold");
      d.setFontSize(24);
      d.setTextColor(0, 0, 0);
      d.text("LASER INOVA", 14, 22);
    }
    d.setFont("helvetica", "bold");
    d.setFontSize(22);
    d.setTextColor(0, 0, 0);
    d.text("NOTA DE CARGO", pageWidth / 2, 22, { align: "center" });
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

  drawHeader(doc, true);

  // Top Right Details (Fecha)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const formattedDate = new Date(paymentReq.createdAt || Date.now()).toLocaleDateString("es-MX");
  doc.text(`Fecha:   ${formattedDate}`, pageWidth - 14, 38, { align: "right" });

  let folioText = paymentReq.quote?.folio || paymentReq.overrideQuoteFolio || "N/A";
  doc.text(`Ref. Cotización:   ${folioText}`, pageWidth - 14, 44, { align: "right" });

  // Top Left Details (Client & Project)
  let currentY = 38;

  const displayName = paymentReq.client?.name || paymentReq.overrideClientName;
  if (displayName) {
    doc.setFont("helvetica", "normal");
    doc.text("PARA:", 14, currentY);
    doc.setFont("helvetica", "bold");
    doc.text(displayName, 35, currentY);
    currentY += 6;
  }

  doc.setFont("helvetica", "normal");
  doc.text("Proyecto:", 14, currentY);
  doc.text(paymentReq.quote?.project || paymentReq.overrideProjectName || "", 35, currentY);
  currentY += 12;

  // Description 
  doc.setFont("helvetica", "bold");
  doc.text("Descripción del Cargo:", 14, currentY);
  currentY += 6;
  doc.setFont("helvetica", "normal");
  
  let notes = paymentReq.notes || "Solicitud de pago correspondiente al saldo pendiente de la cotización.";
  const splitNotes = doc.splitTextToSize(notes, pageWidth - 28);
  doc.text(splitNotes, 14, currentY);
  currentY += (splitNotes.length * 5) + 15;

  // Amount Block
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.rect(14, currentY, pageWidth - 28, 25);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL A PAGAR:", 20, currentY + 16);
  
  doc.setFontSize(14);
  const fmt = (n: number) => `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  doc.text(fmt(paymentReq.amountRequested), pageWidth - 20, currentY + 16, { align: "right" });

  currentY += 30;

  // Warning text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const warningText = "El monto de la presente Nota de Cargo deberá ser pagado en su totalidad, sin descuentos de comisiones por transferencias o cargos bancarios.";
  const splitWarning = doc.splitTextToSize(warningText, pageWidth - 28);
  doc.text(splitWarning, 14, currentY);
  currentY += (splitWarning.length * 4) + 2;

  // Bank table
  autoTable(doc, {
    startY: currentY,
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 3, lineColor: [150, 150, 150], lineWidth: 0.1 },
    headStyles: { fontStyle: "bold", fillColor: [240, 240, 240], textColor: [0, 0, 0] },
    head: [["Pago por Transferencia Nacional (MXN)", "Pago por Transferencia Internacional (USD)"]],
    body: [
      [
        "Banco beneficiario: [Tu Banco MXN]\nNombre del beneficiario: Laser Inova\nCuenta: 0000000000\nCLABE: 000000000000000000\nTipo de moneda: Pesos Mexicanos",
        "Banco beneficiario: [Tu Banco USD]\nSwift No.: XXXXXX\nNombre del beneficiario: Laser Inova\nABA Number: 000000000\nNúmero de cuenta: 000000000\nTipo de moneda: Dólares Americanos"
      ]
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Por favor incluya el folio de la Nota de Cargo pagada y notifique su pago a info@laserinova.com", 14, currentY);

  currentY += 15;
  doc.setFontSize(10);
  doc.text(`Solicitado por: ${paymentReq.createdBy?.name || paymentReq.overrideCreatorName || 'Administración'}`, 14, currentY);

  drawFooter(doc);

  const buffer = Buffer.from(doc.output("arraybuffer"));
  return buffer;
}
