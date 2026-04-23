import { useState } from "react";
import {
  Folder, File, FileText, FileImage, FileVideo, FileAudio,
  Upload, FolderPlus, Search, ChevronRight, Download,
  Trash2, MoreHorizontal, HardDrive, Star, Clock,
  Plus, X, ScanLine, Image, Grid3X3, List, Check,
  CloudUpload, Filter,
} from "lucide-react";

const SAMPLE_FOLDERS = [
  { id: 1, name: "Design Assets", count: 24, color: "from-violet-500 to-purple-600", bg: "bg-violet-50", text: "text-violet-600" },
  { id: 2, name: "Client Projects", count: 87, color: "from-blue-500 to-cyan-500", bg: "bg-blue-50", text: "text-blue-600" },
  { id: 3, name: "Invoices", count: 12, color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50", text: "text-emerald-600" },
  { id: 4, name: "Marketing", count: 45, color: "from-orange-400 to-amber-500", bg: "bg-orange-50", text: "text-orange-600" },
  { id: 5, name: "Videos", count: 8, color: "from-red-500 to-rose-600", bg: "bg-red-50", text: "text-red-600" },
  { id: 6, name: "Archive", count: 133, color: "from-gray-400 to-slate-500", bg: "bg-gray-50", text: "text-gray-600" },
];

const SAMPLE_FILES = [
  { id: 1, name: "Brand Guidelines v3.pdf", mime: "application/pdf", size: "4.2 MB", modified: "Today", starred: true },
  { id: 2, name: "Hero Banner.png", mime: "image/png", size: "1.8 MB", modified: "Yesterday", starred: false },
  { id: 3, name: "Q1 Report.xlsx", mime: "application/excel", size: "892 KB", modified: "Apr 15", starred: false },
  { id: 4, name: "Product Demo.mp4", mime: "video/mp4", size: "87.3 MB", modified: "Apr 10", starred: false },
  { id: 5, name: "Meeting Notes.txt", mime: "text/plain", size: "24 KB", modified: "Apr 8", starred: false },
  { id: 6, name: "Logo Pack.zip", mime: "application/zip", size: "12.4 MB", modified: "Apr 5", starred: false },
];

function MimeColor(mime: string) {
  if (mime.startsWith("image/")) return { icon: FileImage, bg: "bg-purple-100", text: "text-purple-600", label: "IMG" };
  if (mime.startsWith("video/")) return { icon: FileVideo, bg: "bg-red-100", text: "text-red-600", label: "VID" };
  if (mime.startsWith("audio/")) return { icon: FileAudio, bg: "bg-amber-100", text: "text-amber-600", label: "AUD" };
  if (mime.includes("pdf")) return { icon: FileText, bg: "bg-blue-100", text: "text-blue-600", label: "PDF" };
  return { icon: File, bg: "bg-gray-100", text: "text-gray-600", label: "FILE" };
}

export function ModernGrid() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const usedGB = 3.8;
  const totalGB = 10;
  const usedPct = (usedGB / totalGB) * 100;

  const handleUpload = () => {
    setShowActionSheet(false);
    setDragging(false);
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 2500);
  };

  const filters = ["All", "Folders", "Images", "Videos", "Documents"];

  return (
    <div
      className="min-h-screen bg-gray-50 font-sans relative"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); handleUpload(); }}
    >
      {/* Drag overlay */}
      {dragging && (
        <div className="absolute inset-0 z-40 bg-blue-600/10 border-4 border-dashed border-blue-500 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
            <CloudUpload className="w-12 h-12 text-blue-500 mx-auto mb-3" />
            <p className="text-lg font-bold text-gray-900">Drop files to upload</p>
            <p className="text-sm text-gray-500 mt-1">Files will be added to your current folder</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mr-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Drive</span>
          </div>

          {/* Search bar — full width */}
          <div className="flex-1 max-w-2xl">
            <div className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 rounded-2xl px-4 py-2.5 transition group">
              <Search className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files, folders, and more..."
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
              />
              <Filter className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpload}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition"
            >
              <Upload className="w-4 h-4" /> Upload
            </button>
            <button
              onClick={handleUpload}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition"
            >
              <FolderPlus className="w-4 h-4" /> New Folder
            </button>
            <button
              onClick={handleUpload}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition"
            >
              <ScanLine className="w-4 h-4" /> Scan
            </button>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 ml-2">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition ${viewMode === "list" ? "bg-white shadow text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition ${viewMode === "grid" ? "bg-white shadow text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Breadcrumb + filters */}
        <div className="px-6 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm">
            <button className="text-blue-600 font-medium hover:underline">My Drive</button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-700 font-medium">All Files</span>
          </div>
          <div className="flex items-center gap-2">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  activeFilter === f
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Storage quota banner */}
      <div className="mx-6 mt-4 bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-4">
        <HardDrive className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600 font-medium">Storage used</span>
            <span className="text-gray-500">{usedGB} GB of {totalGB} GB</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
              style={{ width: `${usedPct}%` }}
            />
          </div>
        </div>
        <button className="text-xs text-blue-600 font-semibold hover:underline flex-shrink-0">Upgrade</button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Folders section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Folder className="w-4 h-4" /> Folders
            </h2>
            <button className="text-xs text-blue-600 font-medium hover:underline">View all</button>
          </div>
          <div className="grid grid-cols-6 gap-3">
            {SAMPLE_FOLDERS.map((folder) => (
              <div
                key={folder.id}
                className="group bg-white border border-gray-100 hover:border-gray-300 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${folder.color} flex items-center justify-center mb-3 shadow-sm`}>
                  <Folder className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-semibold text-gray-800 truncate">{folder.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{folder.count} items</p>
              </div>
            ))}
          </div>
        </section>

        {/* Files section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" /> Recent Files
            </h2>
            <span className="text-xs text-gray-400">{SAMPLE_FILES.length} files</span>
          </div>

          {viewMode === "list" ? (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-[2fr_1fr_1fr_80px] px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Name</span>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Modified</span>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Size</span>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</span>
              </div>
              {SAMPLE_FILES.map((file, idx) => {
                const { icon: Icon, bg, text } = MimeColor(file.mime);
                return (
                  <div
                    key={file.id}
                    className={`grid grid-cols-[2fr_1fr_1fr_80px] px-4 py-3 hover:bg-blue-50/50 transition group ${
                      idx !== SAMPLE_FILES.length - 1 ? "border-b border-gray-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${text}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        {file.starred && <Star className="w-3 h-3 text-amber-400 fill-amber-400 inline" />}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500 self-center">{file.modified}</span>
                    <span className="text-sm text-gray-500 self-center">{file.size}</span>
                    <div className="flex items-center gap-1 justify-end self-center opacity-0 group-hover:opacity-100 transition">
                      <button className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {SAMPLE_FILES.map((file) => {
                const { icon: Icon, bg, text } = MimeColor(file.mime);
                return (
                  <div
                    key={file.id}
                    className="group bg-white border border-gray-100 hover:border-gray-300 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md"
                  >
                    <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center mb-3`}>
                      <Icon className={`w-6 h-6 ${text}`} />
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{file.size} · {file.modified}</p>
                    <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition">
                      <button className="flex-1 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-600 transition">Download</button>
                      <button className="w-8 h-7 rounded-lg bg-gray-50 hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Floating + FAB */}
      <button
        onClick={() => setShowActionSheet(!showActionSheet)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-500/30 flex items-center justify-center transition-all active:scale-95 z-20"
      >
        <Plus className={`w-7 h-7 text-white transition-transform duration-200 ${showActionSheet ? "rotate-45" : ""}`} />
      </button>

      {/* Action sheet */}
      {showActionSheet && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowActionSheet(false)} />
          <div className="fixed bottom-24 right-6 z-30 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden w-60">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Add to Drive</span>
              <button onClick={() => setShowActionSheet(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            {[
              { icon: Upload, label: "Upload files", desc: "From your device", color: "text-blue-600 bg-blue-50" },
              { icon: Image, label: "Upload photos", desc: "Images & videos", color: "text-purple-600 bg-purple-50" },
              { icon: ScanLine, label: "Scan document", desc: "Use your camera", color: "text-emerald-600 bg-emerald-50" },
              { icon: FolderPlus, label: "Create folder", desc: "Organize your files", color: "text-amber-600 bg-amber-50" },
              { icon: FileText, label: "New document", desc: "Start from scratch", color: "text-gray-600 bg-gray-50" },
            ].map(({ icon: Icon, label, desc, color }) => (
              <button
                key={label}
                onClick={handleUpload}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition"
              >
                <div className={`w-9 h-9 rounded-xl ${color.split(" ")[1]} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${color.split(" ")[0]}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Upload success toast */}
      {uploadSuccess && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white text-sm font-medium rounded-xl shadow-xl">
          <Check className="w-4 h-4" /> File uploaded successfully
        </div>
      )}
    </div>
  );
}
