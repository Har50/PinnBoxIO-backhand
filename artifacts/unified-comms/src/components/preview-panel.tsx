import { useEffect, useRef } from "react";
import { X, Download, ExternalLink, FileText, Image, File, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export type PreviewItem =
  | { kind: "attachment"; filename: string; url: string; size: number; mimeType?: string }
  | { kind: "link"; url: string; title?: string };

interface PreviewPanelProps {
  item: PreviewItem | null;
  onClose: () => void;
}

function getFileCategory(filename: string, mimeType?: string): "image" | "pdf" | "other" {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const mime = mimeType?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif"].includes(ext) || mime.startsWith("image/")) return "image";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  return "other";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PreviewPanel({ item, onClose }: PreviewPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!item) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        className="w-full max-w-2xl bg-background border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="h-14 px-4 border-b flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            {item.kind === "attachment" ? (
              <div className="flex items-center gap-2">
                {getFileCategory(item.filename, item.mimeType) === "image" ? (
                  <Image className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : getFileCategory(item.filename, item.mimeType) === "pdf" ? (
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <File className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className="font-semibold text-sm truncate">{item.filename}</span>
                <span className="text-xs text-muted-foreground shrink-0">{formatBytes(item.size)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-semibold text-sm truncate">{item.title || item.url}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {item.kind === "attachment" && item.url && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" asChild>
                <a href={item.url} download={item.filename} target="_blank" rel="noreferrer">
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
              </Button>
            )}
            {item.kind === "link" && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" asChild>
                <a href={item.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Open</span>
                </a>
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {item.kind === "attachment" ? (
            <AttachmentPreview item={item} />
          ) : (
            <LinkPreview url={item.url} />
          )}
        </div>
      </div>
    </div>
  );
}

function AttachmentPreview({ item }: { item: Extract<PreviewItem, { kind: "attachment" }> }) {
  const category = getFileCategory(item.filename, item.mimeType);

  if (!item.url) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <File className="w-16 h-16 text-muted-foreground/30" />
        <p className="text-muted-foreground text-sm">Preview not available for this file type.</p>
      </div>
    );
  }

  if (category === "image") {
    return (
      <ScrollArea className="h-full">
        <div className="p-4 flex items-center justify-center min-h-full">
          <img
            src={item.url}
            alt={item.filename}
            className="max-w-full rounded-lg shadow-md object-contain"
            style={{ maxHeight: "calc(100vh - 120px)" }}
          />
        </div>
      </ScrollArea>
    );
  }

  if (category === "pdf") {
    return (
      <iframe
        src={item.url}
        className="w-full h-full border-0"
        title={item.filename}
        sandbox="allow-scripts allow-same-origin"
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
      <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
        <File className="w-10 h-10 text-muted-foreground/60" />
      </div>
      <div>
        <p className="font-semibold text-base mb-1">{item.filename}</p>
        <p className="text-sm text-muted-foreground mb-6">{formatBytes(item.size)}</p>
        <Button asChild>
          <a href={item.url} download={item.filename} target="_blank" rel="noreferrer">
            <Download className="w-4 h-4 mr-2" />
            Download File
          </a>
        </Button>
      </div>
    </div>
  );
}

function LinkPreview({ url }: { url: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 bg-muted/50 border-b flex items-center gap-2 shrink-0">
        <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground truncate font-mono">{url}</span>
      </div>
      <iframe
        src={url}
        className="w-full flex-1 border-0"
        title="Link preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
