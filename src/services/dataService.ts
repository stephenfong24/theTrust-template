import { readStorage, writeStorage } from "./storageService";

const wait = () => new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 300));

export async function listRecords<T>(storageKey: string, initialRecords: T[]): Promise<T[]> {
  await wait();
  return readStorage<T[]>(storageKey, initialRecords);
}

export async function createRecord<T extends { id: string }>(storageKey: string, initialRecords: T[], record: T): Promise<T> {
  await wait();
  const records = readStorage<T[]>(storageKey, initialRecords);
  writeStorage(storageKey, [record, ...records]);
  return record;
}

export async function updateRecord<T extends { id: string }>(storageKey: string, initialRecords: T[], id: string, updates: Partial<T>): Promise<T> {
  await wait();
  const records = readStorage<T[]>(storageKey, initialRecords);
  const nextRecords = records.map((record) => (record.id === id ? { ...record, ...updates } : record));
  writeStorage(storageKey, nextRecords);
  const updated = nextRecords.find((record) => record.id === id);
  if (!updated) throw new Error("Record not found.");
  return updated;
}

export async function deleteRecord<T extends { id: string }>(storageKey: string, initialRecords: T[], id: string): Promise<void> {
  await wait();
  const records = readStorage<T[]>(storageKey, initialRecords);
  writeStorage(
    storageKey,
    records.filter((record) => record.id !== id)
  );
}
