'use client';

import { useEffect, useState } from 'react';
import { Calculator, Loader2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { extractQuoteDataAction, runManualEstimateAction } from '@/server/actions/whatsapp.actions';

type QuoteData = {
  project_name: string;
  tipo_concepto: string;
  material: string;
  grosor: string;
  ancho_cm: number;
  alto_cm: number;
  cantidad: number;
  diseno_incluido: boolean;
  nombre_cliente: string;
  correo_cliente: string;
  descripcion_concepto: string;
};

const fieldClass =
  'w-full bg-wa-header border border-wa-border-strong rounded-lg px-3 h-10 text-sm !text-wa-text placeholder:text-wa-muted outline-none focus:border-wa-accent transition-colors';

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className || ''}`}>
      <span className="text-xs font-medium text-wa-muted">{label}</span>
      {children}
    </label>
  );
}

/**
 * Botón "Calcular" del chat: la IA lee la conversación y propone los datos de la cotización;
 * el asesor los corrige y, al confirmar, se corre el cálculo del Chalán y queda la nota de
 * estimación en el chat (con su botón "Generar cotización").
 */
export default function CalculateQuoteModal({
  contactId,
  onClose,
  onDone,
}: {
  contactId: string;
  onClose: () => void;
  // Recibe la nota de estimación recién guardada (mensaje INTERNAL).
  onDone: (message: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
}) {
  const [data, setData] = useState<QuoteData | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    extractQuoteDataAction(contactId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setData(res.data);
          setMissing(res.missing);
        } else {
          setLoadError(res.error);
        }
      })
      .catch(() => { if (!cancelled) setLoadError('No se pudieron leer los datos de la conversación.'); });
    return () => { cancelled = true; };
  }, [contactId]);

  const set = <K extends keyof QuoteData>(key: K, value: QuoteData[K]) => setData((prev) => (prev ? { ...prev, [key]: value } : prev));
  const numberValue = (n: number) => (n ? String(n) : '');
  const isResale = data?.tipo_concepto === 'REVENTA';
  const canSubmit = !!data && !!data.project_name.trim() && !!data.material.trim() && data.cantidad > 0
    && (isResale || (data.ancho_cm > 0 && data.alto_cm > 0));

  const submit = async () => {
    if (!data || !canSubmit || saving) return;
    setSaving(true);
    try {
      const res = await runManualEstimateAction(contactId, data);
      if (res.success) {
        toast.success('Estimación lista. Ya puedes generar la cotización.');
        onDone(res.message);
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error('No se pudo calcular la estimación.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-wa-panel rounded-2xl w-full max-w-xl shadow-2xl border border-wa-border-strong overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-4 bg-wa-header border-b border-wa-border-strong flex justify-between items-center">
          <div className="flex items-center gap-2 text-wa-text font-medium">
            <Calculator className="text-amber-400" size={20} />
            <span>Calcular cotización</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-wa-muted hover:text-wa-text transition-colors p-1 rounded-full hover:bg-wa-input">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[70vh]">
          {loadError ? (
            <p className="py-8 text-center text-sm text-red-300">{loadError}</p>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center py-10 text-wa-muted">
              <Loader2 size={32} className="animate-spin mb-4 text-amber-400" />
              <p className="text-sm">Leyendo la conversación...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-wa-muted">
                {missing.length > 0
                  ? <>Esto encontré en la conversación. <span className="text-amber-300">Falta: {missing.join(', ')}.</span></>
                  : 'Esto encontré en la conversación. Revísalo y corrige lo que haga falta.'}
              </p>

              <div className="grid grid-cols-6 gap-3">
                <Field label="Proyecto" className="col-span-4">
                  <input className={fieldClass} value={data.project_name} onChange={(e) => set('project_name', e.target.value)} placeholder="Placas de acrílico" />
                </Field>
                <Field label="Tipo" className="col-span-2">
                  <select className={fieldClass} value={data.tipo_concepto} onChange={(e) => set('tipo_concepto', e.target.value)}>
                    <option value="CORTE">Corte</option>
                    <option value="GRABADO">Grabado</option>
                    <option value="REVENTA">Producto de catálogo</option>
                  </select>
                </Field>

                <Field label="Material" className="col-span-4">
                  <input className={fieldClass} value={data.material} onChange={(e) => set('material', e.target.value)} placeholder="Acrílico cristal" />
                </Field>
                <Field label="Grosor" className="col-span-2">
                  <input className={fieldClass} value={data.grosor} onChange={(e) => set('grosor', e.target.value)} placeholder="3mm" />
                </Field>

                <Field label="Ancho (cm)" className="col-span-2">
                  <input className={fieldClass} type="number" min="0" step="any" inputMode="decimal" value={numberValue(data.ancho_cm)} onChange={(e) => set('ancho_cm', Number(e.target.value) || 0)} />
                </Field>
                <Field label="Alto (cm)" className="col-span-2">
                  <input className={fieldClass} type="number" min="0" step="any" inputMode="decimal" value={numberValue(data.alto_cm)} onChange={(e) => set('alto_cm', Number(e.target.value) || 0)} />
                </Field>
                <Field label="Cantidad" className="col-span-2">
                  <input className={fieldClass} type="number" min="0" step="1" inputMode="numeric" value={numberValue(data.cantidad)} onChange={(e) => set('cantidad', Math.round(Number(e.target.value)) || 0)} />
                </Field>

                <Field label="Descripción" className="col-span-6">
                  <input className={fieldClass} value={data.descripcion_concepto} onChange={(e) => set('descripcion_concepto', e.target.value)} placeholder="Detalle del trabajo (forma, acabado, orificios...)" />
                </Field>

                <Field label="Nombre del cliente" className="col-span-3">
                  <input className={fieldClass} value={data.nombre_cliente} onChange={(e) => set('nombre_cliente', e.target.value)} />
                </Field>
                <Field label="Correo (opcional)" className="col-span-3">
                  <input className={fieldClass} type="email" value={data.correo_cliente} onChange={(e) => set('correo_cliente', e.target.value)} />
                </Field>
              </div>

              <label className="flex items-center gap-2 text-sm text-wa-text-soft cursor-pointer">
                <input type="checkbox" className="accent-wa-accent w-4 h-4" checked={data.diseno_incluido} onChange={(e) => set('diseno_incluido', e.target.checked)} />
                El cliente ya tiene su diseño
              </label>
            </div>
          )}
        </div>

        <div className="p-4 bg-wa-header border-t border-wa-border-strong flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 h-10 rounded-lg text-sm font-medium bg-wa-input text-wa-text hover:bg-wa-border-strong transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || saving}
            className="px-4 h-10 rounded-lg text-sm font-semibold bg-amber-500 text-amber-950 hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Calculando...</> : 'Calcular'}
          </button>
        </div>
      </div>
    </div>
  );
}
