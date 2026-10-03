/**
 * CameraScreen.tsx
 * ------------------------------------------------------------------
 *  - Ask for camera permission
 *  - Show the live camera preview
 *  - Let the user switch front/rear camera
 *  - Let the user toggle flash
 *  - Capture button -> takes the photo -> hands the temp file off
 *    to the Preview screen
 * ------------------------------------------------------------------
 */
import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import { colors, radius, fonts } from "../styles/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Camera">;

export default function CameraScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [torchOn, setTorchOn] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // --- Permission states -------------------------------------------------
  if (!permission) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.infoText}>Checking camera permission…</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.permissionHeading}>Camera Access Needed</Text>
        <Text style={styles.infoText}>
          Provenance needs camera access to capture and secure a photo.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- Actions -------------------------------------------------------
  function toggleFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  function toggleTorch() {
    setTorchOn((current) => !current);
  }

  async function handleCapture() {
    if (!cameraRef.current || isCapturing) return;
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1, // keep full quality - don't compress before hashing later
      });
      if (photo?.uri) {
        navigation.navigate("Preview", { tempUri: photo.uri });
      }
    } catch (error) {
      console.error("Failed to capture photo:", error);
    } finally {
      setIsCapturing(false);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        enableTorch={torchOn}
      />

      {/* Corner frame guides, matching the prototype's viewfinder treatment */}
      <View pointerEvents="none" style={styles.frameCorners}>
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
      </View>

      <SafeAreaView style={styles.topOverlay}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <SafeAreaView style={styles.controlsOverlay}>
        <View style={styles.bottomControls}>
          <View style={styles.bottomRow}>
            <TouchableOpacity
              style={[styles.iconButton, torchOn && styles.iconButtonActive]}
              onPress={toggleTorch}
            >
              <Text style={[styles.iconButtonText, torchOn && styles.iconButtonTextActive]}>
                {torchOn ? "Flash: On" : "Flash: Off"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleCapture}
              disabled={isCapturing}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton} onPress={toggleFacing}>
              <Text style={styles.iconButtonText}>Flip Camera</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const CORNER_SIZE = 20;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  camera: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
    backgroundColor: colors.ink,
  },
  permissionHeading: {
    fontFamily: fonts.heading,
    fontSize: 20,
    fontWeight: "700",
    color: colors.paper,
    marginBottom: 10,
  },
  infoText: {
    textAlign: "center",
    fontSize: 14.5,
    color: colors.muted,
    lineHeight: 21,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: colors.seal,
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: radius.md,
  },
  primaryButtonText: { color: colors.ink, fontWeight: "700", fontSize: 15 },

  frameCorners: {
    position: "absolute",
    top: 90,
    left: 24,
    right: 24,
    bottom: 150,
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.seal,
    opacity: 0.85,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 6 },

  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
    marginTop: 8,
  },
  closeButtonText: { color: colors.paper, fontSize: 15 },

  controlsOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomControls: {
    paddingBottom: 20,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  iconButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    minWidth: 88,
    alignItems: "center",
  },
  iconButtonActive: {
    backgroundColor: colors.seal,
  },
  iconButtonText: { color: colors.paper, fontSize: 13, fontWeight: "500" },
  iconButtonTextActive: { color: colors.ink },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.paper,
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.paper,
  },
});
