import { prisma } from "@/lib/prisma";
import fs from "node:fs";
import path from "node:path";

const PROMOOPCION_GRAPHQL_URL =
  process.env.PROMOOPCION_GRAPHQL_URL ||
  "https://www.promocionalesenlinea.net/graphql";

const TOKEN_FILE_PATH = path.join(
  process.cwd(),
  "storage",
  "promoopcion_token.json"
);

interface CachedToken {
  token: string;
  expiresAt: number; // timestamp en ms
}

/**
 * Consulta y mantiene en caché el token de acceso de Promo Opción.
 * ⚠️ Regla crítica de la API: Solo 3 intentos de login por email cada 24 horas.
 * Esta función garantiza que el token se solicite 1 sola vez al día (validez de 23h).
 */
export async function getPromoOpcionToken(): Promise<string> {
  let email = process.env.PROMOOPCION_EMAIL;
  let password = process.env.PROMOOPCION_PASSWORD;

  // Si el servidor de Next.js aún no ha recargado las variables de entorno de .env
  if (!password || password === "tu_password" || !email) {
    try {
      const envPath = path.join(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf8");
        const matchPass = envContent.match(/PROMOOPCION_PASSWORD=["']?(.*?)["']?(\r?\n|$)/);
        const matchEmail = envContent.match(/PROMOOPCION_EMAIL=["']?(.*?)["']?(\r?\n|$)/);
        if (matchPass && matchPass[1]) password = matchPass[1].trim();
        if (matchEmail && matchEmail[1]) email = matchEmail[1].trim();
      }
    } catch {
      // Fallback silencioso si no se puede leer el archivo
    }
  }

  // Guardia de seguridad: Prevenir quemar 1 de los 3 intentos con valores por defecto
  if (!email || !password || password.trim() === "" || password === "tu_password") {
    throw new Error(
      "Credenciales incompletas en .env: PROMOOPCION_PASSWORD aún tiene el valor de ejemplo 'tu_password'. Reemplázalo con tu contraseña real de Promo Opción para evitar ser bloqueado por la API (límite de 3 intentos/24h)."
    );
  }

  // 1. Revisar caché en disco
  try {
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      const raw = fs.readFileSync(TOKEN_FILE_PATH, "utf8");
      const parsed: CachedToken = JSON.parse(raw);
      // Si aún le queda más de 1 hora de vida (expiración a 24h)
      if (parsed.token && parsed.expiresAt && Date.now() < parsed.expiresAt) {
        return parsed.token;
      }
    }
  } catch (err) {
    console.warn("No se pudo leer el archivo de token en caché, se solicitará uno nuevo:", err);
  }

  // 2. Si no hay token válido, solicitar a la API mediante Mutation Login
  const loginMutation = `
    mutation Login($email: String!, $password: String!) {
      login(email: $email, password: $password) {
        message
        accessToken
      }
    }
  `;

  const response = await fetch(PROMOOPCION_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: loginMutation,
      variables: { email, password },
    }),
  });

  if (!response.ok) {
    throw new Error(`Error HTTP al autenticar con Promo Opción (${response.status}): ${response.statusText}`);
  }

  const result = await response.json();

  if (result.errors && result.errors.length > 0) {
    const errorMsg = result.errors.map((e: any) => e.message).join(", ");
    throw new Error(`Error de autenticación Promo Opción: ${errorMsg}`);
  }

  const accessToken = result.data?.login?.accessToken;
  if (!accessToken) {
    throw new Error("La API de Promo Opción no devolvió un accessToken válido.");
  }

  // 3. Guardar en caché con expiración de 23 horas (para renovar con margen de seguridad)
  try {
    const storageDir = path.dirname(TOKEN_FILE_PATH);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    const tokenData: CachedToken = {
      token: accessToken,
      expiresAt: Date.now() + 23 * 60 * 60 * 1000,
    };
    fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(tokenData, null, 2), "utf8");
  } catch (err) {
    console.error("Error al persistir el token en storage:", err);
  }

  return accessToken;
}

/**
 * Consulta una página del catálogo de distribuidores para México (MX)
 */
