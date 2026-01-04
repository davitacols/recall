const DB_NAME = 'RecallDB';
const DB_VERSION = 1;

let db = null;

const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      if (!database.objectStoreNames.contains('conversations')) {
        database.createObjectStore('conversations', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('decisions')) {
        database.createObjectStore('decisions', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('replies')) {
        database.createObjectStore('replies', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('cache')) {
        database.createObjectStore('cache', { keyPath: 'key' });
      }
    };
  });
};

export const saveToCache = async (storeName, data) => {
  try {
    const database = await initDB();
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    if (Array.isArray(data)) {
      data.forEach(item => store.put(item));
    } else {
      store.put(data);
    }
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Failed to save to cache:', error);
  }
};

export const getFromCache = async (storeName, id) => {
  try {
    const database = await initDB();
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (error) {
    console.error('Failed to get from cache:', error);
    return null;
  }
};

export const getAllFromCache = async (storeName) => {
  try {
    const database = await initDB();
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (error) {
    console.error('Failed to get all from cache:', error);
    return [];
  }
};

export const clearCache = async (storeName) => {
  try {
    const database = await initDB();
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
};

export const cacheAPIResponse = async (key, data, ttl = 3600000) => {
  try {
    const database = await initDB();
    const tx = database.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    
    store.put({
      key,
      data,
      timestamp: Date.now(),
      ttl
    });
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Failed to cache API response:', error);
  }
};

export const getCachedAPIResponse = async (key) => {
  try {
    const database = await initDB();
    const tx = database.transaction('cache', 'readonly');
    const store = tx.objectStore('cache');
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result && Date.now() - result.timestamp < result.ttl) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
    });
  } catch (error) {
    console.error('Failed to get cached API response:', error);
    return null;
  }
};

export default {
  initDB,
  saveToCache,
  getFromCache,
  getAllFromCache,
  clearCache,
  cacheAPIResponse,
  getCachedAPIResponse
};
