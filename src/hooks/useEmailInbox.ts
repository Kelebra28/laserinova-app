import { useState, useEffect, useCallback } from 'react';

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
      const res = await fetch(`/api/email/list?folder=${folder}&page=${activePage}&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails);
        setTotalEmails(data.total || 0);
        
        // Cache page 1 locally
        if (activePage === 1) {
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
  }, [currentFolder, page]);

  const syncEmails = useCallback(async (signal?: AbortSignal) => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncAuthError(false);
    try {
      const res = await fetch('/api/email/sync', { method: 'POST', signal });
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

  const changeFolder = (folder: string) => {
    setCurrentFolder(folder);
    setPage(1);
    
    // Instantly load folder from cache if present to prevent visual flash
    const folderData = getInitialData(folder);
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

  return { 
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
