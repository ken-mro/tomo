// Tiny IndexedDB wrapper for the single binary blob we persist: the user's
// uploaded custom alarm sound. A whole library would be overkill for one key.
const DB_NAME = 'tomo'
const STORE = 'sounds'
const CUSTOM_KEY = 'customSound'

interface CustomSound {
  blob: Blob
  name: string
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode)
        const req = run(transaction.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        // Close the connection once the transaction settles, so a future
        // schema upgrade (version bump) is never blocked by a lingering handle.
        transaction.oncomplete = () => db.close()
        transaction.onabort = () => db.close()
      }),
  )
}

export async function saveCustomSound(blob: Blob, name: string): Promise<void> {
  const value: CustomSound = { blob, name }
  await tx('readwrite', (s) => s.put(value, CUSTOM_KEY))
}

export async function loadCustomSound(): Promise<CustomSound | null> {
  try {
    const value = await tx<CustomSound | undefined>('readonly', (s) => s.get(CUSTOM_KEY))
    return value ?? null
  } catch {
    return null
  }
}

export async function clearCustomSound(): Promise<void> {
  await tx('readwrite', (s) => s.delete(CUSTOM_KEY))
}
