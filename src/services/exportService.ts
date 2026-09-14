import { archiveImageNames, sanitizeArchiveName } from './exportNaming';
import saveAs from 'file-saver';
import { TagImage, Project } from '../types';

// Export all projects into a single ZIP with folder structure (Worker-based)
export const exportAllProjectsToZip = async (projects: Project[], format: 'txt' | 'json' = 'txt') => {
  const timestamp = new Date().toISOString().slice(0, 10);

  // Prepare data for worker (strip non-serializable parts if any, but File objects are transferrable/cloneable)
  // We need to map projects to a structure the worker can handle. 
  // Note: File objects can be sent to workers.

  const worker = new Worker(new URL('./export.worker.ts', import.meta.url), { type: 'module' });

  return new Promise<void>((resolve, reject) => {
    worker.onmessage = (e) => {
      const { type, blob, error } = e.data;
      if (type === 'SUCCESS') {
        try {
          saveAs(blob, `lora_dataset_full_${timestamp}.zip`);
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          worker.terminate();
        }
      } else if (type === 'ERROR') {
        console.error("Export failed:", error);
        worker.terminate();
        reject(new Error(String(error)));
      }
    };

    worker.onmessageerror = () => {
      worker.terminate();
      reject(new Error('Unable to decode export worker response'));
    };

    worker.onerror = (e) => {
      console.error("Worker error:", e);
      worker.terminate();
      reject(e);
    };

    // Send data
    try {
      worker.postMessage({ type: 'EXPORT_ALL', data: { projects, format } });
    } catch (error) {
      worker.terminate();
      reject(error);
    }
  });
};

// Export a single project as a flat ZIP
export const exportProjectToZip = async (project: Project) => {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const usedNames = new Set<string>();
  const timestamp = new Date().toISOString().slice(0, 10);

  project.images.forEach((img) => {
    const names = archiveImageNames(img.file.name, 'txt', usedNames);
    zip.file(names.image, img.file);

    // Add caption file if exists
    if (img.caption) {
      zip.file(names.caption, img.caption);
    }
  });

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${sanitizeArchiveName(project.name)}_${timestamp}.zip`);
};

export const downloadSingleText = (image: TagImage) => {
  if (!image.caption) return;

  const fileNameWithoutExt = image.file.name.substring(0, image.file.name.lastIndexOf('.')) || image.file.name;
  const textFileName = `${fileNameWithoutExt}.txt`;

  const blob = new Blob([image.caption], { type: "text/plain;charset=utf-8" });
  saveAs(blob, textFileName);
};
