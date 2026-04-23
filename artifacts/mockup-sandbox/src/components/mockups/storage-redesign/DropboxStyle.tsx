import { useState } from "react";
import {
  Folder, File, FileText, FileImage, FileVideo, FileAudio,
  Upload, FolderPlus, Search, ChevronRight, Download,
  Trash2, MoreHorizontal, HardDrive, Star, Clock,
  Home, ChevronDown, Plus, X, ScanLine, Image, Check,
} from "lucide-react";

const SAMPLE_FOLDERS = [
  { id: 1, name: "Design Assets", count: 24, starred: true },
  { id: 2, name: "Client Projects", count: 87, starred: false },
  { id: 3, name: "Invoices", count: 12, starred: true },
  { id: 4, name: "Marketing", count: 45, starred: false },
  { id: 5, name: "Videos", count: 8, starred: false },
];

const SAMPLE_FILES = [
  { id: 1, name: "Brand Guidelines v3.pdf", mime: "application/pdf", size: "4.2 MB", modified: "Apr 21, 2026", starred: false },
  { id: 2, name: "Hero Banner.png", mime: "image/png", size: "1.8 MB", modified: "Apr 19, 2026", starred: true },
  { id: 3, name: "Q1 Report.xlsx", mime: "application/excel", size: "892 KB", modified: "Apr 15, 2026", starred: false },
  { id: 4, name: "Product Demo.mp4", mime: "video/mp4", size: "87.3 MB", modified: "Apr 10, 2026", starred: false },
  { id: 5, name: "Meeting Notes.txt", mime: "text/plain", size: "24 KB", modified: "Apr 8, 2026", starred: false },
];

function FileIcon({ mime, size = 16 }: { mime: string; size?: number }) {
  const s = size;
  if (mime.startsWith("image/")) return <FileImage width={s} height={s} />;
  if (mime.startsWith("video/")) return <FileVideo width={s} height={s} />;
  if (mime.startsWith("audio/")) return <FileAudio width={s} height={s} />;
  if (mime.includes("pdf") || mime.includes("text")) return <FileText width={s} height={s} />;
  return <File width={s} height={s} />;
}

function FileBadge({ mime }: { mime: string }) {
  if (mime.startsWith("image/")) return <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">IMG</span>;
  if (mime.startsWith("video/")) return <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">VID</span>;
  if (mime.includes("pdf")) return <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">PDF</span>;
  return <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">FILE</span>;
}