export async function fetchPromoOpcionCatalogPage(page: number = 1) {
  const token = await getPromoOpcionToken();

  const catalogQuery = `
    query GetDistribuitorCatalog($page: Int!) {
      distribuitorProductCatalog(page: $page) {
        message
        currentPage
        totalPages
        perPage
        hasNextPage
        hasPrevPage
        data {
          productModel {
            sku
            nameProductModel
            isEnabledProductModelMx
            descriptionMx
            metaKeywordProductModelMx
            brand
            capacity
            media {
              mainImagesMx
              vectorImagesMx
            }
            package {
              dimensions {
                heightInCentimeters
                lengthInCentimeters
                widthInCentimeters
                volume
                unitVolume
                individualBoxDimensions
              }
              weight {
                grossWeight
                netWeight
                unitWeight
                weightMasterBox
              }
              units {
                piecesPerBox
                piecesPerInner
                piecesPerMaster
                saleMultiples
              }
              individualBag
              individualBox
            }
            features {
              hasBluetooth
              hasUvFilter
              hasCotton
              hasCutlery
              isEcological
              isWaterproof
              canGrabaprom
              light
              rfid
              chargingPort
              material
              steelType
              circumference
              measure
              sizeMeasures
              neckType
              materialDensity
            }
            filters {
              familyFilterable
              subFamilyFilterable
            }
            writingInk {
              inkColorMx
            }
            printing {
              printArea
              printTechnique
            }
          }
          variants {
            sku
            name
            parentArticle
            color
            size
            regionalClassification {
              groupPriceMx
            }
            pricing {
              priceMx {
                amount
                currency
              }
            }
            availability {
              isEnabledVariantMx
            }
            seoMetadata {
              metaKeywordMx
              metaTitle
              nameProductModel
            }
            mediaAssets {
              variantImages
            }
            commercialAttributes {
              priceConditionMx
              isNotRestockableMx
              hasUniquePriceMx
              isBrandNewMx
              isOnOutletMx
              isMadeInMexicoMx
            }
          }
        }
      }
    }
  `;

  const response = await fetch(PROMOOPCION_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: catalogQuery,
      variables: { page },
    }),
  });

  if (!response.ok) {
    throw new Error(`Error HTTP al consultar catálogo Promo Opción (${response.status}): ${response.statusText}`);
  }

  const result = await response.json();
  if (result.errors && result.errors.length > 0) {
    const errorMsg = result.errors.map((e: any) => e.message).join(", ");
    throw new Error(`Error en consulta de catálogo Promo Opción: ${errorMsg}`);
  }

  return result.data?.distribuitorProductCatalog;
}

/**
 * Consulta el catálogo de inventario disponible por ubicación/almacén (distributorStockCatalog)
 * y retorna un mapa agrupado por SKU con la suma de currentStock disponible.
 */
export async function fetchPromoOpcionStock(): Promise<Map<string, number>> {
  const token = await getPromoOpcionToken();

  const stockQuery = `
    query GetDistributorStockCatalog {
      distributorStockCatalog {
        sku
        currentStock
        locationName
        incomingTransit
        arrivalDate
      }
    }
  `;

  const response = await fetch(PROMOOPCION_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: stockQuery,
    }),
  });

  if (!response.ok) {
    throw new Error(`Error HTTP al consultar stock de Promo Opción (${response.status}): ${response.statusText}`);
  }

  const result = await response.json();
  if (result.errors && result.errors.length > 0) {
    const errorMsg = result.errors.map((e: any) => e.message).join(", ");
    throw new Error(`Error en consulta de stock Promo Opción: ${errorMsg}`);
  }

  const stockList = result.data?.distributorStockCatalog || [];
  const stockMap = new Map<string, number>();

  for (const item of stockList) {
    if (!item.sku) continue;
    const current = stockMap.get(item.sku) || 0;
    const qty = typeof item.currentStock === "number" ? item.currentStock : parseInt(item.currentStock, 10) || 0;
    stockMap.set(item.sku, current + qty);
  }

  return stockMap;
}

/**
 * Actualiza el stockQuantity de todos los productos de Promo Opción ya registrados en el CRM.
 * Operación ultra-rápida (lotes en transacción) sin volver a descargar las fichas técnicas completas.
 */
export async function syncPromoOpcionStockOnlyService() {
  const stockMap = await fetchPromoOpcionStock();

  const products = await prisma.product.findMany({
    where: { provider: "Promoopcion" },
    select: { id: true, sku: true, stockQuantity: true },
  });

  let updatedCount = 0;
  const updates = [];

  for (const p of products) {
    if (!p.sku) continue;
    const newStock = stockMap.get(p.sku) ?? 0;
    if (newStock !== p.stockQuantity) {
      updates.push(
        prisma.product.update({
          where: { id: p.id },
          data: { stockQuantity: newStock },
        })
      );
    }
  }

  // Ejecutar en lotes concurrentes ligeros (sin transacción que monopolice el pool)
  const BATCH_SIZE = 10;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    await Promise.all(batch);
    updatedCount += batch.length;
  }

  return {
    totalProductsChecked: products.length,
    updatedCount,
    distinctSkusInStock: stockMap.size,
  };
}

/**
 * Sincroniza una página del catálogo de Promo Opción e inyecta el stock real en Prisma
 */
