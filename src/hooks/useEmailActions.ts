import { useState } from 'react';

export function useEmailActions() {
  const [isSending, setIsSending] = useState(false);

  const sendEmail = async (to: string, cc: string, subject: string, text: string, attachments: File[]) => {
    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('to', to);
      formData.append('cc', cc);
      formData.append('subject', subject);
      formData.append('text', text);
      
      // Append signature fields dynamically from localStorage
      if (typeof window !== 'undefined') {
        formData.append('sigName', localStorage.getItem('sig_name') || 'Ricardo Basurto');
        formData.append('sigTitle', localStorage.getItem('sig_title') || 'Director General');
        formData.append('sigPhone', localStorage.getItem('sig_phone') || '+52 1 55 1234 5678');
        formData.append('sigEmail', localStorage.getItem('sig_email') || 'info@laserinova.com');
        formData.append('sigWeb', localStorage.getItem('sig_web') || 'www.laserinova.com');
      }

      attachments.forEach(file => {
        formData.append('attachments', file);
      });

      const res = await fetch('/api/email/send', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Error enviando correo');
      
      setIsSending(false);
      return true;
    } catch (error) {
      console.error(error);
      setIsSending(false);
      return false;
    }
  };

  const downloadAttachment = async (messageId: string, filename: string) => {
    window.open(`/api/email/attachment?messageId=${encodeURIComponent(messageId)}&filename=${encodeURIComponent(filename)}`, '_blank');
  };

  const updateEmail = async (emailId: string, updates: { folder?: string; isRead?: boolean; isStarred?: boolean }) => {
    try {
      const res = await fetch('/api/email/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailId, ...updates }),
      });
      return res.ok;
    } catch (error) {
      console.error('Failed to update email', error);
      return false;
    }
  };

  return { isSending, sendEmail, downloadAttachment, updateEmail };
}