export function DropboxStyle() {
  const [activeNav, setActiveNav] = useState<"home" | "files" | "starred" | "recent">("files");
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<number | null>(null);
  const [hoveredFolder, setHoveredFolder] = useState<number | null>(null);
  const [hoveredFile, setHoveredFile] = useState<number | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const usedGB = 3.8;
  const totalGB = 10;
  const usedPct = (usedGB / totalGB) * 100;

  const handleUpload = () => {
    setShowActionSheet(false);
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 2500);
  };

  return (
    <div className="flex h-screen w-full bg-[#1a1a2e] text-white font-sans overflow-hidden relative">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-[#16213e] border-r border-white/[0.06] flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
            <HardDrive className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base text-white tracking-tight">PinnboxIO</span>
        </div>

        {/* Search */}
        <div className="px-3 mb-3">
          <div className="flex items-center gap-2 bg-white/[0.07] rounded-lg px-3 py-2 border border-white/[0.08]">
            <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="bg-transparent text-xs text-white placeholder-gray-500 outline-none flex-1"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-2 flex-1 space-y-0.5">
          {[
            { id: "home", label: "Home", icon: Home },
            { id: "files", label: "My Drive", icon: Folder },
            { id: "starred", label: "Starred", icon: Star },
            { id: "recent", label: "Recent", icon: Clock },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveNav(id as typeof activeNav)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                activeNav === id
                  ? "bg-blue-600/20 text-blue-400 font-medium"
                  : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        {/* Upload action in sidebar */}
        <div className="px-3 py-3 border-t border-white/[0.06] space-y-2">
          <button
            onClick={handleUpload}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/30"
          >
            <Upload className="w-4 h-4" /> Upload
          </button>
          {/* Storage bar */}
          <div className="bg-white/[0.04] rounded-lg p-3">
            <div className="flex justify-between text-[11px] mb-2">
              <span className="text-gray-400">Storage</span>
              <span className="text-gray-300 font-medium">{usedGB} / {totalGB} GB</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <button className="mt-2 w-full text-[11px] text-blue-400 hover:text-blue-300 font-medium text-center">
              Get more storage →
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <button className="text-gray-400 hover:text-white transition">My Drive</button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-white font-medium">All Files</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowActionSheet(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-sm text-gray-300 border border-white/[0.08] transition"
            >
              <FolderPlus className="w-4 h-4" /> New Folder
            </button>
            <button
              onClick={handleUpload}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm text-white font-medium transition shadow-lg shadow-blue-900/30"
            >
              <Upload className="w-4 h-4" /> Upload files
            </button>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick access folders */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Folders</h2>
              <button className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
                See all <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {SAMPLE_FOLDERS.map((folder) => (
                <div
                  key={folder.id}
                  onMouseEnter={() => setHoveredFolder(folder.id)}
                  onMouseLeave={() => setHoveredFolder(null)}
                  className="group relative bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.14] rounded-xl p-4 cursor-pointer transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center mb-3">
                    <Folder className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="text-sm font-medium text-white truncate">{folder.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{folder.count} items</p>
                  {folder.starred && (
                    <Star className="absolute top-3 right-3 w-3 h-3 text-amber-400 fill-amber-400" />
                  )}
                  {hoveredFolder === folder.id && (
                    <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20">
                        <MoreHorizontal className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Files list */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Files</h2>
              <span className="text-xs text-gray-500">{SAMPLE_FILES.length} files</span>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="grid grid-cols-[2fr_1fr_1fr_auto] px-4 py-2.5 border-b border-white/[0.06]">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Modified</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Size</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-16 text-right">Actions</span>
              </div>
              {SAMPLE_FILES.map((file, idx) => (
                <div
                  key={file.id}
                  onMouseEnter={() => setHoveredFile(file.id)}
                  onMouseLeave={() => setHoveredFile(null)}
                  onClick={() => setSelectedFile(file.id === selectedFile ? null : file.id)}
                  className={`grid grid-cols-[2fr_1fr_1fr_auto] px-4 py-3 cursor-pointer transition-all ${
                    idx !== SAMPLE_FILES.length - 1 ? "border-b border-white/[0.04]" : ""
                  } ${
                    selectedFile === file.id
                      ? "bg-blue-600/10 border-l-2 border-l-blue-500"
                      : "hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.07] flex items-center justify-center flex-shrink-0 text-gray-400">
                      <FileIcon mime={file.mime} size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{file.name}</p>
                      <FileBadge mime={file.mime} />
                    </div>
                  </div>
                  <span className="text-sm text-gray-400 self-center">{file.modified}</span>
                  <span className="text-sm text-gray-400 self-center">{file.size}</span>
                  <div className="flex items-center gap-1 w-16 justify-end self-center">
                    {(hoveredFile === file.id || selectedFile === file.id) && (
                      <>
                        <button className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button className="w-7 h-7 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-gray-400 hover:text-red-400 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Floating + FAB */}
      <button
        onClick={() => setShowActionSheet(!showActionSheet)}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 shadow-2xl shadow-blue-900/50 flex items-center justify-center transition-all active:scale-95 z-20"
      >
        <Plus className={`w-7 h-7 text-white transition-transform ${showActionSheet ? "rotate-45" : ""}`} />
      </button>

      {/* Action sheet */}
      {showActionSheet && (
        <>
          <div className="absolute inset-0 z-10" onClick={() => setShowActionSheet(false)} />
          <div className="absolute bottom-24 right-6 z-30 bg-[#1e2a45] border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-56">
            <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Add to Drive</span>
              <button onClick={() => setShowActionSheet(false)}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            {[
              { icon: Upload, label: "Upload files", action: handleUpload },
              { icon: Image, label: "Upload photos", action: handleUpload },
              { icon: ScanLine, label: "Scan document", action: handleUpload },
              { icon: FolderPlus, label: "Create folder", action: handleUpload },
              { icon: FileText, label: "Create document", action: handleUpload },
            ].map(({ icon: Icon, label, action }) => (
              <button
                key={label}
                onClick={action}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.06] text-sm text-gray-300 hover:text-white transition"
              >
                <div className="w-8 h-8 rounded-xl bg-white/[0.07] flex items-center justify-center">
                  <Icon className="w-4 h-4 text-blue-400" />
                </div>
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Upload success toast */}
      {uploadSuccess && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-green-600 text-white text-sm font-medium rounded-xl shadow-xl">
          <Check className="w-4 h-4" /> File uploaded successfully
        </div>
      )}
    </div>
  );
}
