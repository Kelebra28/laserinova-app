import fs from 'fs';
import path from 'path';
import os from 'os';

let cachedStoragePath: string | null = null;

export const getStorageBasePath = () => {
  if (cachedStoragePath) return cachedStoragePath;

  const primaryDir = path.join(process.cwd(), 'storage', 'emails');
  try {
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }
    // Test if directory is actually writable (handles read-only filesystems)
    const testFile = path.join(primaryDir, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    
    cachedStoragePath = primaryDir;
    return primaryDir;
  } catch (error) {
    console.warn(`Primary storage path ${primaryDir} not writable. Falling back to temporary storage.`, error);
    const fallbackDir = path.join(os.tmpdir(), 'crm-emails');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    cachedStoragePath = fallbackDir;
    return fallbackDir;
  }
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
