'use client';

import Link from 'next/link';

import { useState, useEffect, useRef } from 'react';
import { useWhatsAppEvents } from '@/hooks/useWhatsAppEvents';
import { getPusherClient } from '@/lib/pusher';
import { sendManualMessageAction, getMessagesAction, toggleBotModeAction, simulateIncomingMessageAction, createDummyContactAction, sendMediaMessageAction, generateSummaryAction, deleteConversationAction, getContactsAction } from '@/server/actions/whatsapp.actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { Bot, User as UserIcon, Send, Image as ImageIcon, FileText, Check, CheckCheck, Plus, X, Smile, Reply, Mic, Trash2, Square, ChevronLeft, Sparkles, Loader2, RefreshCw, Search, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

type Contact = any;
type Message = any;

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

const AVATAR_GRADIENTS = [
  'from-emerald-500 to-teal-600', 'from-sky-500 to-blue-600', 'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600', 'from-pink-500 to-rose-600', 'from-cyan-500 to-teal-600', 'from-lime-500 to-green-600',
];

function avatarGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function Avatar({ contact, size }: { contact: any; size: number }) {
  const style = { width: size, height: size };
  if (contact.profilePictureUrl) {
    return <img src={contact.profilePictureUrl} alt="Avatar" style={style} className="rounded-full object-cover shrink-0" />;
  }
  const label = contact.name ? Array.from(contact.name as string).find(ch => /[\p{L}\p{N}]/u.test(ch)) : null;
  return (
    <div style={style} className={cn("rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold shrink-0", avatarGradient(contact.name || contact.phone || ''))}>
      {label ? <span style={{ fontSize: size * 0.42 }}>{label.toUpperCase()}</span> : <UserIcon size={size * 0.5} className="text-white/90" />}
    </div>
  );
}

function listTime(d: Date) {
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function dayLabel(d: Date) {
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Hoy';
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}) });
}

function previewOf(m: any): string {
  if (!m) return 'Sin mensajes recientes';
  if (m.direction === 'INTERNAL') return '📝 Nota interna';
  switch (m.type) {
    case 'IMAGE': return m.content === '🎭 Sticker' ? '🎭 Sticker' : '📷 Foto';
    case 'AUDIO': return '🎤 Audio';
    case 'DOCUMENT': return '📄 Documento';
    default: return (m.content || '').replace(/\s*\n\s*/g, ' ');
  }
}

