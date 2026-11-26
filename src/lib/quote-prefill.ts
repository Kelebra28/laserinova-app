// Lógica pura: qué va como nombre del concepto ("Descripción" en el PDF) y qué como "Detalles".

type ProductText = { name: string; model?: string | null; description?: string | null };

/** Nombre del producto sin la clave del proveedor ni el color. */
export function productTitle(product: ProductText): string {
  const base = product.model ? product.name.split(product.model)[0].trim() : '';
  return base || product.name.trim();
}

/** Al cambiar de producto: se conserva lo escrito del trabajo y se cambia la ficha del anterior por la del nuevo. */
export function swapProductDetails(current: string | null | undefined, previous: ProductText | null | undefined, next: ProductText): string {
  const old = conceptDetails(null, previous);
  const work = (current ?? '').replace(old, '').trim();
  return work.includes(conceptDetails(null, next)) ? work : conceptDetails(work, next);
}

/** Detalles para el PDF: primero lo que pidió el cliente y después la ficha del catálogo. */
export function conceptDetails(work?: string | null, product?: ProductText | null): string {
  return [work, product?.description]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .map((part) => (/[.!?]$/.test(part) ? part : `${part}.`))
    .join(' ');
}
