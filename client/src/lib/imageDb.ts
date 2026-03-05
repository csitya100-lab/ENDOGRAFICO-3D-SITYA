/**
 * IndexedDB storage layer for large image data (base64 strings).
 * Replaces sessionStorage to avoid the 5-10MB quota limit.
 *
 * Each image is stored as a separate entry keyed by a string key.
 * This allows the Zustand store to keep only lightweight metadata
 * in sessionStorage while large base64 data lives in IndexedDB.
 */

const DB_NAME = 'EndoMapperImagesDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            dbPromise = null;
            reject(request.error);
        };

        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });

    return dbPromise;
}

/** Store a base64 image string by key */
export async function putImage(key: string, data: string): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(data, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.warn('[imageDb] Failed to store image:', key, e);
    }
}

/** Retrieve a base64 image string by key, returns empty string if not found */
export async function getImage(key: string): Promise<string> {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(key);
            request.onsuccess = () => resolve((request.result as string) || '');
            request.onerror = () => resolve('');
        });
    } catch {
        return '';
    }
}

/** Delete a single image by key */
export async function deleteImage(key: string): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch {
        // silently fail
    }
}

/** Delete multiple images by key prefix (e.g. 'draft2d_' or 'pdf_') */
export async function deleteImagesByPrefix(prefix: string): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.openCursor();
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    if (typeof cursor.key === 'string' && cursor.key.startsWith(prefix)) {
                        cursor.delete();
                    }
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = () => resolve();
        });
    } catch {
        // silently fail
    }
}

/** Get all images whose keys start with a given prefix */
export async function getImagesByPrefix(prefix: string): Promise<Record<string, string>> {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const result: Record<string, string> = {};
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.openCursor();
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    if (typeof cursor.key === 'string' && cursor.key.startsWith(prefix)) {
                        result[cursor.key] = cursor.value as string;
                    }
                    cursor.continue();
                } else {
                    resolve(result);
                }
            };
            request.onerror = () => resolve({});
        });
    } catch {
        return {};
    }
}
