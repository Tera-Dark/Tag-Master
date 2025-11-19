
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Project } from '../types';

// We use IndexedDB because LocalStorage has a 5MB limit and cannot store Image Blobs efficiently.

interface LoraDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
  };
}

const DB_NAME = 'lora-tag-master-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<LoraDB>>;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<LoraDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const saveProjectsToDB = async (projects: Project[]) => {
  const db = await getDB();
  const tx = db.transaction('projects', 'readwrite');
  const store = tx.objectStore('projects');

  // 1. Clear existing data to ensure deletions are synced
  await store.clear();

  // 2. Prepare data for storage
  // Note: We do NOT strip previewUrl here because it's just a string. 
  // However, we must ensure 'file' is a Blob/File which IDB handles.
  // We wrap this in Promise.all to ensure transaction integrity.
  const savePromises = projects.map(project => {
    // Clone to avoid mutating state
    const pClone = { ...project };
    // Ensure we don't save the object URL string as it expires, 
    // but we keep the structure. When loading, we regenerate it.
    pClone.images = pClone.images.map(img => {
      const { previewUrl, ...rest } = img;
      return { ...rest, previewUrl: '' }; // Clear ephemeral URL
    });
    return store.put(pClone);
  });

  await Promise.all(savePromises);
  await tx.done;
};

export const loadProjectsFromDB = async (): Promise<Project[]> => {
  const db = await getDB();
  return await db.getAll('projects');
};

export const clearDB = async () => {
  const db = await getDB();
  await db.clear('projects');
};
