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

export function useEmailInbox(initialFolder: string = 'INBOX') {
  const initialData = getInitialData(initialFolder);
  const [emails, setEmails] = useState<Email[]>(initialData.emails);
  const [totalEmails, setTotalEmails] = useState(initialData.total);
  const [isLoading, setIsLoading] = useState(initialData.emails.length === 0);
  const [isSyncing, setIsSyncing] = useState(false);
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

  const syncEmails = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/email/sync', { method: 'POST' });
      if (res.ok) {
        await fetchEmails(currentFolder, 1, false); // Block loading during forced sync to show new mail
        setPage(1);
      }
    } catch (error) {
      console.error('Failed to sync emails', error);
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

  // Silent sync on mount
  useEffect(() => {
    const folderData = getInitialData(currentFolder);
    const hasCache = folderData.emails.length > 0;
    fetchEmails(currentFolder, page, hasCache);
  }, [currentFolder, page, fetchEmails]);

  return { 
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
  };
}
