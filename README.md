# Content Authenticity Network — Full Stack (Phase 1 + Backend)

This is your Review 1 mobile prototype (capture → hash → Android
Keystore signature) extended with everything discussed for the next
phase: a backend that stores and verifies captures, a smart contract
that anchors hashes on-chain, and a simple web page to check a
photo's authenticity.

```
content-authenticity-network/
├── mobile-app/          Your existing Expo/React Native app, extended
│   ├── screens/CapturedScreen.tsx   (updated - upload/export buttons added)
│   ├── utils/api.ts                 (NEW - uploads a capture to the backend)
│   ├── utils/export.ts              (NEW - OS share-sheet export)
│   ├── utils/deviceId.ts            (NEW - persistent per-device id)
│   ├── config.ts                    (NEW - backend URL)
│   └── ...(hash.ts, secureCapture.ts, storage.ts, modules/secure-keystore unchanged)
├── backend/              FastAPI + SQLAlchemy (Person 3/4/5's work)
│   ├── app/
│   │   ├── main.py                  FastAPI app, CORS, health check
│   │   ├── models.py / schemas.py   DB table + request/response shapes
│   │   ├── crypto_verify.py         Person 4 - ECDSA signature verification
│   │   ├── storage.py               Original photo storage (local disk)
│   │   ├── blockchain.py            Person 6 - web3.py glue to the contract
│   │   └── routers/
│   │       ├── captures.py          POST /captures, GET /captures/{id}
│   │       └── verify.py            POST /verify
│   ├── requirements.txt
│   └── .env.example
├── blockchain/            Hardhat + Solidity (Person 2's contract)
│   ├── contracts/HashRegistry.sol
│   ├── scripts/deploy.js
│   ├── test/HashRegistry.test.js
│   ├── abi/HashRegistry.json        (also copied into backend/app/contract_abi.json)
│   └── .env.example
└── verify-portal/
    └── index.html          Open this in a browser to "upload a photo, check authenticity"
```

I already ran the backend end-to-end in a sandbox (simulating the
Keystore signature with an equivalent EC key, since I can't run
Android hardware here) — `POST /captures` correctly stores a valid
capture and rejects a tampered/mismatched one, and `POST /verify`
correctly confirms a matching photo and rejects a tampered one. The
Solidity contract compiles cleanly. What's left is wiring it up on
your machine and a real device, which is what this guide walks
through.

---

## 0. Prerequisites

- Node.js 18+ and npm (for the mobile app and blockchain/)
- Python 3.10+ (for the backend)
- An Android phone (or emulator) for the mobile app — Keystore
  signing needs the native Dev Client build, same as your Review 1 setup
- A free Infura or Alchemy account (for a testnet RPC URL) — only
  needed once you get to the blockchain step
- MetaMask (or any wallet) to create a **burner** test wallet — never
  use a wallet with real funds for this

---

## 1. Backend first (works with zero blockchain setup)

The backend runs standalone with `BLOCKCHAIN_ENABLED=false` — you can
build/test the whole capture → store → verify loop before touching
any blockchain step at all.

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # defaults work as-is for local dev

uvicorn app.main:app --reload --port 8000
```

Open **http://localhost:8000/docs** — this is an interactive Swagger
UI where you can manually try `POST /captures` and `POST /verify`
before the mobile app or web page ever call them.

Quick sanity check with curl (replace with a real image path):

```bash
curl http://localhost:8000/health
# {"status":"ok","blockchain_enabled":false}
```

---

## 2. Verify portal (the "website" from our discussion)

```bash
cd verify-portal
python3 -m http.server 5500       # or just double-click index.html
```

Open **http://localhost:5500**, make sure the "Backend" field points
at `http://localhost:8000`, upload a photo, and click **Check
Authenticity**. Until you've uploaded any captures from the mobile
app, this will correctly say "Not Verified — no matching record."

---

## 3. Mobile app — wire it to the backend

```bash
cd mobile-app
npm install
npx expo install expo-sharing     # new dependency for the Export button
```

