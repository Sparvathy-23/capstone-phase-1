/**
 * config.ts
 * ------------------------------------------------------------------
 * Single place to point the app at your backend. Change this to
 * wherever `uvicorn app.main:app` is actually reachable from your
 * phone/emulator:
 *
 *  - Android emulator talking to a backend running on your own
 *    laptop: use 10.0.2.2 (Android's special alias for "the host
 *    machine"), e.g. "http://10.0.2.2:8000"
 *  - Real phone on the same Wi-Fi as your laptop: use your laptop's
 *    LAN IP, e.g. "http://192.168.1.23:8000"
 *  - Deployed backend (Render/Railway/etc.): use its https:// URL
 * ------------------------------------------------------------------
 */
export const BACKEND_URL = "http://localhost:8000";
