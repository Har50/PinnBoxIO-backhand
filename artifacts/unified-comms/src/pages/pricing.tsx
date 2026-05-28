import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { Check, Crown, Sparkles, Zap, HardDrive, Brain, Inbox as InboxIcon, ArrowLeft } from "lucide-react";
import { startUpgrade, type BillingCycle, type Currency } from "@/lib/subscription";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const prevDesc = meta?.getAttribute("content") ?? null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);
    return () => {
      document.title = prevTitle;
      if (meta && prevDesc !== null) meta.setAttribute("content", prevDesc);
    };
  }, [title, description]);
}

const PRICES = {
  monthly: { inr: { amount: "₹499", suffix: "/mo" }, usd: { amount: "$7.99", suffix: "/mo" } },
  annual: { inr: { amount: "₹3,999", suffix: "/yr" }, usd: { amount: "$59.99", suffix: "/yr" } },
};

export default function PricingPage() {
  usePageMeta(
    "Pricing — PinnboxIO",
    "PinnboxIO pricing: free forever with 1 GB storage and 20 AI requests/day. Pro from ₹499/month for unlimited AI and 25 GB storage. Cancel anytime.",
  );
  const [, navigate] = useLocation();
  const { isSignedIn } = useAuth();
  const [cycle, setCycle] = useState<BillingCycle>("annual");
  const [currency, setCurrency] = useState<Currency>("inr");
  const [busy, setBusy] = useState(false);

  const price = PRICES[cycle][currency];

  async function handleUpgrade() {
    if (busy) return;
    if (!isSignedIn) {
      navigate(`/sign-up?redirect_url=${encodeURIComponent(`${basePath}/pricing`)}`);
      return;
    }
    setBusy(true);
    try {
      await startUpgrade(cycle, currency);
    } catch (err: any) {
      alert(`Couldn't open checkout: ${err?.message || "Unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  function handleFreeCta() {
    if (isSignedIn) {
      navigate("/dashboard");
    } else {
      navigate("/sign-up");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="px-4 sm:px-8 py-5 border-b flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(isSignedIn ? "/dashboard" : "/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shadow-sm">
            PB
          </div>
          <span className="font-semibold tracking-tight">PinnboxIO</span>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 sm:px-6 pt-12 pb-8 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
          <Sparkles className="w-3 h-3" />
          Simple, honest pricing
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">
          Free forever. Upgrade when you need more.
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          Get started with 1 GB of storage and 20 AI requests per day. Upgrade to Pro for unlimited AI and 25 GB of cloud storage.
        </p>
      </section>

      {/* Toggles */}
      <section className="px-4 sm:px-6 pb-8 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3">
        {/* Cycle */}
        <div role="radiogroup" aria-label="Billing cycle" className="inline-flex rounded-full border border-border p-1 bg-muted/30">
          <button
            type="button"
            role="radio"
            aria-checked={cycle === "monthly"}
            onClick={() => setCycle("monthly")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              cycle === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={cycle === "annual"}
            onClick={() => setCycle("annual")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors relative ${
              cycle === "annual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
            <span className="absolute -top-2 -right-2 text-[10px] font-semibold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">
              -33%
            </span>
          </button>
        </div>

        {/* Currency */}
        <div role="radiogroup" aria-label="Currency" className="inline-flex rounded-full border border-border p-1 bg-muted/30">
          <button
            type="button"
            role="radio"
            aria-checked={currency === "inr"}
            onClick={() => setCurrency("inr")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              currency === "inr" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ₹ INR
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={currency === "usd"}
            onClick={() => setCurrency("usd")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              currency === "usd" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            $ USD
          </button>
        </div>
      </section>

      {/* Cards */}
      <section className="px-4 sm:px-6 pb-16 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Free */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <InboxIcon className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Free</h2>
          </div>
          <div className="mb-1">
            <span className="text-4xl font-bold">{currency === "inr" ? "₹0" : "$0"}</span>
            <span className="text-muted-foreground ml-1">/forever</span>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Everything you need to get started.</p>
          <ul className="space-y-2.5 mb-8 flex-1">
            {[
              "Unified inbox (Gmail + Outlook)",
              "20 AI requests per day",
              "1 GB cloud storage",
              "AI auto-categorization of files",
              "Calendar sync",
              "Contacts & search",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleFreeCta}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground font-medium text-sm hover:bg-muted/40 transition-colors"
          >
            {isSignedIn ? "Go to dashboard" : "Get started free"}
          </button>
        </div>

        {/* Pro */}
        <div
          className="relative rounded-2xl p-6 sm:p-8 flex flex-col text-white"
          style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-400 text-amber-950 text-xs font-bold uppercase tracking-wide">
            Most Popular
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4" />
            <h2 className="text-sm font-semibold uppercase tracking-wide">Pro</h2>
          </div>
          <div className="mb-1">
            <span className="text-4xl font-bold">{price.amount}</span>
            <span className="opacity-80 ml-1">{price.suffix}</span>
          </div>
          <p className="text-sm opacity-80 mb-6">
            {cycle === "annual" ? "Billed annually. Cancel anytime." : "Billed monthly. Cancel anytime."}
          </p>
          <ul className="space-y-2.5 mb-8 flex-1">
            {[
              { icon: Brain, text: "Unlimited AI requests across all models" },
              { icon: HardDrive, text: "25 GB cloud storage" },
              { icon: Zap, text: "Priority AI response speed" },
              { icon: Check, text: "All free features included" },
              { icon: Check, text: "Email & priority support" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2 text-sm">
                <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={busy}
            className="w-full px-4 py-2.5 rounded-lg bg-white text-indigo-600 font-semibold text-sm hover:bg-white/95 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4" />
            {busy ? "Opening checkout…" : isSignedIn ? "Upgrade to Pro" : "Sign up to upgrade"}
          </button>
          <p className="text-xs opacity-70 mt-3 text-center">Secure payment via Razorpay.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 sm:px-6 pb-16 max-w-3xl mx-auto">
        <h3 className="text-xl font-semibold mb-5 text-center">Common questions</h3>
        <div className="space-y-3">
          {[
            {
              q: "Can I cancel anytime?",
              a: "Yes. You can cancel from Settings → Subscription → Manage at any time. Your Pro access continues until the end of the period you've already paid for.",
            },
            {
              q: "What happens to my data if I downgrade?",
              a: "Your data stays put. If you go over the 1 GB free limit you simply can't upload new files until you're back under or upgrade again — nothing is deleted.",
            },
            {
              q: "Do you offer refunds?",
              a: "Yes, within the first 7 days of any new subscription. See our Refunds & Cancellations page for the full policy.",
            },
            {
              q: "Why two currencies?",
              a: "We're based in India and many of our customers are too, so we offer INR alongside USD. Pick whichever is more convenient.",
            },
          ].map(({ q, a }) => (
            <details key={q} className="group rounded-xl border border-border bg-card p-4">
              <summary className="cursor-pointer text-sm font-medium flex items-center justify-between">
                {q}
                <span className="text-muted-foreground text-xs ml-3 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} PinnboxIO. All rights reserved.</p>
          <nav className="flex flex-wrap items-center gap-4">
            {[
              { href: "/privacy", label: "Privacy Policy" },
              { href: "/terms", label: "Terms of Service" },
              { href: "/refunds", label: "Refunds & Cancellations" },
              { href: "/cookies", label: "Cookie Policy" },
            ].map((item) => (
              <a
                key={item.href}
                href={`${basePath}${item.href}`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
