import { useState, useEffect, useCallback, useRef } from 'react';
import { getPusherClient } from '@/lib/pusher';
import { playNotificationSound } from '@/lib/notificationSound';

export interface Email {
  id: string;
  messageId: string;
  subject: string;
  from: string;
  to: string;
  snippet: string;
  isRead: boolean;
  isStarred: boolean;
  folder: string;
  cc?: string;
  bcc?: string;
  receivedAt: string;
  quoteStatus?: 'PENDING' | 'DRAFT' | 'ANSWERED';
  storagePath?: string;
  attachments: { filename: string, size: number }[];
}


// Memory cache mapping folder IDs to their last synced email lists
let memoryCache: Record<string, { emails: Email[]; total: number }> = {};

function getInitialData(folder: string): { emails: Email[]; total: number } {
  if (memoryCache[folder]) {
    return memoryCache[folder];
  }
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(`email_cache_${folder}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        memoryCache[folder] = parsed;
        return parsed;
      } catch (e) {
        console.error('Failed to parse email cache', e);
      }
    }
  }
  return { emails: [], total: 0 };
}

export function useEmailInbox(initialFolder: string = 'INBOX', userEmail?: string) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [totalEmails, setTotalEmails] = useState(0);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncAuthError, setSyncAuthError] = useState<boolean>(false);
  const [currentFolder, setCurrentFolder] = useState(initialFolder);
  const [page, setPage] = useState(1);
  const limit = 10;

  const fetchEmails = useCallback(async (folderToFetch?: string, pageToFetch?: number, silent = false) => {
    if (!silent) setIsLoading(true);
    const folder = folderToFetch || currentFolder;
    const activePage = pageToFetch !== undefined ? pageToFetch : page;
    try {
      const base = folder === 'QUOTES' ? '/api/email/quotes?' : `/api/email/list?folder=${folder}&`;
      const res = await fetch(`${base}page=${activePage}&limit=${limit}${query ? `&q=${encodeURIComponent(query)}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails);
        setTotalEmails(data.total || 0);
        // El contador de Recibidos es solo de Recibidos: no debe cambiar al mirar Cotizaciones, Borradores, etc.
        if (folder === 'INBOX') setUnreadTotal(data.unread || 0);
        
        // Cache page 1 locally (solo la vista sin búsqueda)
        if (activePage === 1 && !query) {
          const cachePayload = { emails: data.emails, total: data.total || 0 };
          memoryCache[folder] = cachePayload;
          if (typeof window !== 'undefined') {
            localStorage.setItem(`email_cache_${folder}`, JSON.stringify(cachePayload));
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch emails', error);
    }
    setIsLoading(false);
  }, [currentFolder, page, query]);

  const syncEmails = useCallback(async (signal?: AbortSignal, full = true) => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncAuthError(false);
    try {
      const res = await fetch(`/api/email/sync${full ? '' : '?full=0'}`, { method: 'POST', signal });
      if (signal?.aborted) return;

      if (res.ok) {
        const data = await res.json().catch(() => ({}));

        if (data.background) {
          // El sync ocurre en background — hacemos polling para mostrar nuevos correos
          // Primera carga rápida para actualizar la vista
          setTimeout(async () => {
            if (!signal?.aborted) await fetchEmails(currentFolder, 1, true);
          }, 3000);
          // Segunda carga más tardía para capturar todos los correos ya sincronizados
          setTimeout(async () => {
            if (!signal?.aborted) {
              await fetchEmails(currentFolder, 1, false);
              setPage(1);
              setIsSyncing(false);
            }
          }, 10000);
          return; // isSyncing se apaga en el segundo setTimeout
        } else {
          await fetchEmails(currentFolder, 1, false);
          setPage(1);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setSyncError(data.message || data.errorDetail || 'Error al intentar conectar con el servidor IMAP.');
        if (data.authError === true) {
          setSyncAuthError(true);
        }
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      console.error('Failed to sync emails', error);
      setSyncError(error.message || 'Error de red al intentar sincronizar.');
    }
    setIsSyncing(false);
  }, [fetchEmails, currentFolder]);

  const search = useCallback((q: string) => { setQuery(q); setPage(1); }, []);

  const changeFolder = (folder: string) => {
    setCurrentFolder(folder);
    setPage(1);
    
    // Instantly load folder from cache if present to prevent visual flash
    const folderData = getInitialData(folder);
    setQuery('');
    setEmails(folderData.emails);
    setTotalEmails(folderData.total);
    
    // Fetch background update: silent if we already have cache
    const hasCache = folderData.emails.length > 0;
    fetchEmails(folder, 1, hasCache);
  };

  const changePage = (newPage: number) => {
    setPage(newPage);
    fetchEmails(currentFolder, newPage, false); // Blocker-load during page changes
  };

  // Carga inicial + auto-sync inteligente con limpieza en unmount
  useEffect(() => {
    const folderData = getInitialData(currentFolder);
    const hasCache = folderData.emails.length > 0;
    fetchEmails(currentFolder, page, hasCache);

    let abortController: AbortController | null = null;

    if (userEmail && currentFolder === 'INBOX' && page === 1) {
      const now = Date.now();
      const cacheKey = `last_imap_sync_${userEmail.trim().toLowerCase()}`;
      const lastSyncStr = localStorage.getItem(cacheKey);
      const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;

      if (now - lastSync > 5 * 60 * 1000) {
        localStorage.setItem(cacheKey, now.toString());
        abortController = new AbortController();
        syncEmails(abortController.signal);
      }
    }

    return () => {
      // Cancelar el sync si el componente se desmonta antes de que termine
      abortController?.abort();
    };
  }, [currentFolder, page, fetchEmails, userEmail, syncEmails]);

  // Auto-sync: mientras la bandeja esté abierta se revisa el correo nuevo cada 2 minutos (antes solo al abrir
  // la página y cada 5 min), y de inmediato al volver a la pestaña.
  useEffect(() => {
    if (!userEmail) return;
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      const key = `last_imap_sync_${userEmail.trim().toLowerCase()}`;
      const last = parseInt(localStorage.getItem(key) || '0', 10);
      if (Date.now() - last < 110 * 1000) return;
      localStorage.setItem(key, Date.now().toString());
      syncEmails(undefined, false); // revisión rápida: solo lo nuevo
    };
    const id = setInterval(tick, 120 * 1000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [userEmail, syncEmails]);

  // Aviso en vivo: cuando el servidor (cron o sincronización) detecta correo nuevo, la bandeja se actualiza
  // y suena, sin esperar el siguiente ciclo ni tener que apretar "Sincronizar".
  const fetchRef = useRef(fetchEmails);
  useEffect(() => { fetchRef.current = fetchEmails; }, [fetchEmails]);
  useEffect(() => {
    if (!userEmail) return;
    const channel = getPusherClient().subscribe('crm-channel');
    const onNewMail = (data: { email?: string }) => {
      if (data?.email && data.email.toLowerCase() !== userEmail.trim().toLowerCase()) return;
      fetchRef.current(undefined, undefined, true);
      playNotificationSound();
    };
    channel.bind('email_new', onNewMail);
    return () => { channel.unbind('email_new', onNewMail); };
  }, [userEmail]);

  return { 
    unreadTotal,
    query,
    search,
    emails, 
    isLoading, 
    isSyncing, 
    syncError,
    syncAuthError,
    syncEmails, 
    fetchEmails, 
    currentFolder, 
    changeFolder,
    page,
    totalEmails,
    limit,
    changePage
  };
}
