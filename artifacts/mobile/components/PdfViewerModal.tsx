import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform, Modal, View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

interface PdfViewerModalProps {
  visible: boolean;
  url: string;
  filename: string;
  onClose: () => void;
}

function getGoogleDocsViewerUrl(url: string): string {
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
}

export function PdfViewerModal({ visible, url, filename, onClose }: PdfViewerModalProps) {
  const colors = useColors();
  const [loading, setLoading] = useState(true);

  async function openExternal() {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.open(url, "_blank");
    } else {
      await Linking.openURL(url);
    }
  }

  async function openInBrowser() {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.open(getGoogleDocsViewerUrl(url), "_blank");
    } else {
      await WebBrowser.openBrowserAsync(getGoogleDocsViewerUrl(url));
    }
  }

  if (!visible) return null;

  if (Platform.OS !== "web") {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{filename}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>
          <View style={styles.nativeBody}>
            <View style={[styles.pdfIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="file-text" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.pdfFilename, { color: colors.foreground }]} numberOfLines={2}>{filename}</Text>
            <Text style={[styles.pdfHint, { color: colors.mutedForeground }]}>
              Open this PDF in your device viewer or browser
            </Text>
            <Pressable
              style={[styles.openBtn, { backgroundColor: colors.primary }]}
              onPress={openInBrowser}
            >
              <Feather name="eye" size={16} color="#fff" />
              <Text style={styles.openBtnText}>View PDF</Text>
            </Pressable>
            <Pressable
              style={[styles.downloadBtn, { borderColor: colors.border }]}
              onPress={openExternal}
            >
              <Feather name="download" size={16} color={colors.primary} />
              <Text style={[styles.downloadBtnText, { color: colors.primary }]}>Download / Open Externally</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.webOverlay}>
        <View style={[styles.webSheet, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{filename}</Text>
            <View style={styles.headerActions}>
              <Pressable
                onPress={openExternal}
                style={[styles.headerBtn, { borderColor: colors.border }]}
              >
                <Feather name="download" size={14} color={colors.foreground} />
                <Text style={[styles.headerBtnText, { color: colors.foreground }]}>Download</Text>
              </Pressable>
              <Pressable
                onPress={() => { if (typeof window !== "undefined") window.open(url, "_blank"); }}
                style={[styles.headerBtn, { borderColor: colors.border }]}
              >
                <Feather name="external-link" size={14} color={colors.foreground} />
                <Text style={[styles.headerBtnText, { color: colors.foreground }]}>Open</Text>
              </Pressable>
              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
                <Feather name="x" size={22} color={colors.foreground} />
              </Pressable>
            </View>
          </View>
          <View style={styles.iframeWrap}>
            {loading && (
              <View style={styles.iframeLoader}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading PDF…</Text>
              </View>
            )}
            <iframe
              src={getGoogleDocsViewerUrl(url)}
              style={{ width: "100%", height: "100%", border: "none", display: loading ? "none" : "block" }}
              onLoad={() => setLoading(false)}
              title={filename}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  title: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold" },
  closeBtn: { padding: 4 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  nativeBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  pdfIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  pdfFilename: { fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  pdfHint: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    width: "100%",
    justifyContent: "center",
  },
  openBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    width: "100%",
    justifyContent: "center",
  },
  downloadBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  webOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  webSheet: {
    width: "100%",
    maxWidth: 900,
    height: "90%",
    borderRadius: 16,
    overflow: "hidden",
  },
  iframeWrap: { flex: 1, position: "relative" as any },
  iframeLoader: {
    position: "absolute" as any,
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
