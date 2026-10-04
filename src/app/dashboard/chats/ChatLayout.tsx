'use client';

import Link from 'next/link';

import { useState, useEffect, useRef } from 'react';
import { useWhatsAppEvents } from '@/hooks/useWhatsAppEvents';
import { sendManualMessageAction, getMessagesAction, toggleBotModeAction, simulateIncomingMessageAction, createDummyContactAction, sendMediaMessageAction, generateSummaryAction } from '@/server/actions/whatsapp.actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Bot, User as UserIcon, Send, Image as ImageIcon, FileText, Check, CheckCheck, Plus, X, Smile, Reply, Mic, Trash2, Square, ChevronLeft, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

type Contact = any;
type Message = any;

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function ChatLayout({ initialContacts }: { initialContacts: Contact[] }) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [simulatorMode, setSimulatorMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [reactionMenuFor, setReactionMenuFor] = useState<string | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summaryCache, setSummaryCache] = useState<Record<string, { text: string; messageCount: number }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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
        if (message.mediaUrl === 'FETCH_REQUIRED') {
          // La imagen era muy grande para Pusher, recargar historial desde DB
          loadMessages(contact);
        } else {
          setMessages(prev => {
            if (prev.find(m => m.id === message.id)) return prev;
            return [...prev, message];
          });
        }
      } else if (message.direction === 'INBOUND') {
        // Si el chat NO está abierto y es un mensaje entrante, incrementar contador
        setUnreadCounts(prev => ({
          ...prev,
          [contact.id]: (prev[contact.id] || 0) + 1
        }));
        // Sonido de notificación
        try { new Audio('/notification.mp3').play().catch(() => {}); } catch {}
      }
    },
    onStatusUpdate: (statusData) => {
      // Update message status in the active chat if applicable
      setMessages(prev => prev.map(m => 
        m.messageId === statusData.id ? { ...m, status: statusData.status.toUpperCase() } : m
      ));
    },
    onContactUpdate: (data) => {
      const { contactId, changes } = data;
      // Actualizar la lista de contactos en el sidebar
      setContacts(prev => prev.map(c => 
        c.id === contactId ? { ...c, ...changes } : c
      ));
      
      // Actualizar el contacto activo si es el que estamos viendo
      setActiveContact((prev: any) => {
        if (prev?.id === contactId) {
          return { ...prev, ...changes };
        }
        return prev;
      });
    }
  });

  const loadMessages = async (contact: Contact) => {
    setActiveContact(contact);
    setLoadingMessages(true);
    // Limpiar notificaciones al abrir el chat
    setUnreadCounts(prev => ({ ...prev, [contact.id]: 0 }));
    
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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Web Audio API para ondas sonoras
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256; // We need time domain data for volume
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // History array for rolling waveform
      const volumeHistory: number[] = [];
      let lastPushTime = performance.now();

      const draw = (time: number) => {
        if (!canvasRef.current) {
          animationFrameRef.current = requestAnimationFrame(draw);
          return;
        }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteTimeDomainData(dataArray);

        // Calculate RMS (volume)
        let sumSquares = 0;
        for (let i = 0; i < bufferLength; i++) {
          const norm = (dataArray[i] / 128.0) - 1.0;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / bufferLength);
        
        // Push to history every 50ms
        if (time - lastPushTime > 50) {
          volumeHistory.push(rms);
          // Keep only enough history to fill the canvas
          const maxBars = Math.floor(canvas.width / 4); // 2px bar + 2px gap = 4px
          if (volumeHistory.length > maxBars) {
            volumeHistory.shift();
          }
          lastPushTime = time;
        }

        // Handle Retina/high-DPI displays for crisp rendering
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        // Update internal canvas resolution if needed
        if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Parametros estilo WhatsApp Web, escalados por DPR para verse nítidos
        const barWidth = 2 * dpr;
        const gap = 2 * dpr;
        const step = barWidth + gap;
        
        // Start drawing from the right side
        let x = canvas.width - barWidth;

        ctx.fillStyle = '#8696a0'; // Gray color like WA

        for (let i = volumeHistory.length - 1; i >= 0; i--) {
          if (x < 0) break;
          
          let vol = volumeHistory[i];
          // Scale volume to canvas height (exaggerate low volumes slightly)
          let barHeight = Math.min(canvas.height * 0.9, Math.max(2, vol * canvas.height * 3));
          
          const y = (canvas.height - barHeight) / 2;

          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
          ctx.fill();

          x -= step;
        }
      };

      draw(performance.now());

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error al acceder al micrófono:", err);
      toast.error("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordedAudio(null);
    setRecordingDuration(0);
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !stagedFile && !recordedAudio) || !activeContact) return;

    const textToSend = inputText;
    const fileToSend = stagedFile;
    const audioToSend = recordedAudio;
    const replyingToMessage = replyingTo;
    
    setInputText('');
    setStagedFile(null);
    setRecordedAudio(null);
    setReplyingTo(null);

    // Si hay un archivo o audio, lo manejamos con sendMediaMessageAction
    if (fileToSend || audioToSend) {
      const formData = new FormData();
      if (fileToSend) {
        formData.append('file', fileToSend);
      } else if (audioToSend) {
        // Convert Blob to File
        const audioFile = new File([audioToSend], `audio_message_${Date.now()}.webm`, { type: 'audio/webm' });
        formData.append('file', audioFile);
      }
      formData.append('contactId', activeContact.id);
      formData.append('simulatorMode', String(simulatorMode));
      if (textToSend.trim()) {
        formData.append('caption', textToSend);
      }

      setIsUploading(true);
      try {
        const res = await sendMediaMessageAction(formData);
        if (res.success && res.message) {
          setMessages(prev => {
            if (prev.some(m => m.id === res.message.id)) return prev;
            return [...prev, res.message];
          });
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
        if (res.success && res.message) {
          setMessages(prev => {
            const filtered = prev.filter(m => m.id !== optimisticMessage.id);
            if (filtered.some(m => m.id === res.message!.id)) return filtered;
            return [...filtered, res.message];
          });
        } else {
          setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
          toast.error(res.error || 'Error al simular mensaje');
        }
      } else {
        const res = await sendManualMessageAction(activeContact!.id, finalContent);
        if (res.success && res.message) {
          setMessages(prev => {
            const filtered = prev.filter(m => m.id !== optimisticMessage.id);
            if (filtered.some(m => m.id === res.message!.id)) return filtered;
            return [...filtered, res.message];
          });
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

  const handleGenerateSummary = async () => {
    if (!activeContact) return;
    setIsSummaryOpen(true);

    const currentMessageCount = messages.length;
    const cached = summaryCache[activeContact.id];

    if (cached && cached.messageCount === currentMessageCount) {
      setSummaryText(cached.text);
      return; // Usar caché, no gastar tokens
    }

    setSummaryLoading(true);
    setSummaryText('');
    
    try {
      const res = await generateSummaryAction(activeContact.id);
      if (res.success) {
        setSummaryText(res.summary!);
        setSummaryCache(prev => ({
          ...prev,
          [activeContact.id]: { text: res.summary!, messageCount: currentMessageCount }
        }));
      } else {
        setSummaryText('Error al generar resumen: ' + res.error);
      }
    } catch (e) {
      setSummaryText('Error al procesar el resumen.');
    } finally {
      setSummaryLoading(false);
    }
  };

  let pendingQuoteUrl = '';
  if (activeContact && messages.length > 0) {
    const quoteMsg = [...messages].reverse().find(m => m.direction === 'INTERNAL' && m.content.includes('|||'));
    if (quoteMsg) {
      const parts = quoteMsg.content.split('|||');
      if (parts[1] && !parts[1].startsWith('QUOTE:')) {
        try {
          const data = JSON.parse(decodeURIComponent(parts[1]));
          let queryParams = `?contactId=${activeContact.id}`;
          if (data.project) queryParams += `&project=${encodeURIComponent(data.project)}`;
          if (data.material) queryParams += `&material=${encodeURIComponent(data.material)}`;
          if (data.width) queryParams += `&w=${data.width}`;
          if (data.height) queryParams += `&h=${data.height}`;
          if (data.qty) queryParams += `&qty=${data.qty}`;
          if (data.estimatedTimeMin) queryParams += `&t=${data.estimatedTimeMin}`;
          if (data.name) queryParams += `&name=${encodeURIComponent(data.name)}`;
          if (data.email) queryParams += `&email=${encodeURIComponent(data.email)}`;
          pendingQuoteUrl = `/dashboard/quotes/new${queryParams}`;
        } catch(e) {}
      }
    }
  }

  return (
    <div className="flex h-full bg-[#111b21] text-[#e9edef] divide-x divide-[#313d45] border-x border-[#313d45]">
      {/* Sidebar */}
      <div className={cn("flex flex-col bg-[#111b21] overflow-hidden", activeContact ? "hidden md:flex md:w-1/3" : "w-full md:w-1/3")}>
        <div className="p-3 bg-[#111b21] flex gap-2 border-b border-[#313d45]">
          <Input 
            placeholder="Buscar contacto..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#202c33] border-none !text-white focus-visible:ring-[#00a884] placeholder:text-[#8696a0] flex-1 rounded-lg" 
          />
          <Button type="button" onClick={() => window.location.reload()} variant="outline" size="icon" title="Recargar App" className="shrink-0 bg-transparent border-none hover:bg-[#202c33] text-[#8696a0] rounded-full">
            <RefreshCw size={20} />
          </Button>
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
            contacts
              .filter(c => 
                (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
                (c.phone && c.phone.includes(searchQuery))
              )
              .map(contact => (
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
                  <div className="flex items-center gap-2 shrink-0">
                    {unreadCounts[contact.id] > 0 && (
                      <span className="bg-[#00a884] text-[#111b21] text-[11px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1">
                        {unreadCounts[contact.id]}
                      </span>
                    )}
                    {contact.botMode ? (
                      <Bot size={16} className="text-[#00a884]" />
                    ) : (
                      <UserIcon size={16} className="text-[#8696a0]" />
                    )}
                  </div>
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
        <div className={cn("flex flex-col bg-[#0b141a] relative", !activeContact ? "hidden md:flex md:w-2/3" : "w-full md:w-2/3")}>
          {/* Fondo de patrón clásico de WhatsApp */}
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[url('https://static.whatsapp.net/rsrc.php/v3/yl/r/r2jEqjVLEmC.png')] bg-repeat z-0 invert" />
          
          {simulatorMode && (
            <div className="bg-yellow-500/10 backdrop-blur-sm text-yellow-500 border-b border-yellow-500/20 text-xs font-bold py-1.5 px-4 text-center shadow-sm shrink-0 z-20">
              MODO SIMULADOR ACTIVO: Estás escribiendo como si fueras el cliente. No se enviarán mensajes reales.
            </div>
          )}
          {/* Header */}
          <div className="h-16 bg-[#202c33] px-3 md:px-6 flex items-center justify-between shrink-0 z-30">
            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 pr-2">
              <button 
                type="button"
                onClick={() => setActiveContact(null)}
                className="md:hidden p-2 -ml-2 text-[#8696a0] hover:text-[#e9edef] rounded-full hover:bg-[#2a3942]"
              >
                <ChevronLeft size={24} />
              </button>
              {activeContact.profilePictureUrl ? (
                <img src={activeContact.profilePictureUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 shrink-0 rounded-full bg-[#6a7175] flex items-center justify-center text-white font-medium text-lg">
                  {activeContact.name ? activeContact.name.substring(0, 1).toUpperCase() : <UserIcon size={20} className="text-[#cfd4d6]" />}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-lg text-[#e9edef] leading-tight truncate">{activeContact.name || activeContact.phone}</span>
                <span className="text-xs text-[#8696a0] truncate">{activeContact.phone}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {pendingQuoteUrl && (
                <Link href={pendingQuoteUrl}>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="rounded-xl px-4 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black tracking-wide shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center gap-2 transition-all active:scale-95"
                    title="Cotización Lista para Generar"
                  >
                    📝 <span className="hidden md:inline">Generar Cotización</span>
                  </Button>
                </Link>
              )}
              
              {/* Contenedor del Simulador con estilo Píldora */}
              <div className="hidden md:flex items-center gap-3 bg-[#111b21] px-4 py-1.5 rounded-xl border border-[#313d45] shadow-inner">
                <span className="text-xs font-bold text-[#8696a0] uppercase tracking-wider">Simulador</span>
                <button
                  type="button"
                  onClick={() => setSimulatorMode(!simulatorMode)}
                  className={cn(
                    "w-11 h-6 rounded-full relative transition-colors duration-300 shadow-inner",
                    simulatorMode ? "bg-amber-500" : "bg-[#313d45]"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-300 shadow-md",
                    simulatorMode ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </div>

              {/* Botón de Bot Activo / Modo Humano */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={toggleBotMode}
                className={cn(
                  "rounded-xl px-4 font-black uppercase tracking-wider text-xs transition-all active:scale-95 shadow-sm border",
                  activeContact.botMode 
                    ? "bg-[#00a884] hover:bg-[#00c298] text-teal-950 border-[#00a884] shadow-[0_0_15px_rgba(0,168,132,0.3)]" 
                    : "bg-[#111b21] hover:bg-[#202c33] text-[#8696a0] border-[#313d45]"
                )}
              >
                {activeContact.botMode 
                  ? <><Bot size={16} className="md:mr-2"/><span className="hidden md:inline">Bot Activo</span></> 
                  : <><UserIcon size={16} className="md:mr-2"/><span className="hidden md:inline">Modo Humano</span></>}
              </Button>

              {/* Botón Resumen IA */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleGenerateSummary}
                className="rounded-xl w-9 h-9 bg-[#111b21] border border-[#313d45] hover:border-purple-500/50 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all shadow-sm active:scale-95"
                title="Resumir con IA"
              >
                <Sparkles size={18} />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 z-10 relative">
            {loadingMessages ? (
              <div className="text-center text-[#8696a0] my-8">Cargando mensajes...</div>
            ) : (
              messages.map(msg => {
                const isInternal = msg.direction === 'INTERNAL';
                const isSimulatorChat = simulatorMode;
                const alignRight = isInternal ? false : isSimulatorChat ? (msg.direction === 'INBOUND') : (msg.direction === 'OUTBOUND');
                
                if (isInternal) {
                  const parts = msg.content?.split('|||') || [];
                  const displayContent = parts[0];
                  let buttonLink = null;
                  let buttonText = "";
                  
                  if (parts[1]) {
                    if (parts[1].startsWith('QUOTE:')) {
                      const quoteId = parts[1].replace('QUOTE:', '');
                      buttonLink = `/dashboard/quotes/${quoteId}`;
                      buttonText = "Ver Cotización";
                    } else {
                      try {
                        const data = JSON.parse(decodeURIComponent(parts[1]));
                        let queryParams = `?contactId=${activeContact.id}`;
                        if (data.project) queryParams += `&project=${encodeURIComponent(data.project)}`;
                        if (data.material) queryParams += `&material=${encodeURIComponent(data.material)}`;
                        if (data.width) queryParams += `&w=${data.width}`;
                        if (data.height) queryParams += `&h=${data.height}`;
                        if (data.qty) queryParams += `&qty=${data.qty}`;
                        if (data.estimatedTimeMin) queryParams += `&t=${data.estimatedTimeMin}`;
                        if (data.name) queryParams += `&name=${encodeURIComponent(data.name)}`;
                        if (data.email) queryParams += `&email=${encodeURIComponent(data.email)}`;
                        buttonLink = `/dashboard/quotes/new${queryParams}`;
                        buttonText = "Generar Cotización";
                      } catch(e) {}
                    }
                  }

                  return (
                    <div key={msg.id} className="flex justify-center w-full my-2">
                      <div className="bg-[#ffeb3b]/10 border border-[#ffeb3b]/30 text-[#ffeb3b] px-4 py-2 rounded-lg text-sm max-w-[85%] text-center shadow-sm">
                        <div className="font-bold mb-1 flex items-center justify-center gap-2">
                          <Bot size={14} /> Nota Interna (Sistema)
                        </div>
                        <p className="whitespace-pre-wrap text-left break-words mb-2">{displayContent}</p>
                        {buttonLink && buttonText !== "Generar Cotización" && (
                          <Link 
                            href={buttonLink}
                            className="mt-2 inline-flex items-center gap-1 bg-[#ffeb3b]/20 hover:bg-[#ffeb3b]/30 text-[#ffeb3b] px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                          >
                            <FileText size={14} /> {buttonText}
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                }

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
                      {msg.type === 'AUDIO' && (
                        <div className="mb-2">
                          <audio controls src={`/api/media/${msg.id}`} className="w-full h-10 filter invert opacity-90" />
                        </div>
                      )}
                      {msg.type === 'IMAGE' ? (
                        <div className="flex flex-col gap-1">
                          <img src={`/api/media/${msg.id}`} alt="Adjunto" className="rounded-xl max-w-full max-h-60 object-contain shadow-md" />
                          {msg.content && msg.content !== '📷 Imagen adjunta' && <span className="text-sm mt-1">{msg.content}</span>}
                        </div>
                      ) : msg.type === 'DOCUMENT' ? (
                        <div className="flex flex-col gap-1 bg-black/20 p-2 rounded-lg">
                          <a href={`/api/media/${msg.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline">
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
                  <div className="flex flex-col bg-[#2a3942] rounded-lg shadow-sm mx-2 overflow-hidden border border-[#313d45]">
                    <div className="flex justify-between items-center bg-[#202c33] px-2 py-1 border-b border-[#313d45]">
                      <span className="text-xs text-[#8696a0]">Vista previa adjunto</span>
                      <button type="button" onClick={() => setStagedFile(null)} className="text-[#8696a0] hover:text-[#e9edef] p-1">
                        <X size={18} />
                      </button>
                    </div>
                    {stagedFile.type.startsWith('image/') ? (
                      <div className="flex justify-center bg-[#111b21] p-4 max-h-[250px]">
                        <img 
                          src={URL.createObjectURL(stagedFile)} 
                          alt="Preview" 
                          className="object-contain max-h-full rounded-md shadow-md"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-12 h-12 bg-[#202c33] rounded-lg flex items-center justify-center shrink-0">
                          <FileText size={24} className="text-[#8696a0]"/>
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-medium text-[#e9edef] truncate">{stagedFile.name}</span>
                          <span className="text-xs text-[#8696a0]">{(stagedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      </div>
                    )}
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
                accept="image/*,.pdf,.doc,.docx,.dxf"
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
              
              {/* If we have a recorded audio, show a preview of it instead of textarea */}
              {recordedAudio ? (
                <div className="flex-1 flex items-center justify-between bg-[#2a3942] rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Mic className="text-red-500 animate-pulse" size={18} />
                    <span className="text-[#e9edef] text-sm">Audio grabado</span>
                  </div>
                  <button type="button" onClick={cancelRecording} className="text-[#8696a0] hover:text-red-400">
                    <Trash2 size={18} />
                  </button>
                </div>
              ) : isRecording ? (
                <div className="flex-1 flex items-center gap-3">
                  <button type="button" onClick={cancelRecording} className="text-[#8696a0] hover:text-red-400 p-2 shrink-0">
                    <Trash2 size={20} />
                  </button>
                  <div className="flex-1 flex items-center bg-[#202c33] rounded-full px-4 py-2 border border-[#313d45]">
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                      <span className="text-[#8696a0] font-mono text-sm tracking-wide">{formatDuration(recordingDuration)}</span>
                    </div>
                    <div className="flex-1 px-4 h-8 flex items-center">
                      <canvas ref={canvasRef} style={{ width: '100%', height: '32px' }} className="rounded-md" />
                    </div>
                  </div>
                </div>
              ) : (
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
                  onPaste={e => {
                    const items = e.clipboardData?.items;
                    if (!items) return;
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].type.indexOf('image') !== -1) {
                        const file = items[i].getAsFile();
                        if (file) {
                          setStagedFile(file);
                          e.preventDefault();
                          break;
                        }
                      }
                    }
                  }}
                  rows={1}
                  placeholder={isUploading ? "Enviando..." : (simulatorMode ? "Escribe un mensaje como cliente..." : "Añade un comentario...")}
                  className="flex-1 bg-[#2a3942] border-none focus:outline-none !text-white placeholder-[#8696a0] px-4 py-2.5 max-h-[120px] resize-none overflow-y-auto rounded-lg shadow-sm"
                  disabled={isUploading}
                />
              )}

              {/* Action Buttons: Send or Mic */}
              {inputText.trim() || stagedFile || recordedAudio ? (
                <Button type="submit" size="icon" className="shrink-0 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] w-10 h-10 mb-1 ml-1 shadow-sm" disabled={isUploading}>
                  <Send size={18} className="transition-transform translate-x-0.5 -translate-y-0.5" />
                </Button>
              ) : isRecording ? (
                <Button type="button" onClick={stopRecording} size="icon" className="shrink-0 rounded-full bg-red-500 hover:bg-red-600 text-white w-10 h-10 mb-1 ml-1 shadow-sm">
                  <Square size={16} fill="currentColor" />
                </Button>
              ) : (
                <Button type="button" onClick={startRecording} size="icon" className="shrink-0 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] w-10 h-10 mb-1 ml-1 shadow-sm">
                  <Mic size={20} />
                </Button>
              )}
            </form>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex w-2/3 items-center justify-center bg-[#202c33] border-l border-[#313d45] relative overflow-hidden">
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

      {/* Modal Resumen IA */}
      {isSummaryOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111b21] rounded-2xl w-full max-w-lg shadow-2xl border border-[#313d45] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-4 bg-[#202c33] border-b border-[#313d45] flex justify-between items-center">
              <div className="flex items-center gap-2 text-[#e9edef] font-medium">
                <Sparkles className="text-purple-400" size={20} />
                <span>Resumen de la Conversación</span>
              </div>
              <button onClick={() => setIsSummaryOpen(false)} className="text-[#8696a0] hover:text-[#e9edef] transition-colors p-1 rounded-full hover:bg-[#2a3942]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {summaryLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-[#8696a0]">
                  <Loader2 size={32} className="animate-spin mb-4 text-purple-400" />
                  <p>La IA está analizando los mensajes...</p>
                </div>
              ) : (
                <div className="text-[#e9edef] text-[15px] leading-relaxed space-y-4">
                  {summaryText.split('\n').map((line, i) => {
                    if (line.trim().startsWith('**') && line.includes('**')) {
                      const parts = line.split('**');
                      return (
                        <p key={i} className="flex gap-2">
                          <span className="font-semibold text-purple-400 shrink-0">{parts[1]}</span>
                          <span className="text-[#d1d7db]">{parts[2] || parts.slice(2).join('')}</span>
                        </p>
                      );
                    }
                    if (line.trim()) return <p key={i}>{line}</p>;
                    return null;
                  })}
                </div>
              )}
            </div>
            <div className="p-4 bg-[#202c33] border-t border-[#313d45] flex justify-end">
              <Button onClick={() => setIsSummaryOpen(false)} variant="outline" className="bg-[#2a3942] border-none text-[#e9edef] hover:bg-[#313d45]">
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
