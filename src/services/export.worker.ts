import JSZip from 'jszip';
import { Project } from '../types';
import { archiveImageNames, uniqueArchiveName } from './exportNaming';

self.onmessage = async (e: MessageEvent) => {
    const { type, data } = e.data;

    if (type === 'EXPORT_ALL') {
        try {
            const zip = new JSZip();
            const projects: Project[] = data.projects;
            const usedFolders = new Set<string>();
            let hasContent = false;

            for (const project of projects) {
                if (project.images.length === 0) continue;

                const folder = zip.folder(uniqueArchiveName(project.name, usedFolders));
                if (!folder) continue;

                const usedNames = new Set<string>();
                for (const img of project.images) {
                    const names = archiveImageNames(img.file.name, data.format, usedNames);
                    hasContent = true;
                    // Add original image file
                    folder.file(names.image, img.file);

                    // Add caption file if exists
                    if (img.caption) {


                        if (data.format === 'json') {
                            const jsonContent = JSON.stringify({ tags: img.caption }, null, 2);
                            folder.file(names.caption, jsonContent);
                        } else {
                            // Default to txt
                            folder.file(names.caption, img.caption);
                        }
                    }
                }
            }

            if (!hasContent) {
                self.postMessage({ type: 'ERROR', error: 'No content to export' });
                return;
            }

            const content = await zip.generateAsync({ type: 'blob' });
            self.postMessage({ type: 'SUCCESS', blob: content });

        } catch (error) {
            self.postMessage({ type: 'ERROR', error: String(error) });
        }
    }
};
