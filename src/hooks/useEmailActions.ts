import { useState } from 'react';
import { useSession } from 'next-auth/react';

export function useEmailActions() {
  const [isSending, setIsSending] = useState(false);
  const { data: session } = useSession();
  const userEmail = session?.user?.email;

  const getStorageKey = (key: string) => `${key}${userEmail ? `_${userEmail}` : ''}`;

  const sendEmail = async (to: string, cc: string, subject: string, text: string, attachments: File[]) => {
    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('to', to);
      formData.append('cc', cc);
      formData.append('subject', subject);
      formData.append('text', text);
      
      // Append signature fields dynamically from localStorage using user-specific keys
      if (typeof window !== 'undefined') {
        const getSignatureField = (key: string, defaultValue: string) => {
          if (userEmail) {
            const cleanEmail = userEmail.trim().toLowerCase();
            const val = localStorage.getItem(`${key}_${cleanEmail}`);
            if (val) return val;
            
            const rawVal = localStorage.getItem(`${key}_${userEmail}`);
            if (rawVal) return rawVal;
            
            return defaultValue; // Prevent profile overlap
          }
          return localStorage.getItem(key) || defaultValue;
        };

        formData.append('sigName', getSignatureField('sig_name', 'Ricardo Basurto'));
        formData.append('sigTitle', getSignatureField('sig_title', 'Director General'));
        formData.append('sigPhone', getSignatureField('sig_phone', '+52 1 55 1234 5678'));
        formData.append('sigEmail', getSignatureField('sig_email', 'info@laserinova.com'));
        formData.append('sigWeb', getSignatureField('sig_web', 'www.laserinova.com'));
      }

      attachments.forEach(file => {
        formData.append('attachments', file);
      });

      const res = await fetch('/api/email/send', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Error enviando correo');
      }
      
      setIsSending(false);
      return { success: true };
    } catch (error: any) {
      console.error(error);
      setIsSending(false);
      return { success: false, error: error.message };
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
