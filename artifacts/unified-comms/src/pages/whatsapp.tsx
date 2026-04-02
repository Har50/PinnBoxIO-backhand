export default function WhatsApp() {
  return (
    <div className="h-full w-full flex flex-col">
      <div className="bg-amber-500/10 text-amber-600 p-3 text-center text-sm font-medium border-b border-amber-500/20">
        WhatsApp Web runs in this panel. Some browsers may require you to allow cross-site tracking or popups.
      </div>
      <div className="flex-1 w-full bg-slate-50">
        <iframe 
          src="https://web.whatsapp.com" 
          className="w-full h-full border-none"
          allow="camera; microphone; display-capture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
