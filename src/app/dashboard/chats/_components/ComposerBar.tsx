'use client';

import { useRef, useState, type Ref } from 'react';
import { FileText, Mic, Plus, Send, Square, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatRecordingTime } from '../_lib/chat-format';
import type { ChatMessage } from '../_lib/types';
import type { AudioRecorder } from '../_hooks/useAudioRecorder';
import { Composer, type ComposerHandle } from './Composer';
import { StagedImagePreview } from './StagedImagePreview';

type Props = {
  composerRef: Ref<ComposerHandle>;
  simulatorMode: boolean;
  isUploading: boolean;
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
  stagedFiles: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onClearFiles: () => void;
  recorder: AudioRecorder;
  onSend: () => void;
};

/** Barra inferior del chat: "respondiendo a", adjuntos, grabadora de voz, campo de texto y botón de enviar/grabar. */
export function ComposerBar({
  composerRef, simulatorMode, isUploading, replyingTo, onCancelReply,
  stagedFiles, onAddFiles, onRemoveFile, onClearFiles, recorder, onSend,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // El texto vive en <Composer>; aquí solo se sabe si hay algo escrito (para el botón de enviar).
  const [hasText, setHasText] = useState(false);
  const { isRecording, duration, recordedAudio, canvasRef } = recorder;

  return (
    <div className="bg-wa-panel border-t border-wa-border px-3 md:px-4 py-2.5 flex flex-col z-20">

      {(replyingTo || stagedFiles.length > 0) && (
        <div className="flex flex-col gap-2 mb-2">
          {replyingTo && (
            <div className="flex items-center justify-between bg-wa-surface p-2.5 rounded-xl border-l-4 border-wa-accent relative">
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-semibold text-wa-accent-light">Respondiendo a</span>
                <span className="text-sm text-wa-text-dim truncate">{replyingTo.content || (replyingTo.type === 'IMAGE' ? 'Imagen' : 'Adjunto')}</span>
              </div>
              <button type="button" onClick={onCancelReply} className="text-wa-muted hover:text-wa-text p-1">
                <X size={16} />
              </button>
            </div>
          )}

          {stagedFiles.length > 0 && (
            <div className="flex flex-col bg-wa-surface rounded-xl overflow-hidden border border-wa-input">
              <div className="flex justify-between items-center px-3 py-1.5 border-b border-wa-input">
                <span className="text-xs text-wa-muted">Vista previa de adjuntos ({stagedFiles.length})</span>
                <button type="button" onClick={onClearFiles} className="text-wa-muted hover:text-wa-text p-1">
                  <X size={16} />
                </button>
              </div>
              <div className="flex overflow-x-auto p-2 gap-2 custom-scrollbar">
                {stagedFiles.map((file, idx) => (
                  <div key={`${file.name}-${file.lastModified}-${idx}`} className="relative group shrink-0">
                    {file.type.startsWith('image/') ? (
                      <div className="w-24 h-24 bg-wa-panel rounded-lg overflow-hidden relative border border-wa-input">
                        <StagedImagePreview file={file} />
                      </div>
                    ) : (
                      <div className="w-24 h-24 bg-wa-panel rounded-lg flex flex-col items-center justify-center p-2 border border-wa-input">
                        <FileText size={24} className="text-wa-muted mb-1"/>
                        <span className="text-[10px] font-medium text-wa-text truncate w-full text-center">{file.name}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveFile(idx)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); onSend(); }} className="flex gap-2 items-end transition-all">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) onAddFiles(files);
            // Reset para poder volver a elegir el mismo archivo si lo quitó
            e.target.value = '';
          }}
          accept="image/*,.pdf,.doc,.docx,.dxf"
          multiple
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-wa-muted hover:text-wa-text rounded-full hover:bg-wa-header mb-0.5"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="Adjuntar archivo"
        >
          <Plus size={24} />
        </Button>

        {recordedAudio ? (
          <div className="flex-1 flex items-center justify-between bg-wa-header rounded-2xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Mic className="text-red-500 animate-pulse" size={18} />
              <span className="text-wa-text text-sm">Audio grabado</span>
            </div>
            <button type="button" onClick={recorder.cancel} className="text-wa-muted hover:text-red-400">
              <Trash2 size={18} />
            </button>
          </div>
        ) : isRecording ? (
          <div className="flex-1 flex items-center gap-3">
            <button type="button" onClick={recorder.cancel} className="text-wa-muted hover:text-red-400 p-2 shrink-0">
              <Trash2 size={20} />
            </button>
            <div className="flex-1 flex items-center bg-wa-header rounded-full px-4 py-2">
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-wa-text-dim font-mono text-sm tracking-wide">{formatRecordingTime(duration)}</span>
              </div>
              <div className="flex-1 px-4 h-8 flex items-center">
                <canvas ref={canvasRef} style={{ width: '100%', height: '32px' }} className="rounded-md" />
              </div>
            </div>
          </div>
        ) : (
          <Composer
            ref={composerRef}
            disabled={isUploading}
            placeholder={isUploading ? "Enviando..." : (simulatorMode ? "Escribe un mensaje como cliente..." : "Escribe un mensaje")}
            hasAttachments={stagedFiles.length > 0}
            onHasTextChange={setHasText}
            onSubmit={onSend}
            onPasteFiles={onAddFiles}
          />
        )}

        {hasText || stagedFiles.length > 0 || recordedAudio ? (
          <Button type="submit" size="icon" className="shrink-0 rounded-full bg-wa-accent hover:bg-wa-accent-hover text-wa-on-accent w-10 h-10 mb-0.5 shadow-sm transition-transform active:scale-95" disabled={isUploading} title="Enviar">
            <Send size={18} className="transition-transform translate-x-0.5 -translate-y-0.5" />
          </Button>
        ) : isRecording ? (
          <Button type="button" onClick={recorder.stop} size="icon" className="shrink-0 rounded-full bg-red-500 hover:bg-red-600 text-white w-10 h-10 mb-0.5 shadow-sm">
            <Square size={16} fill="currentColor" />
          </Button>
        ) : (
          <Button type="button" onClick={recorder.start} size="icon" className="shrink-0 rounded-full bg-wa-accent hover:bg-wa-accent-hover text-wa-on-accent w-10 h-10 mb-0.5 shadow-sm transition-transform active:scale-95" title="Grabar audio">
            <Mic size={20} />
          </Button>
        )}
      </form>
    </div>
  );
}
