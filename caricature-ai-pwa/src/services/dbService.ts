import { HistoryItem } from "../types";

const DB_NAME = 'CaricatureAI_DB';
const STORE_NAME = 'history';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const saveHistoryItem = async (item: HistoryItem): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    
    // Cleanup old items to keep DB size reasonable (limit to 20 items)
    transaction.oncomplete = () => {
      limitHistorySize();
    };
  });
};

const limitHistorySize = async () => {
    try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getAllKeysRequest = store.getAllKeys();
        
        getAllKeysRequest.onsuccess = () => {
            const keys = getAllKeysRequest.result;
            if (keys.length > 20) {
                // Delete oldest keys (assuming IDs are timestamps or sortable)
                // Since we use Date.now() as ID strings, they sort correctly roughly, 
                // but strictly we should check timestamps. For simplicity, we just delete the excess count.
                // A better approach would be to use an index on timestamp, but let's keep it simple.
                // We will delete the first (oldest inserted usually) ones.
                const keysToDelete = keys.slice(0, keys.length - 20);
                keysToDelete.forEach(key => {
                    store.delete(key);
                });
            }
        };
    } catch (e) {
        console.error("Error cleaning up DB", e);
    }
}

export const getHistoryItems = async (): Promise<HistoryItem[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by timestamp desc
      const items = request.result as HistoryItem[];
      items.sort((a, b) => b.timestamp - a.timestamp);
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
};
