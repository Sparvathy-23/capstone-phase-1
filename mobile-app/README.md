# Secure Capture Prototype — Camera Team (Person 1 & 2)

This is the camera + capture + storage portion of the mobile prototype.
Scope: Home → Camera → Preview (Retake/Confirm) → save to app-private
storage → hand off the file path. No hashing, signing, blockchain,
backend, or AI is implemented here — that's Person 3/4/5/6's territory.

## Setup

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android/iOS) to run it on a real
phone — the camera won't work in most simulators, so test on a real
device early.

## File map

| File | Owner | Responsibility |
|---|---|---|
| `screens/HomeScreen.tsx` | — | Entry point, "Take Photo" button |
| `screens/CameraScreen.tsx` | **Person 1** | Permissions, live preview, front/rear switch, flash, capture button |
| `screens/PreviewScreen.tsx` | **Person 2** | Shows captured photo, Retake / Confirm |
| `utils/storage.ts` | **Person 2** | Saves the confirmed photo into app-private storage as `photo_001.jpg`, etc. |
| `screens/CapturedScreen.tsx` | handoff stub | Shows the saved path — this is where Person 3 & 4's `secureCapture(imagePath)` plugs in next |
| `types.ts` | — | Shared navigation types |

## How it works

1. **CameraScreen** asks for camera permission, shows the live preview,
   and lets the user flip the camera / toggle flash. Tapping the
   shutter button calls `takePictureAsync()` and navigates to
   `Preview` with the temporary file URI.
2. **PreviewScreen** shows that photo full-screen.
   - **Retake** discards it and goes back to the camera.
   - **Confirm** calls `saveCapturedImage()` from `utils/storage.ts`,
     which copies the *original, untouched* file into
     `FileSystem.documentDirectory/captures/` and returns its final
     path + filename.
3. **CapturedScreen** just displays that saved path/filename as proof
   the handoff works. In the full app, this is where you'll call
   Person 3 & 4's `secureCapture(imagePath)` and forward its result
   (hash, signature, public key, timestamp) to Person 5's UI screens.

## Important: don't touch the file after capture

The image is copied via `FileSystem.copyAsync` — never re-encoded or
compressed — because Person 3 hashes this exact file with SHA-256.
Any modification (even re-saving through an image library) will
change the hash and break verification.

## Handoff contract for Person 3 & 4

You'll receive a single string: the absolute path to the saved image
(e.g. `.../captures/photo_001.jpg`). That's the only input your
`secureCapture(imagePath)` function needs from this side.

## Next steps (not yet built here)

- Wire `CapturedScreen` to call `secureCapture(imagePath)` once
  Person 3 & 4 have it ready.
- Person 5 can restyle `HomeScreen` / `PreviewScreen` and replace
  `CapturedScreen` with the "Securing Capture" progress + result
  screens described in the team plan.
- Person 6: test permission-denied flow, retake flow, and confirm
  the same file produces the same hash across multiple runs once
  hashing is wired in.
