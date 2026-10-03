import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

// Forzar dinámico para que no falle en Hostinger
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // 'pinecone', 'materials', 'products', 'machines', 'costs'

    if (!file || !type) {
      return NextResponse.json({ success: false, error: "Archivo o tipo faltante." }, { status: 400 });
    }

    let text = await file.text();
    
    // Limpiar basura del export de Excel (las primeras líneas de título)
    let lines = text.split('\n');
    const headerIndex = lines.findIndex(line => 
      line.startsWith('ID,') || 
      line.startsWith('Campo,') || 
      line.startsWith('Margen,') || 
      line.startsWith('Pregunta,') || 
      line.startsWith('Regla,') ||
      line.startsWith('Situación,') ||
      line.startsWith('Uso,') ||
      line.startsWith('Concepto,') ||
      line.startsWith('Política,') ||
      line.startsWith('Restricción,') ||
      line.startsWith('ID;') // por si lo exporta con punto y coma
    );

    if (headerIndex !== -1) {
      lines = lines.slice(headerIndex);
      text = lines.join('\n');
    }
    
    // Parsear CSV
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    });

    const rows = parsed.data as any[];

    if (type.startsWith("pinecone_")) {
      const namespaceName = type.split('_')[1]; // 'secretary' o 'chalan'
      
      // PROCESAR REGLAS PARA PINECONE (Respuestas, FAQ, Restricciones, Políticas)
      const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
      const index = pc.index(process.env.PINECONE_INDEX!);
      const targetNamespace = index.namespace(namespaceName);
      
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

      const vectors = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Evitar filas vacías o de encabezados extraños
        if (!row.ID && Object.keys(row).length < 2) continue;

        // Construir un texto rico combinando todas las columnas para que la IA lo entienda
        const contentStr = Object.entries(row)
          .filter(([key, val]) => val && key.trim() !== '')
          .map(([key, val]) => `${key}: ${val}`)
          .join(" | ");

        // Generar vector
        const result = await embeddingModel.embedContent(contentStr);
        const vectorValues = result.embedding.values;

        vectors.push({
          id: row.ID || `rule-${Date.now()}-${i}`,
          values: vectorValues,
          metadata: {
            content: contentStr,
            source: "csv-import"
          }
        });
      }

      if (vectors.length > 0) {
        // En Pinecone v9, se envía un objeto con la propiedad records al namespace
        await targetNamespace.upsert({ records: vectors });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Se sincronizaron ${vectors.length} reglas en el espacio '${namespaceName}'.` 
      });
    }

    // PROCESAR BASE DE DATOS ESTRUCTURADA
    if (type === "materials") {
      let count = 0;
      // Asegurar que exista una categoría genérica si no hay
      let category = await prisma.materialCategory.findFirst();
      if (!category) {
        category = await prisma.materialCategory.create({
          data: { name: "General", slug: "general" }
        });
      }

      for (const row of rows) {
        if (!row.Material && !row.ID) continue; // Saltar filas vacías
        
        const price = parseFloat((row.Costo_MXN || '0').replace(/[^0-9.-]+/g,""));
        
        await prisma.material.create({
          data: {
            categoryId: category.id,
            name: `${row.Material} - ${row.Espesor || ''} - ${row.Formato || ''}`,
            sheetPrice: isNaN(price) ? 0 : price,
            notes: `ID: ${row.ID} | Unidad: ${row.Unidad} | Uso: ${row.Uso}`
          }
        });
        count++;
      }
      return NextResponse.json({ success: true, message: `Se importaron ${count} materiales a la base de datos.` });
    }

    if (type === "machines") {
      let count = 0;
      for (const row of rows) {
        if (!row.Equipo && !row.ID) continue;
        
        await prisma.machineProcess.create({
          data: {
            machineName: row.Equipo,
            material: row.Usos || "General",
            notes: `Tecnología: ${row.Tecnología} | Área: ${row.Área_Capacidad} | Restricciones: ${row.Restricciones}`
          }
        });
        count++;
      }
      return NextResponse.json({ success: true, message: `Se importaron ${count} máquinas/procesos a la base de datos.` });
    }

    if (type === "costs") {
      let count = 0;
      for (const row of rows) {
        if (!row.Concepto && !row.ID) continue;
        const price = parseFloat((row.Costo_MXN || '0').replace(/[^0-9.-]+/g,""));
        
        await prisma.costConfiguration.upsert({
          where: { key: row.ID },
          update: {
            name: row.Concepto,
            value: isNaN(price) ? 0 : price,
            unit: row.Unidad || ''
          },
          create: {
            key: row.ID,
            name: row.Concepto,
            value: isNaN(price) ? 0 : price,
            unit: row.Unidad || ''
          }
        });
        count++;
      }
      return NextResponse.json({ success: true, message: `Se importaron ${count} costos a la base de datos.` });
    }

    return NextResponse.json({ success: false, error: "Tipo de importación no válido." }, { status: 400 });

  } catch (error: any) {
    console.error("Error importando CSV:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
