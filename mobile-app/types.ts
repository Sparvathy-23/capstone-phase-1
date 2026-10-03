export type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  // tempUri is the raw file straight from the camera, before it's confirmed/saved
  Preview: { tempUri: string };
  // savedPath is the final app-private storage path, ready to hand off
  // to Person 3 & 4's secureCapture(imagePath)
  Captured: { savedPath: string; filename: string };
};
