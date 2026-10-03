/**
 * deviceId.ts
 * ------------------------------------------------------------------
 * Every capture needs a stable device identifier so the backend/
 * blockchain can tell "these 12 photos all came from the same
 * device" apart from "each came from a different one".
 *
 * We don't need anything from the OS for this - just generate a
 * random UUID the first time the app runs, and persist it in
 * app-private storage so every future capture reuses the same id.
 * ------------------------------------------------------------------
 */
import * as FileSystem from "expo-file-system/legacy";
import * as Crypto from "expo-crypto";

const DEVICE_ID_FILE = `${FileSystem.documentDirectory}device_id.txt`;

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  const info = await FileSystem.getInfoAsync(DEVICE_ID_FILE);
  if (info.exists) {
    cachedDeviceId = (await FileSystem.readAsStringAsync(DEVICE_ID_FILE)).trim();
    return cachedDeviceId;
  }

  const newId = Crypto.randomUUID();
  await FileSystem.writeAsStringAsync(DEVICE_ID_FILE, newId);
  cachedDeviceId = newId;
  return newId;
}
