import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const tab = searchParams.get('tab') || 'finanzas';

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const quotes = await prisma.quote.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        client: true,
        user: true,
        concepts: {
          include: { material: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const activeQuotes = quotes.filter(q => q.status !== "CANCELLED" && q.status !== "REJECTED");

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Laser Inova CRM';
    workbook.created = new Date();

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const periodName = `${monthNames[month - 1]} ${year}`;

    // Helper para aplicar estilo al header
    const styleHeader = (worksheet: ExcelJS.Worksheet) => {
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } }; // Rojo Inova (red-600)
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    };

    let filename = `Reporte_${tab}_${periodName.replace(' ', '_')}.xlsx`;

    if (tab === 'finanzas') {
      const sheet = workbook.addWorksheet('Resumen Financiero');
      sheet.columns = [
        { header: 'Folio', key: 'folio', width: 15 },
        { header: 'Fecha', key: 'fecha', width: 15 },
        { header: 'Cliente / Prospecto', key: 'cliente', width: 30 },
        { header: 'Estatus', key: 'estatus', width: 15 },
        { header: 'Subtotal', key: 'subtotal', width: 15 },
        { header: 'IVA', key: 'iva', width: 15 },
        { header: 'Total Venta', key: 'total', width: 15 },
        { header: 'Costo Operativo', key: 'costo', width: 20 },
        { header: 'Utilidad Neta', key: 'utilidad', width: 20 },
      ];
      
      styleHeader(sheet);

      quotes.forEach(q => {
        sheet.addRow({
          folio: q.folio,
          fecha: new Date(q.createdAt).toLocaleDateString(),
          cliente: q.client?.name || q.prospectName || "Sin cliente",
          estatus: q.status,
          subtotal: q.subtotal,
          iva: q.tax,
          total: q.total,
          costo: (q.total - (q.realUtilityTotal || 0)), // Aproximado para display
          utilidad: q.realUtilityTotal || 0,
        });
      });

      // Formato de moneda
      ['E', 'F', 'G', 'H', 'I'].forEach(col => {
        sheet.getColumn(col).numFmt = '"$"#,##0.00';
      });
    }

    if (tab === 'clientes') {
      const sheet = workbook.addWorksheet('Rendimiento por Cliente');
      sheet.columns = [
        { header: 'Cliente', key: 'cliente', width: 35 },
        { header: 'Cotizaciones', key: 'cantidad', width: 15 },
        { header: 'Ingreso Total', key: 'ingreso', width: 20 },
        { header: 'Utilidad Neta', key: 'utilidad', width: 20 },
      ];
      styleHeader(sheet);

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

      clientsStats.forEach((c: any) => {
        sheet.addRow({
          cliente: c.name,
          cantidad: c.count,
          ingreso: c.total,
          utilidad: c.utility,
        });
      });

      ['C', 'D'].forEach(col => sheet.getColumn(col).numFmt = '"$"#,##0.00');
    }

    if (tab === 'inventario') {
      const sheet = workbook.addWorksheet('Inventario y Productos');
      sheet.columns = [
        { header: 'Producto', key: 'producto', width: 40 },
        { header: 'Tipo', key: 'tipo', width: 20 },
        { header: 'Cantidad Vendida', key: 'cantidad', width: 20 },
        { header: 'Costo Total', key: 'costo', width: 20 },
        { header: 'Ingreso Total', key: 'ingreso', width: 20 },
        { header: 'Ganancia', key: 'ganancia', width: 20 },
      ];
      styleHeader(sheet);

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

      productsStats.forEach((p: any) => {
        sheet.addRow({
          producto: p.name,
          tipo: p.type === 'RESALE' ? 'Reventa' : 'Producto Propio',
          cantidad: p.quantity,
          costo: p.cost,
          ingreso: p.revenue,
          ganancia: p.revenue - p.cost,
        });
      });

      ['D', 'E', 'F'].forEach(col => sheet.getColumn(col).numFmt = '"$"#,##0.00');
    }

    if (tab === 'procesos') {
      const sheet = workbook.addWorksheet('Procesos y Servicios');
      sheet.columns = [
        { header: 'Servicio / Proceso', key: 'proceso', width: 30 },
        { header: 'Veces Contratado', key: 'cantidad', width: 20 },
        { header: 'Costo Operativo', key: 'costo', width: 20 },
        { header: 'Ingresos Generados', key: 'ingreso', width: 20 },
        { header: 'Utilidad Neta', key: 'utilidad', width: 20 },
      ];
      styleHeader(sheet);

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

      processesStats.forEach((p: any) => {
        sheet.addRow({
          proceso: p.name,
          cantidad: p.quantity,
          costo: p.cost,
          ingreso: p.revenue,
          utilidad: p.utility,
        });
      });

      ['C', 'D', 'E'].forEach(col => sheet.getColumn(col).numFmt = '"$"#,##0.00');
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Error generating Excel:', error);
    return new NextResponse("Error al generar el reporte en Excel", { status: 500 });
  }
}
