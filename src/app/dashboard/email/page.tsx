"use client";

import React, { useState } from 'react';
import { useEmailInbox, Email } from '@/hooks/useEmailInbox';
import { useEmailActions } from '@/hooks/useEmailActions';
import { EmailInboxView } from '@/components/ui/email/EmailInboxView';
import { EmailComposeModal } from '@/components/ui/email/EmailComposeModal';
import { EmailBodyViewer } from '@/components/ui/email/EmailBodyViewer';
import { useSession } from 'next-auth/react';
import { Trash2, AlertOctagon, MailOpen, ArrowLeft, Download, Calendar, X, Reply, Loader2, Paperclip, ChevronDown, ChevronRight } from 'lucide-react';

export default function EmailPage() {
  const { data: session } = useSession();
  const { 
    emails, 
    isLoading, 
    isSyncing, 
    syncError,
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
  const [activeThread, setActiveThread] = useState<(Email & { html?: string; text?: string; attachments?: any[] })[]>([]);
  const [expandedEmails, setExpandedEmails] = useState<Record<string, boolean>>({});
  const [replyData, setReplyData] = useState<{ to: string; subject: string; text: string } | null>(null);

  const handleSelectEmail = async (email: Email) => {
    setSelectedEmail(email);
    setActiveThread([]);
    setExpandedEmails({});

    // Fetch body from hybrid storage API
    try {
      const res = await fetch(`/api/email/${email.id}/body`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.thread) {
          setActiveThread(data.thread);
          // Expand the last email in the thread by default
          if (data.thread.length > 0) {
            const lastId = data.thread[data.thread.length - 1].id;
            setExpandedEmails({ [lastId]: true });
          }
        } else {
          setActiveThread([{ ...email, html: `<p>${email.snippet || ''}</p>`, text: email.snippet }]);
          setExpandedEmails({ [email.id]: true });
        }
      } else {
        setActiveThread([{ ...email, html: `<p>${email.snippet || ''}</p>`, text: email.snippet }]);
        setExpandedEmails({ [email.id]: true });
      }
    } catch (e) {
      console.error('Error fetching email body:', e);
      setActiveThread([{ ...email, html: `<p>${email.snippet || ''}</p>`, text: email.snippet }]);
      setExpandedEmails({ [email.id]: true });
    }

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

  const handleToggleStar = async (emailId: string, isStarred: boolean) => {
    const success = await updateEmail(emailId, { isStarred });
    if (success) {
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
  };

  const toggleExpand = (emailId: string) => {
    setExpandedEmails(prev => ({ ...prev, [emailId]: !prev[emailId] }));
  };

  const toggleExpandAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    activeThread.forEach(em => {
      next[em.id] = expand;
    });
    setExpandedEmails(next);
  };

  return (
    <div className="flex h-[calc(100vh-7.5rem)] w-full bg-slate-50/30">
      <div className="flex-1 w-full h-full relative flex gap-4">
        
        {/* Main Inbox View */}
        <div className={`flex-1 transition-all duration-300 ${selectedEmail ? 'hidden' : 'w-full'}`}>
          <EmailInboxView 
            emails={emails}
            isLoading={isLoading}
            isSyncing={isSyncing}
            syncError={syncError}
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
            onToggleStar={handleToggleStar}
            userName={session?.user?.name || ''}
            userEmail={session?.user?.email || ''}
          />
        </div>

        {/* Selected Email Panel (Full screen viewer when active) */}
        {selectedEmail && (
          <div className="flex-1 w-full bg-white border border-slate-200/80 rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-300">
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

            {/* Thread Subject Title Bar */}
            <div className="p-6 border-b border-slate-100 flex-shrink-0 bg-slate-50/20 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg text-slate-800 leading-tight">{selectedEmail.subject}</h2>
                {activeThread.length > 1 && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Conversación de {activeThread.length} mensajes
                  </p>
                )}
              </div>
              {activeThread.length > 1 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleExpandAll(true)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all"
                  >
                    Expandir todos
                  </button>
                  <button
                    onClick={() => toggleExpandAll(false)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all"
                  >
                    Colapsar todos
                  </button>
                </div>
              )}
            </div>

            {/* Email Body Content / Scroll Area */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-55/30 space-y-4">
              {activeThread.length === 0 ? (
                <div className="flex flex-col justify-center items-center py-12 text-slate-450 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-red-650" />
                  <span className="text-xs font-medium">Cargando conversación...</span>
                </div>
              ) : (
                activeThread.map((em) => {
                  const isExpanded = !!expandedEmails[em.id];
                  const senderInitial = em.from.charAt(0).toUpperCase();

                  return (
                    <div 
                      key={em.id} 
                      className={`bg-white border rounded-xl shadow-sm transition-all overflow-hidden ${
                        isExpanded ? 'border-slate-200' : 'border-slate-150 hover:border-slate-300 hover:shadow-md cursor-pointer'
                      }`}
                    >
                      {/* Accordion Header / Compact Row */}
                      <div 
                        onClick={() => toggleExpand(em.id)}
                        className={`px-4 py-3 flex items-center justify-between gap-4 select-none ${
                          !isExpanded ? 'bg-white' : 'bg-slate-50/50 border-b border-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-700 font-bold text-xs uppercase shadow-sm flex-shrink-0">
                            {senderInitial}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2 justify-between pr-2">
                              <span className="font-semibold text-slate-800 text-xs truncate max-w-[200px]">
                                {em.from}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold flex-shrink-0">
                                {new Date(em.receivedAt).toLocaleDateString('es-MX', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            
                            {!isExpanded && (
                              <p className="text-xs text-slate-500 truncate max-w-full mt-0.5 pr-4">
                                {em.snippet}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {em.attachments && em.attachments.length > 0 && (
                            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <div className="p-1 hover:bg-slate-100 rounded text-slate-400">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded View */}
                      {isExpanded && (
                        <div className="p-5 bg-white space-y-4">
                          <div className="flex justify-between items-start text-xs border-b border-slate-100 pb-3">
                            <div>
                              <p className="text-slate-500">De: <span className="font-semibold text-slate-805">{em.from}</span></p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Para: {em.to}</p>
                              {em.cc && <p className="text-[10px] text-slate-400">Cc: {em.cc}</p>}
                            </div>
                            <div className="text-right text-[10px] text-slate-400">
                              {new Date(em.receivedAt).toLocaleString('es-MX', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })}
                            </div>
                          </div>

                          {/* Email Body */}
                          <div className="pt-2">
                            <EmailBodyViewer html={em.html} text={em.text} />
                          </div>

                          {/* Attachments */}
                          {em.attachments && em.attachments.length > 0 && (
                            <div className="border-t border-slate-100 pt-4 mt-4">
                              <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Adjuntos ({em.attachments.length})
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {em.attachments.map((att: any, i: number) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between p-2.5 border border-slate-200/80 hover:border-slate-350 bg-slate-50/50 rounded-xl transition-all group"
                                  >
                                    <div className="min-w-0 flex-1 pr-2">
                                      <p className="text-xs font-semibold text-slate-800 truncate">{att.filename}</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">({(att.size / 1024).toFixed(1)} KB)</p>
                                    </div>
                                    <button
                                      onClick={() => downloadAttachment(em.messageId, att.filename)}
                                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 shadow-sm transition-all"
                                      title="Descargar archivo"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Individual Message Quick reply button */}
                          <div className="flex justify-end pt-2">
                            <button
                              onClick={() => handleReply(em)}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-600 hover:text-red-650 rounded-lg text-xs font-semibold transition-all active:scale-95"
                            >
                              <Reply className="w-3.5 h-3.5" />
                              Responder a este mensaje
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
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
