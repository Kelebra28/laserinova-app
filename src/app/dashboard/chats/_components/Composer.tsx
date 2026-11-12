'use client';

import { memo, useImperativeHandle, useRef, useState, type Ref } from 'react';

export type ComposerHandle = {
  /** Texto escrito en este momento. */
  getText: () => string;
  /** Vacía el campo (después de enviar). */
  clear: () => void;
};

type Props = {
  ref?: Ref<ComposerHandle>;
  disabled: boolean;
  placeholder: string;
  /** Hay adjuntos listos: Enter envía aunque no haya texto. */
  hasAttachments: boolean;
  /** Avisa solo cuando el campo pasa de vacío a con texto (o al revés), no en cada tecla. */
  onHasTextChange: (hasText: boolean) => void;
  onSubmit: () => void;
  onPasteFiles: (files: File[]) => void;
};

/**
 * Campo de texto del chat con su propio estado: escribir solo redibuja este campo,
 * no la lista de chats ni las burbujas (antes cada tecla redibujaba toda la pantalla).
 */
export const Composer = memo(function Composer({ ref, disabled, placeholder, hasAttachments, onHasTextChange, onSubmit, onPasteFiles }: Props) {
  const [text, setText] = useState('');
  const hadText = useRef(false);

  const update = (value: string) => {
    setText(value);
    const has = value.trim().length > 0;
    if (has !== hadText.current) {
      hadText.current = has;
      onHasTextChange(has);
    }
  };

  useImperativeHandle(ref, () => ({
    getText: () => text,
    clear: () => update(''),
  }));

  return (
    <textarea
      value={text}
      onChange={e => {
        update(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (text.trim() || hasAttachments) onSubmit();
        }
      }}
      onPaste={e => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const newFiles: File[] = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) newFiles.push(file);
          }
        }
        if (newFiles.length > 0) {
          onPasteFiles(newFiles);
          e.preventDefault();
        }
      }}
      rows={1}
      placeholder={placeholder}
      className="flex-1 bg-wa-header border-none focus:outline-none focus:ring-1 focus:ring-wa-accent/50 !text-white placeholder-wa-muted px-4 py-2.5 max-h-[120px] resize-none overflow-y-auto rounded-2xl text-[15px]"
      disabled={disabled}
    />
  );
});
