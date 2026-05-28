import { useState } from 'react';

export function useEmailActions() {
  const [isSending, setIsSending] = useState(false);

  const sendEmail = async (to: string, subject: string, text: string, attachments: File[]) => {
    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('to', to);
      formData.append('subject', subject);
      formData.append('text', text);
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

  const updateEmail = async (emailId: string, updates: { folder?: string; isRead?: boolean }) => {
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
