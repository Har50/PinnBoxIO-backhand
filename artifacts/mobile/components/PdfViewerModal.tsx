import React, { useState, useEffect } from "react";
import { Modal, View, Text, Pressable, ActivityIndicator, StyleSheet, Platform, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import * as FileSystem from "expo-file-system/legacy";

interface Props {
  visible: boolean;
  title: string;
  url?: string;
  base64?: string;
  onClose: () => void;
}

export function PdfViewerModal({ visible, title, url, base64, onClose }: Props) {
  const colors = useColors();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (visible) setStatus("loading");
  }, [visible]);

  const handleOpenExternally = async () => {
    if (url) {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    }
  };

  const handleDownload = async () => {
    if (!url) return;
    setStatus("loading");
    try {
      const localUri = FileSystem.cacheDirectory + title;
      await FileSystem.downloadAsync(url, localUri);
      if (Platform.OS === "web") {
        const a = document.createElement("a");
        a.href = localUri;
        a.download = title;
        a.click();
      } else {
        await Linking.openURL(localUri);
      }
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
          <View style={styles.headerActions}>
            {url && Platform.OS !== "web" && (
              <Pressable onPress={handleDownload} style={styles.actionBtn}>
                <Feather name="download" size={18} color={colors.primary} />
              </Pressable>
            )}
            {url && (
              <Pressable onPress={handleOpenExternally} style={styles.actionBtn}>
                <Feather name="external-link" size={18} color={colors.primary} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.body}>
          {status === "loading" && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.statusText, { color: colors.mutedForeground }]}>Loading PDF...</Text>
            </View>
          )}
          {status === "error" && (
            <View style={styles.center}>
              <Feather name="alert-circle" size={48} color={colors.destructive} />
              <Text style={[styles.statusText, { color: colors.foreground, marginTop: 12 }]}>Could not load PDF</Text>
              <Pressable onPress={handleDownload} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.retryBtnText}>Download instead</Text>
              </Pressable>
            </View>
          )}
          {status === "ready" && (
            <View style={styles.center}>
              <Feather name="check-circle" size={48} color="#22c55e" />
              <Text style={[styles.statusText, { color: colors.foreground, marginTop: 12 }]}>PDF ready</Text>
              {url && (
                <Pressable onPress={handleOpenExternally} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
                  <Text style={styles.retryBtnText}>Open PDF</Text>
                </Pressable>
              )}
            </View>
          )}
          {url && Platform.OS === "web" && (
            <iframe
              src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`}
              style={{ flex: 1, border: "none", borderRadius: 8, margin: 16 }}
              title="PDF Viewer"
            />
          )}
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: { padding: 4, marginRight: 12 },
  title: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold" },
  headerActions: { flexDirection: "row", gap: 8 },
  actionBtn: { padding: 8 },
  body: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  statusText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
