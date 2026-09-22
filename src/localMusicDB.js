const DB_NAME = "SonicFlowDB";
const STORE_NAME = "localSongs";
const DB_VERSION = 2;

const openDB = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      db.onversionchange = () => {
        db.close();
      };

      resolve(db);
    };

    request.onerror = () => {
      reject(request.error || new Error("Unable to open local music storage."));
    };

    request.onblocked = () => {
      reject(new Error("Local music storage is blocked by another tab."));
    };
  });

const waitForTransaction = (transaction) =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () =>
      reject(transaction.error || new Error("Local music transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error || new Error("Local music transaction aborted."));
  });

const serializeSong = (song) => {
  const blob = song?.file instanceof Blob
    ? song.file
    : song?.blob instanceof Blob
      ? song.blob
      : null;

  if (!blob) {
    throw new Error("The selected file could not be stored.");
  }

  return {
    id: song.id,
    title: song.title,
    artist: song.artist || "Local Music",
    cover: song.cover || "🎵",
    blob,
    fileName: song.fileName || song.file?.name || song.title || "audio-file",
    mimeType: song.file?.type || blob.type || "audio/mpeg",
    lastModified: song.file?.lastModified || Date.now(),
    isLocal: true,
  };
};

const deserializeSong = (record) => {
  const blob = record?.blob ?? record?.file;

  if (!(blob instanceof Blob)) {
    return null;
  }

  const file = blob instanceof File
    ? blob
    : new File(
        [blob],
        record.fileName || record.title || "audio-file",
        {
          type: record.mimeType || blob.type || "audio/mpeg",
          lastModified: record.lastModified || Date.now(),
        }
      );

  return {
    id: record.id,
    title: record.title || record.fileName || "Local Track",
    artist: record.artist || "Local Music",
    cover: record.cover || "🎵",
    file,
    blob,
    fileName: record.fileName || file.name,
    mimeType: record.mimeType || file.type,
    lastModified: record.lastModified || file.lastModified,
    isLocal: true,
    url: URL.createObjectURL(file),
  };
};

export const requestPersistentStorage = async () => {
  try {
    if (!navigator.storage?.persist) {
      return false;
    }

    const alreadyPersisted = await navigator.storage.persisted?.();
    if (alreadyPersisted) {
      return true;
    }

    return await navigator.storage.persist();
  } catch (error) {
    console.warn("Persistent storage request failed:", error);
    return false;
  }
};

export const saveLocalSongs = async (songs) => {
  if (!Array.isArray(songs) || !songs.length) return;

  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);

  songs.forEach((song) => {
    store.put(serializeSong(song));
  });

  await waitForTransaction(transaction);
  db.close();
};

export const getLocalSongs = async () => {
  const db = await openDB();

  const records = await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Unable to read local music."));
  });

  db.close();

  return records.map(deserializeSong).filter(Boolean);
};

export const deleteLocalSong = async (id) => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).delete(id);

  await waitForTransaction(transaction);
  db.close();
};

export const clearLocalSongs = async () => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).clear();

  await waitForTransaction(transaction);
  db.close();
};
