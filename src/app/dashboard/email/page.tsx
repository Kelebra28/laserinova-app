"use client";

import React, { useState } from 'react';
import { useEmailInbox, Email } from '@/hooks/useEmailInbox';
import { useEmailActions } from '@/hooks/useEmailActions';
import { EmailInboxView } from '@/components/ui/email/EmailInboxView';
import { EmailComposeModal } from '@/components/ui/email/EmailComposeModal';
import { EmailBodyViewer } from '@/components/ui/email/EmailBodyViewer';
import { useSession } from 'next-auth/react';
import { Trash2, AlertOctagon, MailOpen, ArrowLeft, Download, Calendar, X, Reply } from 'lucide-react';

export default function EmailPage() {
  const { data: session } = useSession();
  const { 
    emails, 
    isLoading, 
    isSyncing, 
    syncEmails, 
    fetchEmails,
    currentFolder, 
    changeFolder,
    page,
    totalEmails,
    limit,
    changePage
  } = useEmailInbox();
  const { isSending, sendEmail, downloadAttachment, updateEmail } = useEmailActions();
  
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [replyData, setReplyData] = useState<{ to: string; subject: string; text: string } | null>(null);

  const handleSelectEmail = async (email: Email) => {
    setSelectedEmail(email);
    // Marcar como leído automáticamente en DB
    if (!email.isRead) {
      const success = await updateEmail(email.id, { isRead: true });
      if (success) {
        // Refrescar lista de fondo silenciosamente sin cambiar de página
        fetchEmails(currentFolder, page);
      }
    }
  };

  const handleMoveEmail = async (emailId: string, targetFolder: string) => {
    const success = await updateEmail(emailId, { folder: targetFolder });
    if (success) {
      setSelectedEmail(null);
      fetchEmails(currentFolder, page);
    }
  };

  const handleToggleRead = async (emailId: string, isRead: boolean) => {
    const success = await updateEmail(emailId, { isRead });
    if (success) {
      setSelectedEmail(null);
      fetchEmails(currentFolder, page);
    }
  };

  const handleReply = (email: Email) => {
    // Extraer dirección limpia de correo del remitente
    const match = email.from.match(/<([^>]+)>/);
    const replyTo = match ? match[1] : email.from.trim();
    
    const replySubject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;
    
    // Crear cita limpia del mensaje anterior
    const replyText = `\n\n-------------------\nEl ${new Date(email.receivedAt).toLocaleString('es-MX')}, ${email.from} escribió:\n> ${email.snippet || ''}\n`;
    
    setReplyData({
      to: replyTo,
      subject: replySubject,
      text: replyText
    });
    setIsComposeOpen(true);
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] p-6 bg-slate-50/30">
      <div className="flex-1 max-w-7xl mx-auto h-full relative flex gap-6">
        
        {/* Main Inbox View */}
        <div className={`flex-1 transition-all duration-300 ${selectedEmail ? 'w-1/2 hidden md:flex' : 'w-full'}`}>
          <EmailInboxView 
            emails={emails}
            isLoading={isLoading}
            isSyncing={isSyncing}
            currentFolder={currentFolder}
            onFolderChange={changeFolder}
            onRefresh={syncEmails}
            onCompose={() => {
              setReplyData(null);
              setIsComposeOpen(true);
            }}
            onSelectEmail={handleSelectEmail}
            page={page}
            totalEmails={totalEmails}
            limit={limit}
            onPageChange={changePage}
            onMoveEmail={handleMoveEmail}
            userName={session?.user?.name || ''}
            userEmail={session?.user?.email || ''}
          />
        </div>

        {/* Selected Email Panel (Beautiful Gmail-inspired split viewer) */}
        {selectedEmail && (
          <div className="flex-1 md:w-1/2 w-full bg-white border border-slate-200/80 rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-300">
            {/* Action Bar (Top) */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setSelectedEmail(null)} 
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-all flex items-center gap-1 text-xs font-semibold mr-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Bandeja
                </button>

                <div className="h-4 w-px bg-slate-200 mx-1" />

                {/* Reply button */}
                <button 
                  onClick={() => handleReply(selectedEmail)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95"
                  title="Responder a este correo"
                >
                  <Reply className="w-3.5 h-3.5" />
                  Responder
                </button>

                <div className="h-4 w-px bg-slate-200 mx-1" />

                {currentFolder !== 'SPAM' && (
                  <button 
                    onClick={() => handleMoveEmail(selectedEmail.id, 'SPAM')}
                    className="p-2 text-amber-650 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-all"
                    title="Marcar como Spam"
                  >
                    <AlertOctagon className="w-4.5 h-4.5" />
                  </button>
                )}

                {currentFolder !== 'TRASH' && (
                  <button 
                    onClick={() => handleMoveEmail(selectedEmail.id, 'TRASH')}
                    className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-all"
                    title="Mover a la Papelera"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                )}

                {currentFolder === 'TRASH' || currentFolder === 'SPAM' ? (
                  <button 
                    onClick={() => handleMoveEmail(selectedEmail.id, 'INBOX')}
                    className="px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 border border-teal-200 rounded-lg transition-all"
                  >
                    Mover a Recibidos
                  </button>
                ) : null}

                <button 
                  onClick={() => handleToggleRead(selectedEmail.id, false)}
                  className="p-2 text-slate-605 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-all"
                  title="Marcar como no leído"
                >
                  <MailOpen className="w-4.5 h-4.5" />
                </button>
              </div>

              <button 
                onClick={() => setSelectedEmail(null)} 
                className="text-slate-400 hover:text-slate-700 p-2 hover:bg-slate-200/50 rounded-lg transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Email Header Panel */}
            <div className="p-6 border-b border-slate-100 flex-shrink-0 bg-slate-50/20">
              <h2 className="font-bold text-lg text-slate-800 leading-tight mb-4">{selectedEmail.subject}</h2>
              
              <div className="flex items-start justify-between">
                <div className="flex gap-3 items-center">
                  <div className="w-9 h-9 bg-slate-200 border border-slate-300/50 rounded-full flex items-center justify-center text-slate-700 font-bold text-xs uppercase shadow-sm">
                    {selectedEmail.from.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-slate-800 text-xs">{selectedEmail.from}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Para: {selectedEmail.to}</p>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(selectedEmail.receivedAt).toLocaleString('es-MX', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Email Body Content */}
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              {/* Elegant Sandboxed Frame to prevent visual deformation or style escaping */}
              <EmailBodyViewer html={selectedEmail.bodyHtml} text={selectedEmail.bodyText || selectedEmail.snippet} />
              
              {/* Attachments Display */}
              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="mt-8 border-t border-slate-100 pt-5">
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Adjuntos ({selectedEmail.attachments.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedEmail.attachments.map((att, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 border border-slate-200/80 hover:border-slate-350 bg-slate-50/50 rounded-xl transition-all group"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-xs font-semibold text-slate-800 truncate">{att.filename}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">({(att.size / 1024).toFixed(1)} KB)</p>
                        </div>
                        <button
                          onClick={() => downloadAttachment(selectedEmail.messageId, att.filename)}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 shadow-sm transition-all"
                          title="Descargar archivo"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Compose Modal */}
        <EmailComposeModal 
          isOpen={isComposeOpen}
          onClose={() => {
            setIsComposeOpen(false);
            setReplyData(null);
          }}
          onSend={sendEmail}
          isSending={isSending}
          initialTo={replyData?.to || ''}
          initialSubject={replyData?.subject || ''}
          initialText={replyData?.text || ''}
        />
      </div>
    </div>
  );
}
