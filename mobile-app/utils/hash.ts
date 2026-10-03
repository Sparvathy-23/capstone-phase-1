import { File } from "expo-file-system";
import * as Crypto from "expo-crypto";

/**
 * Generates a SHA-256 hash from the exact bytes of an image file.
 *
 * @param imagePath - Absolute file URI of the confirmed image
 * @returns SHA-256 hash as a lowercase hexadecimal string
 */
export async function generateHash(imagePath: string): Promise<string> {
  // Create a reference to the saved image
  const file = new File(imagePath);

  // Read the ORIGINAL file bytes
  const bytes = await file.bytes();

  // Calculate SHA-256 from those bytes
  const digest = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    bytes
  );

  // Convert the resulting bytes to hexadecimal
  const hashArray = Array.from(new Uint8Array(digest));

  const hash = hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return hash;
}