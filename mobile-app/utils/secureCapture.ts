import { generateHash } from "./hash";
import { getOrCreatePublicKey, signHash } from "../modules/secure-keystore";

export interface SecureCaptureResult {
  hash: string;
  signature: string;
  publicKey: string;
  timestamp: string;
}

/**
 * Person 3 & 4's combined function: image path in, everything the rest
 * of the app needs out. Hashes the image, signs the hash via Android
 * Keystore, and returns hash + signature + public key + timestamp.
 */
export async function secureCapture(imagePath: string): Promise<SecureCaptureResult> {
  const hash = await generateHash(imagePath);
  const publicKey = await getOrCreatePublicKey();
  const signature = await signHash(hash);
  return { hash, signature, publicKey, timestamp: new Date().toISOString() };
}
