import fs from 'fs';
import path from 'path';

const getStorageBasePath = () => {
  const dir = path.join(process.cwd(), 'storage', 'emails');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

export const saveEmailToDisk = (messageId: string, html: string = '', text: string = '') => {
  const safeId = messageId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dirPath = path.join(getStorageBasePath(), safeId);
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  fs.writeFileSync(path.join(dirPath, 'body.html'), html, 'utf-8');
  fs.writeFileSync(path.join(dirPath, 'body.txt'), text, 'utf-8');

  return safeId;
};

export const loadEmailFromDisk = (storagePath: string) => {
  const dirPath = path.join(getStorageBasePath(), storagePath);
  let html = '';
  let text = '';
  
  try {
    if (fs.existsSync(path.join(dirPath, 'body.html'))) {
      html = fs.readFileSync(path.join(dirPath, 'body.html'), 'utf-8');
    }
    if (fs.existsSync(path.join(dirPath, 'body.txt'))) {
      text = fs.readFileSync(path.join(dirPath, 'body.txt'), 'utf-8');
    }
  } catch (error) {
    console.error('Failed to load email from disk:', error);
  }

  return { html, text };
};
