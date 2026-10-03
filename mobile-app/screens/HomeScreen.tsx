import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import { colors, radius, fonts } from "../styles/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>V</Text>
          </View>
          <View>
            <Text style={styles.title}>Provenance</Text>
            <Text style={styles.subtitle}>Secure Capture</Text>
          </View>
        </View>

        <Text style={styles.copy}>
          Take a photo and Provenance creates a{" "}
          <Text style={styles.copyStrong}>signed, tamper-evident record</Text>{" "}
          of that exact image — the moment you capture it.
        </Text>

        <View>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate("Camera")}
          >
            <Text style={styles.buttonText}>Take Photo</Text>
          </TouchableOpacity>
          <View style={styles.ledgerLine}>
            <Text style={styles.ledgerText}>SHA-256</Text>
            <Text style={styles.ledgerDivider}>·</Text>
            <Text style={styles.ledgerText}>Hardware-signed</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  body: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 34,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.seal,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  brandMarkText: {
    fontFamily: fonts.heading,
    fontWeight: "700",
    fontSize: 18,
    color: colors.ink,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: "700",
    fontSize: 26,
    color: colors.paper,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  copy: {
    fontSize: 15,
    lineHeight: 22,
    color: "#C7CAD4",
    marginBottom: 40,
  },
  copyStrong: {
    color: colors.paper,
    fontWeight: "700",
  },
  button: {
    backgroundColor: colors.seal,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: "center",
  },
  buttonText: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "700",
  },
  ledgerLine: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingTop: 14,
    marginTop: 24,
  },
  ledgerText: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
    color: colors.muted,
  },
  ledgerDivider: {
    color: colors.muted,
    fontSize: 11.5,
  },
});
