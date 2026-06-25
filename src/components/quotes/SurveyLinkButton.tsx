'use client';

import { useState } from 'react';
import { Copy, Check, MessageCircleHeart } from 'lucide-react';

export default function SurveyLinkButton({ quoteId, projectName }: { quoteId: string, projectName: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const surveyUrl = `${window.location.origin}/s/${quoteId}`;
    const textToCopy = `¡Hola! Ha sido un placer trabajar contigo en el proyecto de *${projectName}*. \n\nPara seguir mejorando, nos encantaría que nos regalaras 1 minuto para calificar nuestro servicio en este enlace:\n\n${surveyUrl}\n\n¡Muchas gracias!`;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.error('Error copying text:', e);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center px-6 py-2.5 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 ${
        copied ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-900 hover:bg-slate-800'
      }`}
    >
      {copied ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          ¡Copiado!
        </>
      ) : (
        <>
          <MessageCircleHeart className="mr-2 h-4 w-4 text-rose-400" />
          Pedir Reseña
        </>
      )}
    </button>
  );
}
