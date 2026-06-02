import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Download, X, FileText, ExternalLink } from "lucide-react";

interface PdfViewerModalProps {
  open: boolean;
  onClose: () => void;
  url: string;
  filename?: string;
}

export function PdfViewerModal({ open, onClose, url, filename = "document.pdf" }: PdfViewerModalProps) {
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.click();
  };

  const handleOpenExternal = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl w-full h-[90vh] p-0 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0 bg-muted/20">
          <div className="w-7 h-7 rounded-md bg-blue-500/15 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <DialogTitle className="flex-1 text-sm font-medium truncate">{filename}</DialogTitle>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2.5" onClick={handleOpenExternal} title="Open in new tab">
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">Open</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2.5" onClick={handleDownload} title="Download">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">Download</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-muted/30">
          <iframe
            src={`${url}#toolbar=1&view=FitH`}
            title={filename}
            className="w-full h-full border-0"
            style={{ minHeight: 0 }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
