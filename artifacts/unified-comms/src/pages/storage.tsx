import { useState, useEffect, useCallback, useRef } from "react";
import {
  HardDrive, Upload, File, FileText, FileImage, FileVideo, FileAudio,
  Download, Trash2, Loader2, AlertTriangle, Package,
  X, Folder, FolderPlus, ChevronRight, MoveRight, Search,
  Plus, ScanLine, Check, Sparkles, Send,
  SquareCheck, Square, Share2, Copy, Link as LinkIcon, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { getAuthHeaders } from "@/lib/api-client";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    ...opts,
    headers: { ...authHeaders, ...(opts.headers as Record<string, string> || {}) },
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

interface Quota { id: number; userId: string; totalBytes: number; usedBytes: number; planName: string; }
interface StorageFile { id: number; name: string; mimeType: string; sizeBytes: number; storageKey: string; folder: string; downloadCount: number; createdAt: string; isPublic?: boolean; shareToken?: string | null; category?: string | null; }
interface StorageFolder { path: string; name: string; }
type FileFilter = "all" | "photos" | "videos" | "audio" | "docs";

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

function getFileIcon(mimeType: string, cls = "w-4 h-4") {
  if (mimeType.startsWith("image/")) return <FileImage className={cls} />;
  if (mimeType.startsWith("video/")) return <FileVideo className={cls} />;
  if (mimeType.startsWith("audio/")) return <FileAudio className={cls} />;
  if (mimeType.includes("pdf") || mimeType.includes("text")) return <FileText className={cls} />;
  return <File className={cls} />;
}

function getFileColors(mimeType: string): { bg: string; text: string; badge: string } {
  if (mimeType.startsWith("image/")) return { bg: "bg-purple-500/15", text: "text-purple-400", badge: "IMG" };
  if (mimeType.startsWith("video/")) return { bg: "bg-red-500/15", text: "text-red-400", badge: "VID" };
  if (mimeType.startsWith("audio/")) return { bg: "bg-amber-500/15", text: "text-amber-400", badge: "AUD" };
  if (mimeType.includes("pdf")) return { bg: "bg-blue-500/15", text: "text-blue-400", badge: "PDF" };
  return { bg: "bg-white/10", text: "text-gray-400", badge: "FILE" };
}

function matchesFilter(mimeType: string, filter: FileFilter): boolean {
  if (filter === "all") return true;
  if (filter === "photos") return mimeType.startsWith("image/");
  if (filter === "videos") return mimeType.startsWith("video/");
  if (filter === "audio") return mimeType.startsWith("audio/");
  if (filter === "docs") return !mimeType.startsWith("image/") && !mimeType.startsWith("video/") && !mimeType.startsWith("audio/");
  return true;
}

const CATEGORY_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  invoice:      { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Invoice" },
  contract:     { bg: "bg-blue-500/15",    text: "text-blue-400",    label: "Contract" },
  receipt:      { bg: "bg-teal-500/15",    text: "text-teal-400",    label: "Receipt" },
  report:       { bg: "bg-indigo-500/15",  text: "text-indigo-400",  label: "Report" },
  presentation: { bg: "bg-orange-500/15",  text: "text-orange-400",  label: "Deck" },
  spreadsheet:  { bg: "bg-green-500/15",   text: "text-green-400",   label: "Sheet" },
  photo:        { bg: "bg-purple-500/15",  text: "text-purple-400",  label: "Photo" },
  video:        { bg: "bg-red-500/15",     text: "text-red-400",     label: "Video" },
  audio:        { bg: "bg-amber-500/15",   text: "text-amber-400",   label: "Audio" },
  code:         { bg: "bg-cyan-500/15",    text: "text-cyan-400",    label: "Code" },
  document:     { bg: "bg-gray-500/15",    text: "text-gray-400",    label: "Doc" },
  other:        { bg: "bg-gray-500/10",    text: "text-gray-500",    label: "Other" },
};

function CategoryBadge({ category }: { category?: string | null }) {
  if (!category) return null;
  const s = CATEGORY_STYLE[category];
  if (!s) return null;
  return (
    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded ml-1", s.bg, s.text)}>
      {s.label}
    </span>
  );
}

interface AiMessage { role: "user" | "assistant"; content: string; streaming?: boolean; }

function AiPanel({
  files,
  onClose,
  initialFileId,
  autoQuery,
}: {
  files: StorageFile[];
  onClose: () => void;
  initialFileId?: number | null;
  autoQuery?: string | null;
}) {
  const [selected, setSelected] = useState<Set<number>>(() =>
    initialFileId != null ? new Set([initialFileId]) : new Set()
  );
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSentRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (autoQuery && !autoSentRef.current && files.length > 0) {
      autoSentRef.current = true;
      setTimeout(() => {
        sendQueryWithContent(autoQuery);
      }, 150);
    }
  }, [autoQuery, files]);

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === files.length) setSelected(new Set());
    else setSelected(new Set(files.map((f) => f.id)));
  }

  async function sendQueryWithContent(q: string) {
    if (!q || streaming) return;

    const selectedFiles = files.filter((f) => selected.has(f.id));
    const context = selectedFiles.length > 0
      ? `The user has selected these files from their drive:\n${selectedFiles
          .map((f) => `- ${f.name} (${f.mimeType}, ${formatBytes(f.sizeBytes)}, uploaded ${formatDistanceToNow(new Date(f.createdAt), { addSuffix: true })}${f.category ? `, category: ${f.category}` : ""})`)
          .join("\n")}\n\nUser question: ${q}`
      : q;

    const userMsg: AiMessage = { role: "user", content: q };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);

    const assistantMsg: AiMessage = { role: "assistant", content: "", streaming: true };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const authHeaders = await getAuthHeaders();
      const convRes = await fetch(`${BASE}/api/ai/conversations`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ title: selectedFiles.length > 0 ? `Drive: ${selectedFiles[0].name}` : "Drive AI" }),
      });
      const convData = await convRes.json();
      const convId = convData.id;

      const msgRes = await fetch(`${BASE}/api/ai/conversations/${convId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ content: context, provider: "openai" }),
      });

      if (!msgRes.body) throw new Error("No stream");
      const reader = msgRes.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content ?? parsed.content ?? "";
              full += delta;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: full, streaming: true };
                return updated;
              });
            } catch {}
          }
        }
      }

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: full, streaming: false };
        return updated;
      });
    } catch (err: any) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: `Error: ${err.message}`, streaming: false };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  async function sendQuery() {
    const q = query.trim();
    if (!q) return;
    setQuery("");
    await sendQueryWithContent(q);
  }

  const allSelected = files.length > 0 && selected.size === files.length;

  return (
    <div className="flex flex-col h-full bg-background border-l border-white/[0.08] w-80 flex-shrink-0">
      {/* AI Panel Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <span className="text-sm font-semibold text-white">AI Assistant</span>
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* File selector */}
      <div className="border-b border-white/[0.07] flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-2.5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
            Select files to include
          </p>
          {files.length > 0 && (
            <button onClick={selectAll} className="text-xs text-blue-400 hover:text-blue-300 transition font-medium">
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>
        <div className="max-h-44 overflow-y-auto px-2 pb-2">
          {files.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-4">No files in this folder</p>
          ) : (
            files.map((file) => {
              const colors = getFileColors(file.mimeType);
              const isSelected = selected.has(file.id);
              return (
                <button
                  key={file.id}
                  onClick={() => toggleSelect(file.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-all",
                    isSelected ? "bg-violet-600/15 border border-violet-500/30" : "hover:bg-white/[0.04] border border-transparent"
                  )}
                >
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", colors.bg)}>
                    {getFileIcon(file.mimeType, cn("w-3.5 h-3.5", colors.text))}
                  </div>
                  <span className="flex-1 text-xs text-gray-300 truncate">{file.name}</span>
                  {isSelected
                    ? <SquareCheck className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                    : <Square className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" />
                  }
                </button>
              );
            })
          )}
        </div>
        {selected.size > 0 && (
          <div className="px-4 pb-2.5">
            <span className="text-xs text-violet-400 font-medium">
              {selected.size} file{selected.size !== 1 ? "s" : ""} selected
            </span>
          </div>
        )}
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <Sparkles className="w-8 h-8 text-violet-400/50 mb-3" />
            <p className="text-sm text-gray-500 font-medium">Ask AI about your files</p>
            <p className="text-xs text-gray-700 mt-1">Select files above, then ask a question below</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div className={cn(
              "max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed",
              msg.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-white/[0.06] border border-white/[0.07] text-gray-300"
            )}>
              {msg.content || (msg.streaming && <Loader2 className="w-3 h-3 animate-spin" />)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Query input */}
      <div className="p-3 border-t border-white/[0.07] flex-shrink-0">
        <div className="flex items-end gap-2 bg-white/[0.05] border border-white/[0.09] rounded-xl px-3 py-2.5">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendQuery(); } }}
            placeholder={selected.size > 0 ? `Ask about ${selected.size} file${selected.size !== 1 ? "s" : ""}…` : "Ask anything about your drive…"}
            rows={2}
            className="flex-1 bg-transparent text-xs text-white placeholder-gray-600 outline-none resize-none"
          />
          <button
            onClick={sendQuery}
            disabled={!query.trim() || streaming}
            className="flex-shrink-0 w-7 h-7 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center transition"
          >
            {streaming
              ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              : <Send className="w-3.5 h-3.5 text-white" />
            }
          </button>
        </div>
        <p className="text-[10px] text-gray-700 mt-1.5 text-center">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

export default function StoragePage() {
  const [currentFolder, setCurrentFolder] = useState("/");
  const [quota, setQuota] = useState<Quota | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [folders, setFolders] = useState<StorageFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredFile, setHoveredFile] = useState<number | null>(null);
  const [shareModal, setShareModal] = useState<{ file: StorageFile; link: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hoveredFolder, setHoveredFolder] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileFilter, setFileFilter] = useState<FileFilter>("all");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [analyzeTarget, setAnalyzeTarget] = useState<StorageFile | null>(null);
  const [aiSearchMode, setAiSearchMode] = useState(false);
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState<StorageFile[] | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "file"; item: StorageFile } | { type: "folder"; item: StorageFolder } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [failedUpload, setFailedUpload] = useState<{ file: File; error: string } | null>(null);

  const newFolderRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  const loadData = useCallback(async (folder = currentFolder) => {
    setLoadError(null);
    try {
      const [quotaRes, filesRes, foldersRes] = await Promise.all([
        apiFetch<{ quota: Quota }>("/storage/quota"),
        apiFetch<{ files: StorageFile[] }>(`/storage/files?folder=${encodeURIComponent(folder)}`),
        apiFetch<{ folders: StorageFolder[] }>(`/storage/folders?folder=${encodeURIComponent(folder)}`),
      ]);
      setQuota(quotaRes.quota);
      setFiles(filesRes.files);
      setFolders(foldersRes.folders);
    } catch (err: any) {
      setLoadError(err.message ?? "Failed to load files");
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
    setFileFilter("all");
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
    setDeleteConfirm({ type: "folder", item: folder });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      if (deleteConfirm.type === "file") {
        await apiFetch(`/storage/files/${deleteConfirm.item.id}`, { method: "DELETE" });
        showToast("success", `"${deleteConfirm.item.name}" deleted`);
      } else {
        await apiFetch(`/storage/folders?folder=${encodeURIComponent(deleteConfirm.item.path)}`, { method: "DELETE" });
        showToast("success", `"${deleteConfirm.item.name}" deleted`);
      }
      setDeleteConfirm(null);
      await loadData(currentFolder);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setDeleting(false);
    }
  }, [deleteConfirm, currentFolder, loadData]);

  const handleUpload = useCallback(async (file: File) => {
    if (!quota) return;
    if (file.size + quota.usedBytes > quota.totalBytes) {
      showToast("error", "Not enough storage space. Please upgrade your plan.");
      return;
    }
    setUploading(true);
    setFailedUpload(null);
    setShowActionSheet(false);
    setUploadProgress(`Preparing "${file.name}"…`);
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
      if (!putRes.ok) throw new Error("Upload to storage failed — please try again");
      setUploadProgress("Saving…");
      await apiFetch("/storage/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, mimeType: file.type, sizeBytes: file.size, storageKey, folder: currentFolder }),
      });
      showToast("success", `"${file.name}" uploaded successfully`);
      await loadData(currentFolder);
    } catch (err: any) {
      setFailedUpload({ file, error: err.message ?? "Upload failed" });
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
    setDeleteConfirm({ type: "file", item: file });
  }, []);

  const handleShare = useCallback(async (file: StorageFile) => {
    try {
      const { shareToken } = await apiFetch<{ shareToken: string; file: StorageFile }>(
        `/storage/files/${file.id}/share`,
        { method: "POST" }
      );
      const link = `${window.location.origin}${BASE}/api/storage/public/${shareToken}`;
      try {
        await navigator.clipboard.writeText(link);
        showToast("success", "Share link copied to clipboard");
      } catch {
        showToast("success", "Share link created");
      }
      await loadData(currentFolder);
      return link;
    } catch (err: any) {
      showToast("error", err.message);
      return null;
    }
  }, [loadData, currentFolder]);

  const handleUnshare = useCallback(async (file: StorageFile) => {
    try {
      await apiFetch(`/storage/files/${file.id}/share`, { method: "DELETE" });
      showToast("success", "Sharing disabled");
      await loadData(currentFolder);
    } catch (err: any) {
      showToast("error", err.message);
    }
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

  const openFilePicker = () => fileInputRef.current?.click();
  const openPhotoPicker = () => photoInputRef.current?.click();

  const handleAiSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setAiSearchResults(null); return; }
    setAiSearchLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`${BASE}/api/storage/search`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setAiSearchResults(data.files ?? []);
    } catch {
      setAiSearchResults([]);
    } finally {
      setAiSearchLoading(false);
    }
  }, []);

  const displayedFiles = aiSearchMode && aiSearchResults !== null
    ? aiSearchResults
    : files.filter((f) => {
        const matchesSearch = !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = matchesFilter(f.mimeType, fileFilter);
        return matchesSearch && matchesCat;
      });

  const filteredFiles = displayedFiles;
  const filteredFolders = (aiSearchMode && aiSearchResults !== null)
    ? []
    : fileFilter === "all"
      ? folders.filter((f) => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : [];

  const breadcrumbSegments = currentFolder === "/" ? [] : currentFolder.split("/").filter(Boolean);
  const usedPct = quota && quota.totalBytes > 0 ? Math.min(100, (quota.usedBytes / quota.totalBytes) * 100) : 0;
  const isWarning = usedPct > 80;
  const isDanger = usedPct > 95;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <div>
          <p className="text-base font-semibold text-white">Couldn't load your files</p>
          <p className="text-sm text-gray-500 mt-1">Your files are safe — there was a temporary connection issue.</p>
          <p className="text-xs text-gray-600 mt-1">{loadError}</p>
        </div>
        <button
          onClick={() => { setLoading(true); loadData(currentFolder); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition shadow-lg shadow-blue-900/30"
        >
          <Loader2 className="w-4 h-4" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background text-white overflow-hidden">
      {/* Main column */}
      <div
        className="flex flex-col flex-1 min-w-0 relative overflow-hidden"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
      >
        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
        <input ref={photoInputRef} type="file" accept="image/*,video/*,audio/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />

        {/* Drag overlay */}
        {dragging && (
          <div className="absolute inset-0 z-40 bg-blue-600/10 border-4 border-dashed border-blue-500 flex items-center justify-center backdrop-blur-sm pointer-events-none">
            <div className="bg-[#1a2744] rounded-2xl p-8 text-center shadow-2xl">
              <Upload className="w-12 h-12 text-blue-400 mx-auto mb-3" />
              <p className="text-lg font-bold text-white">Drop to upload</p>
              <p className="text-sm text-gray-400 mt-1">File will be added to the current folder</p>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={cn(
            "fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border",
            toast.type === "success"
              ? "bg-green-900/90 border-green-700 text-green-200"
              : "bg-red-900/90 border-red-700 text-red-200"
          )}>
            {toast.type === "success" ? <Check className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
            {toast.message}
            <button onClick={() => setToast(null)} className="ml-1 text-white/50 hover:text-white/80"><X className="w-3 h-3" /></button>
          </div>
        )}

        {/* ── Header ── */}
        <header className="flex-shrink-0 border-b border-white/[0.07] bg-background">
          {/* Search row */}
          <div className="flex items-center gap-3 px-5 py-3.5">
            <div className="flex-1 max-w-lg">
              <div className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2.5 border transition group",
                aiSearchMode
                  ? "bg-violet-600/10 border-violet-500/30 hover:bg-violet-600/15"
                  : "bg-white/[0.06] hover:bg-white/[0.09] border-white/[0.08]"
              )}>
                {aiSearchLoading
                  ? <Loader2 className="w-4 h-4 text-violet-400 animate-spin flex-shrink-0" />
                  : aiSearchMode
                    ? <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0" />
                    : <Search className="w-4 h-4 text-gray-500 group-hover:text-gray-400 flex-shrink-0" />
                }
                <input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (aiSearchMode) setAiSearchResults(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && aiSearchMode && searchQuery.trim()) {
                      handleAiSearch(searchQuery);
                    }
                  }}
                  placeholder={aiSearchMode ? "Describe what you're looking for… (press Enter)" : "Search My Drive…"}
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setAiSearchResults(null); }} className="text-gray-500 hover:text-gray-300">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => { setAiSearchMode((v) => !v); setSearchQuery(""); setAiSearchResults(null); }}
                  title={aiSearchMode ? "Switch to regular search" : "Switch to AI search"}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition flex-shrink-0",
                    aiSearchMode
                      ? "bg-violet-600 text-white hover:bg-violet-500"
                      : "bg-white/[0.08] text-gray-400 hover:text-violet-400 hover:bg-violet-600/10"
                  )}
                >
                  <Sparkles className="w-3 h-3" />
                  AI
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons row */}
          <div className="flex items-center gap-2 px-5 pb-3.5 overflow-x-auto scrollbar-none">
            {/* Files filter */}
            <button
              onClick={() => setFileFilter("all")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap flex-shrink-0",
                fileFilter === "all"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                  : "bg-white/[0.06] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.1]"
              )}
            >
              <File className="w-4 h-4" /> Files
            </button>

            {/* Add / Upload */}
            <button
              onClick={() => setShowActionSheet((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.1] transition whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-4 h-4" /> Add
            </button>

            {/* Photos & Video */}
            <button
              onClick={() => setFileFilter((prev) => prev === "photos" ? "videos" : prev === "videos" ? "audio" : "photos")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap flex-shrink-0",
                (fileFilter === "photos" || fileFilter === "videos" || fileFilter === "audio")
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-900/30"
                  : "bg-white/[0.06] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.1]"
              )}
            >
              <FileVideo className="w-4 h-4" />
              {fileFilter === "photos" ? "Photos" : fileFilter === "videos" ? "Videos" : fileFilter === "audio" ? "Audio" : "Media"}
            </button>

            {/* Scan */}
            <button
              onClick={openFilePicker}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.1] transition whitespace-nowrap flex-shrink-0"
            >
              <ScanLine className="w-4 h-4" /> Scan
            </button>

            {/* AI */}
            <button
              onClick={() => setShowAiPanel((v) => !v)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap flex-shrink-0",
                showAiPanel
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-900/30"
                  : "bg-white/[0.06] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.1]"
              )}
            >
              <Sparkles className="w-4 h-4" /> AI
            </button>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 px-5 pb-3 text-sm">
            <button
              onClick={() => navigateTo("/")}
              className={cn("font-medium transition", breadcrumbSegments.length === 0 ? "text-white" : "text-blue-400 hover:text-blue-300")}
            >
              My Drive
            </button>
            {breadcrumbSegments.map((seg, idx) => {
              const segPath = "/" + breadcrumbSegments.slice(0, idx + 1).join("/");
              const isLast = idx === breadcrumbSegments.length - 1;
              return (
                <span key={segPath} className="flex items-center gap-1">
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                  <button
                    onClick={() => !isLast && navigateTo(segPath)}
                    className={cn("font-medium transition", isLast ? "text-white cursor-default" : "text-blue-400 hover:text-blue-300")}
                  >
                    {seg}
                  </button>
                </span>
              );
            })}
          </div>
        </header>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Upload progress */}
          {uploading && (
            <div className="bg-blue-900/30 border border-blue-700/40 rounded-xl px-4 py-3 flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
              <p className="text-sm text-blue-300">{uploadProgress}</p>
            </div>
          )}

          {/* Upload failure — retry banner */}
          {failedUpload && !uploading && (
            <div className="bg-red-900/30 border border-red-700/40 rounded-xl px-4 py-3 flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-red-300 font-medium">Upload failed — "{failedUpload.file.name}"</p>
                <p className="text-xs text-red-500 mt-0.5">{failedUpload.error}</p>
              </div>
              <button
                onClick={() => handleUpload(failedUpload.file)}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition"
              >
                Retry
              </button>
              <button onClick={() => setFailedUpload(null)} className="flex-shrink-0 text-red-500 hover:text-red-300">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* New folder form */}
          {showNewFolder && (
            <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                <Folder className="w-4 h-4 text-amber-400" />
              </div>
              <input
                ref={newFolderRef}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
                placeholder="Folder name"
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-600"
              />
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || creatingFolder}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50 transition"
              >
                {creatingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create"}
              </button>
              <button onClick={() => setShowNewFolder(false)} className="text-gray-500 hover:text-gray-300 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Storage quota */}
          {quota && (
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 flex items-center gap-4">
              <HardDrive className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-400 font-medium">{quota.planName} plan</span>
                  <span className="text-gray-500">{formatBytes(quota.usedBytes)} of {formatBytes(quota.totalBytes)}</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all",
                      isDanger ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-gradient-to-r from-blue-500 to-violet-500"
                    )}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
                {isDanger && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Storage almost full</p>}
              </div>
            </div>
          )}

          {/* Data security notice */}
          {currentFolder === "/" && !uploading && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-500/[0.07] border border-emerald-500/[0.15]">
              <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-emerald-400/80">
                Your files are securely stored and tied to your account — they won't be lost if you sign out or refresh.
              </p>
            </div>
          )}

          {/* Empty state */}
          {filteredFolders.length === 0 && filteredFiles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.05] flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-base font-semibold text-gray-300">
                {searchQuery ? "No results found" : fileFilter !== "all" ? "No files in this category" : currentFolder === "/" ? "Your drive is empty" : "This folder is empty"}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {searchQuery ? "Try a different search term" : fileFilter !== "all" ? "Try uploading a file or switch to All" : "Upload a file or create a folder to get started"}
              </p>
              {!searchQuery && fileFilter === "all" && (
                <button
                  onClick={openFilePicker}
                  className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition shadow-lg shadow-blue-900/30"
                >
                  <Upload className="w-4 h-4" /> Upload first file
                </button>
              )}
            </div>
          )}

          {/* Folders */}
          {filteredFolders.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Folders · {filteredFolders.length}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredFolders.map((folder) => (
                  <div
                    key={folder.path}
                    onMouseEnter={() => setHoveredFolder(folder.path)}
                    onMouseLeave={() => setHoveredFolder(null)}
                    onClick={() => navigateTo(folder.path)}
                    className="group relative bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.14] rounded-xl p-4 cursor-pointer transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center mb-3">
                      <Folder className="w-5 h-5 text-amber-400" />
                    </div>
                    <p className="text-sm font-medium text-white truncate">{folder.name}</p>
                    {hoveredFolder === folder.path && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}
                        className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-red-400 opacity-0 group-hover:opacity-100 transition"
                        title="Delete folder"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Files */}
          {filteredFiles.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {fileFilter === "all" ? "Files" : fileFilter === "photos" ? "Photos" : fileFilter === "videos" ? "Videos" : fileFilter === "audio" ? "Audio" : "Files"} · {filteredFiles.length}
              </h2>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="grid grid-cols-[2fr_1fr_1fr_auto] px-4 py-2.5 border-b border-white/[0.05] bg-white/[0.02]">
                  <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Name</span>
                  <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider hidden sm:block">Modified</span>
                  <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider hidden sm:block">Size</span>
                  <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider text-right w-20">Actions</span>
                </div>
                {filteredFiles.map((file, idx) => {
                  const colors = getFileColors(file.mimeType);
                  const isHovered = hoveredFile === file.id;
                  return (
                    <div
                      key={file.id}
                      onMouseEnter={() => setHoveredFile(file.id)}
                      onMouseLeave={() => setHoveredFile(null)}
                      className={cn(
                        "grid grid-cols-[2fr_1fr_1fr_auto] px-4 py-3 transition-all cursor-default",
                        idx !== filteredFiles.length - 1 && "border-b border-white/[0.04]",
                        isHovered ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", colors.bg)}>
                          {getFileIcon(file.mimeType, cn("w-4 h-4", colors.text))}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{file.name}</p>
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", colors.bg, colors.text)}>
                              {colors.badge}
                            </span>
                            <CategoryBadge category={file.category} />
                          </div>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 self-center hidden sm:block">
                        {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                      </span>
                      <span className="text-sm text-gray-500 self-center hidden sm:block">
                        {formatBytes(file.sizeBytes)}
                      </span>
                      <div className={cn(
                        "flex items-center gap-1 justify-end self-center transition-opacity",
                        isHovered ? "opacity-100" : "opacity-0"
                      )}>
                        <button
                          onClick={() => {
                            setAnalyzeTarget(file);
                            setShowAiPanel(true);
                          }}
                          className="w-7 h-7 rounded-lg hover:bg-violet-600/20 flex items-center justify-center text-gray-500 hover:text-violet-400 transition"
                          title="Analyze with AI"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        {currentFolder !== "/" && (
                          <button onClick={() => handleMoveToRoot(file)}
                            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition" title="Move to My Drive">
                            <MoveRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {file.mimeType.startsWith("image/") && (
                          <button onClick={async () => {
                            setPreviewFile(file);
                            setPreviewUrl(null);
                            try {
                              const { downloadUrl } = await apiFetch<{ downloadUrl: string }>(`/storage/files/${file.id}/download-url`);
                              setPreviewUrl(downloadUrl);
                            } catch (err: any) { showToast("error", err.message); setPreviewFile(null); }
                          }}
                            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition" title="Preview">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={async () => {
                          const link = await handleShare(file);
                          if (link) setShareModal({ file, link });
                        }}
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center transition",
                            file.isPublic
                              ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                              : "hover:bg-white/10 text-gray-500 hover:text-white"
                          )}
                          title={file.isPublic ? "Shared — get link" : "Share"}>
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDownload(file)}
                          className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition" title="Download">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(file)}
                          className="w-7 h-7 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-gray-500 hover:text-red-400 transition" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Floating + FAB */}
        <button
          onClick={() => setShowActionSheet((v) => !v)}
          className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 shadow-2xl shadow-blue-900/50 flex items-center justify-center transition-all active:scale-95 z-20"
          title="Add"
        >
          <Plus className={cn("w-7 h-7 text-white transition-transform duration-200", showActionSheet && "rotate-45")} />
        </button>

        {/* Action sheet */}
        {showActionSheet && (
          <>
            <div className="absolute inset-0 z-10" onClick={() => setShowActionSheet(false)} />
            <div className="absolute bottom-24 right-6 z-30 bg-[#1a2035] border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-56">
              <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Add to My Drive</span>
                <button onClick={() => setShowActionSheet(false)} className="text-gray-500 hover:text-gray-300 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {[
                { icon: Upload, label: "Upload files", desc: "Any file type", action: () => { setShowActionSheet(false); openFilePicker(); } },
                { icon: FileImage, label: "Upload photos", desc: "Images & videos", action: () => { setShowActionSheet(false); openPhotoPicker(); } },
                { icon: ScanLine, label: "Scan document", desc: "Use your camera", action: () => { setShowActionSheet(false); openFilePicker(); } },
                { icon: FolderPlus, label: "Create folder", desc: "Organize files", action: () => { setShowActionSheet(false); setShowNewFolder(true); setNewFolderName(""); setTimeout(() => newFolderRef.current?.focus(), 50); } },
              ].map(({ icon: Icon, label, desc, action }) => (
                <button key={label} onClick={action}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.06] text-left transition">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── AI Panel (slides in from right) ── */}
      {showAiPanel && (
        <AiPanel
          files={files}
          onClose={() => { setShowAiPanel(false); setAnalyzeTarget(null); }}
          initialFileId={analyzeTarget?.id ?? null}
          autoQuery={analyzeTarget ? `Please analyze this file and give me a summary: "${analyzeTarget.name}". Include key information, important dates or figures, and any action items if applicable.` : null}
        />
      )}

      {/* Share modal */}
      {shareModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShareModal(null)}>
          <div className="bg-[#1a2035] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-emerald-400" /> Share file
                </h3>
                <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">{shareModal.file.name}</p>
              </div>
              <button onClick={() => setShareModal(null)} className="text-gray-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Anyone with this link can download this file. Disable sharing to revoke access.</p>
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2">
              <input
                readOnly
                value={shareModal.link}
                className="flex-1 bg-transparent text-xs text-white truncate outline-none"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                onClick={() => { navigator.clipboard.writeText(shareModal.link); showToast("success", "Link copied"); }}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                title="Copy"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
            </div>
            <div className="flex justify-between items-center mt-5">
              <button
                onClick={async () => { await handleUnshare(shareModal.file); setShareModal(null); }}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Disable sharing
              </button>
              <button
                onClick={() => setShareModal(null)}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => !deleting && setDeleteConfirm(null)}>
          <div className="bg-[#1a2035] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  {deleteConfirm.type === "folder" ? "Delete folder?" : "Delete file?"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px]">"{deleteConfirm.item.name}"</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-5">
              {deleteConfirm.type === "folder"
                ? "This will permanently delete the folder and all files inside it. This cannot be undone."
                : "This will permanently delete this file. This cannot be undone."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm font-medium text-gray-300 hover:bg-white/[0.06] transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image preview modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => { setPreviewFile(null); setPreviewUrl(null); }}>
          <button
            onClick={() => { setPreviewFile(null); setPreviewUrl(null); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition z-10"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute top-4 left-4 text-sm text-white/80 max-w-[60%] truncate">{previewFile.name}</div>
          <div className="max-w-[90vw] max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {!previewUrl ? (
              <Loader2 className="w-8 h-8 animate-spin text-white/60" />
            ) : (
              <img src={previewUrl} alt={previewFile.name} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
