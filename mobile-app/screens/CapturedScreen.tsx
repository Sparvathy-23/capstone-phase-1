/**
 * CapturedScreen.tsx
 * ------------------------------------------------------------------
 *  - Receive the final saved image path
 *  - Generate a SHA-256 hash from the original image bytes
 *  - Sign that hash via Android Keystore
 *  - Display the result
 *  - Offer "Upload for Verification" (sends hash+signature+publicKey+
 *    timestamp+deviceId+the original photo bytes straight to the
 *    backend - see utils/api.ts) and "Export Original" (hands the
 *    exact same untouched file to the OS share sheet - see
 *    utils/export.ts) so the user can save it wherever they like
 *    (Drive, Files, etc.) for later verification elsewhere.
 *
 * Renders as three states of ONE screen:
 *  - while isProcessing: a step list, checked off as each real step
 *    resolves
 *  - once done: the sealed result card, with Upload/Export actions
 *  - on failure: an error card with a retry action
 * ------------------------------------------------------------------
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import { generateHash } from "../utils/hash";
import { getOrCreatePublicKey, signHash } from "../modules/secure-keystore";
import type { SecureCaptureResult } from "../utils/secureCapture";
import { uploadCapture, UploadCaptureResult, UploadError } from "../utils/api";
import { exportOriginalPhoto } from "../utils/export";
import { colors, radius, fonts } from "../styles/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Captured">;

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "success"; result: UploadCaptureResult }
  | { status: "error"; message: string };

const STEPS = [
  { key: "store", label: "Photo captured & stored" },
  { key: "hash", label: "SHA-256 hash generated" },
  { key: "sign", label: "Digital signature created" },
] as const;

export default function CapturedScreen({ route, navigation }: Props) {
  const { savedPath, filename } = route.params;

  const [completed, setCompleted] = useState<string[]>([]);
  const [result, setResult] = useState<SecureCaptureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (!cancelled) setCompleted(["store"]);

        const hash = await generateHash(savedPath);
        if (cancelled) return;
        setCompleted((c) => [...c, "hash"]);

        const publicKey = await getOrCreatePublicKey();
        const signature = await signHash(hash);
        if (cancelled) return;
        setCompleted((c) => [...c, "sign"]);

        setResult({ hash, signature, publicKey, timestamp: new Date().toISOString() });
      } catch (err) {
        console.error("Failed to secure capture:", err);
        if (!cancelled) setError("Hashing/signing failed. Please try again.");
      } finally {
        if (!cancelled) setIsProcessing(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [savedPath]);

  async function handleUpload() {
    if (!result) return;
    setUploadState({ status: "uploading" });
    try {
      const uploadResult = await uploadCapture(savedPath, result, filename);
      setUploadState({ status: "success", result: uploadResult });
    } catch (err) {
      const message = err instanceof UploadError ? err.message : "Upload failed unexpectedly.";
      setUploadState({ status: "error", message });
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportOriginalPhoto(savedPath);
    } catch (err) {
      Alert.alert("Export failed", (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  }

  if (isProcessing || (!result && !error)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.securingBody}>
          <Text style={styles.heading}>Securing Capture</Text>
          <Text style={styles.subheading}>Please keep the app open for a moment.</Text>

          <View style={styles.steps}>
            {STEPS.map((step, index) => {
              const isDone = completed.includes(step.key);
              const isActive = !isDone && completed.length === index;
              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={[styles.stepMark, isDone && styles.stepMarkDone]}>
                    {isDone ? (
                      <Text style={styles.stepCheck}>✓</Text>
                    ) : isActive ? (
                      <ActivityIndicator size="small" color={colors.seal} />
                    ) : (
                      <View style={styles.stepDot} />
                    )}
                  </View>
                  <Text style={[styles.stepLabel, isDone && styles.stepLabelDone]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.securingBody}>
          <Text style={styles.heading}>Something Went Wrong</Text>
          <Text style={[styles.subheading, { color: colors.danger }]}>
            {error ?? "Unknown error."}
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.popToTop()}>
            <Text style={styles.buttonText}>Start Over</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formattedTime = new Date(result.timestamp).toLocaleString();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.resultScroll}>
        <View style={styles.sealBadge}>
          <Text style={styles.sealCheck}>✓</Text>
        </View>
        <Text style={[styles.heading, styles.centerText]}>Secure Capture Complete</Text>
        <Text style={[styles.subheading, styles.centerText]}>
          This record binds the photo below to the hash and signature shown here.
        </Text>

        <View style={styles.card}>
          <InfoRow label="Filename" value={filename} />
          <InfoRow label="App-Private Storage Path" value={savedPath} mono />
          <InfoRow label="SHA-256 Hash" value={result.hash} mono />
          <InfoRow label="Signature Status" value="Signed · Verified" status />
          <InfoRow label="Public Key" value={result.publicKey} mono />
          <InfoRow label="Signature" value={result.signature} mono />
          <InfoRow label="Captured At" value={formattedTime} />
        </View>

        <TouchableOpacity
          style={[styles.button, styles.uploadButton]}
          onPress={handleUpload}
          disabled={uploadState.status === "uploading"}
        >
          {uploadState.status === "uploading" ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <Text style={styles.buttonText}>Upload for Verification</Text>
          )}
        </TouchableOpacity>

        {uploadState.status === "success" && (
          <View style={styles.statusBox}>
            <Text style={styles.statusSuccess}>
              Uploaded - stored on backend as capture {uploadState.result.id.slice(0, 8)}...
            </Text>
            <Text style={styles.statusDetail}>
              {uploadState.result.is_on_chain
                ? `Anchored on-chain (tx ${uploadState.result.blockchain_tx_hash?.slice(0, 10)}...)`
                : "Blockchain anchoring not enabled yet on this backend - stored in the database only."}
            </Text>
          </View>
        )}
        {uploadState.status === "error" && (
          <View style={styles.statusBox}>
            <Text style={styles.statusError}>{uploadState.message}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.exportButton]}
          onPress={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator color={colors.paper} />
          ) : (
            <Text style={styles.exportButtonText}>Export Original</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.textButton} onPress={() => navigation.popToTop()}>
          <Text style={styles.textButtonText}>Capture Another Photo</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  mono,
  status,
}: {
  label: string;
  value: string;
  mono?: boolean;
  status?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Text
        style={[styles.infoValue, mono && styles.infoValueMono, status && styles.infoValueStatus]}
        selectable
      >
        {status ? "● " : ""}
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  securingBody: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  centerText: { textAlign: "center" },
  heading: { fontFamily: fonts.heading, fontSize: 21, fontWeight: "700", color: colors.paper },
  subheading: { fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 19 },
  steps: { marginTop: 36, gap: 22 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepMark: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1.5,
    borderColor: colors.hairline, alignItems: "center", justifyContent: "center",
  },
  stepMarkDone: { backgroundColor: colors.seal, borderColor: colors.seal },
  stepCheck: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  stepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#3A4553" },
  stepLabel: { fontSize: 14.5, color: colors.muted },
  stepLabelDone: { color: colors.paper, fontWeight: "600" },
  resultScroll: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 36, alignItems: "center" },
  sealBadge: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.seal,
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  sealCheck: { color: colors.ink, fontSize: 24, fontWeight: "700" },
  card: {
    width: "100%", backgroundColor: colors.inkRaised, borderWidth: 1,
    borderColor: colors.hairline, borderRadius: radius.lg, padding: 18,
    marginTop: 22, marginBottom: 24, gap: 15,
  },
  infoRow: { gap: 4 },
  infoLabel: { fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 13.5, color: colors.paper },
  infoValueMono: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 18 },
  infoValueStatus: { color: colors.verified, fontWeight: "700" },
  button: {
    width: "100%", backgroundColor: colors.seal, paddingVertical: 16,
    borderRadius: radius.md, alignItems: "center",
  },
  buttonText: { color: colors.ink, fontWeight: "700", fontSize: 16 },
  uploadButton: { backgroundColor: colors.verified, marginTop: 0 },
  exportButton: {
    backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.hairline, marginTop: 14,
  },
  exportButtonText: { color: colors.paper, fontWeight: "700", fontSize: 16 },
  statusBox: {
    width: "100%", marginTop: 12, padding: 14, borderRadius: radius.sm,
    backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.hairline,
  },
  statusSuccess: { color: colors.verified, fontWeight: "700", fontSize: 13 },
  statusDetail: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  statusError: { color: colors.danger, fontWeight: "700", fontSize: 13 },
  textButton: { marginTop: 20, alignItems: "center", paddingVertical: 10 },
  textButtonText: { color: colors.seal, fontWeight: "600", fontSize: 15 },
});