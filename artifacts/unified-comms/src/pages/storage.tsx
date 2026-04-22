import { useState, useEffect, useCallback, useRef } from "react";
import {
  HardDrive, Upload, File, FileText, FileImage, FileVideo, FileAudio,
  Download, Trash2, Loader2, CheckCircle2, AlertTriangle, Package,
  X, CloudUpload, Folder, FolderPlus, ChevronRight, MoveRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, { credentials: "include", ...opts });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

interface Quota { id: number; userId: string; totalBytes: number; usedBytes: number; planName: string; }
interface StorageFile { id: number; name: string; mimeType: string; sizeBytes: number; storageKey: string; folder: string; downloadCount: number; createdAt: string; }
interface StorageFolder { path: string; name: string; }
interface Plan { gb: number; label: string; priceId: string | null; unitAmount: number; currency: string; name?: string; }

function normPath(raw: string) {
  const p = ("/" + raw).replace(/\/+/g, "/").replace(/\/$/, "") || "/";
  return p;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <FileImage className="w-4 h-4" />;
  if (mimeType.startsWith("video/")) return <FileVideo className="w-4 h-4" />;
  if (mimeType.startsWith("audio/")) return <FileAudio className="w-4 h-4" />;
  if (mimeType.includes("pdf") || mimeType.includes("text")) return <FileText className="w-4 h-4" />;
  return <File className="w-4 h-4" />;
}

function getFileBg(mimeType: string) {
  if (mimeType.startsWith("image/")) return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
  if (mimeType.startsWith("video/")) return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
  if (mimeType.startsWith("audio/")) return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
  if (mimeType.includes("pdf")) return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
  return "bg-muted text-muted-foreground";
}

function QuotaBar({ quota }: { quota: Quota }) {
  const pct = quota.totalBytes > 0 ? Math.min(100, (quota.usedBytes / quota.totalBytes) * 100) : 0;
  const isWarning = pct > 80;
  const isDanger = pct > 95;
  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Storage</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{quota.planName}</span>
        </div>
        <span className="text-xs text-muted-foreground">{formatBytes(quota.usedBytes)} / {formatBytes(quota.totalBytes)}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", isDanger ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
      {isDanger && (
        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Storage almost full — upgrade to add more
        </p>
      )}
    </div>
  );
}

function Breadcrumb({ path, onNavigate }: { path: string; onNavigate: (p: string) => void }) {
  const segments = path === "/" ? [] : path.split("/").filter(Boolean);
  return (
    <nav className="flex items-center gap-1 text-sm mb-4 flex-wrap">
      <button onClick={() => onNavigate("/")} className={cn("hover:text-primary transition font-medium", segments.length === 0 ? "text-foreground" : "text-primary")}>
        My Drive
      </button>
      {segments.map((seg, idx) => {
        const segPath = "/" + segments.slice(0, idx + 1).join("/");
        const isLast = idx === segments.length - 1;
        return (
          <span key={segPath} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            <button
              onClick={() => !isLast && onNavigate(segPath)}
              className={cn("hover:text-primary transition font-medium", isLast ? "text-foreground cursor-default" : "text-primary")}
            >
              {seg}
            </button>
          </span>
        );
      })}
    </nav>
  );
}

function UploadArea({ onUpload }: { onUpload: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onUpload(f);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
      )}
    >
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
      <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm font-medium text-foreground">Drop a file here or click to upload</p>
      <p className="text-xs text-muted-foreground mt-0.5">Any file type supported</p>
    </div>
  );
}

