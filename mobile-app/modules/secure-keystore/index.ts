import { requireNativeModule } from "expo-modules-core";

const SecureKeystore = requireNativeModule("SecureKeystore");

/** Public key of the app's signing keypair (creates it in Android Keystore on first call). */
export function getOrCreatePublicKey(): Promise<string> {
  return SecureKeystore.getOrCreatePublicKey();
}

/** Signs a hex-encoded hash with the Keystore-protected private key. Returns a base64 signature. */
export function signHash(hashHex: string): Promise<string> {
  return SecureKeystore.signHash(hashHex);
}
