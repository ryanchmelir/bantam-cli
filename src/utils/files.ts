import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: string;
}

export const getMimeType = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.xml': 'application/xml',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
};

export const getFileInfo = async (filePath: string): Promise<FileInfo> => {
  const stats = await fs.promises.stat(filePath);
  return {
    name: path.basename(filePath),
    path: filePath,
    size: stats.size,
    type: getMimeType(filePath)
  };
};

export const createZipFromDirectory = async (dirPath: string): Promise<string> => {
  const tempFile = path.join(tmpdir(), `bantam-deploy-${randomBytes(8).toString('hex')}.zip`);
  const output = createWriteStream(tempFile);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });

  archive.pipe(output);

  // Add all files from directory
  archive.directory(dirPath, false);

  await archive.finalize();

  return new Promise((resolve, reject) => {
    output.on('close', () => resolve(tempFile));
    archive.on('error', reject);
  });
};

export const findIndexFile = (dirPath: string): string | null => {
  const indexFiles = ['index.html', 'index.htm'];
  
  for (const indexFile of indexFiles) {
    const fullPath = path.join(dirPath, indexFile);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  
  return null;
};

export const isDirectory = (filePath: string): boolean => {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
};

export const getDirectorySize = async (dirPath: string): Promise<number> => {
  let totalSize = 0;

  const calculateSize = async (currentPath: string) => {
    const stats = await fs.promises.stat(currentPath);
    
    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      const files = await fs.promises.readdir(currentPath);
      await Promise.all(
        files.map(file => calculateSize(path.join(currentPath, file)))
      );
    }
  };

  await calculateSize(dirPath);
  return totalSize;
};

export const shouldIgnoreFile = (filePath: string): boolean => {
  const ignoredPatterns = [
    '.git',
    '.DS_Store',
    'node_modules',
    '.env',
    '.env.local',
    'npm-debug.log',
    'yarn-error.log',
    '.vscode',
    '.idea',
    '*.swp',
    '*.swo',
    '*~',
    'Thumbs.db'
  ];

  const fileName = path.basename(filePath);
  return ignoredPatterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(fileName);
    }
    return fileName === pattern || filePath.includes(`/${pattern}/`);
  });
};