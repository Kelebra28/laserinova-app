import React, { useState, useMemo } from 'react';
import { 
  Mail, Loader2, Paperclip, RefreshCw, Plus, Send, AlertOctagon, Trash2, Inbox, 
  Search, Star, CheckSquare, Square, Filter, ChevronLeft, ChevronRight, Eye, MailOpen
} from 'lucide-react';
import { Email } from '@/hooks/useEmailInbox';

interface EmailInboxViewProps {
  emails: Email[];
  isLoading: boolean;
  isSyncing: boolean;
  currentFolder: string;
  onFolderChange: (folder: string) => void;
  onRefresh: () => void;
  onCompose: () => void;
  onSelectEmail: (email: Email) => void;
  page: number;
  totalEmails: number;
  limit: number;
  onPageChange: (page: number) => void;
  onMoveEmail?: (emailId: string, folder: string) => void;
  userName?: string;
  userEmail?: string;
}

export function EmailInboxView({ 
  emails, 
  isLoading, 
  isSyncing, 
  currentFolder, 
  onFolderChange, 
  onRefresh, 
  onCompose, 
  onSelectEmail,
  page,
  totalEmails,
  limit,
  onPageChange,
  onMoveEmail,
  userName,
  userEmail
}: EmailInboxViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [starredEmails, setStarredEmails] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const folders = [
    { id: 'INBOX', label: 'Recibidos', icon: <Inbox className="w-4 h-4" /> },
    { id: 'SENT', label: 'Enviados', icon: <Send className="w-4 h-4" /> },
    { id: 'SPAM', label: 'Spam', icon: <AlertOctagon className="w-4 h-4" /> },
    { id: 'TRASH', label: 'Papelera', icon: <Trash2 className="w-4 h-4" /> },
  ];

  // Filter emails client-side for ultra-fast UX
  const filteredEmails = useMemo(() => {
    if (!searchQuery) return emails;
    const query = searchQuery.toLowerCase();
    return emails.filter(email => 
      email.subject.toLowerCase().includes(query) ||
      email.from.toLowerCase().includes(query) ||
      email.snippet.toLowerCase().includes(query)
    );
  }, [emails, searchQuery]);

  // Count unread
  const unreadCount = useMemo(() => {
    return emails.filter(e => !e.isRead && e.folder === 'INBOX').length;
  }, [emails]);

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredEmails(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectAll = () => {
    const allSelected = filteredEmails.every(e => selectedIds[e.id]);
    const newSelected: Record<string, boolean> = {};
    if (!allSelected) {
      filteredEmails.forEach(e => {
        newSelected[e.id] = true;
      });
    }
    setSelectedIds(newSelected);
  };

  const handleBulkMove = (folder: string) => {
    if (onMoveEmail) {
      Object.keys(selectedIds).forEach(id => {
        if (selectedIds[id]) {
          onMoveEmail(id, folder);
        }
      });
      setSelectedIds({});
    }
  };

  const anySelected = Object.values(selectedIds).some(Boolean);

  return (
    <div className="flex h-full w-full bg-slate-50 border border-slate-200 rounded-2xl shadow-xl overflow-hidden font-sans">
      
      {/* Sidebar Folders */}
      <div className="w-64 bg-slate-900 flex flex-col justify-between text-slate-300">
        <div>
          {/* Logo / Header */}
          <div className="p-5 border-b border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 bg-red-650 rounded-lg flex items-center justify-center font-bold text-white text-xs uppercase shadow-sm">
              {userName ? userName.charAt(0) : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-xs text-white leading-tight truncate">{userName || 'LaserInova Mail'}</h2>
              <p className="text-[9px] text-slate-400 font-medium truncate mt-0.5">{userEmail || 'Bandeja Profesional'}</p>
            </div>
          </div>

          <div className="p-4">
            <button 
              onClick={onCompose}
              className="w-full flex justify-center items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 rounded-xl transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Redactar Correo
            </button>
          </div>

          <nav className="px-3 space-y-1">
            {folders.map(f => {
              const isSelected = currentFolder === f.id;
              const hasBadge = f.id === 'INBOX' && unreadCount > 0;
              return (
                <button
                  key={f.id}
                  onClick={() => onFolderChange(f.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    isSelected 
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700' 
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isSelected ? 'text-red-500' : ''}>{f.icon}</span>
                    {f.label}
                  </div>
                  {hasBadge && (
                    <span className="bg-red-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sync Info Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20 text-center">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Servidor IMAP</p>
          <p className="text-[10px] text-slate-400 mt-1 truncate">imap.hostinger.com</p>
        </div>
      </div>

      {/* Main Inbox Workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Topbar Search and Pagination */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar en correos por remitente, asunto..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 border border-transparent focus:border-slate-250 focus:bg-white px-9 py-2 rounded-xl text-xs text-slate-700 placeholder-slate-400 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={onRefresh}
              disabled={isSyncing || isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-sm transition-all disabled:opacity-50 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando' : 'Sincronizar'}
            </button>
          </div>
        </div>

        {/* Gmail Action Bar */}
        <div className="px-6 py-3 border-b border-slate-150 flex items-center justify-between text-slate-650 bg-white/80">
          <div className="flex items-center gap-3">
            {/* Checkbox All */}
            <button 
              onClick={handleSelectAll}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
              title="Seleccionar todo"
            >
              {filteredEmails.length > 0 && filteredEmails.every(e => selectedIds[e.id]) ? (
                <CheckSquare className="w-4.5 h-4.5 text-red-500" />
              ) : (
                <Square className="w-4.5 h-4.5" />
              )}
            </button>

            {/* Bulk actions */}
            {anySelected && (
              <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                <div className="h-4 w-px bg-slate-200 mx-1" />
                
                {currentFolder !== 'SPAM' && (
                  <button 
                    onClick={() => handleBulkMove('SPAM')}
                    className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-all"
                    title="Marcar como Spam"
                  >
                    <AlertOctagon className="w-4.5 h-4.5" />
                  </button>
                )}

                {currentFolder !== 'TRASH' && (
                  <button 
                    onClick={() => handleBulkMove('TRASH')}
                    className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-all"
                    title="Eliminar seleccionados"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                )}

                {currentFolder === 'TRASH' || currentFolder === 'SPAM' ? (
                  <button 
                    onClick={() => handleBulkMove('INBOX')}
                    className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-teal-700 hover:bg-teal-50 border border-teal-200 rounded-lg transition-all"
                  >
                    Mover a Recibidos
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {/* Pagination Counts */}
          {totalEmails > 0 && (
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
              <span>
                {Math.min((page - 1) * limit + 1, totalEmails)}-{Math.min(page * limit, totalEmails)} de {totalEmails}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1 || isLoading}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onPageChange(page + 1)}
                  disabled={page * limit >= totalEmails || isLoading}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Email List Table */}
        <div className="flex-1 overflow-y-auto bg-slate-50/20">
          {isLoading && filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-red-500" />
              <p className="text-xs font-medium">Buscando correos en el servidor...</p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-slate-400">
              <Mail className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-xs font-medium">No se encontraron correos en esta bandeja</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEmails.map((email) => {
                const isSelected = !!selectedIds[email.id];
                const isStarred = !!starredEmails[email.id];
                return (
                  <div 
                    key={email.id} 
                    onClick={() => onSelectEmail(email)}
                    className={`flex items-center gap-4 px-6 py-3 cursor-pointer transition-all hover:shadow-[inset_3px_0_0_#ef4444] ${
                      isSelected 
                        ? 'bg-rose-50/40' 
                        : email.isRead 
                          ? 'bg-white hover:bg-slate-50/50' 
                          : 'bg-red-50/20 font-bold hover:bg-red-50/30'
                    }`}
                  >
                    {/* Left Actions (Select & Star) */}
                    <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={e => toggleSelect(email.id, e)} 
                        className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-red-500" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <button 
                        onClick={e => toggleStar(email.id, e)} 
                        className={`p-1 hover:bg-slate-100 rounded transition-colors ${
                          isStarred ? 'text-amber-400' : 'text-slate-350 hover:text-slate-500'
                        }`}
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </button>
                    </div>

                    {/* Sender Avatar / Initial */}
                    <div className="w-8 h-8 flex-shrink-0 bg-slate-200 border border-slate-300/40 rounded-full flex items-center justify-center text-slate-700 font-bold text-xs uppercase shadow-sm">
                      {email.from.charAt(0)}
                    </div>

                    {/* Sender Name */}
                    <div className="w-44 flex-shrink-0 truncate text-slate-800 text-xs font-semibold">
                      {email.from.split('<')[0].trim() || email.from}
                    </div>
                    
                    {/* Subject & Snippet */}
                    <div className="flex-1 min-w-0 flex items-center gap-2 text-xs">
                      <span className={`${email.isRead ? 'text-slate-700 font-medium' : 'text-slate-900 font-bold'} truncate`}>
                        {email.subject}
                      </span>
                      <span className="text-slate-400 font-normal">-</span>
                      <span className="truncate text-slate-400 font-normal max-w-md">
                        {email.snippet}
                      </span>
                    </div>

                    {/* Attachment Icon */}
                    {email.attachments && email.attachments.length > 0 && (
                      <div className="flex-shrink-0 text-slate-400">
                        <Paperclip className="w-3.5 h-3.5" />
                      </div>
                    )}

                    {/* Date */}
                    <div className="w-20 text-right flex-shrink-0 text-[10px] text-slate-400 font-medium">
                      {new Date(email.receivedAt).toLocaleDateString('es-MX', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
