import JSZip from 'jszip';

self.onmessage = async (e: MessageEvent) => {
    const { type, data } = e.data;

    if (type === 'EXPORT_ALL') {
        try {
            const zip = new JSZip();
            const projects = data.projects;
            let hasContent = false;

            for (const project of projects) {
                if (project.images.length === 0) continue;

                const folder = zip.folder(project.name);
                if (!folder) continue;

                for (const img of project.images) {
                    hasContent = true;
                    // Add original image file
                    folder.file(img.file.name, img.file);

                    // Add caption file if exists
                    if (img.caption) {
                        const fileNameWithoutExt = img.file.name.substring(0, img.file.name.lastIndexOf('.')) || img.file.name;

                        if (data.format === 'json') {
                            const jsonContent = JSON.stringify({ tags: img.caption }, null, 2);
                            folder.file(`${fileNameWithoutExt}.json`, jsonContent);
                        } else {
                            // Default to txt
                            folder.file(`${fileNameWithoutExt}.txt`, img.caption);
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