export default function ChatLayout({ initialContacts, initialContactId }: { initialContacts: Contact[]; initialContactId?: string }) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [listFilter, setListFilter] = useState<'all' | 'unread' | 'bot' | 'human'>('all');
  const [inputText, setInputText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [simulatorMode, setSimulatorMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [reactionMenuFor, setReactionMenuFor] = useState<string | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summaryCache, setSummaryCache] = useState<Record<string, { text: string; messageCount: number }>>({});
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isDeletingContact, setIsDeletingContact] = useState(false);
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
    onReaction: ({ id, reaction }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, reaction } : m));
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

  // Resincroniza al volver a la app o al reconectar Pusher: en la PWA el websocket se duerme en segundo plano
  // y los mensajes que llegaron mientras tanto no se verían hasta recargar.
  const activeContactIdRef = useRef<string | null>(null);
  activeContactIdRef.current = activeContact?.id ?? null;
  useEffect(() => {
    const resync = async () => {
      try {
        const res = await getContactsAction();
        if (res.success) setContacts(res.data);
        const activeId = activeContactIdRef.current;
        if (activeId) {
          const msgs = await getMessagesAction(activeId);
          if (msgs.success) setMessages(msgs.data);
        }
      } catch {}
    };
    const onVisible = () => { if (document.visibilityState === 'visible') resync(); };
    const pusher = getPusherClient();
    const onState = (s: { previous: string; current: string }) => {
      if (s.current === 'connected' && s.previous !== 'connected') resync();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', resync);
    pusher.connection.bind('state_change', onState);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', resync);
      pusher.connection.unbind('state_change', onState);
    };
  }, []);

  // Enlace directo (/dashboard/chats?c=<id>): abrir esa conversación al entrar.
  useEffect(() => {
    if (!initialContactId) return;
    const target = initialContacts.find((c: Contact) => c.id === initialContactId);
    if (target) loadMessages(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContactId]);

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
    if ((!inputText.trim() && stagedFiles.length === 0 && !recordedAudio) || !activeContact) return;

    const textToSend = inputText;
    const filesToSend = [...stagedFiles];
    const audioToSend = recordedAudio;
    const replyingToMessage = replyingTo;
    
    setInputText('');
    setStagedFiles([]);
    setRecordedAudio(null);
    setReplyingTo(null);

    // Si hay archivos o audio, los manejamos con sendMediaMessageAction
    if (filesToSend.length > 0 || audioToSend) {
      setIsUploading(true);
      try {
        if (audioToSend) {
          const formData = new FormData();
          const audioFile = new File([audioToSend], `audio_message_${Date.now()}.webm`, { type: 'audio/webm' });
          formData.append('file', audioFile);
          formData.append('contactId', activeContact.id);
          formData.append('simulatorMode', String(simulatorMode));
          
          const res = await sendMediaMessageAction(formData);
          if (res.success && res.message) {
            setMessages(prev => {
              if (prev.some(m => m.id === res.message.id)) return prev;
              return [...prev, res.message];
            });
          }
        }

        // Subir cada imagen/archivo secuencialmente
        for (let i = 0; i < filesToSend.length; i++) {
          const file = filesToSend[i];
          const formData = new FormData();
          formData.append('file', file);
          formData.append('contactId', activeContact.id);
          formData.append('simulatorMode', String(simulatorMode));
          
          // Solo adjuntar el texto al primer archivo
          if (i === 0 && textToSend.trim()) {
            formData.append('caption', textToSend);
          }

          const res = await sendMediaMessageAction(formData);
          if (res.success && res.message) {
            setMessages(prev => {
              if (prev.some(m => m.id === res.message.id)) return prev;
              return [...prev, res.message];
            });
          } else {
            toast.error(res.error || `Error al subir archivo ${i+1}`);
          }
        }
      } catch (err) {
        toast.error('Error al subir archivos');
      } finally {
        setIsUploading(false);
      }
      
      // Si no hubo primer archivo pero sí audio y texto, el texto se envía por separado
      if (filesToSend.length === 0 && textToSend.trim()) {
        await handleTextSend(textToSend, replyingToMessage);
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !activeContact) return;

    // Agregar nuevos archivos a los que ya estaban (si queremos permitir acumular)
    setStagedFiles(prev => [...prev, ...files]);
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

  const handleDeleteConversation = async () => {
    if (!contactToDelete) return;
    setIsDeletingContact(true);
    try {
      const res = await deleteConversationAction(contactToDelete.id);
      if (res.success) {
        toast.success("Conversación eliminada");
        setContacts(prev => prev.filter(c => c.id !== contactToDelete.id));
        if (activeContact?.id === contactToDelete.id) {
          setActiveContact(null);
          setMessages([]);
        }
        setContactToDelete(null);
      } else {
        toast.error(res.error || "Error al eliminar conversación");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar conversación");
    } finally {
      setIsDeletingContact(false);
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
          if (data.type) queryParams += `&type=${encodeURIComponent(data.type)}`;
          if (data.description) queryParams += `&desc=${encodeURIComponent(data.description)}`;
          pendingQuoteUrl = `/dashboard/quotes/new${queryParams}`;
        } catch(e) {}
      }
    }
  }

  const visibleContacts = contacts.filter(c => {
    const q = searchQuery.toLowerCase();
    const matches = !q || (c.name && c.name.toLowerCase().includes(q)) || (c.phone && c.phone.includes(searchQuery));
    if (!matches) return false;
    if (listFilter === 'unread') return (unreadCounts[c.id] || 0) > 0;
    if (listFilter === 'bot') return !!c.botMode;
    if (listFilter === 'human') return !c.botMode;
    return true;
  });

  return (
    <div className="flex h-full bg-[#0b141a] text-[#e9edef] border-x border-[#222d34]">
      {/* ───────── Lista de chats ───────── */}
      <aside className={cn("flex flex-col bg-[#111b21] overflow-hidden border-r border-[#222d34]", activeContact ? "hidden md:flex md:w-[290px] xl:w-[380px] md:shrink-0" : "w-full md:w-[290px] xl:w-[380px] md:shrink-0")}>
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-[#e9edef]">Chats</h1>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => window.location.reload()} title="Recargar App" className="p-2 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#202c33] transition-colors">
              <RefreshCw size={18} />
            </button>
            <button type="button" onClick={createDummyContact} title="Crear contacto de prueba" className="p-2 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#202c33] transition-colors">
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 bg-[#202c33] rounded-xl px-3 h-10 focus-within:ring-1 focus-within:ring-[#00a884]/60 transition-shadow">
            <Search size={16} className="text-[#8696a0] shrink-0" />
            <input
              placeholder="Buscar por nombre o teléfono"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm !text-[#e9edef] placeholder:text-[#8696a0]"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="text-[#8696a0] hover:text-[#e9edef]">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {([['all', 'Todos'], ['unread', 'No leídos'], ['bot', 'Bot'], ['human', 'Humano']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setListFilter(key)}
              className={cn(
                "shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                listFilter === key ? "bg-[#00a884]/20 text-[#35d6b5]" : "bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#8696a0] p-8 text-center space-y-4">
              <MessageCircle size={40} className="opacity-40" />
              <p className="text-sm">No hay chats recientes</p>
              <Button type="button" onClick={createDummyContact} className="bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] border-none">
                <Plus size={16} className="mr-2" />
                Crear chat de prueba
              </Button>
            </div>
          ) : visibleContacts.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#8696a0]">Ningún chat coincide con tu búsqueda.</div>
          ) : (
            visibleContacts.map(contact => {
              const last = contact.messages?.[0];
              const unread = unreadCounts[contact.id] || 0;
              const isActive = activeContact?.id === contact.id;
              return (
                <div
                  key={contact.id}
                  onClick={() => loadMessages(contact)}
                  className={cn(
                    "relative px-3 py-2.5 mx-2 my-0.5 rounded-xl cursor-pointer transition-colors flex gap-3 items-center group",
                    isActive ? "bg-[#2a3942]" : "hover:bg-[#1a262d]"
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar contact={contact} size={48} />
                    <span
                      title={contact.botMode ? 'Bot activo' : 'Atención humana'}
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full flex items-center justify-center ring-2",
                        isActive ? "ring-[#2a3942]" : "ring-[#111b21] group-hover:ring-[#1a262d]",
                        contact.botMode ? "bg-[#00a884] text-[#06211b]" : "bg-[#3b4a54] text-[#cfd8dc]"
                      )}
                    >
                      {contact.botMode ? <Bot size={11} /> : <UserIcon size={11} />}
                    </span>
                  </div>

                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <span className={cn("truncate text-[15px]", unread > 0 ? "font-semibold text-white" : "font-medium text-[#e9edef]")}>
                        {contact.name || contact.phone}
                      </span>
                      <span className={cn("text-[11px] shrink-0", unread > 0 ? "text-[#00a884] font-medium" : "text-[#8696a0]")}>
                        {last ? listTime(new Date(last.timestamp)) : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2 mt-0.5">
                      <span className={cn("text-[13px] truncate flex items-center gap-1", unread > 0 ? "text-[#c7d0d5]" : "text-[#8696a0]", last?.direction === 'INTERNAL' && "italic")}>
                        {last?.direction === 'OUTBOUND' && (
                          <CheckCheck size={14} className={cn("shrink-0", last.status === 'READ' ? "text-[#53bdeb]" : "text-[#8696a0]")} />
                        )}
                        <span className="truncate">{previewOf(last)}</span>
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {unread > 0 && (
                          <span className="bg-[#00a884] text-[#06211b] text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                            {unread}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setContactToDelete(contact); }}
                          title="Eliminar conversación"
                          className="hidden group-hover:flex p-1 text-[#8696a0] hover:text-red-400 hover:bg-[#313d45] rounded-md transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ───────── Conversación ───────── */}
      {activeContact ? (
        <section className="flex flex-col bg-[#0b141a] relative flex-1 min-w-0">
          <div className="absolute inset-0 pointer-events-none z-0 opacity-100 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] [background-size:22px_22px]" />

          {simulatorMode && (
            <div className="bg-amber-500/10 text-amber-400 border-b border-amber-500/20 text-xs font-medium py-1.5 px-4 text-center shrink-0 z-20">
              Modo simulador: escribes como si fueras el cliente. No se envían mensajes reales.
            </div>
          )}

          {/* Cabecera */}
          <header className="h-16 bg-[#111b21]/95 backdrop-blur border-b border-[#222d34] px-3 md:px-5 flex items-center justify-between shrink-0 z-30">
            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 pr-2">
              <button
                type="button"
                onClick={() => setActiveContact(null)}
                className="md:hidden p-2 -ml-2 text-[#8696a0] hover:text-[#e9edef] rounded-full hover:bg-[#202c33]"
                aria-label="Volver a la lista"
              >
                <ChevronLeft size={24} />
              </button>
              <Avatar contact={activeContact} size={40} />
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-[16px] text-[#e9edef] leading-tight truncate">{activeContact.name || activeContact.phone}</span>
                <span className="text-xs text-[#8696a0] truncate flex items-center gap-1.5">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", activeContact.botMode ? "bg-[#00a884]" : "bg-amber-400")} />
                  {activeContact.botMode ? 'Bot activo' : 'Atención humana'} · +{activeContact.phone}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {pendingQuoteUrl && (
                <Link href={pendingQuoteUrl}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full px-3.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95"
                    title="Cotización Lista para Generar"
                  >
                    📝 <span className="hidden xl:inline">Generar cotización</span>
                  </Button>
                </Link>
              )}

              <div title="Modo simulador" className="hidden md:flex items-center gap-2 bg-[#202c33] 2xl:pl-3 pl-2 pr-2 py-1 rounded-full">
                <span className="text-[11px] font-medium text-[#8696a0] hidden 2xl:inline">Simulador</span>
                <button
                  type="button"
                  onClick={() => setSimulatorMode(!simulatorMode)}
                  aria-label="Activar modo simulador"
                  className={cn("w-9 h-5 rounded-full relative transition-colors duration-300", simulatorMode ? "bg-amber-500" : "bg-[#3b4a54]")}
                >
                  <div className={cn("w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-transform duration-300 shadow", simulatorMode ? "translate-x-[18px]" : "translate-x-[3px]")} />
                </button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleBotMode}
                className={cn(
                  "rounded-full px-3.5 font-semibold text-xs transition-all active:scale-95",
                  activeContact.botMode
                    ? "bg-[#00a884] hover:bg-[#00c298] text-[#06211b]"
                    : "bg-[#202c33] hover:bg-[#2a3942] text-[#c7d0d5]"
                )}
                title={activeContact.botMode ? 'Pasar a atención humana' : 'Reactivar el bot'}
              >
                {activeContact.botMode
                  ? <><Bot size={15} className="xl:mr-1.5" /><span className="hidden xl:inline">Bot activo</span></>
                  : <><UserIcon size={15} className="xl:mr-1.5" /><span className="hidden xl:inline">Modo humano</span></>}
              </Button>

              <button
                type="button"
                onClick={handleGenerateSummary}
                className="w-9 h-9 rounded-full flex items-center justify-center text-purple-300 hover:bg-purple-500/15 transition-colors active:scale-95"
                title="Resumir con IA"
              >
                <Sparkles size={18} />
              </button>

              <button
                type="button"
                data-testid="delete-chat-header-btn"
                onClick={() => setContactToDelete(activeContact)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#8696a0] hover:text-red-400 hover:bg-red-500/10 transition-colors active:scale-95"
                title="Eliminar conversación completa"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </header>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto px-3 md:px-[6%] py-4 z-10 relative">
            {loadingMessages ? (
              <div className="flex items-center justify-center gap-2 text-[#8696a0] my-8 text-sm">
                <Loader2 size={16} className="animate-spin" /> Cargando mensajes...
              </div>
            ) : (
              messages.map((msg, idx) => {
                const prev = messages[idx - 1];
                const date = new Date(msg.timestamp);
                const showDay = !prev || new Date(prev.timestamp).toDateString() !== date.toDateString();
                const dayChip = showDay && (
                  <div className="flex justify-center my-3">
                    <span className="bg-[#182229] text-[#8696a0] text-xs font-medium px-3 py-1 rounded-lg shadow-sm capitalize">{dayLabel(date)}</span>
                  </div>
                );

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
                        if (data.type) queryParams += `&type=${encodeURIComponent(data.type)}`;
                        if (data.description) queryParams += `&desc=${encodeURIComponent(data.description)}`;
                        queryParams += `&msgId=${msg.id}`;
                        buttonLink = `/dashboard/quotes/new${queryParams}`;
                        buttonText = "Generar Cotización";
                      } catch(e) {}
                    }
                  }

                  return (
                    <div key={msg.id}>
                      {dayChip}
                      <div className="flex justify-center w-full my-2">
                        <div className="bg-amber-400/[0.07] border border-amber-400/20 text-amber-100/90 px-4 py-2.5 rounded-xl text-[13px] max-w-[90%] md:max-w-[75%] shadow-sm">
                          <div className="font-semibold mb-1 flex items-center gap-1.5 text-amber-300 text-xs uppercase tracking-wide">
                            <Bot size={13} /> Nota interna · Sistema
                          </div>
                          <p className="whitespace-pre-wrap text-left break-words">{displayContent}</p>
                          {buttonLink && buttonText !== "Generar Cotización" && (
                            <Link
                              href={buttonLink}
                              className="mt-2 inline-flex items-center gap-1.5 bg-amber-400/15 hover:bg-amber-400/25 text-amber-200 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                            >
                              <FileText size={14} /> {buttonText}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Las reacciones se muestran pegadas al mensaje, nunca como aviso aparte
                if (msg.type === 'REACTION') return null;

                const sameAsPrev = !!prev && !showDay && prev.direction === msg.direction && prev.direction !== 'INTERNAL' && prev.type !== 'REACTION'
                  && date.getTime() - new Date(prev.timestamp).getTime() < 5 * 60 * 1000;
                const isSticker = msg.type === 'IMAGE' && msg.content === '🎭 Sticker';
                const quoted = typeof msg.content === 'string' && msg.type === 'TEXT' ? msg.content.match(/^↪️ En respuesta a «([\s\S]*?)»\n([\s\S]*)$/) : null;
                const bodyText = quoted ? quoted[2] : msg.content;
                const mediaSrc = msg.mediaUrl?.startsWith('http') ? msg.mediaUrl : `/api/media/${msg.id}`;
                const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const ticks = alignRight && (
                  <span className={cn("inline-flex", msg.status === 'READ' ? "text-[#53bdeb]" : "text-white/50")}>
                    {msg.status === 'SENT' ? <Check size={15} /> : <CheckCheck size={15} />}
                  </span>
                );

                return (
                  <div key={msg.id}>
                    {dayChip}
                    <div className={cn("flex group items-center", alignRight ? "justify-end" : "justify-start", sameAsPrev ? "mt-0.5" : "mt-2")}>

                      {/* Acciones al pasar el mouse (reaccionar / responder) */}
                      <div className={cn("hidden group-hover:flex items-center gap-1 mx-2", alignRight ? "order-1" : "order-2")}>
                        <button type="button" onClick={() => setReactionMenuFor(reactionMenuFor === msg.id ? null : msg.id)} className="p-1.5 rounded-full bg-[#1f2c34] text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition-colors relative shadow-sm border border-[#2a3942]">
                          <Smile size={15} />
                          {reactionMenuFor === msg.id && (
                            <div className="absolute bottom-full mb-2 -translate-x-1/2 left-1/2 bg-[#233138] p-2 rounded-full shadow-xl border border-[#2a3942] flex gap-2 z-50">
                              {['👍','❤️','😂','😮','😢','🙏'].map(emoji => (
                                <div key={emoji} onClick={(e) => { e.stopPropagation(); setMessages(prev => prev.map(m => m.id === msg.id ? {...m, reaction: emoji} : m)); setReactionMenuFor(null); }} className="hover:scale-125 cursor-pointer transition-transform text-lg px-1">{emoji}</div>
                              ))}
                            </div>
                          )}
                        </button>
                        <button type="button" onClick={() => setReplyingTo(msg)} className="p-1.5 rounded-full bg-[#1f2c34] text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition-colors shadow-sm border border-[#2a3942]">
                          <Reply size={15} />
                        </button>
                      </div>

                      {isSticker ? (
                        <div className={cn("relative", alignRight ? "order-2" : "order-1", msg.reaction && "mb-3")}>
                          <img src={mediaSrc} alt="Sticker" className="max-w-[160px] max-h-[160px] object-contain drop-shadow-lg" />
                          <span className="absolute bottom-1 right-1 text-[10px] text-white/80 bg-black/45 rounded-full px-1.5 py-0.5 flex items-center gap-1">{time}{ticks}</span>
                          {msg.reaction && (
                            <div className={cn("absolute -bottom-3 bg-[#233138] rounded-full px-1.5 py-0.5 text-sm shadow ring-2 ring-[#0b141a] z-10", alignRight ? "right-3" : "left-3")}>{msg.reaction}</div>
                          )}
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "relative max-w-[85%] md:max-w-[68%] px-2.5 pt-1.5 pb-1 text-[14.5px] leading-[1.4] shadow-[0_1px_1px_rgba(0,0,0,0.3)] rounded-2xl",
                            msg.type === 'IMAGE' && "p-1.5",
                            alignRight
                              ? cn("bg-[#005c4b] text-[#e9edef] order-2", !sameAsPrev && "rounded-tr-md")
                              : cn("bg-[#1f2c34] text-[#e9edef] order-1", !sameAsPrev && "rounded-tl-md"),
                            msg.reaction && "mb-3"
                          )}
                        >
                          {quoted && (
                            <div className={cn("mb-1.5 rounded-lg border-l-4 px-2.5 py-1.5 text-[13px]", alignRight ? "bg-black/20 border-[#35d6b5]" : "bg-black/20 border-[#00a884]")}>
                              <div className="text-[11px] font-semibold text-[#35d6b5] mb-0.5">Respuesta a</div>
                              <div className="text-[#c7d0d5] line-clamp-2">{quoted[1]}</div>
                            </div>
                          )}

                          {msg.type === 'AUDIO' && (
                            <div className="mb-1 min-w-[230px]">
                              <audio controls src={mediaSrc} className="w-full h-10 filter invert opacity-90" />
                            </div>
                          )}

                          {msg.type === 'IMAGE' ? (
                            <div className="flex flex-col gap-1.5 relative w-[min(300px,72vw)]">
                              <a href={mediaSrc} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden bg-black/25">
                                <img src={mediaSrc} alt="Adjunto" className="w-full max-h-80 object-contain" />
                              </a>
                              {msg.content && msg.content !== '📷 Imagen adjunta' && <span className="text-[14px] leading-snug whitespace-pre-wrap break-words px-0.5">{msg.content}</span>}
                            </div>
                          ) : msg.type === 'DOCUMENT' ? (
                            <a href={mediaSrc} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-black/20 hover:bg-black/30 transition-colors p-2.5 rounded-xl min-w-[220px]">
                              <div className="w-10 h-10 rounded-lg bg-red-500/20 text-red-300 flex items-center justify-center shrink-0">
                                <FileText size={20} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate max-w-[220px]">{msg.content || 'Documento adjunto'}</div>
                                <div className="text-[11px] text-white/50">{msg.mimeType === 'application/pdf' ? 'PDF · ' : ''}Toca para abrir</div>
                              </div>
                            </a>
                          ) : (
                            bodyText ? <p className="break-words whitespace-pre-wrap">{bodyText}<span className={cn("inline-block", alignRight ? "w-[6.2rem]" : "w-[4.6rem]")} /></p> : null
                          )}

                          <div className={cn("flex items-center justify-end gap-1 text-[11px] text-white/50 select-none", (msg.type === 'TEXT' && bodyText) ? "absolute right-2.5 bottom-1" : "mt-0.5")}>
                            <span>{time}</span>
                            {ticks}
                          </div>

                          {msg.aiTrace && (() => {
                            try {
                              const t = JSON.parse(msg.aiTrace) as { rules?: string[]; tools?: string[] };
                              const rules = t.rules ?? [];
                              const tools = t.tools ?? [];
                              return (
                                <details className="mt-1.5 text-[11px] text-[#8696a0] border-t border-white/10 pt-1">
                                  <summary className="cursor-pointer select-none hover:text-[#c7d0d5]">
                                    🧠 {rules.length ? `${rules.length} regla(s) RAG` : 'Sin reglas RAG (prompt)'}{tools.length ? ` · ${tools.join(', ')}` : ''}
                                  </summary>
                                  <ul className="mt-1 space-y-1 text-left">
                                    {rules.map((r, i) => <li key={i}>• {r}</li>)}
                                    {tools.map((n, i) => <li key={`t${i}`}>🔧 Herramienta: {n}</li>)}
                                    {!rules.length && !tools.length && <li>Respondió solo con el prompt base.</li>}
                                  </ul>
                                </details>
                              );
                            } catch { return null; }
                          })()}

                          {msg.reaction && (
                            <div className={cn("absolute -bottom-3.5 bg-[#233138] rounded-full px-1.5 py-0.5 text-sm shadow ring-2 ring-[#0b141a] z-10", alignRight ? "right-3" : "left-3")}>
                              {msg.reaction}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Barra de escribir */}
          <div className="bg-[#111b21] border-t border-[#222d34] px-3 md:px-4 py-2.5 flex flex-col z-20">

            {(replyingTo || stagedFiles.length > 0) && (
              <div className="flex flex-col gap-2 mb-2">
                {replyingTo && (
                  <div className="flex items-center justify-between bg-[#1f2c34] p-2.5 rounded-xl border-l-4 border-[#00a884] relative">
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-semibold text-[#35d6b5]">Respondiendo a</span>
                      <span className="text-sm text-[#c7d0d5] truncate">{replyingTo.content || (replyingTo.type === 'IMAGE' ? 'Imagen' : 'Adjunto')}</span>
                    </div>
                    <button type="button" onClick={() => setReplyingTo(null)} className="text-[#8696a0] hover:text-[#e9edef] p-1">
                      <X size={16} />
                    </button>
                  </div>
                )}

                {stagedFiles.length > 0 && (
                  <div className="flex flex-col bg-[#1f2c34] rounded-xl overflow-hidden border border-[#2a3942]">
                    <div className="flex justify-between items-center px-3 py-1.5 border-b border-[#2a3942]">
                      <span className="text-xs text-[#8696a0]">Vista previa de adjuntos ({stagedFiles.length})</span>
                      <button type="button" onClick={() => setStagedFiles([])} className="text-[#8696a0] hover:text-[#e9edef] p-1">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="flex overflow-x-auto p-2 gap-2 custom-scrollbar">
                      {stagedFiles.map((file, idx) => (
                        <div key={idx} className="relative group shrink-0">
                          {file.type.startsWith('image/') ? (
                            <div className="w-24 h-24 bg-[#111b21] rounded-lg overflow-hidden relative border border-[#2a3942]">
                              <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-24 h-24 bg-[#111b21] rounded-lg flex flex-col items-center justify-center p-2 border border-[#2a3942]">
                              <FileText size={24} className="text-[#8696a0] mb-1"/>
                              <span className="text-[10px] font-medium text-[#e9edef] truncate w-full text-center">{file.name}</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setStagedFiles(prev => prev.filter((_, i) => i !== idx))}
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

            <form onSubmit={handleSendMessage} className="flex gap-2 items-end transition-all">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx,.dxf"
                multiple
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-[#8696a0] hover:text-[#e9edef] rounded-full hover:bg-[#202c33] mb-0.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Adjuntar archivo"
              >
                <Plus size={24} />
              </Button>

              {recordedAudio ? (
                <div className="flex-1 flex items-center justify-between bg-[#202c33] rounded-2xl px-4 py-2.5">
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
                  <div className="flex-1 flex items-center bg-[#202c33] rounded-full px-4 py-2">
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                      <span className="text-[#c7d0d5] font-mono text-sm tracking-wide">{formatDuration(recordingDuration)}</span>
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
                      if (inputText.trim() || stagedFiles.length > 0) handleSendMessage();
                    }
                  }}
                  onPaste={e => {
                    const items = e.clipboardData?.items;
                    if (!items) return;
                    let hasFiles = false;
                    const newFiles: File[] = [];
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].type.indexOf('image') !== -1) {
                        const file = items[i].getAsFile();
                        if (file) {
                          newFiles.push(file);
                          hasFiles = true;
                        }
                      }
                    }
                    if (hasFiles) {
                      setStagedFiles(prev => [...prev, ...newFiles]);
                      e.preventDefault();
                    }
                  }}
                  rows={1}
                  placeholder={isUploading ? "Enviando..." : (simulatorMode ? "Escribe un mensaje como cliente..." : "Escribe un mensaje")}
                  className="flex-1 bg-[#202c33] border-none focus:outline-none focus:ring-1 focus:ring-[#00a884]/50 !text-white placeholder-[#8696a0] px-4 py-2.5 max-h-[120px] resize-none overflow-y-auto rounded-2xl text-[15px]"
                  disabled={isUploading}
                />
              )}

              {inputText.trim() || stagedFiles.length > 0 || recordedAudio ? (
                <Button type="submit" size="icon" className="shrink-0 rounded-full bg-[#00a884] hover:bg-[#00c298] text-[#06211b] w-10 h-10 mb-0.5 shadow-sm transition-transform active:scale-95" disabled={isUploading} title="Enviar">
                  <Send size={18} className="transition-transform translate-x-0.5 -translate-y-0.5" />
                </Button>
              ) : isRecording ? (
                <Button type="button" onClick={stopRecording} size="icon" className="shrink-0 rounded-full bg-red-500 hover:bg-red-600 text-white w-10 h-10 mb-0.5 shadow-sm">
                  <Square size={16} fill="currentColor" />
                </Button>
              ) : (
                <Button type="button" onClick={startRecording} size="icon" className="shrink-0 rounded-full bg-[#00a884] hover:bg-[#00c298] text-[#06211b] w-10 h-10 mb-0.5 shadow-sm transition-transform active:scale-95" title="Grabar audio">
                  <Mic size={20} />
                </Button>
              )}
            </form>
          </div>
        </section>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-[#0b141a] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] [background-size:22px_22px]" />
          <div className="text-center max-w-md p-8 relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#00a884]/25 to-[#00a884]/5 border border-[#00a884]/20 flex items-center justify-center mb-6">
              <MessageCircle size={44} className="text-[#35d6b5]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#e9edef] mb-2 tracking-tight">Chats de WhatsApp</h2>
            <p className="text-[#8696a0] leading-relaxed text-sm">Selecciona una conversación de la lista para ver los mensajes y atender a los prospectos de Laser Inova.</p>
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

      {/* Modal Confirmación Borrar Conversación */}
      <ConfirmationModal
        isOpen={!!contactToDelete}
        onClose={() => setContactToDelete(null)}
        onConfirm={handleDeleteConversation}
        isLoading={isDeletingContact}
        title="Eliminar Conversación"
        message={`¿Estás seguro de que deseas eliminar permanentemente el chat con ${contactToDelete?.name || contactToDelete?.phone || 'este contacto'}? Se borrará todo el historial de mensajes de forma definitiva.`}
        confirmText="Sí, Eliminar Chat"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}
