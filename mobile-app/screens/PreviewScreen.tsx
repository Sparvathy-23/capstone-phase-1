/**
 * PreviewScreen.tsx
 * ------------------------------------------------------------------
 *  - Show the photo that was just captured
 *  - Retake -> discard it, go back to the camera
 *  - Confirm -> save the ORIGINAL, untouched file into app-private
 *    storage. 
 * ------------------------------------------------------------------
 */
import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import { saveCapturedImage } from "../utils/storage";
import { colors, radius, fonts } from "../styles/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Preview">;

export default function PreviewScreen({ route, navigation }: Props) {
  const { tempUri } = route.params;
  const [isSaving, setIsSaving] = useState(false);

  function handleRetake() {
    navigation.goBack();
  }

  async function handleConfirm() {
    try {
      setIsSaving(true);
      const saved = await saveCapturedImage(tempUri);
      navigation.replace("Captured", {
        savedPath: saved.path,
        filename: saved.filename,
      });
    } catch (error) {
      console.error("Failed to save confirmed photo:", error);
      Alert.alert(
        "Save failed",
        "Something went wrong saving this photo. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Review Photo</Text>
        <Text style={styles.subheading}>
          Nothing is hashed or signed yet — confirm to begin securing this capture.
        </Text>
      </View>

      <View style={styles.imageWrap}>
        <Image source={{ uri: tempUri }} style={styles.preview} resizeMode="cover" />
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, styles.retakeButton]}
          onPress={handleRetake}
          disabled={isSaving}
        >
          <Text style={styles.retakeText}>Retake</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.confirmButton]}
          onPress={handleConfirm}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <Text style={styles.confirmText}>Confirm</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, paddingHorizontal: 20 },
  header: { paddingTop: 12, paddingBottom: 16 },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 21,
    fontWeight: "700",
    color: colors.paper,
  },
  subheading: {
    fontSize: 12.5,
    color: colors.muted,
    marginTop: 6,
    lineHeight: 18,
  },
  imageWrap: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.inkRaised,
    marginBottom: 20,
  },
  preview: { width: "100%", height: "100%" },
  controls: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: "center",
  },
  retakeButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  confirmButton: { backgroundColor: colors.seal },
  retakeText: { color: colors.paper, fontWeight: "600", fontSize: 16 },
  confirmText: { color: colors.ink, fontWeight: "700", fontSize: 16 },
});
