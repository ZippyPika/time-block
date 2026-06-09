import type { BackupPayload, TimeBlock } from './types'

const DB_NAME = 'time-block-pwa'
const DB_VERSION = 1
const STORE_NAME = 'blocks'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('date', 'date', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function runStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode)
        const store = transaction.objectStore(STORE_NAME)
        const request = action(store)

        transaction.oncomplete = () => {
          db.close()
          resolve(request ? request.result : undefined)
        }
        transaction.onerror = () => {
          db.close()
          reject(transaction.error)
        }
      }),
  )
}

export async function loadBlocks(): Promise<TimeBlock[]> {
  const blocks = await runStore<TimeBlock[]>('readonly', (store) =>
    store.getAll(),
  )
  return (blocks ?? []).sort(
    (a, b) => a.date.localeCompare(b.date) || a.startSlot - b.startSlot,
  )
}

export async function saveBlock(block: TimeBlock): Promise<void> {
  await runStore('readwrite', (store) => store.put(block))
}

export async function deleteBlock(id: string): Promise<void> {
  await runStore('readwrite', (store) => store.delete(id))
}

export async function replaceBlocks(blocks: TimeBlock[]): Promise<void> {
  await openDatabase().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        store.clear()
        blocks.forEach((block) => store.put(block))
        transaction.oncomplete = () => {
          db.close()
          resolve()
        }
        transaction.onerror = () => {
          db.close()
          reject(transaction.error)
        }
      }),
  )
}

export async function clearBlocks(): Promise<void> {
  await runStore('readwrite', (store) => store.clear())
}

export function makeBackup(blocks: TimeBlock[]): BackupPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    blocks,
  }
}

export function parseBackup(text: string): TimeBlock[] {
  const parsed = JSON.parse(text) as Partial<BackupPayload>
  if (parsed.version !== 1 || !Array.isArray(parsed.blocks)) {
    throw new Error('备份文件格式不正确')
  }

  return parsed.blocks.map((block) => {
    if (
      typeof block.id !== 'string' ||
      typeof block.date !== 'string' ||
      typeof block.startSlot !== 'number' ||
      typeof block.slotCount !== 'number' ||
      typeof block.category !== 'string' ||
      typeof block.label !== 'string'
    ) {
      throw new Error('备份中存在无法识别的记录')
    }

    return block
  })
}
