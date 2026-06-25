"use client";

import React, { useState } from 'react';
import { useEmailInbox, Email } from '@/hooks/useEmailInbox';
import { useEmailActions } from '@/hooks/useEmailActions';
import { EmailComposeModal } from '@/components/ui/email/EmailComposeModal';
import { EmailBodyViewer } from '@/components/ui/email/EmailBodyViewer';
import { useSession } from 'next-auth/react';
import { 
  Trash2, AlertOctagon, MailOpen, ArrowLeft, Download, X, Reply, Loader2, 
  Paperclip, ChevronDown, ChevronRight, Inbox, Send, Star, StarOff,
  RefreshCw, PenSquare, Search, Archive, ChevronLeft, Mail
} from 'lucide-react';

const FOLDERS = [
  { id: 'INBOX', label: 'Recibidos', icon: Inbox },
  { id: 'SENT', label: 'Enviados', icon: Send },
  { id: 'SPAM', label: 'Spam', icon: AlertOctagon },
  { id: 'TRASH', label: 'Papelera', icon: Trash2 },
];

function getInitials(from: string) {
  const nameMatch = from.match(/^"?([^"<]+)"?\s*</);
  if (nameMatch) {
    const words = nameMatch[1].trim().split(/\s+/);
    return words.length >= 2
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : words[0][0].toUpperCase();
  }
  return from[0]?.toUpperCase() || '?';
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
];

function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getSenderName(from: string) {
  const nameMatch = from.match(/^"?([^"<]+)"?\s*</);
  if (nameMatch) return nameMatch[1].trim().replace(/^"|"$/g, '');
  return from.split('@')[0];
}

function formatEmailDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays < 7) {
    return date.toLocaleDateString('es-MX', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  }
}

