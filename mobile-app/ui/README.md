# Verifi — Restyled Screens (drop-in for the existing backend project)

This applies the UI/UX design to your **existing, working** app —
nothing about the camera, hashing, storage, or Keystore signing logic
was changed. Only JSX structure and styling.

## How to apply

1. Copy `styles/theme.ts` into your project's `styles/` folder (new
   folder — doesn't exist yet in your project).
2. Replace these four files with the versions here:
   - `screens/HomeScreen.tsx`
   - `screens/CameraScreen.tsx`
   - `screens/PreviewScreen.tsx`
   - `screens/CapturedScreen.tsx`

That's it — no new dependencies, no changes to `App.tsx`, `types.ts`,
`utils/`, or `modules/secure-keystore/`.

## What changed in each file

| File | Logic | Visuals |
|---|---|---|
| `HomeScreen.tsx` | Untouched | Dark theme, brand mark, ledger line |
| `CameraScreen.tsx` | Untouched (permission flow, torch, flip, capture) | Dark permission screen, corner frame guides, restyled controls |
| `PreviewScreen.tsx` | Untouched (retake/confirm/save) | Dark theme, rounded image frame |
| `CapturedScreen.tsx` | **Re-sequenced, not changed** — see below | Step-list while processing, sealed result card once done |

## Why `CapturedScreen.tsx` needed more than a restyle

Your original screen called the bundled `secureCapture(imagePath)`
wrapper as one `await`, so the UI only knew "processing" vs "done" —
there was no way to show three separate checkmarks from one atomic
call. The prototype's three-step list needed real checkpoints, so this
version calls the same three functions your wrapper already
calls — `generateHash`, `getOrCreatePublicKey`, `signHash` — directly
and in the same order, updating the UI after each one resolves.

**The output is identical** — same hash, same signature, same public
key, produced by the same functions in the same sequence. `secureCapture()`
in `utils/secureCapture.ts` is untouched and still works if you use it
elsewhere; this screen just calls its ingredients individually to
drive honest per-step UI.

## Fonts (optional)

The prototype used "Fraunces" for headings and "IBM Plex Mono" for
hash values. To match exactly:

```bash
npx expo install @expo-google-fonts/fraunces @expo-google-fonts/ibm-plex-mono expo-font
```

Then load them with `useFonts()` in `App.tsx` and set
`fonts.heading` in `styles/theme.ts` to `'Fraunces_500Medium'`.
Without this, headings just use the system font at a heavier weight —
fully functional, just not pixel-identical to the mockup.

## Test this on a real device

Camera and Keystore signing don't work in most simulators — same as
your original README says. Use Expo Go (or your dev client, if the
native `secure-keystore` module needs one) on a physical Android
device.
