import { useState, useEffect, useCallback } from 'react';

export interface Email {
  id: string;
  messageId: string;
  subject: string;
  from: string;
  to: string;
  snippet: string;
  isRead: boolean;
  folder: string;
  receivedAt: string;
  bodyHtml?: string;
  bodyText?: string;
  attachments: { filename: string, size: number }[];
}

export function useEmailInbox(initialFolder: string = 'INBOX') {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentFolder, setCurrentFolder] = useState(initialFolder);
  const [page, setPage] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);
  const limit = 10;

  const fetchEmails = useCallback(async (folderToFetch?: string, pageToFetch?: number) => {
    setIsLoading(true);
    const folder = folderToFetch || currentFolder;
    const activePage = pageToFetch !== undefined ? pageToFetch : page;
    try {
      const res = await fetch(`/api/email/list?folder=${folder}&page=${activePage}&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails);
        setTotalEmails(data.total || 0);
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
        await fetchEmails(currentFolder, 1);
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
    fetchEmails(folder, 1);
  };

  const changePage = (newPage: number) => {
    setPage(newPage);
    fetchEmails(currentFolder, newPage);
  };

  useEffect(() => {
    syncEmails();
  }, [syncEmails]);

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