export default function StoragePage() {
  const [currentFolder, setCurrentFolder] = useState("/");
  const [quota, setQuota] = useState<Quota | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [folders, setFolders] = useState<StorageFolder[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const newFolderRef = useRef<HTMLInputElement>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  const loadData = useCallback(async (folder = currentFolder) => {
    try {
      const [quotaRes, filesRes, foldersRes, plansRes] = await Promise.all([
        apiFetch<{ quota: Quota }>("/storage/quota"),
        apiFetch<{ files: StorageFile[] }>(`/storage/files?folder=${encodeURIComponent(folder)}`),
        apiFetch<{ folders: StorageFolder[] }>(`/storage/folders?folder=${encodeURIComponent(folder)}`),
        apiFetch<{ plans: Plan[] }>("/storage/plans"),
      ]);
      setQuota(quotaRes.quota);
      setFiles(filesRes.files);
      setFolders(foldersRes.folders);
      setPlans(plansRes.plans);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  }, [currentFolder]);

  useEffect(() => {
    setLoading(true);
    loadData(currentFolder);
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "success") {
      showToast("success", "Storage upgraded successfully!");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [currentFolder]);

  const navigateTo = useCallback((folder: string) => {
    setCurrentFolder(normPath(folder));
    setFiles([]);
    setFolders([]);
  }, []);

  const handleCreateFolder = useCallback(async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      await apiFetch("/storage/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentFolder: currentFolder }),
      });
      setShowNewFolder(false);
      setNewFolderName("");
      showToast("success", `Folder "${name}" created`);
      await loadData(currentFolder);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setCreatingFolder(false);
    }
  }, [newFolderName, currentFolder, loadData]);

  const handleDeleteFolder = useCallback(async (folder: StorageFolder) => {
    if (!confirm(`Delete "${folder.name}" and all files inside? This cannot be undone.`)) return;
    try {
      await apiFetch(`/storage/folders?folder=${encodeURIComponent(folder.path)}`, { method: "DELETE" });
      showToast("success", `"${folder.name}" deleted`);
      await loadData(currentFolder);
    } catch (err: any) {
      showToast("error", err.message);
    }
  }, [currentFolder, loadData]);

  const handleUpload = useCallback(async (file: File) => {
    if (!quota) return;
    if (file.size + quota.usedBytes > quota.totalBytes) {
      showToast("error", "Not enough storage space. Please upgrade your plan.");
      return;
    }
    setUploading(true);
    setUploadProgress(`Preparing upload for "${file.name}"…`);
    try {
      const { uploadUrl, storageKey } = await apiFetch<{ uploadUrl: string; storageKey: string }>("/storage/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, sizeBytes: file.size, folder: currentFolder }),
      });

      setUploadProgress(`Uploading "${file.name}"…`);
      const putRes = await fetch(uploadUrl, {
        method: "PUT", body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!putRes.ok) throw new Error("Upload to storage failed");

      setUploadProgress("Saving file record…");
      await apiFetch("/storage/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, mimeType: file.type, sizeBytes: file.size, storageKey, folder: currentFolder }),
      });

      showToast("success", `"${file.name}" uploaded`);
      await loadData(currentFolder);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }, [quota, currentFolder, loadData]);

  const handleDownload = useCallback(async (file: StorageFile) => {
    try {
      const { downloadUrl, fileName } = await apiFetch<{ downloadUrl: string; fileName: string }>(`/storage/files/${file.id}/download-url`);
      const a = document.createElement("a");
      a.href = downloadUrl; a.download = fileName; a.target = "_blank"; a.click();
    } catch (err: any) { showToast("error", err.message); }
  }, []);

  const handleDelete = useCallback(async (file: StorageFile) => {
    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/storage/files/${file.id}`, { method: "DELETE" });
      showToast("success", `"${file.name}" deleted`);
      await loadData(currentFolder);
    } catch (err: any) { showToast("error", err.message); }
  }, [loadData, currentFolder]);

  const handleMoveToRoot = useCallback(async (file: StorageFile) => {
    try {
      await apiFetch(`/storage/files/${file.id}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "/" }),
      });
      showToast("success", `Moved "${file.name}" to My Drive`);
      await loadData(currentFolder);
    } catch (err: any) { showToast("error", err.message); }
  }, [loadData, currentFolder]);

  const handleUpgrade = useCallback(async (plan: Plan) => {
    setUpgradeLoading(plan.gb);
    try {
      const { url } = await apiFetch<{ url: string }>("/storage/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: plan.priceId, gb: plan.gb }),
      });
      window.location.href = url;
    } catch (err: any) {
      showToast("error", err.message);
      setUpgradeLoading(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 min-h-0 h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border",
          toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
        )}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
          <button onClick={() => setToast(null)}><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Storage</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Upload, manage, and share your files securely</p>
        </div>
        <button
          onClick={() => { setShowNewFolder(true); setNewFolderName(""); setTimeout(() => newFolderRef.current?.focus(), 50); }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted/60 text-sm font-medium text-foreground transition"
        >
          <FolderPlus className="w-4 h-4" /> New Folder
        </button>
      </div>

      {/* New folder form */}
      {showNewFolder && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 flex items-center gap-3">
          <Folder className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <input
            ref={newFolderRef}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
            placeholder="Folder name"
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim() || creatingFolder}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 transition hover:opacity-90"
          >
            {creatingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create"}
          </button>
          <button onClick={() => setShowNewFolder(false)} className="text-muted-foreground hover:text-foreground transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {quota && <QuotaBar quota={quota} />}

      {/* Breadcrumb */}
      <Breadcrumb path={currentFolder} onNavigate={navigateTo} />

      {/* Upload area */}
      <div className="mb-5">
        <UploadArea onUpload={handleUpload} />
        {uploading && (
          <div className="mt-2.5 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> {uploadProgress}
          </div>
        )}
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div className="bg-card border border-border rounded-xl mb-4">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Folders</h2>
          </div>
          <div className="divide-y divide-border">
            {folders.map((folder) => (
              <div key={folder.path} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition group cursor-pointer" onClick={() => navigateTo(folder.path)}>
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <Folder className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="flex-1 text-sm font-medium text-foreground">{folder.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition"
                    title="Delete folder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      {files.length > 0 ? (
        <div className="bg-card border border-border rounded-xl mb-6">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Files</h2>
            <span className="text-xs text-muted-foreground">{files.length} file{files.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="p-2">
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 rounded-lg transition group">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", getFileBg(file.mimeType))}>
                  {getFileIcon(file.mimeType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)} · {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  {currentFolder !== "/" && (
                    <button onClick={() => handleMoveToRoot(file)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition" title="Move to My Drive">
                      <MoveRight className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => handleDownload(file)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition" title="Download">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(file)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : folders.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center mb-6">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">{currentFolder === "/" ? "Your drive is empty" : "This folder is empty"}</p>
          <p className="text-xs text-muted-foreground mt-1">Upload files or create a folder to get started</p>
        </div>
      ) : null}

      {/* Upgrade plans — only show at root */}
      {currentFolder === "/" && (
        <>
          <div className="mb-3 mt-2">
            <h2 className="text-base font-semibold text-foreground">Upgrade Storage</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Get more space with a monthly plan</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div key={plan.gb} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CloudUpload className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{plan.gb} GB Storage</p>
                    <p className="text-xs text-muted-foreground">{plan.unitAmount ? `$${(plan.unitAmount / 100).toFixed(2)}/mo` : "Free"}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={upgradeLoading === plan.gb}
                  className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {upgradeLoading === plan.gb ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Upgrade
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
