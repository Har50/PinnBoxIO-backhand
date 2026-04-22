import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import { Feather } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import * as DocumentPicker from "expo-document-picker";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
interface StorageFile { id: number; name: string; mimeType: string; sizeBytes: number; downloadCount: number; createdAt: string; folder: string; }
interface StorageFolder { path: string; name: string; }
interface Plan { gb: number; label: string; priceId: string | null; unitAmount: number; currency: string; }
type RevenueCatPackage = { identifier?: string; packageType?: string; product: { identifier?: string; priceString?: string; title?: string; }; };

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

function getMimeBg(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "#8b5cf6";
  if (mimeType.startsWith("video/")) return "#ef4444";
  if (mimeType.startsWith("audio/")) return "#f59e0b";
  if (mimeType.includes("pdf")) return "#3b82f6";
  return "#6b7280";
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
  const { offerings, purchase, isPurchasing, isLoading: subscriptionLoading } = useSubscription();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [currentFolder, setCurrentFolder] = useState("/");
  const [quota, setQuota] = useState<Quota | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [folders, setFolders] = useState<StorageFolder[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [moveTarget, setMoveTarget] = useState<StorageFile | null>(null);

  const loadData = useCallback(async (folder = currentFolder) => {
    try {
      const [quotaRes, filesRes, foldersRes, plansRes] = await Promise.all([
        apiGet<{ quota: Quota }>("/storage/quota"),
        apiGet<{ files: StorageFile[] }>(`/storage/files?folder=${encodeURIComponent(folder)}`),
        apiGet<{ folders: StorageFolder[] }>(`/storage/folders?folder=${encodeURIComponent(folder)}`),
        apiGet<{ plans: Plan[] }>("/storage/plans"),
      ]);
      setQuota(quotaRes.quota);
      setFiles(filesRes.files);
      setFolders(foldersRes.folders);
      setPlans(plansRes.plans);
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

  const getRevenueCatPackage = useCallback((plan: Plan): RevenueCatPackage | null => {
    const packages = (offerings?.current?.availablePackages ?? []) as RevenueCatPackage[];
    const gb = String(plan.gb);
    return packages.find((pkg) => {
      const id = pkg.identifier?.toLowerCase() ?? "";
      const prodId = pkg.product.identifier?.toLowerCase() ?? "";
      const title = pkg.product.title?.toLowerCase() ?? "";
      return id.includes("storage") && (id.includes(gb) || prodId.includes(gb) || title.includes(`${gb} gb`));
    }) ?? null;
  }, [offerings]);

  const getPlanPrice = useCallback((plan: Plan) => {
    const pkg = getRevenueCatPackage(plan);
    return pkg?.product.priceString || (plan.unitAmount ? `$${(plan.unitAmount / 100).toFixed(2)}/mo` : "Free");
  }, [getRevenueCatPackage]);

  const handleUpgrade = useCallback((plan: Plan) => {
    setPurchaseError(null);
    if (!getRevenueCatPackage(plan)) {
      setPurchaseError("Plans still syncing. Please try again shortly.");
      return;
    }
    setSelectedPlan(plan);
  }, [getRevenueCatPackage]);

  const confirmUpgrade = useCallback(async () => {
    if (!selectedPlan) return;
    const pkg = getRevenueCatPackage(selectedPlan);
    if (!pkg) return;
    try {
      setPurchaseError(null);
      setSelectedPlan(null);
      await purchase(pkg);
      await apiPost("/storage/revenuecat/activate", { gb: selectedPlan.gb });
      await loadData(currentFolder);
      Alert.alert("Storage upgraded", `${selectedPlan.gb} GB storage is now active.`);
    } catch (err: any) {
      if (!err?.userCancelled) {
        setPurchaseError(err?.message === "AUTH_REQUIRED" ? "Please sign in again." : err.message);
      }
    }
  }, [selectedPlan, getRevenueCatPackage, purchase, loadData, currentFolder]);

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
              : Platform.OS === "ios"
                ? <SymbolView name="icloud.and.arrow.up" tintColor={colors.primary} size={20} />
                : <Feather name="upload-cloud" size={20} color={colors.primary} />}
          </Pressable>
        </View>
      </View>

      {/* Breadcrumb */}
      <View style={[styles.breadcrumbWrap, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <BreadcrumbBar path={currentFolder} onNavigate={navigateTo} />
      </View>

      <ScrollView
        style={[styles.fill, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Quota bar */}
        {quota && (
          <View style={[styles.quotaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.quotaHeader}>
              <View style={styles.quotaLeft}>
                <Feather name="hard-drive" size={14} color={colors.mutedForeground} />
                <Text style={[styles.quotaTitle, { color: colors.foreground }]}>Storage</Text>
                <View style={[styles.planBadge, { backgroundColor: colors.primary + "18" }]}>
                  <Text style={[styles.planBadgeText, { color: colors.primary }]}>{quota.planName}</Text>
                </View>
              </View>
              <Text style={[styles.quotaNumbers, { color: colors.mutedForeground }]}>
                {formatBytes(quota.usedBytes)} / {formatBytes(quota.totalBytes)}
              </Text>
            </View>
            <View style={[styles.progressBg, { backgroundColor: colors.muted }]}>
              <View style={[styles.progressFill, { width: `${quotaPct}%`, backgroundColor: isDanger ? "#ef4444" : isWarning ? "#f59e0b" : colors.primary }]} />
            </View>
          </View>
        )}

        {/* Folders */}
        {folders.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Folders</Text>
            <View style={[styles.folderGrid, { borderColor: colors.border }]}>
              {folders.map((folder, i) => (
                <Pressable
                  key={folder.path}
                  onPress={() => navigateTo(folder.path)}
                  onLongPress={() => handleDeleteFolder(folder)}
                  style={({ pressed }) => [
                    styles.folderItem,
                    {
                      borderBottomColor: colors.border,
                      borderBottomWidth: i < folders.length - 1 ? StyleSheet.hairlineWidth : 0,
                      backgroundColor: pressed ? colors.muted : colors.card,
                    },
                  ]}
                >
                  <View style={[styles.folderIcon, { backgroundColor: "#f59e0b18" }]}>
                    <Feather name="folder" size={18} color="#f59e0b" />
                  </View>
                  <Text style={[styles.folderName, { color: colors.foreground }]} numberOfLines={1}>{folder.name}</Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Files */}
        {files.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Files</Text>
            <View style={[styles.fileList, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {files.map((file, i) => (
                <View
                  key={file.id}
                  style={[styles.fileRow, { borderBottomColor: colors.border }, i === files.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={[styles.fileIcon, { backgroundColor: getMimeBg(file.mimeType) + "20" }]}>
                    <Feather name={getMimeIcon(file.mimeType) as any} size={15} color={getMimeBg(file.mimeType)} />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>{file.name}</Text>
                    <Text style={[styles.fileMeta, { color: colors.mutedForeground }]}>
                      {formatBytes(file.sizeBytes)} · {formatDate(file.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.fileActions}>
                    {currentFolder !== "/" && (
                      <Pressable onPress={() => handleMoveFile(file, "/")} style={styles.fileActionBtn} hitSlop={8}>
                        <Feather name="corner-up-left" size={15} color={colors.mutedForeground} />
                      </Pressable>
                    )}
                    <Pressable onPress={() => handleDownload(file)} style={styles.fileActionBtn} hitSlop={8}>
                      <Feather name="download" size={15} color={colors.mutedForeground} />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(file)} style={styles.fileActionBtn} hitSlop={8}>
                      <Feather name="trash-2" size={15} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Empty state */}
        {files.length === 0 && folders.length === 0 && !loading && (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="folder-plus" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {currentFolder === "/" ? "Your drive is empty" : "This folder is empty"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Tap upload to add files or create a folder
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

        {/* Upgrade plans */}
        {currentFolder === "/" && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>Get More Storage</Text>
            {purchaseError && <Text style={[styles.purchaseError, { color: "#dc2626" }]}>{purchaseError}</Text>}
            <View style={styles.plansGrid}>
              {plans.map((plan) => (
                <Pressable
                  key={plan.gb}
                  onPress={() => handleUpgrade(plan)}
                  disabled={isPurchasing || subscriptionLoading || !getRevenueCatPackage(plan)}
                  style={({ pressed }) => [
                    styles.planCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: pressed ? 0.85 : isPurchasing || subscriptionLoading || !getRevenueCatPackage(plan) ? 0.55 : 1,
                    },
                  ]}
                >
                  <View style={[styles.planIconWrap, { backgroundColor: colors.primary + "18" }]}>
                    <Feather name="cloud" size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.planLabel, { color: colors.foreground }]}>{plan.gb} GB</Text>
                  <Text style={[styles.planPrice, { color: colors.mutedForeground }]}>{getPlanPrice(plan)}</Text>
                  <View style={[styles.planBtn, { backgroundColor: colors.primary }]}>
                    {isPurchasing && selectedPlan?.gb === plan.gb
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.planBtnText}>{getRevenueCatPackage(plan) ? "Upgrade" : "Syncing"}</Text>}
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
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

      {/* Purchase confirm modal */}
      {selectedPlan && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Confirm Storage Upgrade</Text>
            <Text style={[styles.modalText, { color: colors.mutedForeground }]}>
              Subscribe to {selectedPlan.gb} GB cloud storage for {getPlanPrice(selectedPlan)}? You can cancel anytime from your app store account settings.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalCancel, { borderColor: colors.border }]} onPress={() => setSelectedPlan(null)}>
                <Text style={[styles.modalCancelText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalConfirm, { backgroundColor: colors.primary }]} onPress={confirmUpgrade} disabled={isPurchasing}>
                <Text style={styles.modalConfirmText}>{isPurchasing ? "Processing..." : "Subscribe"}</Text>
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
    gap: 8,
  },
  quotaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  quotaLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  quotaTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  planBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  planBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  quotaNumbers: { fontSize: 11, fontFamily: "Inter_400Regular" },
  progressBg: { height: 5, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 5, borderRadius: 3 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    marginBottom: 6,
    marginTop: 8,
  },
  folderGrid: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 8,
  },
  folderItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  folderIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  folderName: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  fileList: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fileIcon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  fileInfo: { flex: 1, gap: 2 },
  fileName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fileMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  fileActions: { flexDirection: "row", gap: 2 },
  fileActionBtn: { padding: 5 },
  emptyState: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 30,
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  uploadArea: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
    marginTop: 8,
  },
  uploadTitle: { fontSize: 13, fontFamily: "Inter_500Medium" },
  purchaseError: { fontSize: 12, fontFamily: "Inter_400Regular", paddingHorizontal: 16, marginBottom: 8 },
  plansGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10, marginBottom: 16 },
  planCard: { flex: 1, minWidth: "28%", borderRadius: 14, borderWidth: 1, padding: 12, gap: 5, alignItems: "center" },
  planIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  planLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  planPrice: { fontSize: 11, fontFamily: "Inter_400Regular" },
  planBtn: { marginTop: 4, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, width: "100%", alignItems: "center" },
  planBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  modalOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 24,
  },
  modal: { borderRadius: 20, padding: 22, width: "100%", gap: 16 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  folderInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: "Inter_400Regular" },
  modalButtons: { flexDirection: "row", gap: 10 },
  modalCancel: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  modalCancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  modalConfirm: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: "center" },
  modalConfirmText: { fontSize: 14, color: "#fff", fontFamily: "Inter_600SemiBold" },
});