export async function syncPromoOpcionCatalogService(page: number = 1) {
  // Obtenemos en paralelo el catálogo de productos y el stock real de los almacenes
  const [catalog, stockMap] = await Promise.all([
    fetchPromoOpcionCatalogPage(page),
    fetchPromoOpcionStock().catch((err) => {
      console.warn("No se pudo obtener el stock en vivo, se continuará con stock 0:", err);
      return new Map<string, number>();
    }),
  ]);

  if (!catalog || !catalog.data) {
    return {
      currentPage: page,
      totalPages: 0,
      itemsProcessed: 0,
      hasNextPage: false,
    };
  }

  // Pre-cargar categorías existentes para asignación rápida
  const existingCategories = await prisma.productCategory.findMany();
  const categoryMap = new Map<string, string>();
  for (const c of existingCategories) {
    categoryMap.set(c.name.toLowerCase(), c.id);
  }

  let itemsProcessed = 0;

  for (const item of catalog.data) {
    const model = item.productModel;
    const variants = item.variants || [];

    if (!model || variants.length === 0) continue;

    // 1. Resolver la categoría (FamilyFilterable o General)
    const rawCategory = model.filters?.familyFilterable || "General";
    const categoryKey = rawCategory.trim().toLowerCase();
    let categoryId = categoryMap.get(categoryKey);

    if (!categoryId) {
      const slug = rawCategory.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const createdCategory = await prisma.productCategory.create({
        data: {
          name: rawCategory.trim(),
          slug,
        },
      });
      categoryId = createdCategory.id;
      categoryMap.set(categoryKey, categoryId);
    }

    // 2. Extraer características técnicas comunes del modelo
    const dimensions = model.package?.dimensions;
    const measurements = dimensions
      ? `${dimensions.heightInCentimeters || 0} x ${dimensions.widthInCentimeters || 0} x ${dimensions.lengthInCentimeters || 0} cm`
      : null;

    const weightInfo = model.package?.weight;
    const weightStr = weightInfo
      ? `${weightInfo.grossWeight || 0} ${weightInfo.unitWeight || "kg"}`
      : null;

    const unitsInfo = model.package?.units;
    const masterBoxStr = unitsInfo?.piecesPerMaster
      ? `${unitsInfo.piecesPerMaster} pzas`
      : null;

    const packageTypeStr =
      model.package?.individualBox || model.package?.individualBag || null;

    // 3. Procesar cada variante como un producto sincronizado
    for (const v of variants) {
      if (!v.sku) continue;

      // Precio base de distribuidor (sin IVA)
      const rawPrice = v.pricing?.priceMx?.[0]?.amount;
      const baseCost = rawPrice ? parseFloat(rawPrice) : 0;

      // Imágenes de variante + principales del modelo
      const variantImgs: string[] = v.mediaAssets?.variantImages || [];
      const modelImgs: string[] = model.media?.mainImagesMx || [];
      const combinedImages = Array.from(new Set([...variantImgs, ...modelImgs])).filter(Boolean);

      const mainImage = combinedImages[0] || null;
      const imagesJson = JSON.stringify(combinedImages);

      // Determinar si la variante está habilitada en México
      const isEnabled = v.availability?.isEnabledVariantMx ?? true;
      const stockQuantity = stockMap.get(v.sku) ?? 0;

      await prisma.product.upsert({
        where: { sku: v.sku },
        update: {
          name: v.name || model.nameProductModel || v.sku,
          model: model.sku || null,
          brand: model.brand || "Promo Opción",
          provider: "Promoopcion",
          color: v.color || null,
          stockQuantity,
          unitCost: baseCost,
          unitPrice: baseCost, // Base neta antes de IVA (igual que Doble Vela)
          image: mainImage,
          images: imagesJson,
          description: model.descriptionMx || null,
          material: model.features?.material || null,
          measurements,
          weight: weightStr,
          masterBox: masterBoxStr,
          packageType: packageTypeStr,
          printTechniques: model.printing?.printTechnique || null,
          active: isEnabled,
          categoryId,
        },
        create: {
          sku: v.sku,
          name: v.name || model.nameProductModel || v.sku,
          model: model.sku || null,
          brand: model.brand || "Promo Opción",
          provider: "Promoopcion",
          color: v.color || null,
          stockQuantity,
          unitCost: baseCost,
          unitPrice: baseCost, // Base neta antes de IVA (igual que Doble Vela)
          image: mainImage,
          images: imagesJson,
          description: model.descriptionMx || null,
          material: model.features?.material || null,
          measurements,
          weight: weightStr,
          masterBox: masterBoxStr,
          packageType: packageTypeStr,
          printTechniques: model.printing?.printTechnique || null,
          active: isEnabled,
          categoryId,
        },
      });

      itemsProcessed++;
    }
  }

  return {
    currentPage: catalog.currentPage,
    totalPages: catalog.totalPages,
    perPage: catalog.perPage,
    hasNextPage: catalog.hasNextPage,
    itemsProcessed,
  };
}
