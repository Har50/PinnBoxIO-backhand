import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
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
  TextInput,
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
  if (!token) throw new Error("AUTH_REQUIRED");
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("AUTH_REQUIRED");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error("AUTH_REQUIRED");
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_REQUIRED");
    const b = await res.json().catch(() => ({}));
    throw new Error(b?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error("AUTH_REQUIRED");
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_REQUIRED");
    const b = await res.json().catch(() => ({}));
    throw new Error(b?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiDelete<T>(path: string): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error("AUTH_REQUIRED");
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("AUTH_REQUIRED");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

interface Quota { totalBytes: number; usedBytes: number; planName: string; }
interface StorageFile { id: number; name: string; mimeType: string; sizeBytes: number; downloadCount: number; createdAt: string; folder: string; category?: string | null; }
interface StorageFolder { path: string; name: string; }

type FileFilter = "all" | "photos" | "videos" | "audio" | "docs";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getMimeIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "film";
  if (mimeType.startsWith("audio/")) return "music";
  if (mimeType.includes("pdf")) return "file-text";
  return "file";
}

function getMimeColors(mimeType: string): { bg: string; accent: string; badge: string } {
  if (mimeType.startsWith("image/")) return { bg: "#8b5cf620", accent: "#8b5cf6", badge: "IMG" };
  if (mimeType.startsWith("video/")) return { bg: "#ef444420", accent: "#ef4444", badge: "VID" };
  if (mimeType.startsWith("audio/")) return { bg: "#f59e0b20", accent: "#f59e0b", badge: "AUD" };
  if (mimeType.includes("pdf")) return { bg: "#3b82f620", accent: "#3b82f6", badge: "PDF" };
  return { bg: "#6b728020", accent: "#6b7280", badge: "FILE" };
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  invoice:      { bg: "#10b98120", text: "#10b981", label: "Invoice" },
  contract:     { bg: "#3b82f620", text: "#3b82f6", label: "Contract" },
  receipt:      { bg: "#14b8a620", text: "#14b8a6", label: "Receipt" },
  report:       { bg: "#6366f120", text: "#6366f1", label: "Report" },
  presentation: { bg: "#f9731620", text: "#f97316", label: "Deck" },
  spreadsheet:  { bg: "#22c55e20", text: "#22c55e", label: "Sheet" },
  photo:        { bg: "#a855f720", text: "#a855f7", label: "Photo" },
  video:        { bg: "#ef444420", text: "#ef4444", label: "Video" },
  audio:        { bg: "#f59e0b20", text: "#f59e0b", label: "Audio" },
  code:         { bg: "#06b6d420", text: "#06b6d4", label: "Code" },
  document:     { bg: "#6b728020", text: "#9ca3af", label: "Doc" },
  other:        { bg: "#6b728015", text: "#6b7280", label: "Other" },
};

function matchesFilter(mimeType: string, filter: FileFilter): boolean {
  if (filter === "all") return true;
  if (filter === "photos") return mimeType.startsWith("image/");
  if (filter === "videos") return mimeType.startsWith("video/");
  if (filter === "audio") return mimeType.startsWith("audio/");
  if (filter === "docs") return !mimeType.startsWith("image/") && !mimeType.startsWith("video/") && !mimeType.startsWith("audio/");
  return true;
}

function BreadcrumbBar({ path, onNavigate }: { path: string; onNavigate: (p: string) => void }) {
  const colors = useColors();
  const segments = path === "/" ? [] : path.split("/").filter(Boolean);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.breadcrumb}>
      <Pressable onPress={() => onNavigate("/")}>
        <Text style={[styles.breadcrumbItem, { color: segments.length === 0 ? colors.foreground : colors.primary }]}>
          My Drive
        </Text>
      </Pressable>
      {segments.map((seg, idx) => {
        const segPath = "/" + segments.slice(0, idx + 1).join("/");
        const isLast = idx === segments.length - 1;
        return (
          <View key={segPath} style={styles.breadcrumbPiece}>
            <Text style={[styles.breadcrumbSep, { color: colors.mutedForeground }]}>/</Text>
            <Pressable onPress={() => !isLast && onNavigate(segPath)}>
              <Text style={[styles.breadcrumbItem, { color: isLast ? colors.foreground : colors.primary }]}>{seg}</Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

export default function StorageScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [currentFolder, setCurrentFolder] = useState("/");
  const [quota, setQuota] = useState<Quota | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [folders, setFolders] = useState<StorageFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [moveTarget, setMoveTarget] = useState<StorageFile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileFilter, setFileFilter] = useState<FileFilter>("all");

  const loadData = useCallback(async (folder = currentFolder) => {
    try {
      const [quotaRes, filesRes, foldersRes] = await Promise.all([
        apiGet<{ quota: Quota }>("/storage/quota"),
        apiGet<{ files: StorageFile[] }>(`/storage/files?folder=${encodeURIComponent(folder)}`),
        apiGet<{ folders: StorageFolder[] }>(`/storage/folders?folder=${encodeURIComponent(folder)}`),
      ]);
      setQuota(quotaRes.quota);
      setFiles(filesRes.files);
      setFolders(foldersRes.folders);
    } catch (err: any) {
      if (err?.message !== "AUTH_REQUIRED") Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentFolder]);

  useEffect(() => { loadData(currentFolder); }, [currentFolder]);

  const navigateTo = useCallback((folder: string) => {
    setCurrentFolder(folder);
    setLoading(true);
    setFiles([]);
    setFolders([]);
    setSearchQuery("");
    setFileFilter("all");
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(currentFolder);
  }, [loadData, currentFolder]);

  const handleNewFolder = useCallback(async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      await apiPost("/storage/folders", { name, parentFolder: currentFolder });
      setShowNewFolder(false);
      setNewFolderName("");
      await loadData(currentFolder);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setCreatingFolder(false);
    }
  }, [newFolderName, currentFolder, loadData]);

  const handleScan = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Camera Permission", "Camera access is required to scan documents. Please enable it in Settings.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploading(true);

      const fileName = `scan_${Date.now()}.jpg`;
      const mimeType = "image/jpeg";
      const { uploadUrl, storageKey } = await apiPost<{ uploadUrl: string; storageKey: string }>("/storage/upload-url", {
        fileName,
        mimeType,
        sizeBytes: asset.fileSize ?? 0,
        folder: currentFolder,
      });

      const fileRes = await fetch(asset.uri);
      const blob = await fileRes.blob();
      await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": mimeType } });

      await apiPost("/storage/files", {
        name: fileName,
        mimeType,
        sizeBytes: asset.fileSize ?? 0,
        storageKey,
        folder: currentFolder,
      });

      Alert.alert("Scanned", `"${fileName}" added to ${currentFolder === "/" ? "My Drive" : currentFolder.split("/").pop()}.`);
      await loadData(currentFolder);
    } catch (err: any) {
      Alert.alert("Scan Failed", err?.message === "AUTH_REQUIRED" ? "Please sign in again." : err.message);
    } finally {
      setUploading(false);
    }
  }, [currentFolder, loadData]);

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
        folder: currentFolder,
      });

      const fileRes = await fetch(asset.uri);
      const blob = await fileRes.blob();
      await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": asset.mimeType || "application/octet-stream" } });

      await apiPost("/storage/files", {
        name: asset.name,
        mimeType: asset.mimeType,
        sizeBytes: asset.size,
        storageKey,
        folder: currentFolder,
      });

      Alert.alert("Uploaded", `"${asset.name}" added to ${currentFolder === "/" ? "My Drive" : currentFolder.split("/").pop()}.`);
      await loadData(currentFolder);
    } catch (err: any) {
      Alert.alert("Upload Failed", err?.message === "AUTH_REQUIRED" ? "Please sign in again." : err.message);
    } finally {
      setUploading(false);
    }
  }, [currentFolder, loadData]);

  const handleDownload = useCallback(async (file: StorageFile) => {
    try {
      const { downloadUrl } = await apiGet<{ downloadUrl: string; fileName: string }>(`/storage/files/${file.id}/download-url`);
      await Linking.openURL(downloadUrl);
    } catch (err: any) {
      Alert.alert("Download Failed", err.message);
    }
  }, []);

  const handleDelete = useCallback((file: StorageFile) => {
    Alert.alert("Delete File", `Delete "${file.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiDelete(`/storage/files/${file.id}`);
            await loadData(currentFolder);
          } catch (err: any) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  }, [loadData, currentFolder]);

  const handleDeleteFolder = useCallback((folder: StorageFolder) => {
    Alert.alert(
      "Delete Folder",
      `Delete "${folder.name}" and all files inside? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await getToken();
              if (!token) throw new Error("AUTH_REQUIRED");
              const res = await fetch(`${API_BASE}/api/storage/folders?folder=${encodeURIComponent(folder.path)}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) {
                const b = await res.json().catch(() => ({}));
                throw new Error(b?.error ?? "Failed");
              }
              await loadData(currentFolder);
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]
    );
  }, [loadData, currentFolder]);

  const handleMoveFile = useCallback(async (file: StorageFile, targetFolder: string) => {
    try {
      await apiPatch(`/storage/files/${file.id}/move`, { folder: targetFolder });
      setMoveTarget(null);
      await loadData(currentFolder);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  }, [loadData, currentFolder]);

  const handleAnalyzeWithAi = useCallback(async (file: StorageFile) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("AUTH_REQUIRED");
      Alert.alert("Analyzing…", `AI is reading "${file.name}". This may take a moment.`);
      const convRes = await fetch(`${API_BASE}/api/ai/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: `Analyze: ${file.name}` }),
      });
      const convData = await convRes.json();
      const convId = convData.id;
      const prompt = `Please analyze this file and give me a summary: "${file.name}" (${file.mimeType}, ${file.category ?? "unknown category"}). Include key information, important dates or figures, and any action items if applicable.`;
      const msgRes = await fetch(`${API_BASE}/api/ai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: prompt, provider: "openai" }),
      });
      const text = await msgRes.text();
      const lines = text.split("\n");
      let full = "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            full += parsed.choices?.[0]?.delta?.content ?? parsed.content ?? "";
          } catch {}
        }
      }
      if (full) {
        Alert.alert(`Analysis: ${file.name}`, full.slice(0, 600) + (full.length > 600 ? "…" : ""), [
          { text: "OK" },
        ]);
      } else {
        Alert.alert("Analysis", "No response from AI. Please try again.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message === "AUTH_REQUIRED" ? "Please sign in again." : err.message);
    }
  }, []);

  const handleShare = useCallback(async (file: StorageFile) => {
    try {
      const result = await apiPost<{ shareUrl?: string; shareToken?: string; url?: string }>(`/storage/files/${file.id}/share`, {});
      const shareUrl = result.shareUrl ?? result.url ?? (result.shareToken ? `${API_BASE}/api/storage/public/${result.shareToken}` : null);
      if (shareUrl) {
        Alert.alert(
          "Share Link Created",
          shareUrl,
          [
            { text: "Open", onPress: () => Linking.openURL(shareUrl) },
            { text: "OK" },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert("Share Failed", err.message);
    }
  }, []);

  const quotaPct = quota ? Math.min(100, (quota.usedBytes / quota.totalBytes) * 100) : 0;
  const isWarning = quotaPct > 80;
  const isDanger = quotaPct > 95;

  const filteredFiles = files.filter((f) => {
    const matchesSearch = !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = matchesFilter(f.mimeType, fileFilter);
    return matchesSearch && matchesCat;
  });

  const filteredFolders = fileFilter === "all"
    ? folders.filter((f) => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const TAB_FILTERS: { key: FileFilter | "add" | "scan"; label: string; icon: string }[] = [
    { key: "all", label: "Files", icon: "file" },
    { key: "add", label: "Add", icon: "plus" },
    { key: "photos", label: "Media", icon: "film" },
    { key: "scan", label: "Scan", icon: "maximize" },
    { key: "docs", label: "Docs", icon: "file-text" },
  ];

  if (loading) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          {currentFolder !== "/" && (
            <Pressable onPress={() => {
              const parent = currentFolder.split("/").slice(0, -1).join("/") || "/";
              navigateTo(parent);
            }} style={styles.backBtn} hitSlop={8}>
              <Feather name="chevron-left" size={22} color={colors.primary} />
            </Pressable>
          )}
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {currentFolder === "/" ? "My Drive" : currentFolder.split("/").pop()}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => { setShowNewFolder(true); setNewFolderName(""); }} style={styles.iconBtn} hitSlop={6}>
            <Feather name="folder-plus" size={20} color={colors.mutedForeground} />
          </Pressable>
          <Pressable onPress={handleUpload} disabled={uploading} style={styles.iconBtn}>
            {uploading
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Feather name="upload-cloud" size={20} color={colors.primary} />}
          </Pressable>
        </View>
      </View>

      {/* Search bar */}
      <View style={[styles.searchRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search My Drive…"
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Tab / Filter row */}
      <View style={[styles.tabRowWrap, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {TAB_FILTERS.map((tab) => {
            const isAdd = tab.key === "add";
            const isScan = tab.key === "scan";
            const isActive = !isAdd && !isScan && fileFilter === tab.key;

            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  if (isAdd) { handleUpload(); return; }
                  if (isScan) { handleScan(); return; }
                  setFileFilter(tab.key as FileFilter);
                }}
                style={({ pressed }) => [
                  styles.tabBtn,
                  {
                    backgroundColor: isActive
                      ? colors.primary
                      : pressed ? colors.muted : colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Feather
                  name={tab.icon as any}
                  size={13}
                  color={isActive ? "#fff" : colors.mutedForeground}
                />
                <Text style={[styles.tabBtnText, { color: isActive ? "#fff" : colors.mutedForeground }]}>
                  {isAdd ? "+ Add" : tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Breadcrumb */}
      <View style={[styles.breadcrumbWrap, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <BreadcrumbBar path={currentFolder} onNavigate={navigateTo} />
      </View>

      {/* Storage upgrade nudge — shown when >80% full on free plan */}
      {quota && isWarning && quota.planName === "Free" && (
        <Pressable
          onPress={() => router.push("/paywall" as any)}
          style={styles.upgradeNudgeBar}
        >
          <Feather name="alert-triangle" size={14} color="#92400e" />
          <Text style={styles.upgradeNudgeText}>
            You've used {Math.round((quota.usedBytes / quota.totalBytes) * 100)}% of your {formatBytes(quota.totalBytes)} storage
          </Text>
          <View style={styles.upgradeNudgeBtn}>
            <Text style={styles.upgradeNudgeBtnText}>Upgrade for 25 GB →</Text>
          </View>
        </Pressable>
      )}

      <ScrollView
        style={[styles.fill, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Quota bar */}
        {quota && (
          <View style={[styles.quotaCard, { backgroundColor: colors.card, borderColor: isWarning ? "#f59e0b40" : colors.border }]}>
            <View style={styles.quotaHeader}>
              <View style={styles.quotaLeft}>
                <Feather name="hard-drive" size={14} color={isWarning ? "#f59e0b" : colors.mutedForeground} />
                <Text style={[styles.quotaTitle, { color: colors.foreground }]}>{quota.planName} plan</Text>
              </View>
              <Text style={[styles.quotaNumbers, { color: colors.mutedForeground }]}>
                {formatBytes(quota.usedBytes)} of {formatBytes(quota.totalBytes)}
              </Text>
            </View>
            <View style={[styles.progressBg, { backgroundColor: colors.muted }]}>
              <View style={[styles.progressFill, { width: `${quotaPct}%` as any, backgroundColor: isDanger ? "#ef4444" : isWarning ? "#f59e0b" : colors.primary }]} />
            </View>
            {isWarning && quota.planName === "Free" && (
              <View style={styles.quotaUpgradeRow}>
                <Text style={[styles.quotaUpgradeText, { color: "#f59e0b" }]}>
                  Running low — upgrade for 25 GB
                </Text>
                <Pressable
                  style={[styles.quotaUpgradeBtn, { backgroundColor: "#f59e0b" }]}
                  onPress={() => router.push("/paywall" as any)}
                >
                  <Text style={styles.quotaUpgradeBtnText}>Upgrade</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Folders grid */}
        {filteredFolders.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              FOLDERS · {filteredFolders.length}
            </Text>
            <View style={styles.folderGrid}>
              {filteredFolders.map((folder) => (
                <Pressable
                  key={folder.path}
                  onPress={() => navigateTo(folder.path)}
                  onLongPress={() => handleDeleteFolder(folder)}
                  style={({ pressed }) => [
                    styles.folderCard,
                    {
                      backgroundColor: pressed ? colors.muted : colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.folderCardIcon}>
                    <Feather name="folder" size={26} color="#f59e0b" />
                  </View>
                  <Text style={[styles.folderCardName, { color: colors.foreground }]} numberOfLines={2}>{folder.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Files list */}
        {filteredFiles.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              FILES · {filteredFiles.length}
            </Text>
            <View style={[styles.fileList, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {filteredFiles.map((file, i) => {
                const mime = getMimeColors(file.mimeType);
                return (
                  <View
                    key={file.id}
                    style={[styles.fileRow, { borderBottomColor: colors.border }, i === filteredFiles.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <View style={[styles.fileIconWrap, { backgroundColor: mime.bg }]}>
                      <Feather name={getMimeIcon(file.mimeType) as any} size={15} color={mime.accent} />
                    </View>
                    <View style={styles.fileInfo}>
                      <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>{file.name}</Text>
                      <View style={styles.fileMetaRow}>
                        <View style={[styles.fileBadge, { backgroundColor: mime.bg }]}>
                          <Text style={[styles.fileBadgeText, { color: mime.accent }]}>{mime.badge}</Text>
                        </View>
                        {file.category && CATEGORY_COLORS[file.category] && (
                          <View style={[styles.fileBadge, { backgroundColor: CATEGORY_COLORS[file.category].bg }]}>
                            <Text style={[styles.fileBadgeText, { color: CATEGORY_COLORS[file.category].text }]}>
                              {CATEGORY_COLORS[file.category].label}
                            </Text>
                          </View>
                        )}
                        <Text style={[styles.fileMeta, { color: colors.mutedForeground }]}>
                          {formatBytes(file.sizeBytes)} · {formatDate(file.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.fileActions}>
                      <Pressable onPress={() => handleAnalyzeWithAi(file)} style={styles.fileActionBtn} hitSlop={8}>
                        <Feather name="zap" size={15} color="#8b5cf6" />
                      </Pressable>
                      {currentFolder !== "/" && (
                        <Pressable onPress={() => handleMoveFile(file, "/")} style={styles.fileActionBtn} hitSlop={8}>
                          <Feather name="corner-up-left" size={15} color={colors.mutedForeground} />
                        </Pressable>
                      )}
                      <Pressable onPress={() => handleShare(file)} style={styles.fileActionBtn} hitSlop={8}>
                        <Feather name="share-2" size={15} color={colors.mutedForeground} />
                      </Pressable>
                      <Pressable onPress={() => handleDownload(file)} style={styles.fileActionBtn} hitSlop={8}>
                        <Feather name="download" size={15} color={colors.mutedForeground} />
                      </Pressable>
                      <Pressable onPress={() => handleDelete(file)} style={styles.fileActionBtn} hitSlop={8}>
                        <Feather name="trash-2" size={15} color="#ef4444" />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Empty state */}
        {filteredFiles.length === 0 && filteredFolders.length === 0 && !loading && (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name={searchQuery ? "search" : "folder-plus"} size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {searchQuery
                ? `No results for "${searchQuery}"`
                : fileFilter !== "all"
                  ? "No matching files"
                  : currentFolder === "/" ? "Your drive is empty" : "This folder is empty"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              {searchQuery
                ? "Try a different search term"
                : "Tap upload to add files or create a folder"}
            </Text>
          </View>
        )}

        {/* Upload zone */}
        <Pressable
          onPress={handleUpload}
          disabled={uploading}
          style={({ pressed }) => [styles.uploadArea, { borderColor: colors.border, backgroundColor: pressed ? colors.muted : "transparent" }]}
        >
          <Feather name="upload-cloud" size={24} color={colors.mutedForeground} />
          <Text style={[styles.uploadTitle, { color: colors.mutedForeground }]}>Upload to {currentFolder === "/" ? "My Drive" : currentFolder.split("/").pop()}</Text>
        </Pressable>
      </ScrollView>

      {/* New Folder modal */}
      {showNewFolder && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Folder</Text>
            <TextInput
              style={[styles.folderInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
              placeholder="Folder name"
              placeholderTextColor={colors.mutedForeground}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
              onSubmitEditing={handleNewFolder}
              returnKeyType="done"
            />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalCancel, { borderColor: colors.border }]} onPress={() => setShowNewFolder(false)}>
                <Text style={[styles.modalCancelText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirm, { backgroundColor: colors.primary, opacity: !newFolderName.trim() || creatingFolder ? 0.5 : 1 }]}
                onPress={handleNewFolder}
                disabled={!newFolderName.trim() || creatingFolder}
              >
                {creatingFolder
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalConfirmText}>Create</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  backBtn: { marginRight: 2 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  iconBtn: { padding: 4 },

  searchRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },

  tabRowWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  upgradeNudgeBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fef3c7",
    flexWrap: "wrap",
  },
  upgradeNudgeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#92400e",
  },
  upgradeNudgeBtn: {
    backgroundColor: "#fbbf24",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  upgradeNudgeBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#78350f",
  },

  breadcrumbWrap: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  breadcrumb: { flexDirection: "row", alignItems: "center", gap: 2 },
  breadcrumbPiece: { flexDirection: "row", alignItems: "center", gap: 2 },
  breadcrumbSep: { fontSize: 13, paddingHorizontal: 2 },
  breadcrumbItem: { fontSize: 13, fontFamily: "Inter_500Medium" },

  quotaCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  quotaHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  quotaLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  quotaTitle: { fontSize: 13, fontFamily: "Inter_500Medium" },
  quotaNumbers: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressBg: { height: 4, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  quotaUpgradeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, gap: 10 },
  quotaUpgradeText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  quotaUpgradeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  quotaUpgradeBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },

  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
  },

  folderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  folderCard: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "flex-start",
    gap: 10,
  },
  folderCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#f59e0b18",
    alignItems: "center",
    justifyContent: "center",
  },
  folderCardName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  fileList: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fileInfo: { flex: 1, minWidth: 0 },
  fileName: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 3 },
  fileMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  fileBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fileBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  fileMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  fileActions: { flexDirection: "row", gap: 2, alignItems: "center" },
  fileActionBtn: { padding: 6 },

  emptyState: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 36,
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },

  uploadArea: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  uploadTitle: { fontSize: 14, fontFamily: "Inter_500Medium" },

  modalOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  modal: {
    width: "82%",
    borderRadius: 20,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  folderInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  modalButtons: { flexDirection: "row", gap: 10 },
  modalCancel: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  modalConfirm: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  modalConfirmText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#fff" },
});
