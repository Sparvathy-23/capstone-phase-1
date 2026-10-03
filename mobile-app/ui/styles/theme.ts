/**
 * theme.ts
 */
export const colors = {
  ink: "#12151C",
  inkRaised: "#1B2029",
  paper: "#F1EEE6",
  muted: "#8A94A6",
  hairline: "#2A3040",
  seal: "#C9A24B",
  sealDim: "#C9A24B33",
  verified: "#7BAE93",
  danger: "#C97757",
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
};

export const spacing = {
  xs: 6,
  sm: 12,
  md: 20,
  lg: 28,
};

/**
 * Font notes:
 * The prototype used "Fraunces" for headings and "IBM Plex Mono" for
 * hash/signature values. To match exactly, install:
 *   npx expo install @expo-google-fonts/fraunces @expo-google-fonts/ibm-plex-mono expo-font
 * and load them in App.tsx with useFonts() before rendering.
 *
 * To keep this drop-in with zero new dependencies, these screens use
 * the system font with heavier weights for headings, and the built-in
 * "monospace" family (already used in your original CapturedScreen)
 * for hash/signature/key values.
 */
export const fonts = {
  heading: undefined as string | undefined, // swap to 'Fraunces_500Medium' once loaded
  mono: "monospace",
};
