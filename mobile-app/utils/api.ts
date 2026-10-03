/**
 * api.ts
 * ------------------------------------------------------------------
 * Talks to the FastAPI backend (see backend/app/routers/captures.py).
 * This is the piece that actually gets the original photo out of
 * app-private storage and somewhere it can later be checked for
 * authenticity - the "own backend" approach discussed instead of
 * Google Drive, so there's no OAuth setup required to try this out.
 * ------------------------------------------------------------------
 */
import { BACKEND_URL } from "../config";
import type { SecureCaptureResult } from "./secureCapture";
import { getDeviceId } from "./deviceId";

export interface UploadCaptureResult {
  id: string;
  photo_hash: string;
  is_on_chain: boolean;
  blockchain_tx_hash: string | null;
}

export class UploadError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Uploads the original photo (from savedPath, untouched app-private
 * storage) together with the hash/signature/publicKey/timestamp the
 * app already generated in secureCapture(). The backend independently
 * re-hashes the uploaded bytes and rejects anything that doesn't
 * match - see routers/captures.py.
 */
export async function uploadCapture(
  savedPath: string,
  secureResult: SecureCaptureResult,
  filename: string
): Promise<UploadCaptureResult> {
  const deviceId = await getDeviceId();

  const form = new FormData();
  form.append("hash", secureResult.hash);
  form.append("signature", secureResult.signature);
  form.append("publicKey", secureResult.publicKey);
  form.append("timestamp", secureResult.timestamp);
  form.append("deviceId", deviceId);
  // React Native's fetch/FormData accepts this {uri, name, type}
  // shape for file parts - it streams the file directly from disk,
  // it does not decode/re-encode the image.
  form.append("photo", {
    uri: savedPath,
    name: filename,
    type: "image/jpeg",
  } as unknown as Blob);

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/captures`, {
      method: "POST",
      body: form,
      headers: {
        // Let fetch set its own multipart boundary - do NOT set
        // Content-Type manually here, or the boundary will be wrong
        // and the backend won't be able to parse the form.
        Accept: "application/json",
      },
    });
  } catch (err) {
    throw new UploadError(
      `Could not reach the backend at ${BACKEND_URL}. Is it running, and is the ` +
        `device on the same network? (${(err as Error).message})`
    );
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new UploadError(body?.detail ?? `Upload failed (${response.status})`, response.status);
  }

  return body as UploadCaptureResult;
}
