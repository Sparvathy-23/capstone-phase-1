/**
 * export.ts
 * ------------------------------------------------------------------
 * The manual "get the original file out of the app" option, as an
 * alternative/companion to auto-uploading via api.ts. Uses the OS
 * share sheet via expo-sharing - as long as the user picks a
 * byte-safe destination ("Save to Files", Drive, etc. - not a
 * messaging app that recompresses images), the exported file hashes
 * identically to the one recorded at capture time.
 *
 * Requires: npx expo install expo-sharing
 * ------------------------------------------------------------------
 */
import * as Sharing from "expo-sharing";

export async function exportOriginalPhoto(savedPath: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(savedPath, {
    mimeType: "image/jpeg",
    dialogTitle: "Export original secured photo",
  });
}
