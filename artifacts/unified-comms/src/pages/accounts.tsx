import { useGetAccounts, useDeleteAccount, useCreateAccount } from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api-client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Plus, Trash2, ShieldCheck, CheckCircle2, AlertCircle, MessageCircle, Phone, ExternalLink, ChevronRight, Link2, Link2Off } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

type AccountType = "email" | "whatsapp" | "phone";

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  gmail: <Mail className="w-5 h-5 text-red-500" />,
  outlook: <Mail className="w-5 h-5 text-blue-500" />,
  yahoo: <Mail className="w-5 h-5 text-purple-500" />,
  imap: <Mail className="w-5 h-5 text-muted-foreground" />,
  other: <Mail className="w-5 h-5 text-muted-foreground" />,
  whatsapp: <MessageCircle className="w-5 h-5 text-emerald-500" />,
  phone: <Phone className="w-5 h-5 text-blue-500" />,
};

const PROVIDER_LABEL: Record<string, string> = {
  gmail: "Gmail",
  outlook: "Outlook",
  yahoo: "Yahoo Mail",
  imap: "IMAP Custom",
  other: "Other Email",
  whatsapp: "WhatsApp",
  phone: "Phone Number",
};

function AccountTypeCard({ type, selected, onClick }: { type: AccountType; selected: boolean; onClick: () => void }) {
  const config = {
    email: { icon: <Mail className="w-7 h-7 text-primary" />, label: "Email Account", desc: "Gmail, Outlook, Yahoo, IMAP" },
    whatsapp: { icon: <MessageCircle className="w-7 h-7 text-emerald-500" />, label: "WhatsApp", desc: "Link via WhatsApp Web (optional)" },
    phone: { icon: <Phone className="w-7 h-7 text-blue-500" />, label: "Phone Number", desc: "SMS & call tracking" },
  }[type];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-4 w-full p-4 rounded-xl border-2 text-left transition-all ${
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-muted hover:border-muted-foreground/30 hover:bg-muted/30"
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? "bg-background shadow-sm" : "bg-muted"}`}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{config.label}</div>
        <div className="text-xs text-muted-foreground">{config.desc}</div>
      </div>
      {selected && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
    </button>
  );
}

export default function Accounts() {
  const { data: accounts, isLoading, refetch } = useGetAccounts();
  const deleteAccount = useDeleteAccount();
  const createAccount = useCreateAccount();
  const { toast } = useToast();
  const [location] = useLocation();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<{ gmail: boolean; outlook: boolean } | null>(null);
  const [disconnecting, setDisconnecting] = useState<"gmail" | "outlook" | null>(null);

  useEffect(() => {
    apiFetch<{ gmail: boolean; outlook: boolean }>("/api/accounts/connected")
      .then(setOauthStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    if (connected === "gmail") {
      toast({ title: "Gmail connected successfully!" });
      setOauthStatus((prev) => ({ ...(prev ?? { outlook: false }), gmail: true }));
      refetch();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (connected === "outlook") {
      toast({ title: "Outlook connected successfully!" });
      setOauthStatus((prev) => ({ ...(prev ?? { gmail: false }), outlook: true }));
      refetch();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [location]);

  async function handleDisconnect(provider: "gmail" | "outlook") {
    setDisconnecting(provider);
    try {
      await apiFetch(`/api/auth/${provider}/disconnect`, { method: "DELETE" });
      setOauthStatus((prev) => prev ? { ...prev, [provider]: false } : null);
      toast({ title: `${provider === "gmail" ? "Gmail" : "Outlook"} disconnected` });
      refetch();
    } catch {
      toast({ title: "Failed to disconnect", variant: "destructive" });
    } finally {
      setDisconnecting(null);
    }
  }
  const [step, setStep] = useState<"type" | "form">("type");
  const [accountType, setAccountType] = useState<AccountType>("email");

  const [emailForm, setEmailForm] = useState({ name: "", email: "", provider: "gmail", color: "#0ea5e9" });
  const [waForm, setWaForm] = useState({ name: "WhatsApp", phone: "" });
  const [phoneForm, setPhoneForm] = useState({ name: "", phone: "", color: "#3b82f6" });

  function openAdd() {
    setStep("type");
    setAccountType("email");
    setEmailForm({ name: "", email: "", provider: "gmail", color: "#0ea5e9" });
    setWaForm({ name: "WhatsApp", phone: "" });
    setPhoneForm({ name: "", phone: "", color: "#3b82f6" });
    setIsAddOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let payload: any;
    if (accountType === "email") {
      payload = { name: emailForm.name, email: emailForm.email, provider: emailForm.provider, color: emailForm.color };
    } else if (accountType === "whatsapp") {
      payload = { name: waForm.name, phone: waForm.phone || null, provider: "whatsapp", color: "#25D366" };
    } else {
      payload = { name: phoneForm.name, phone: phoneForm.phone, provider: "phone", color: phoneForm.color };
    }

    createAccount.mutate({ data: payload }, {
      onSuccess: () => {
        toast({ title: "Account connected successfully" });
        setIsAddOpen(false);
        refetch();
      },
      onError: () => {
        toast({ title: "Failed to connect account", variant: "destructive" });
      },
    });
  }

  const handleDelete = (id: number) => {
    deleteAccount.mutate({ id }, {
      onSuccess: () => { toast({ title: "Account removed" }); refetch(); },
    });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Connected Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage email, WhatsApp, and phone accounts in your workspace.</p>
        </div>
        <Button className="gap-2 shadow-sm" onClick={openAdd}>
          <Plus className="w-4 h-4" />
          Add Account
        </Button>
      </div>

      {/* Gmail & Outlook OAuth Connect */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Email Integrations</h2>
        <p className="text-sm text-muted-foreground">Connect your personal Gmail or Outlook/Hotmail account. Each user connects their own account — your emails are private to you.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Gmail */}
          <Card className="border-border shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Gmail</span>
                  {oauthStatus?.gmail && <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 border-0 text-xs">Connected</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Google Mail account</p>
              </div>
              {oauthStatus?.gmail ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 text-destructive hover:text-destructive gap-1.5"
                  onClick={() => handleDisconnect("gmail")}
                  disabled={disconnecting === "gmail"}
                >
                  <Link2Off className="w-3.5 h-3.5" />
                  {disconnecting === "gmail" ? "…" : "Disconnect"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="flex-shrink-0 gap-1.5"
                  onClick={() => window.location.assign(`${BASE}/api/auth/gmail/connect`)}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Connect
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Outlook */}
          <Card className="border-border shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Outlook / Hotmail</span>
                  {oauthStatus?.outlook && <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 border-0 text-xs">Connected</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Microsoft account</p>
              </div>
              {oauthStatus?.outlook ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 text-destructive hover:text-destructive gap-1.5"
                  onClick={() => handleDisconnect("outlook")}
                  disabled={disconnecting === "outlook"}
                >
                  <Link2Off className="w-3.5 h-3.5" />
                  {disconnecting === "outlook" ? "…" : "Disconnect"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="flex-shrink-0 gap-1.5"
                  onClick={() => window.location.assign(`${BASE}/api/auth/outlook/connect`)}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Connect
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Account cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)
        ) : accounts?.length === 0 ? (
          <div className="col-span-full p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground">
            <Mail className="h-12 w-12 mb-4 opacity-20" />
            <h3 className="font-medium text-lg text-foreground mb-1">No accounts connected</h3>
            <p className="text-sm mb-4">Connect an email, WhatsApp, or phone account to get started.</p>
            <Button variant="outline" onClick={openAdd}>Add Account</Button>
          </div>
        ) : (
          accounts?.map(acc => {
            const isWhatsApp = acc.provider === "whatsapp";
            const isPhone = acc.provider === "phone";
            return (
              <Card key={acc.id} className="relative overflow-hidden group hover:border-primary/30 transition-colors shadow-sm">
                <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: acc.color || "var(--primary)" }} />
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border shadow-sm">
                        {PROVIDER_ICONS[acc.provider] ?? <Mail className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <div>
                        <CardTitle className="text-base">{acc.name}</CardTitle>
                        <CardDescription className="text-xs font-medium">{PROVIDER_LABEL[acc.provider] ?? acc.provider.toUpperCase()}</CardDescription>
                      </div>
                    </div>
                    {acc.isActive ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                        <AlertCircle className="w-3 h-3" /> Issue
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pb-4 space-y-4">
                  <div>
                    {acc.email && <div className="text-sm font-medium">{acc.email}</div>}
                    {acc.phone && <div className="text-sm font-medium">{acc.phone}</div>}
                    {isWhatsApp && !acc.phone && (
                      <div className="text-xs text-muted-foreground italic">No phone number linked</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      Connected on {format(new Date(acc.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>
                  {!isWhatsApp && !isPhone && (
                    <div className="bg-muted/40 rounded-md p-3 flex items-center justify-between">
                      <div className="text-xs font-medium text-muted-foreground">Unread Messages</div>
                      <div className="font-semibold">{acc.unreadCount}</div>
                    </div>
                  )}
                  {isWhatsApp && (
                    <a
                      href="https://web.whatsapp.com"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open WhatsApp Web
                    </a>
                  )}
                </CardContent>
                <CardFooter className="pt-0 flex justify-between border-t p-4 bg-muted/10">
                  <Button variant="ghost" size="sm" className="text-xs h-8 text-muted-foreground hover:text-foreground">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Re-sync
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 text-destructive hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(acc.id)}
                    disabled={deleteAccount.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Disconnect
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Account Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>
              {step === "type" ? "Add Account" : (
                <button onClick={() => setStep("type")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm font-normal mb-1 transition-colors">
                  ← Back
                </button>
              )}
            </DialogTitle>
          </DialogHeader>

          {step === "type" && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">Choose the type of account you want to connect.</p>
              <div className="flex flex-col gap-3">
                <AccountTypeCard type="email" selected={accountType === "email"} onClick={() => setAccountType("email")} />
                <AccountTypeCard type="whatsapp" selected={accountType === "whatsapp"} onClick={() => setAccountType("whatsapp")} />
                <AccountTypeCard type="phone" selected={accountType === "phone"} onClick={() => setAccountType("phone")} />
              </div>
              <div className="pt-2 flex justify-end">
                <Button onClick={() => setStep("form")} className="gap-2">
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === "form" && accountType === "email" && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border mb-2">
                <Mail className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Email Account</span>
              </div>
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={emailForm.provider} onValueChange={(v) => setEmailForm({ ...emailForm, provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail</SelectItem>
                    <SelectItem value="outlook">Outlook</SelectItem>
                    <SelectItem value="yahoo">Yahoo Mail</SelectItem>
                    <SelectItem value="imap">IMAP Custom</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input required value={emailForm.name} onChange={e => setEmailForm({ ...emailForm, name: e.target.value })} placeholder="e.g. Work Email" />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" required value={emailForm.email} onChange={e => setEmailForm({ ...emailForm, email: e.target.value })} placeholder="me@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Label Color</Label>
                <div className="flex items-center gap-3">
                  <Input type="color" value={emailForm.color} onChange={e => setEmailForm({ ...emailForm, color: e.target.value })} className="w-12 h-10 p-1 cursor-pointer" />
                  <span className="text-sm text-muted-foreground uppercase">{emailForm.color}</span>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t">
                <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createAccount.isPending}>Connect Account</Button>
              </div>
            </form>
          )}

          {step === "form" && accountType === "whatsapp" && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 mb-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">WhatsApp</span>
              </div>

              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  required
                  value={waForm.name}
                  onChange={e => setWaForm({ ...waForm, name: e.target.value })}
                  placeholder="e.g. My WhatsApp"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Phone Number</Label>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Optional</span>
                </div>
                <Input
                  type="tel"
                  value={waForm.phone}
                  onChange={e => setWaForm({ ...waForm, phone: e.target.value })}
                  placeholder="+1 555 000 0000"
                />
                <p className="text-xs text-muted-foreground">
                  You can link a phone number later. WhatsApp Web is always accessible from the sidebar.
                </p>
              </div>

              <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                <div className="font-medium text-foreground text-sm flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" /> WhatsApp Web integration
                </div>
                <p>WhatsApp messages are accessible through the embedded WhatsApp Web panel in the sidebar. Scan the QR code there to link your device.</p>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t">
                <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createAccount.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Add WhatsApp
                </Button>
              </div>
            </form>
          )}

          {step === "form" && accountType === "phone" && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 mb-2">
                <Phone className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Phone Number</span>
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input required value={phoneForm.name} onChange={e => setPhoneForm({ ...phoneForm, name: e.target.value })} placeholder="e.g. Business Line" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input required type="tel" value={phoneForm.phone} onChange={e => setPhoneForm({ ...phoneForm, phone: e.target.value })} placeholder="+1 555 000 0000" />
              </div>
              <div className="space-y-2">
                <Label>Label Color</Label>
                <div className="flex items-center gap-3">
                  <Input type="color" value={phoneForm.color} onChange={e => setPhoneForm({ ...phoneForm, color: e.target.value })} className="w-12 h-10 p-1 cursor-pointer" />
                  <span className="text-sm text-muted-foreground uppercase">{phoneForm.color}</span>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t">
                <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createAccount.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Phone className="w-4 h-4 mr-2" />
                  Add Phone Number
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
