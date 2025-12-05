import JSZip from 'jszip';
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
        saveAs(blob, `lora_dataset_full_${timestamp}.zip`);
        worker.terminate();
        resolve();
      } else if (type === 'ERROR') {
        console.error("Export failed:", error);
        alert("Export failed: " + error);
        worker.terminate();
        reject(error);
      }
    };

    worker.onerror = (e) => {
      console.error("Worker error:", e);
      worker.terminate();
      reject(e);
    };

    // Send data
    worker.postMessage({ type: 'EXPORT_ALL', data: { projects, format } });
  });
};

// Export a single project as a flat ZIP
export const exportProjectToZip = async (project: Project) => {
  const zip = new JSZip();
  const timestamp = new Date().toISOString().slice(0, 10);

  project.images.forEach((img) => {
    // Add original image file
    zip.file(img.file.name, img.file);

    // Add caption file if exists
    if (img.caption) {
      const fileNameWithoutExt = img.file.name.substring(0, img.file.name.lastIndexOf('.')) || img.file.name;
      const textFileName = `${fileNameWithoutExt}.txt`;
      zip.file(textFileName, img.caption);
    }
  });

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${project.name}_${timestamp}.zip`);
};

export const downloadSingleText = (image: TagImage) => {
  if (!image.caption) return;

  const fileNameWithoutExt = image.file.name.substring(0, image.file.name.lastIndexOf('.')) || image.file.name;
  const textFileName = `${fileNameWithoutExt}.txt`;

  const blob = new Blob([image.caption], { type: "text/plain;charset=utf-8" });
  saveAs(blob, textFileName);
};
