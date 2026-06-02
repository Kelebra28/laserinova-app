"use client";

import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { SendQuoteMailModal } from './SendQuoteMailModal';

interface SendQuoteMailButtonProps {
  quoteId: string;
  folio: string;
  project: string;
  clientName?: string;
  clientEmail?: string;
  hasClientId: boolean;
  userName?: string;
  versions?: any[];
}

export function SendQuoteMailButton({
  quoteId,
  folio,
  project,
  clientName,
  clientEmail,
  hasClientId,
  userName,
  versions = []
}: SendQuoteMailButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-red-600/10 active:scale-95"
      >
        <Mail className="mr-2 h-4 w-4 text-red-100" />
        Enviar por Correo
      </button>

      <SendQuoteMailModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        quoteId={quoteId}
        folio={folio}
        project={project}
        clientName={clientName}
        clientEmail={clientEmail}
        hasClientId={hasClientId}
        userName={userName}
        versions={versions}
      />
    </>
  );
}
