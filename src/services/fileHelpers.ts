import { TagImage } from '../types';

// Helper: Check if file is an image
export const isImageFile = (file: File) => {
    return file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|tiff|avif|heic)$/i.test(file.name);
};

// Helper: Read directory entries recursively
const readAllDirectoryEntries = async (directoryReader: any): Promise<any[]> => {
  const entries: any[] = [];
  let readEntries = await new Promise<any[]>((resolve, reject) => {
    directoryReader.readEntries(resolve, reject);
  });

  while (readEntries.length > 0) {
    entries.push(...readEntries);
    readEntries = await new Promise<any[]>((resolve, reject) => {
      directoryReader.readEntries(resolve, reject);
    });
  }
  return entries;
};

// Helper: Scan a FileSystemEntry (File or Directory)
export const scanEntry = async (entry: any): Promise<File[]> => {
  if (!entry) return [];
  if (entry.isFile) {
    return new Promise((resolve) => {
      entry.file((file: File) => resolve([file]), () => resolve([]));
    });
  } else if (entry.isDirectory) {
    const directoryReader = entry.createReader();
    const entries = await readAllDirectoryEntries(directoryReader);
    const files = await Promise.all(entries.map((e) => scanEntry(e)));
    return files.reduce((acc, curr) => acc.concat(curr), [] as File[]);
  }
  return [];
};

// Helper: Create TagImage objects from Files
export const createTagImages = (files: File[]): TagImage[] => {
    return files.map(file => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        caption: "",
        status: 'idle' as const
    }));
};