Edit **`config.ts`** and set `BACKEND_URL` to wherever your backend is
reachable from the phone/emulator (see the comments in that file —
`10.0.2.2` for the Android emulator talking to your own laptop,
your laptop's LAN IP for a real phone on the same Wi-Fi).

Since the Keystore module is native code, you still need the Dev
Client build, same as Review 1:

```bash
npx expo run:android
```

Take a photo through the app as usual. On the "Photo Secured" screen
you'll now see two new buttons:
- **Upload for Verification** — sends the hash/signature/public
  key/timestamp plus the original photo bytes straight to your
  backend. On success it shows the capture ID and whether it's been
  anchored on-chain yet.
- **Export Original** — opens the OS share sheet so you can manually
  save the untouched file elsewhere (e.g. "Save to Files", then
  AirDrop/email it to your laptop) if you'd rather test the verify
  portal with a manually-transferred file instead of relying on the
  automatic upload.

---

## 4. End-to-end test (no blockchain yet)

1. Take a photo in the app → confirm → wait for hash/signature →
   tap **Upload for Verification** → should show "Uploaded - stored
   on backend as capture ...".
2. Also tap **Export Original** → share/save the file to your laptop.
3. Open the verify portal → upload that same exported file → should
   say **✅ Verified Authentic**.
4. Now edit that exported photo in any image editor (even just
   re-save it) and upload the edited version → should say
   **⚠️ Not Verified** — the hash no longer matches anything on record.

If step 3 fails with "Not Verified" even for an untouched export,
double check you exported/shared it through a byte-safe path (e.g.
"Save to Files") rather than something like WhatsApp, which
recompresses images before sending.

---

## 5. Blockchain — deploying HashRegistry and turning on anchoring

This is optional for local dev/testing (the backend works fine
without it), but it's the actual "Verified Capture" trust anchor your
capstone pitch is built around, so you'll want it live before your
next review.

### 5.1 Get a free testnet RPC URL

1. Create a free account at [infura.io](https://infura.io) or
   [alchemy.com](https://alchemy.com)
2. Create a new app/project, choose **Ethereum Sepolia** (or
   **Polygon Amoy** if you'd rather use Polygon, which your notes
   also mentioned)
3. Copy the HTTPS RPC URL it gives you

### 5.2 Create a burner wallet and get free test funds

1. Install the MetaMask browser extension, create a **new** wallet
   just for this project (do not reuse a personal wallet)
2. Export its private key (Account details → Show private key) —
   treat this like a password, never commit it or share it
3. Get free test ETH (Sepolia) or test MATIC (Amoy) from a faucet:
   - Sepolia: https://sepoliafaucet.com or https://www.alchemy.com/faucets/ethereum-sepolia
   - Polygon Amoy: https://faucet.polygon.technology

### 5.3 Deploy the contract

```bash
cd blockchain
npm install

cp .env.example .env
# edit .env:
#   SEPOLIA_RPC_URL=<the RPC URL from step 5.1>     (or AMOY_RPC_URL)
#   PRIVATE_KEY=<your burner wallet's private key>

npx hardhat compile
npx hardhat test          # runs the included tests against a local in-memory chain
npm run deploy:sepolia    # or: npm run deploy:amoy
```

This prints the deployed contract address — copy it.

> Note: compiling downloads the Solidity compiler from
> `binaries.soliditylang.org` the first time — this needs a normal
> internet connection (it's blocked in the sandbox I built this in,
> but will work fine on your own machine).

### 5.4 Turn on blockchain anchoring in the backend

Edit `backend/.env`:

```
BLOCKCHAIN_ENABLED=true
WEB3_RPC_URL=<same RPC URL as blockchain/.env>
CONTRACT_ADDRESS=<address printed by the deploy script>
BACKEND_WALLET_PRIVATE_KEY=<a burner wallet's private key - can be the same one>
```

Make sure this wallet also has a little test ETH/MATIC in it — it
pays gas for every `registerHash()` call.

Restart the backend:

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

`GET /health` should now show `"blockchain_enabled": true`. From
here, every new **Upload for Verification** from the app will also
write the hash on-chain, and the verify portal's result will include
`On-chain: yes` plus the transaction hash once that write confirms
(usually 10–30 seconds on a testnet).

### 5.5 Confirm it on a block explorer

Paste the transaction hash into:
- Sepolia: https://sepolia.etherscan.io
- Amoy: https://amoy.polygonscan.com

This is a good screenshot/demo moment for your review — showing the
actual on-chain transaction, not just a database row claiming it
happened.

---

## 6. What's intentionally not built yet

- **Google Drive integration** — not implemented. It needs a real
  Google Cloud OAuth client that only you can set up (I can't create
  one on your behalf). The backend's own storage (`app/storage.py`)
  covers the same underlying need — original bytes survive somewhere
  outside app-private storage — without that setup. If you still
  want Drive later, `storage.py` is the only file that would need to
  change; everything else (routers, mobile upload call) stays the same.
- **AI deepfake detection + LLM explanation ("AI-Assessed" tier)** —
  this is explicitly your Phase 2 work, after Review 2. The DB schema
  and `tier` field already have a place for it (`ai_assessed`), but no
  model or LLM call is wired in yet.
- **Web dashboard beyond the single verify page** — `verify-portal/`
  is deliberately minimal (upload → check → show result). A fuller
  dashboard (listing all captures, device management, etc.) would sit
  on top of the same `GET /captures` endpoint already in the backend.

---

## 7. Team split reminder (for reference)

- **Person 1** — Export/Drive: `utils/export.ts` (done), Drive is the
  optional future add-on described above
- **Person 2** — Smart contract: `blockchain/contracts/HashRegistry.sol`
- **Person 3** — DB + `/captures`: `backend/app/models.py`,
  `backend/app/routers/captures.py`
- **Person 4** — Signature verification: `backend/app/crypto_verify.py`
- **Person 5** — `/verify` + verification engine:
  `backend/app/routers/verify.py`, `verify-portal/`
- **Person 6** — Blockchain glue + integration testing:
  `backend/app/blockchain.py`, plus running through Section 4/5 above
  as an end-to-end test
