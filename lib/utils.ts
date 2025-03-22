import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import fs from 'fs';
import path from 'path';
import os from 'os';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanupTempFiles() {
  const tempDir = path.join(os.tmpdir(), 'tdnm-chat');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export function cleanupOldFiles(maxAge: number = 24 * 60 * 60 * 1000) {
  const tempDir = path.join(os.tmpdir(), 'tdnm-chat');
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
      }
    });
  }
}
