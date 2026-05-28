import React, { useState, useMemo, useEffect } from 'react';
import { 
  Mail, Loader2, Paperclip, RefreshCw, Plus, Send, AlertOctagon, Trash2, Inbox, 
  Search, Star, CheckSquare, Square, ChevronLeft, ChevronRight, PenTool, Sparkles, CheckCircle
} from 'lucide-react';
import { Email } from '@/hooks/useEmailInbox';
import { GlobalLoader } from '@/components/ui/GlobalLoader';

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

  // Signature States
  const [sigName, setSigName] = useState('Ricardo Basurto');
  const [sigTitle, setSigTitle] = useState('Director General');
  const [sigPhone, setSigPhone] = useState('+52 1 55 1234 5678');
  const [sigWeb, setSigWeb] = useState('www.laserinova.com');
  const [isSigSaved, setIsSigSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSigName(localStorage.getItem('sig_name') || 'Ricardo Basurto');
      setSigTitle(localStorage.getItem('sig_title') || 'Director General');
      setSigPhone(localStorage.getItem('sig_phone') || '+52 1 55 1234 5678');
      setSigWeb(localStorage.getItem('sig_web') || 'www.laserinova.com');
    }
  }, [currentFolder]);

  const handleSaveSignature = () => {
    localStorage.setItem('sig_name', sigName);
    localStorage.setItem('sig_title', sigTitle);
    localStorage.setItem('sig_phone', sigPhone);
    localStorage.setItem('sig_web', sigWeb);
    setIsSigSaved(true);
    setTimeout(() => setIsSigSaved(false), 3000);
  };

  const folders = [
    { id: 'INBOX', label: 'Recibidos', icon: <Inbox className="w-4 h-4" /> },
    { id: 'SENT', label: 'Enviados', icon: <Send className="w-4 h-4" /> },
    { id: 'SPAM', label: 'Spam', icon: <AlertOctagon className="w-4 h-4" /> },
    { id: 'TRASH', label: 'Papelera', icon: <Trash2 className="w-4 h-4" /> },
    { id: 'SIGNATURE', label: 'Firma Corporativa', icon: <PenTool className="w-4 h-4" /> },
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
              className="w-full flex justify-center items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-md active:scale-95"
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
        
        {/* Render SIGNATURE Editor View when active */}
        {currentFolder === 'SIGNATURE' ? (
          <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50/20 font-sans p-6 md:p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-500/10 text-red-600 rounded-2xl shadow-sm">
                <PenTool className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-850">Mi Firma Corporativa</h1>
                <p className="text-xs text-slate-400 font-medium">Personaliza los campos de tu firma oficial para todos los correos salientes</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
              {/* Form Input fields */}
              <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-450 border-b border-slate-100 pb-2.5">Editar Datos</h3>
                
                {/* Nombre */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Nombre Completo</label>
                  <input 
                    type="text"
                    value={sigName}
                    onChange={e => setSigName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-red-500 focus:bg-white px-3.5 py-2.5 rounded-xl text-xs text-slate-800 font-bold outline-none transition-all"
                    placeholder="Ricardo Basurto"
                  />
                </div>

                {/* Cargo */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cargo o Puesto</label>
                  <input 
                    type="text"
                    value={sigTitle}
                    onChange={e => setSigTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-red-500 focus:bg-white px-3.5 py-2.5 rounded-xl text-xs text-slate-800 outline-none transition-all"
                    placeholder="Director General"
                  />
                </div>

                {/* WhatsApp */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">WhatsApp Corporativo</label>
                  <input 
                    type="text"
                    value={sigPhone}
                    onChange={e => setSigPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-red-500 focus:bg-white px-3.5 py-2.5 rounded-xl text-xs text-slate-800 outline-none transition-all"
                    placeholder="+52 1 55 1234 5678"
                  />
                </div>

                {/* Web */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Sitio Web</label>
                  <input 
                    type="text"
                    value={sigWeb}
                    onChange={e => setSigWeb(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-red-500 focus:bg-white px-3.5 py-2.5 rounded-xl text-xs text-slate-800 outline-none transition-all"
                    placeholder="www.laserinova.com"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button 
                    onClick={handleSaveSignature}
                    className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95"
                  >
                    {isSigSaved ? (
                      <>
                        <CheckCircle className="w-4 h-4 animate-in fade-in" />
                        ¡Guardado!
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-red-100" />
                        Guardar Firma
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Live Preview Pane */}
              <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-450 border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-4.5 h-4.5 text-amber-500" />
                  Previsualización de Correo
                </h3>

                {/* Mock Client Interface */}
                <div className="border border-slate-150 rounded-xl overflow-hidden shadow-inner">
                  {/* Mock Window Top */}
                  <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-150 flex items-center gap-1.5 flex-shrink-0">
                    <div className="w-2.5 h-2.5 bg-red-400 rounded-full" />
                    <div className="w-2.5 h-2.5 bg-amber-400 rounded-full" />
                    <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                    <span className="text-[10px] text-slate-400 font-semibold ml-2">Destinatario: Cliente LaserInova</span>
                  </div>
                  {/* Mock Window Body */}
                  <div className="p-5 min-h-[180px] bg-white font-sans text-xs text-slate-700 leading-relaxed">
                    <p className="text-slate-400 italic mb-4">[Contenido de tu correo...]</p>
                    
                    {/* The signature inside preview */}
                    <div className="mt-8 pt-4 border-t border-slate-100">
                      <table style={{ fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#1e293b', lineHeight: '1.5', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td colSpan={2} style={{ paddingBottom: '12px' }}>
                              <img src="/logo_pdf.png" alt="Laser Inova" style={{ height: '42px', display: 'block' }} />
                            </td>
                          </tr>
                          <tr>
                            <td style={{ verticalAlign: 'middle', paddingRight: '15px', borderRight: '2px solid #ef4444' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#0f172a' }}>{sigName}</div>
                              <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>{sigTitle}</div>
                            </td>
                            <td style={{ verticalAlign: 'middle', paddingLeft: '15px' }}>
                              <div style={{ marginBottom: '4px' }}>
                                <span style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '11px', textTransform: 'uppercase' }}>WhatsApp:</span>&nbsp;
                                <span style={{ color: '#1e293b', fontWeight: '500' }}>{sigPhone}</span>
                              </div>
                              <div style={{ marginBottom: '4px' }}>
                                <span style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '11px', textTransform: 'uppercase' }}>Email:</span>&nbsp;
                                <span style={{ color: '#1e293b', fontWeight: '500' }}>{userEmail || 'ricardob@laserinova.com'}</span>
                              </div>
                              <div>
                                <span style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '11px', textTransform: 'uppercase' }}>Web:</span>&nbsp;
                                <span style={{ color: '#1e293b', fontWeight: '500' }}>{sigWeb}</span>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
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
                <GlobalLoader label="Cargando bandeja" subLabel="Laser Inova Mail" minHeight="min-h-[40vh]" />
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
          </>
        )}
      </div>
    </div>
  );
}
