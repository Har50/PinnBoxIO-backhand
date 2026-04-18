import { useState, useEffect, useCallback, useRef } from "react";
import {
  HardDrive, Upload, File, FileText, FileImage, FileVideo, FileAudio,
  Download, Trash2, Plus, Loader2, CheckCircle2, AlertTriangle, Package,
  ChevronRight, X, CloudUpload,
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

interface Quota {
  id: number;
  userId: string;
  totalBytes: number;
  usedBytes: number;
  planName: string;
}

interface StorageFile {
  id: number;
  name: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  folder: string;
  downloadCount: number;
  createdAt: string;
}

interface Plan {
  gb: number;
  label: string;
  priceId: string | null;
  unitAmount: number;
  currency: string;
  name?: string;
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

function QuotaBar({ quota }: { quota: Quota }) {
  const pct = quota.totalBytes > 0 ? Math.min(100, (quota.usedBytes / quota.totalBytes) * 100) : 0;
  const isWarning = pct > 80;
  const isDanger = pct > 95;

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Storage</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{quota.planName}</span>
        </div>
        <span className="text-xs text-muted-foreground">{formatBytes(quota.usedBytes)} / {formatBytes(quota.totalBytes)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isDanger ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isDanger && (
        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Storage almost full — upgrade to add more
        </p>
      )}
    </div>
  );
}

function PlanCard({ plan, onUpgrade, isLoading }: { plan: Plan; onUpgrade: (plan: Plan) => void; isLoading: boolean }) {
  const price = plan.unitAmount ? `$${(plan.unitAmount / 100).toFixed(2)}/mo` : "Free";
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <CloudUpload className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">{plan.gb} GB Storage</p>
          <p className="text-xs text-muted-foreground">{price}</p>
        </div>
      </div>
      <button
        onClick={() => onUpgrade(plan)}
        disabled={isLoading}
        className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Upgrade
      </button>
    </div>
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
        "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
      )}
    >
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm font-medium text-foreground">Drop a file here or click to upload</p>
      <p className="text-xs text-muted-foreground mt-1">Any file type supported</p>
    </div>
  );
}

function FileRow({ file, onDownload, onDelete }: { file: StorageFile; onDownload: (f: StorageFile) => void; onDelete: (f: StorageFile) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 rounded-lg transition group">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
        {getFileIcon(file.mimeType)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)} · {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={() => onDownload(file)}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(file)}
          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function StoragePage() {
  const [quota, setQuota] = useState<Quota | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  const loadData = useCallback(async () => {
    try {
      const [quotaRes, filesRes, plansRes] = await Promise.all([
        apiFetch<{ quota: Quota }>("/storage/quota"),
        apiFetch<{ files: StorageFile[] }>("/storage/files"),
        apiFetch<{ plans: Plan[] }>("/storage/plans"),
      ]);
      setQuota(quotaRes.quota);
      setFiles(filesRes.files);
      setPlans(plansRes.plans);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "success") {
      showToast("success", "Storage upgraded successfully!");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [loadData]);

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
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, sizeBytes: file.size }),
      });

      setUploadProgress(`Uploading "${file.name}"…`);
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!putRes.ok) throw new Error("Upload to storage failed");

      setUploadProgress("Saving file record…");
      await apiFetch("/storage/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, mimeType: file.type, sizeBytes: file.size, storageKey }),
      });

      showToast("success", `"${file.name}" uploaded successfully`);
      await loadData();
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }, [quota, loadData]);

  const handleDownload = useCallback(async (file: StorageFile) => {
    try {
      const { downloadUrl, fileName } = await apiFetch<{ downloadUrl: string; fileName: string }>(`/storage/files/${file.id}/download-url`);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileName;
      a.target = "_blank";
      a.click();
    } catch (err: any) {
      showToast("error", err.message);
    }
  }, []);

  const handleDelete = useCallback(async (file: StorageFile) => {
    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/storage/files/${file.id}`, { method: "DELETE" });
      showToast("success", `"${file.name}" deleted`);
      await loadData();
    } catch (err: any) {
      showToast("error", err.message);
    }
  }, [loadData]);

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

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Storage</h1>
        <p className="text-muted-foreground text-sm mt-1">Upload, manage, and share your files securely</p>
      </div>

      {quota && <QuotaBar quota={quota} />}

      <div className="mb-6">
        <UploadArea onUpload={handleUpload} />
        {uploading && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {uploadProgress}
          </div>
        )}
      </div>

      {files.length > 0 ? (
        <div className="bg-card border border-border rounded-xl mb-8">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Your Files</h2>
            <span className="text-xs text-muted-foreground">{files.length} file{files.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="p-2">
            {files.map((file) => (
              <FileRow key={file.id} file={file} onDownload={handleDownload} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-10 text-center mb-8">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No files yet</p>
          <p className="text-xs text-muted-foreground mt-1">Upload your first file using the area above</p>
        </div>
      )}

      <div className="mb-2">
        <h2 className="text-lg font-semibold text-foreground">Upgrade Storage</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Get more space with a monthly plan</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <PlanCard key={plan.gb} plan={plan} onUpgrade={handleUpgrade} isLoading={upgradeLoading === plan.gb} />
        ))}
      </div>
    </div>
  );
}
