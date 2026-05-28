import { useState, useCallback } from 'react';

export interface EmailMetadata {
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
  hasAttachments: boolean;
}

export function useHybridEmail() {
  const [emails, setEmails] = useState<EmailMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeEmailHtml, setActiveEmailHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInbox = useCallback(async (folder: string = 'INBOX') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/email/list?folder=${folder}`);
      if (!res.ok) throw new Error('Failed to fetch emails');
      const data = await res.json();
      setEmails(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unknown error fetching emails');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEmailBody = useCallback(async (id: string) => {
    setActiveEmailHtml(null);
    try {
      const res = await fetch(`/api/email/${id}/body`);
      if (!res.ok) throw new Error('Failed to fetch email body');
      const data = await res.json();
      setActiveEmailHtml(data.html);
    } catch (err: any) {
      console.error(err);
      setActiveEmailHtml(`<div class="text-red-500 font-bold p-4">Error loading email body: ${err.message}</div>`);
    }
  }, []);

  return {
    emails,
    loading,
    error,
    activeEmailHtml,
    fetchInbox,
    loadEmailBody,
  };
}
