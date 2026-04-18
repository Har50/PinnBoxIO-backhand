import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import * as DocumentPicker from "expo-document-picker";
import { useState, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return typeof localStorage !== "undefined" ? localStorage.getItem("commshub_session_token") : null;
    }
    const SecureStore = await import("expo-secure-store");
    return await SecureStore.getItemAsync("commshub_session_token");
  } catch {
    return null;
  }
}

async function apiGet<T>(path: string): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiDelete<T>(path: string): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

interface Quota {
  totalBytes: number;
  usedBytes: number;
  planName: string;
}

interface StorageFile {
  id: number;
  name: string;
  mimeType: string;
  sizeBytes: number;
  downloadCount: number;
  createdAt: string;
}

interface Plan {
  gb: number;
  label: string;
  priceId: string | null;
  unitAmount: number;
  currency: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function getMimeIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "film";
  if (mimeType.startsWith("audio/")) return "music";
  if (mimeType.includes("pdf")) return "file-text";
  return "file";
}

export default function StorageScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [quota, setQuota] = useState<Quota | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [quotaRes, filesRes, plansRes] = await Promise.all([
        apiGet<{ quota: Quota }>("/storage/quota"),
        apiGet<{ files: StorageFile[] }>("/storage/files"),
        apiGet<{ plans: Plan[] }>("/storage/plans"),
      ]);
      setQuota(quotaRes.quota);
      setFiles(filesRes.files);
      setPlans(plansRes.plans);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setUploading(true);

      const { uploadUrl, storageKey } = await apiPost<{ uploadUrl: string; storageKey: string }>("/storage/upload-url", {
        fileName: asset.name,
        mimeType: asset.mimeType,
        sizeBytes: asset.size,
      });

      const fileRes = await fetch(asset.uri);
      const blob = await fileRes.blob();

      await fetch(uploadUrl, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": asset.mimeType || "application/octet-stream" },
      });

      await apiPost("/storage/files", {
        name: asset.name,
        mimeType: asset.mimeType,
        sizeBytes: asset.size,
        storageKey,
      });

      Alert.alert("Uploaded", `"${asset.name}" uploaded successfully.`);
      await loadData();
    } catch (err: any) {
      Alert.alert("Upload Failed", err.message);
    } finally {
      setUploading(false);
    }
  }, [loadData]);

  const handleDownload = useCallback(async (file: StorageFile) => {
    try {
      const { downloadUrl } = await apiGet<{ downloadUrl: string; fileName: string }>(`/storage/files/${file.id}/download-url`);
      await Linking.openURL(downloadUrl);
    } catch (err: any) {
      Alert.alert("Download Failed", err.message);
    }
  }, []);

  const handleDelete = useCallback((file: StorageFile) => {
    Alert.alert(
      "Delete File",
      `Delete "${file.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiDelete(`/storage/files/${file.id}`);
              await loadData();
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]
    );
  }, [loadData]);

  const handleUpgrade = useCallback(async (plan: Plan) => {
    try {
      const { url } = await apiPost<{ url: string }>("/storage/checkout", {
        priceId: plan.priceId,
        gb: plan.gb,
      });
      await Linking.openURL(url);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  }, []);

  const quotaPct = quota ? Math.min(100, (quota.usedBytes / quota.totalBytes) * 100) : 0;
  const isWarning = quotaPct > 80;
  const isDanger = quotaPct > 95;

  if (loading) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Storage</Text>
        <Pressable onPress={handleUpload} disabled={uploading} style={styles.uploadBtn}>
          {uploading
            ? <ActivityIndicator size="small" color={colors.primary} />
            : Platform.OS === "ios"
              ? <SymbolView name="icloud.and.arrow.up" tintColor={colors.primary} size={20} />
              : <Feather name="upload-cloud" size={20} color={colors.primary} />}
        </Pressable>
      </View>

      <ScrollView
        style={[styles.fill, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {quota && (
          <View style={[styles.quotaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.quotaHeader}>
              <View style={styles.quotaLeft}>
                <Feather name="hard-drive" size={16} color={colors.mutedForeground} />
                <Text style={[styles.quotaTitle, { color: colors.foreground }]}>Storage</Text>
                <View style={[styles.planBadge, { backgroundColor: colors.primary + "15" }]}>
                  <Text style={[styles.planBadgeText, { color: colors.primary }]}>{quota.planName}</Text>
                </View>
              </View>
              <Text style={[styles.quotaNumbers, { color: colors.mutedForeground }]}>
                {formatBytes(quota.usedBytes)} / {formatBytes(quota.totalBytes)}
              </Text>
            </View>
            <View style={[styles.progressBg, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${quotaPct}%`,
                    backgroundColor: isDanger ? "#ef4444" : isWarning ? "#f59e0b" : colors.primary,
                  },
                ]}
              />
            </View>
            {isDanger && (
              <View style={styles.warningRow}>
                <Feather name="alert-triangle" size={12} color="#ef4444" />
                <Text style={styles.warningText}>Storage almost full — upgrade to add more</Text>
              </View>
            )}
          </View>
        )}

        <Pressable
          onPress={handleUpload}
          disabled={uploading}
          style={({ pressed }) => [styles.uploadArea, { borderColor: colors.border, backgroundColor: pressed ? colors.muted : "transparent" }]}
        >
          <Feather name="upload-cloud" size={32} color={colors.mutedForeground} />
          <Text style={[styles.uploadTitle, { color: colors.foreground }]}>Tap to upload a file</Text>
          <Text style={[styles.uploadSub, { color: colors.mutedForeground }]}>Any file type supported</Text>
        </Pressable>

        {files.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Files</Text>
              <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{files.length} file{files.length !== 1 ? "s" : ""}</Text>
            </View>
            <View style={[styles.fileList, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {files.map((file, i) => (
                <View
                  key={file.id}
                  style={[
                    styles.fileRow,
                    { borderBottomColor: colors.border },
                    i === files.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={[styles.fileIcon, { backgroundColor: colors.muted }]}>
                    <Feather name={getMimeIcon(file.mimeType) as any} size={16} color={colors.mutedForeground} />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>{file.name}</Text>
                    <Text style={[styles.fileMeta, { color: colors.mutedForeground }]}>
                      {formatBytes(file.sizeBytes)} · {formatDate(file.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.fileActions}>
                    <Pressable onPress={() => handleDownload(file)} style={styles.fileActionBtn} hitSlop={8}>
                      <Feather name="download" size={16} color={colors.mutedForeground} />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(file)} style={styles.fileActionBtn} hitSlop={8}>
                      <Feather name="trash-2" size={16} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {files.length === 0 && !loading && (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="archive" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No files yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Tap upload to add your first file</Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 16, marginTop: 24, marginBottom: 12 }]}>
          Upgrade Storage
        </Text>
        <View style={styles.plansGrid}>
          {plans.map((plan) => (
            <Pressable
              key={plan.gb}
              onPress={() => handleUpgrade(plan)}
              style={({ pressed }) => [
                styles.planCard,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[styles.planIconWrap, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="cloud" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.planLabel, { color: colors.foreground }]}>{plan.gb} GB</Text>
              <Text style={[styles.planPrice, { color: colors.mutedForeground }]}>
                {plan.unitAmount ? `$${(plan.unitAmount / 100).toFixed(2)}/mo` : "Free"}
              </Text>
              <View style={[styles.planBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.planBtnText}>Upgrade</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  uploadBtn: { padding: 4, marginBottom: 2 },
  quotaCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  quotaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  quotaLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  quotaTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  planBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  planBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  quotaNumbers: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  warningRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  warningText: { fontSize: 12, color: "#ef4444", fontFamily: "Inter_400Regular" },
  uploadArea: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    padding: 32,
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  uploadTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  uploadSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  sectionCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  fileList: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fileIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  fileInfo: { flex: 1, gap: 2 },
  fileName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  fileMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  fileActions: { flexDirection: "row", gap: 4 },
  fileActionBtn: { padding: 6 },
  emptyState: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  plansGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 10,
  },
  planCard: {
    flex: 1,
    minWidth: "28%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
    alignItems: "center",
  },
  planIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  planLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  planPrice: { fontSize: 12, fontFamily: "Inter_400Regular" },
  planBtn: { marginTop: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, width: "100%", alignItems: "center" },
  planBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
