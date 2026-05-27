import { useState, ChangeEvent } from 'react';

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadImages = async (files: FileList | File[]): Promise<string[]> => {
    setIsUploading(true);
    const urls: string[] = [];
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error('Error al subir imagen');
        const data = await res.json();
        return data.url;
      });

      const results = await Promise.all(uploadPromises);
      urls.push(...results.filter(url => url !== null));
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
    
    return urls;
  };

  const handleFileChange = async (
    e: ChangeEvent<HTMLInputElement>,
    onSuccess: (newUrls: string[]) => void
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const uploadedUrls = await uploadImages(e.target.files);
    if (uploadedUrls.length > 0) {
      onSuccess(uploadedUrls);
    }
    // Clear input
    e.target.value = '';
  };

  const deleteImage = async (url: string) => {
    try {
      await fetch('/api/upload/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
    } catch (error) {
      console.error('Error deleting image', error);
    }
  };

  return {
    isUploading,
    handleFileChange,
    uploadImages,
    deleteImage,
  };
};
