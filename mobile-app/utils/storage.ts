/**
 * storage.ts
 * ------------------------------------------------------------------
 * Person 2's responsibility: once the user CONFIRMS a photo, copy the
 * original captured file into the app's private storage, unchanged,
 * and hand back a stable file path.
 *
 * IMPORTANT: the file must stay byte-for-byte identical after this
 * point, because Person 3 will calculate a SHA-256 hash from this
 * exact file. Never re-compress, re-encode, or edit it here.
 * ------------------------------------------------------------------
 */
import * as FileSystem from "expo-file-system/legacy";

// Dedicated folder inside the app's private document directory.
// Android/iOS both give every app its own private sandboxed storage
// automatically - no extra setup or permissions needed for this.
const CAPTURES_DIR = `${FileSystem.documentDirectory}captures/`;

/** Make sure the captures/ folder exists before we try to write into it. */
async function ensureCapturesDirExists(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(CAPTURES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CAPTURES_DIR, { intermediates: true });
  }
}

/**
 * Returns the next available filename, e.g. photo_001.jpg, photo_002.jpg...
 * so confirmed captures don't overwrite each other.
 */
async function getNextPhotoFilename(): Promise<string> {
  await ensureCapturesDirExists();
  const existing = await FileSystem.readDirectoryAsync(CAPTURES_DIR);
  const photoNumbers = existing
    .map((name) => name.match(/^photo_(\d+)\.jpg$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => parseInt(match[1], 10));

  const nextNumber = (photoNumbers.length > 0 ? Math.max(...photoNumbers) : 0) + 1;
  return `photo_${String(nextNumber).padStart(3, "0")}.jpg`;
}

export interface SavedCapture {
  /** Final absolute path of the saved, untouched original image. */
  path: string;
  /** Just the filename, e.g. "photo_001.jpg" */
  filename: string;
  /** ISO timestamp of when it was saved (capture confirmation time). */
  savedAt: string;
}

/**
 * Copies the temporary captured photo (tempUri, coming straight from the
 * camera) into permanent app-private storage. This is the function
 * Person 2 exposes to the rest of the Confirm flow.
 *
 * The returned `path` is what gets handed off to Person 3 & 4's
 * secureCapture(imagePath) function.
 */
export async function saveCapturedImage(tempUri: string): Promise<SavedCapture> {
  await ensureCapturesDirExists();
  const filename = await getNextPhotoFilename();
  const destinationPath = `${CAPTURES_DIR}${filename}`;

  // Copy (not move) so we never risk corrupting/losing the original
  // if something goes wrong mid-write.
  await FileSystem.copyAsync({
    from: tempUri,
    to: destinationPath,
  });

  return {
    path: destinationPath,
    filename,
    savedAt: new Date().toISOString(),
  };
}

/** Utility for Person 6 (testing): list all confirmed captures currently stored. */
export async function listSavedCaptures(): Promise<string[]> {
  await ensureCapturesDirExists();
  const files = await FileSystem.readDirectoryAsync(CAPTURES_DIR);
  return files.map((f) => `${CAPTURES_DIR}${f}`);
}
