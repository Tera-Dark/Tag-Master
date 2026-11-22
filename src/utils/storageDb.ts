import { Project } from '../types/prompt';

const DB_NAME = 'tag_master_studio_db';
const DB_VERSION = 1;
const STORE_NAME = 'workspace';
const PROJECTS_KEY = 'projects_v1';
const LEGACY_LS_KEY = 'tag_master_v3_projects';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });
}

export async function loadProjectsFromDb(): Promise<Project[] | null> {
  try {
    const db = await openDb();
    const data = await new Promise<Project[] | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(PROJECTS_KEY);
      getReq.onsuccess = () => {
        const val = getReq.result;
        resolve(Array.isArray(val) && val.length > 0 ? (val as Project[]) : null);
      };
      getReq.onerror = () => reject(getReq.error);
    });
    db.close();

    if (data) return data;

    // Seamless one-time migration from legacy localStorage if present
    try {
      const legacy = localStorage.getItem(LEGACY_LS_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy) as Project[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          await saveProjectsToDb(parsed);
          localStorage.removeItem(LEGACY_LS_KEY);
          return parsed;
        }
      }
    } catch {
      // ignore legacy parse error
    }
    return null;
  } catch {
    // Fallback to localStorage if IndexedDB is blocked (e.g. strict sandbox)
    try {
      const raw = localStorage.getItem(LEGACY_LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Project[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  }
}

export async function saveProjectsToDb(projects: Project[]): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putReq = store.put(projects, PROJECTS_KEY);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });
    db.close();
  } catch {
    try {
      localStorage.setItem(LEGACY_LS_KEY, JSON.stringify(projects));
    } catch {
      // Ignore storage quota errors in restricted environments
    }
  }
}