export default function EmailPage() {
  const { data: session } = useSession();
  const { 
    emails, isLoading, isSyncing, syncError, syncAuthError,
    syncEmails, fetchEmails, currentFolder, changeFolder,
    page, totalEmails, limit, changePage
  } = useEmailInbox('INBOX', session?.user?.email || '');

  const { isSending, sendEmail, downloadAttachment, updateEmail } = useEmailActions();
  
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [activeThread, setActiveThread] = useState<(Email & { html?: string; text?: string; attachments?: any[] })[]>([]);
  const [expandedEmails, setExpandedEmails] = useState<Record<string, boolean>>({});
  const [replyData, setReplyData] = useState<{ to: string; subject: string; text: string; quotedText: string } | null>(null);
  const [isLoadingBody, setIsLoadingBody] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectEmail = async (email: Email) => {
    setSelectedEmail(email);
    setActiveThread([]);
    setExpandedEmails({});
    setIsLoadingBody(true);

    try {
      const res = await fetch(`/api/email/${email.id}/body?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.thread) {
          setActiveThread(data.thread);
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
      setActiveThread([{ ...email, html: `<p>${email.snippet || ''}</p>`, text: email.snippet }]);
      setExpandedEmails({ [email.id]: true });
    } finally {
      setIsLoadingBody(false);
    }

    if (!email.isRead) {
      const success = await updateEmail(email.id, { isRead: true });
      if (success) fetchEmails(currentFolder, page);
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
    if (success) fetchEmails(currentFolder, page);
  };

  const handleReply = (email: Email) => {
    const match = email.from.match(/<([^>]+)>/);
    const replyTo = match ? match[1] : email.from.trim();
    const replySubject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;
    const threadMail = activeThread.find(m => m.id === email.id);
    const emailText = threadMail?.text || '';
    const originalBodyQuoted = emailText
      ? emailText.split('\n').map(line => `> ${line}`).join('\n')
      : `> ${email.snippet || ''}`;
    const formattedDate = new Date(email.receivedAt).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
    const replyText = `El ${formattedDate}, ${email.from} escribió:\n${originalBodyQuoted}`;
    setReplyData({ to: replyTo, subject: replySubject, text: '', quotedText: replyText });
    setIsComposeOpen(true);
  };

  const toggleExpand = (emailId: string) => {
    setExpandedEmails(prev => ({ ...prev, [emailId]: !prev[emailId] }));
  };

  const totalPages = Math.ceil(totalEmails / limit);

  const filteredEmails = emails.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.subject?.toLowerCase().includes(q) ||
      e.from?.toLowerCase().includes(q) ||
      e.snippet?.toLowerCase().includes(q)
    );
  });

  const unreadCount = emails.filter(e => !e.isRead).length;

  return (
    <div className="flex h-[calc(100vh-7.5rem)] w-full overflow-hidden rounded-2xl border border-slate-200/60 shadow-xl bg-white">
      
      {/* ─── LEFT SIDEBAR ─── */}
      <div className="w-56 flex-shrink-0 bg-slate-50/80 border-r border-slate-200/60 flex flex-col">
        {/* Compose button */}
        <div className="p-3">
          <button
            onClick={() => { setReplyData(null); setIsComposeOpen(true); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm shadow-md shadow-red-200 transition-all active:scale-95"
          >
            <PenSquare className="w-4 h-4" />
            Nuevo correo
          </button>
        </div>

        {/* Folders */}
        <nav className="px-2 flex-1">
          {FOLDERS.map(({ id, label, icon: Icon }) => {
            const isActive = currentFolder === id;
            return (
              <button
                key={id}
                onClick={() => changeFolder(id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all mb-0.5 ${
                  isActive
                    ? 'bg-red-50 text-red-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{label}</span>
                {id === 'INBOX' && unreadCount > 0 && (
                  <span className="ml-auto text-[11px] font-bold bg-red-600 text-white rounded-full px-1.5 py-0.5 leading-none">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sync button */}
        <div className="p-3 border-t border-slate-200/60">
          <button
            onClick={() => syncEmails()}
            disabled={isSyncing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      </div>

      {/* ─── EMAIL LIST ─── */}
      <div className={`flex-shrink-0 flex flex-col border-r border-slate-200/60 bg-white transition-all duration-300 ${selectedEmail ? 'w-80' : 'flex-1 min-w-0'}`}>
        {/* List header */}
        <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-slate-800 text-base capitalize">
              {FOLDERS.find(f => f.id === currentFolder)?.label || currentFolder}
            </h2>
            <span className="text-xs text-slate-400">{totalEmails} mensajes</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar correos..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition"
            />
          </div>
        </div>

        {/* Error states */}
        {syncAuthError && (
          <div className="mx-3 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            ⚠️ Configura tu correo en Ajustes para sincronizar.
          </div>
        )}
        {syncError && !syncAuthError && (
          <div className="mx-3 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            Error: {syncError}
          </div>
        )}

        {/* Email list */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              <span className="text-xs">Cargando...</span>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Mail className="w-10 h-10 opacity-30" />
              <span className="text-sm font-medium">Sin correos</span>
            </div>
          ) : (
            filteredEmails.map(email => {
              const isSelected = selectedEmail?.id === email.id;
              const senderName = getSenderName(email.from);
              const initials = getInitials(email.from);
              const avatarColor = getAvatarColor(email.from);
              
              // If no email is selected, we are in full-width mode
              const isFullWidth = !selectedEmail;

              return (
                <button
                  key={email.id}
                  onClick={() => handleSelectEmail(email)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 transition-all hover:bg-slate-50 group ${
                    isSelected ? 'bg-red-50/60 border-l-2 border-l-red-500' : 'border-l-2 border-l-transparent'
                  }`}
                >
                  <div className={`w-full min-w-0 flex ${isFullWidth ? 'items-center gap-4' : 'items-start gap-3'}`}>
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold ${avatarColor}`}>
                      {initials}
                    </div>

                    {isFullWidth ? (
                      /* ─── FULL WIDTH LAYOUT (Gmail style) ─── */
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        {/* Sender */}
                        <div className={`w-24 md:w-40 flex-shrink-0 truncate text-sm md:text-sm ${!email.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {senderName}
                        </div>
                        
                        {/* Subject & Snippet Container */}
                        <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
                          <span className={`flex-shrink-0 max-w-[40%] md:max-w-[50%] truncate text-sm ${!email.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}`}>
                            {email.subject || '(Sin asunto)'}
                          </span>
                          <span className="text-slate-400 truncate text-xs md:text-sm flex-1 min-w-0">
                            - {email.snippet}
                          </span>
                        </div>
                        
                        {/* Date & Unread indicator */}
                        <div className="w-16 md:w-24 text-right flex-shrink-0 flex items-center justify-end gap-1.5 md:gap-2">
                          {!email.isRead && <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 flex-shrink-0" />}
                          <span className={`text-[10px] md:text-xs truncate ${!email.isRead ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                            {formatEmailDate(email.receivedAt)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* ─── COMPACT SIDEBAR LAYOUT ─── */
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-sm truncate ${!email.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                            {senderName}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {!email.isRead && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                            <span className={`text-[10px] ${!email.isRead ? 'font-bold text-slate-900' : 'text-slate-400'}`}>
                              {formatEmailDate(email.receivedAt)}
                            </span>
                          </div>
                        </div>

                        <p className={`text-xs truncate ${!email.isRead ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                          {email.subject || '(Sin asunto)'}
                        </p>

                        <p className="text-[11px] text-slate-500 truncate mt-0.5 leading-relaxed">
                          {email.snippet}
                        </p>
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 flex-shrink-0 bg-white">
            <button
              onClick={() => changePage(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-xs text-slate-500">{page} / {totalPages}</span>
            <button
              onClick={() => changePage(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-all"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        )}
      </div>

      {/* ─── EMAIL VIEWER PANEL ─── */}
      {selectedEmail && (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <>
            {/* Viewer toolbar */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReply(selectedEmail)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm shadow-red-200 transition-all active:scale-95"
                >
                  <Reply className="w-3.5 h-3.5" />
                  Responder
                </button>

                <div className="h-4 w-px bg-slate-200" />

                {currentFolder !== 'SPAM' && (
                  <button
                    onClick={() => handleMoveEmail(selectedEmail.id, 'SPAM')}
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                    title="Marcar como Spam"
                  >
                    <AlertOctagon className="w-4 h-4" />
                  </button>
                )}

                {currentFolder !== 'TRASH' && (
                  <button
                    onClick={() => handleMoveEmail(selectedEmail.id, 'TRASH')}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    title="Mover a la Papelera"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {(currentFolder === 'TRASH' || currentFolder === 'SPAM') && (
                  <button
                    onClick={() => handleMoveEmail(selectedEmail.id, 'INBOX')}
                    className="px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 border border-teal-200 rounded-lg transition-all"
                  >
                    Mover a Recibidos
                  </button>
                )}

                <button
                  onClick={() => handleToggleRead(selectedEmail.id, false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                  title="Marcar como no leído"
                >
                  <MailOpen className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setSelectedEmail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thread subject */}
            <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex-shrink-0">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">
                {selectedEmail.subject || '(Sin asunto)'}
              </h1>
              {activeThread.length > 1 && (
                <p className="text-xs text-slate-400 mt-1">
                  {activeThread.length} mensajes en esta conversación
                </p>
              )}
            </div>

            {/* Thread body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {isLoadingBody ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                  <span className="text-xs">Cargando conversación...</span>
                </div>
              ) : activeThread.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                  <span className="text-xs">Cargando...</span>
                </div>
              ) : (
                activeThread.map((em, idx) => {
                  const isExpanded = !!expandedEmails[em.id];
                  const senderName = getSenderName(em.from);
                  const initials = getInitials(em.from);
                  const avatarColor = getAvatarColor(em.from);
                  const isLast = idx === activeThread.length - 1;

                  return (
                    <div
                      key={em.id}
                      className={`rounded-2xl border transition-all ${
                        isExpanded
                          ? 'border-slate-200 shadow-sm'
                          : 'border-slate-150 hover:border-slate-300 hover:shadow cursor-pointer bg-white'
                      }`}
                    >
                      {/* Accordion header */}
                      <div
                        onClick={() => toggleExpand(em.id)}
                        className={`px-5 py-3.5 flex items-center justify-between gap-4 select-none cursor-pointer ${
                          isExpanded ? 'border-b border-slate-100' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold ${avatarColor}`}>
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2 justify-between">
                              <span className="font-semibold text-slate-900 text-sm truncate">{senderName}</span>
                              <span className="text-xs text-slate-400 flex-shrink-0">
                                {new Date(em.receivedAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                              </span>
                            </div>
                            {!isExpanded && (
                              <p className="text-xs text-slate-500 truncate mt-0.5">{em.snippet}</p>
                            )}
                            {isExpanded && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                Para: {em.to}
                                {em.cc && ` · CC: ${em.cc}`}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {em.attachments && em.attachments.length > 0 && (
                            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="px-5 pt-4 pb-5 space-y-4 bg-white rounded-b-2xl">
                          {/* Email body iframe */}
                          <EmailBodyViewer html={em.html} text={em.text} />

                          {/* Attachments */}
                          {em.attachments && em.attachments.length > 0 && (
                            <div className="border-t border-slate-100 pt-4">
                              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Adjuntos ({em.attachments.length})
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {em.attachments.map((att: any, i: number) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between p-3 border border-slate-200 hover:border-slate-300 bg-slate-50 rounded-xl transition-all"
                                  >
                                    <div className="min-w-0 flex-1 pr-2">
                                      <p className="text-xs font-semibold text-slate-700 truncate">{att.filename}</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">{(att.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button
                                      onClick={() => downloadAttachment(em.messageId, att.filename)}
                                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
                                      title="Descargar"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Reply button per message */}
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => handleReply(em)}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-lg text-xs font-semibold transition-all active:scale-95"
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
          </>
        </div>
      )}

      {/* Compose Modal */}
      <EmailComposeModal
        isOpen={isComposeOpen}
        onClose={() => { setIsComposeOpen(false); setReplyData(null); }}
        onSend={sendEmail}
        isSending={isSending}
        initialTo={replyData?.to || ''}
        initialSubject={replyData?.subject || ''}
        initialText={replyData?.text || ''}
        initialQuotedText={replyData?.quotedText || ''}
      />
    </div>
  );
}
