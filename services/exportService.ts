
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { TagImage, Project } from '../types';

// Export all projects into a single ZIP with folder structure
export const exportAllProjectsToZip = async (projects: Project[]) => {
  const zip = new JSZip();
  const timestamp = new Date().toISOString().slice(0, 10);
  let hasContent = false;

  projects.forEach((project) => {
    if (project.images.length === 0) return;
    
    // Create a folder for the project
    const folder = zip.folder(project.name);
    if (!folder) return;

    project.images.forEach((img) => {
      hasContent = true;
      // Add original image file
      folder.file(img.file.name, img.file);

      // Add caption file if exists
      if (img.caption) {
        const fileNameWithoutExt = img.file.name.substring(0, img.file.name.lastIndexOf('.')) || img.file.name;
        const textFileName = `${fileNameWithoutExt}.txt`;
        folder.file(textFileName, img.caption);
      }
    });
  });

  if (!hasContent) return;

  // Generate and save
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `lora_dataset_full_${timestamp}.zip`);
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
