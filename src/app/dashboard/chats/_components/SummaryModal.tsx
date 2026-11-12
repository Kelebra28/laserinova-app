'use client';

import { Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/** Resumen de la conversación hecho por la IA. Se carga solo cuando se abre (next/dynamic). */
export default function SummaryModal({ loading, text, onClose }: { loading: boolean; text: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-wa-panel rounded-2xl w-full max-w-lg shadow-2xl border border-wa-border-strong overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-4 bg-wa-header border-b border-wa-border-strong flex justify-between items-center">
          <div className="flex items-center gap-2 text-wa-text font-medium">
            <Sparkles className="text-purple-400" size={20} />
            <span>Resumen de la Conversación</span>
          </div>
          <button onClick={onClose} className="text-wa-muted hover:text-wa-text transition-colors p-1 rounded-full hover:bg-wa-input">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-wa-muted">
              <Loader2 size={32} className="animate-spin mb-4 text-purple-400" />
              <p>La IA está analizando los mensajes...</p>
            </div>
          ) : (
            <div className="text-wa-text text-[15px] leading-relaxed space-y-4">
              {text.split('\n').map((line, i) => {
                if (line.trim().startsWith('**') && line.includes('**')) {
                  const parts = line.split('**');
                  return (
                    <p key={i} className="flex gap-2">
                      <span className="font-semibold text-purple-400 shrink-0">{parts[1]}</span>
                      <span className="text-wa-text-soft">{parts[2] || parts.slice(2).join('')}</span>
                    </p>
                  );
                }
                if (line.trim()) return <p key={i}>{line}</p>;
                return null;
              })}
            </div>
          )}
        </div>
        <div className="p-4 bg-wa-header border-t border-wa-border-strong flex justify-end">
          <Button onClick={onClose} variant="outline" className="bg-wa-input border-none text-wa-text hover:bg-wa-border-strong">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
