'use client';

import { useState, useEffect, useRef } from 'react';
import { useWhatsAppEvents } from '@/hooks/useWhatsAppEvents';
import { sendManualMessageAction, getMessagesAction, toggleBotModeAction, simulateIncomingMessageAction, createDummyContactAction, sendMediaMessageAction } from '@/server/actions/whatsapp.actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Bot, User as UserIcon, Send, Image as ImageIcon, FileText, Check, CheckCheck, Plus, X, Smile, Reply } from 'lucide-react';
import { toast } from 'react-hot-toast';

type Contact = any;
type Message = any;

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function ChatLayout({ initialContacts }: { initialContacts: Contact[] }) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [simulatorMode, setSimulatorMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [reactionMenuFor, setReactionMenuFor] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useWhatsAppEvents({
    onNewMessage: (data) => {
      const { message, contact } = data;
      
      // Update contacts list order and last message
      setContacts(prev => {
        const existing = prev.find(c => c.id === contact.id);
        const others = prev.filter(c => c.id !== contact.id);
        const updatedContact = existing ? { ...existing, messages: [message] } : { ...contact, messages: [message] };
        return [updatedContact, ...others];
      });

      // If active chat, append message
      if (activeContact?.id === contact.id) {
        setMessages(prev => {
          if (prev.find(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    },
    onStatusUpdate: (statusData) => {
      // Update message status in the active chat if applicable
      setMessages(prev => prev.map(m => 
        m.messageId === statusData.id ? { ...m, status: statusData.status.toUpperCase() } : m
      ));
    }
  });

  const loadMessages = async (contact: Contact) => {
    setActiveContact(contact);
    setLoadingMessages(true);
    
    // Autoclick en el simulador si es el contacto de prueba
    if (contact.name?.includes('Simulador')) {
      setSimulatorMode(true);
    } else {
      setSimulatorMode(false);
    }

    try {
      const result = await getMessagesAction(contact.id);
      if (result.success) {
        setMessages(result.data);
      }
    } catch (e) {
      toast.error('Error al cargar mensajes');
    }
    setLoadingMessages(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !stagedFile) || !activeContact) return;

    const textToSend = inputText;
    const fileToSend = stagedFile;
    const replyingToMessage = replyingTo;
    
    setInputText('');
    setStagedFile(null);
    setReplyingTo(null);

    // Si hay un archivo, lo manejamos con sendMediaMessageAction
    if (fileToSend) {
      const formData = new FormData();
      formData.append('file', fileToSend);
      formData.append('contactId', activeContact.id);
      formData.append('simulatorMode', String(simulatorMode));
      // NOTA: Para un sistema completo, deberíamos enviar también el texto (caption) 
      // y context (replyingTo) al endpoint de media si tu backend lo soporta.

      setIsUploading(true);
      try {
        const res = await sendMediaMessageAction(formData);
        if (res.success && res.message) {
          setMessages(prev => prev.find(m => m.id === res.message.id) ? prev : [...prev, res.message]);
          
          // Si además hay texto, lo enviamos como mensaje separado si el backend de media no soporta caption
          if (textToSend.trim()) {
            await handleTextSend(textToSend, replyingToMessage);
          }
        } else {
          toast.error(res.error || 'Error al subir archivo');
        }
      } catch (err) {
        toast.error('Error al subir el archivo');
      } finally {
        setIsUploading(false);
      }
    } else {
      await handleTextSend(textToSend, replyingToMessage);
    }
  };

  const handleTextSend = async (text: string, replyContext: Message | null) => {
    // Si estamos respondiendo a un mensaje, agregamos el contexto al texto visible
    // (En WhatsApp Cloud real, se envía `context: { message_id: ... }`).
    // Aquí simulamos visualmente el quote si es modo simulador.
    let finalContent = text;
    if (replyContext) {
       finalContent = `*[Respuesta a: ${replyContext.content.substring(0, 30)}${replyContext.content.length > 30 ? '...' : ''}]*\n${text}`;
    }

    const optimisticMessage: any = {
      id: `opt_${Date.now()}`,
      contactId: activeContact!.id,
      messageId: `opt_${Date.now()}`,
      direction: simulatorMode ? 'INBOUND' : 'OUTBOUND',
      type: 'TEXT',
      content: finalContent,
      status: 'SENT',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMessage]);
    
    try {
      if (simulatorMode) {
        const res = await simulateIncomingMessageAction(activeContact!.id, finalContent);
        if (res.success) {
          setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id).concat(res.message));
        } else {
          setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
          toast.error(res.error || 'Error al simular mensaje');
        }
      } else {
        const res = await sendManualMessageAction(activeContact!.id, finalContent);
        if (res.success) {
          setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id).concat(res.message));
          if (activeContact!.botMode) {
            const updatedContact = { ...activeContact!, botMode: false };
            setActiveContact(updatedContact);
            setContacts(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));
          }
        } else {
          setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
          toast.error(res.error || 'Error al enviar');
        }
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      toast.error('Ocurrió un error al enviar el mensaje');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeContact) return;

    // Solo lo preparamos (stage)
    setStagedFile(file);
    // Reset input para que pueda seleccionar el mismo archivo si lo borra
    e.target.value = '';
  };

  const toggleBotMode = async () => {
    if (!activeContact) return;
    const newMode = !activeContact.botMode;
    
    // Optimistic
    const updatedContact = { ...activeContact, botMode: newMode };
    setActiveContact(updatedContact);
    setContacts(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));
    
    try {
      await toggleBotModeAction(activeContact.id, newMode);
      toast.success(`Modo ${newMode ? 'Bot' : 'Humano'} activado`);
    } catch (e) {
      toast.error('Error al cambiar modo');
      // Revert
      setActiveContact(activeContact);
      setContacts(prev => prev.map(c => c.id === activeContact.id ? activeContact : c));
    }
  };

  const createDummyContact = async () => {
    try {
      const res = await createDummyContactAction();
      if (res.success && res.contact) {
        setContacts(prev => [res.contact, ...prev]);
        loadMessages(res.contact);
        setSimulatorMode(true); // Encender simulador automáticamente al crear uno de prueba
        toast.success('Contacto de prueba creado');
      }
    } catch (e) {
      toast.error('Error al crear contacto de prueba');
    }
  };

  return (
    <div className="flex h-full bg-[#111b21] text-[#e9edef] divide-x divide-[#313d45] border-x border-[#313d45]">
      {/* Sidebar */}
      <div className="w-1/3 flex flex-col bg-[#111b21] overflow-hidden">
        <div className="p-3 bg-[#111b21] flex gap-2 border-b border-[#313d45]">
          <Input placeholder="Buscar contacto..." className="bg-[#202c33] border-none text-[#e9edef] focus-visible:ring-[#00a884] placeholder:text-[#8696a0] flex-1 rounded-lg" />
          <Button type="button" onClick={createDummyContact} variant="outline" size="icon" title="Crear contacto de prueba" className="shrink-0 bg-transparent border-none hover:bg-[#202c33] text-[#8696a0] rounded-full">
            <Plus size={20} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#8696a0] p-8 text-center space-y-4">
              <p>No hay chats recientes</p>
              <Button type="button" onClick={createDummyContact} className="w-full bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] border-none">
                <Plus size={16} className="mr-2" />
                Crear chat de prueba
              </Button>
            </div>
          ) : (
            contacts.map(contact => (
              <div 
                key={contact.id} 
                onClick={() => loadMessages(contact)}
                className={cn(
                  "p-3 mx-2 my-1 rounded-xl cursor-pointer transition-colors flex flex-col gap-1",
                  activeContact?.id === contact.id ? "bg-[#2a3942]" : "hover:bg-[#202c33]"
                )}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {contact.profilePictureUrl ? (
                      <img src={contact.profilePictureUrl} alt="Avatar" className="w-12 h-12 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#6a7175] flex items-center justify-center text-white font-medium text-lg shrink-0">
                        {contact.name ? contact.name.substring(0, 1).toUpperCase() : <UserIcon size={24} className="text-[#cfd4d6]" />}
                      </div>
                    )}
                    <span className="font-normal text-[#e9edef] truncate text-[17px]">{contact.name || contact.phone}</span>
                  </div>
                  {contact.botMode ? (
                    <Bot size={16} className="text-[#00a884] shrink-0" />
                  ) : (
                    <UserIcon size={16} className="text-[#8696a0] shrink-0" />
                  )}
                </div>
                <div className="text-xs text-slate-400 truncate flex justify-between ml-13 pl-13">
                  <span className="truncate pl-[52px]">
                    {contact.messages?.[0]?.type === 'TEXT' ? contact.messages[0].content : 
                     contact.messages?.[0]?.type === 'IMAGE' ? '📷 Foto' : 
                     contact.messages?.[0]?.type === 'AUDIO' ? '🎵 Audio' : 
                     contact.messages?.[0]?.type === 'DOCUMENT' ? '📄 Documento' : 
                     'Sin mensajes recientes'}
                  </span>
                  {contact.messages?.[0] && (
                    <span className="ml-2 text-slate-500 shrink-0">
                      {new Date(contact.messages[0].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {activeContact ? (
        <div className="w-2/3 flex flex-col bg-[#0b141a] relative">
          {/* Fondo de patrón clásico de WhatsApp */}
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[url('https://static.whatsapp.net/rsrc.php/v3/yl/r/r2jEqjVLEmC.png')] bg-repeat z-0 invert" />
          
          {simulatorMode && (
            <div className="absolute top-16 left-0 right-0 bg-yellow-500/10 backdrop-blur-sm text-yellow-500 border-b border-yellow-500/20 text-xs font-bold py-1.5 px-4 text-center shadow-sm z-20">
              MODO SIMULADOR ACTIVO: Estás escribiendo como si fueras el cliente. No se enviarán mensajes reales.
            </div>
          )}
          {/* Header */}
          <div className="h-16 bg-[#202c33] px-6 flex items-center justify-between shrink-0 z-30">
            <div className="flex items-center gap-3">
              {activeContact.profilePictureUrl ? (
                <img src={activeContact.profilePictureUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#6a7175] flex items-center justify-center text-white font-medium text-lg">
                  {activeContact.name ? activeContact.name.substring(0, 1).toUpperCase() : <UserIcon size={20} className="text-[#cfd4d6]" />}
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-medium text-lg text-[#e9edef] leading-tight">{activeContact.name || activeContact.phone}</span>
                <span className="text-xs text-[#8696a0]">{activeContact.phone}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 border-r border-[#313d45] pr-4">
                <span className="text-sm text-[#8696a0]">Simulador</span>
                <button
                  type="button"
                  onClick={() => setSimulatorMode(!simulatorMode)}
                  className={cn(
                    "w-10 h-5 rounded-full relative transition-colors duration-200",
                    simulatorMode ? "bg-[#00a884]" : "bg-[#313d45]"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 shadow-sm",
                    simulatorMode ? "translate-x-5" : "translate-x-1"
                  )} />
                </button>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={toggleBotMode}
                className={cn(
                  "border-none transition-all rounded-full px-4",
                  activeContact.botMode 
                    ? "bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-medium shadow-sm" 
                    : "bg-transparent hover:bg-[#2a3942] text-[#8696a0]"
                )}
              >
                {activeContact.botMode ? <><Bot size={16} className="mr-2"/> Bot Activo</> : <><UserIcon size={16} className="mr-2"/> Modo Humano</>}
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 z-10 relative">
            {loadingMessages ? (
              <div className="text-center text-[#8696a0] my-8">Cargando mensajes...</div>
            ) : (
              messages.map(msg => {
                const isSimulatorChat = simulatorMode;
                const alignRight = isSimulatorChat ? (msg.direction === 'INBOUND') : (msg.direction === 'OUTBOUND');
                return (
                  <div key={msg.id} className={cn("flex group items-center", alignRight ? "justify-end" : "justify-start")}>
                    
                    {/* Hover actions (Reply/React) */}
                    <div className={cn("hidden group-hover:flex items-center gap-1 mx-2", alignRight ? "order-1" : "order-2")}>
                      <button type="button" onClick={() => setReactionMenuFor(reactionMenuFor === msg.id ? null : msg.id)} className="p-1.5 rounded-full bg-[#202c33] text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition-colors relative shadow-sm border border-[#313d45]">
                        <Smile size={16} />
                        {reactionMenuFor === msg.id && (
                          <div className="absolute bottom-full mb-2 -translate-x-1/2 left-1/2 bg-[#2a3942] p-2 rounded-full shadow-lg border border-[#313d45] flex gap-2 z-50">
                            {['👍','❤️','😂','😮','😢','🙏'].map(emoji => (
                              <div key={emoji} onClick={(e) => { e.stopPropagation(); setMessages(prev => prev.map(m => m.id === msg.id ? {...m, reaction: emoji} : m)); setReactionMenuFor(null); }} className="hover:scale-125 cursor-pointer transition-transform text-lg px-1">{emoji}</div>
                            ))}
                          </div>
                        )}
                      </button>
                      <button type="button" onClick={() => setReplyingTo(msg)} className="p-1.5 rounded-full bg-[#202c33] text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition-colors shadow-sm border border-[#313d45]">
                        <Reply size={16} />
                      </button>
                    </div>

                    <div 
                      className={cn(
                        "max-w-[70%] px-3 py-2 relative shadow-sm text-[15px]",
                        alignRight 
                          ? "bg-[#005c4b] text-[#e9edef] rounded-lg rounded-tr-none order-2" 
                          : "bg-[#202c33] text-[#e9edef] rounded-lg rounded-tl-none border border-transparent order-1"
                      )}
                    >
                      {msg.type === 'AUDIO' && msg.mediaUrl && (
                        <div className="mb-2">
                          <audio controls src={msg.mediaUrl} className="w-full h-10 filter invert opacity-90" />
                        </div>
                      )}
                      {msg.type === 'IMAGE' && msg.mediaUrl ? (
                        <div className="flex flex-col gap-1">
                          <img src={msg.mediaUrl} alt="Adjunto" className="rounded-xl max-w-full max-h-60 object-contain shadow-md" />
                          {msg.content && msg.content !== msg.mediaUrl.split('/').pop() && <span className="text-sm mt-1">{msg.content}</span>}
                        </div>
                      ) : msg.type === 'DOCUMENT' && msg.mediaUrl ? (
                        <div className="flex flex-col gap-1 bg-black/20 p-2 rounded-lg">
                          <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline">
                            <FileText size={16} />
                            <span className="text-sm truncate max-w-[200px]">{msg.content || 'Documento adjunto'}</span>
                          </a>
                        </div>
                      ) : (
                        <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                      )}
                      
                      <div className={cn("flex items-center justify-end gap-1 mt-1", alignRight ? "text-[#8696a0]" : "text-[#8696a0]")}>
                        <span className="text-[11px]">
                          {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        {alignRight && (
                          <span className={cn("text-sm", msg.status === 'READ' ? "text-[#53bdeb]" : "text-[#8696a0]")}>
                            {msg.status === 'SENT' ? <Check size={16}/> : <CheckCheck size={16}/>}
                          </span>
                        )}
                      </div>
                      {/* Reaction Badge */}
                      {msg.reaction && (
                        <div className={cn("absolute -bottom-3 bg-[#2a3942] rounded-full px-1.5 py-0.5 text-xs shadow-sm ring-1 ring-[#111b21] z-10", alignRight ? "right-4" : "left-4")}>
                          {msg.reaction}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-[#202c33] px-4 py-3 flex flex-col z-20">
            
            {/* Context Banners (Reply & Staged File) */}
            {(replyingTo || stagedFile) && (
              <div className="flex flex-col gap-2 mb-2">
                {replyingTo && (
                  <div className="flex items-center justify-between bg-[#2a3942] p-3 rounded-lg border-l-4 border-[#00a884] shadow-sm relative mx-2">
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-semibold text-[#00a884]">Respondiendo a</span>
                      <span className="text-sm text-[#e9edef] truncate">{replyingTo.content || (replyingTo.type === 'IMAGE' ? 'Imagen' : 'Adjunto')}</span>
                    </div>
                    <button type="button" onClick={() => setReplyingTo(null)} className="text-[#8696a0] hover:text-[#e9edef] p-1">
                      <X size={16} />
                    </button>
                  </div>
                )}
                
                {stagedFile && (
                  <div className="flex items-center justify-between bg-[#2a3942] p-3 rounded-lg shadow-sm mx-2">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-[#202c33] rounded-lg flex items-center justify-center shrink-0">
                        {stagedFile.type.startsWith('image/') ? <ImageIcon size={20} className="text-[#8696a0]"/> : <FileText size={20} className="text-[#8696a0]"/>}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium text-[#e9edef] truncate">{stagedFile.name}</span>
                        <span className="text-xs text-[#8696a0]">{(stagedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => setStagedFile(null)} className="text-[#8696a0] hover:text-[#e9edef] p-1">
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex gap-2 items-end transition-all">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload} 
                accept="image/*,.pdf,.doc,.docx"
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="shrink-0 text-[#8696a0] hover:text-[#e9edef] rounded-full hover:bg-[#2a3942] mb-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Plus size={24} />
              </Button>
              
              <textarea
                value={inputText}
                onChange={e => {
                  setInputText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (inputText.trim() || stagedFile) handleSendMessage();
                  }
                }}
                rows={1}
                placeholder={isUploading ? "Enviando..." : (simulatorMode ? "Escribe un mensaje como cliente..." : "Escribe un mensaje...")}
                className="flex-1 bg-[#2a3942] border-none focus:outline-none text-[#e9edef] placeholder-[#8696a0] px-4 py-2.5 max-h-[120px] resize-none overflow-y-auto rounded-lg shadow-sm"
                style={{ color: '#e9edef' }}
                disabled={isUploading}
              />

              <Button type="submit" size="icon" className="shrink-0 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] w-10 h-10 mb-1 ml-1 shadow-sm" disabled={(!inputText.trim() && !stagedFile) || isUploading}>
                <Send size={18} className={cn("transition-transform", (inputText.trim() || stagedFile) ? "translate-x-0.5 -translate-y-0.5" : "")} />
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="w-2/3 flex items-center justify-center bg-[#202c33] border-l border-[#313d45] relative overflow-hidden">
          <div className="text-center max-w-md p-8 relative z-10 flex flex-col items-center">
            <div className="w-64 h-64 mx-auto mb-8 relative">
              <div className="absolute inset-0 bg-[#00a884]/10 rounded-full animate-pulse" />
              <div className="absolute inset-4 bg-[#111b21] rounded-full shadow-sm flex items-center justify-center">
                <Bot size={80} className="text-[#00a884]" />
              </div>
            </div>
            <h2 className="text-3xl font-light text-[#e9edef] mb-4 tracking-tight">WhatsApp CRM</h2>
            <p className="text-[#8696a0] leading-relaxed text-sm">Selecciona un chat en la barra lateral para ver los mensajes y responder a los prospectos de Laser Inova de forma rápida y sencilla.</p>
          </div>
        </div>
      )}
    </div>
  );
}
