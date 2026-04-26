import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <ArrowLeft className="w-4 h-4" />
          Back to PinnboxIO
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground">PB</span>
              </div>
              <span className="text-sm font-semibold text-muted-foreground">PinnboxIO</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Cookie Policy</h1>
            <p className="text-sm text-muted-foreground mt-2">Last updated: April 18, 2026</p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">What Are Cookies?</h2>
              <p className="text-muted-foreground leading-relaxed">
                Cookies are small text files stored on your device when you visit a website. They help the website remember your preferences and session information so you don't need to log in every time.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">How We Use Cookies</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">PinnboxIO uses a minimal set of cookies strictly necessary to operate the Service:</p>

              <div className="space-y-3">
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted px-4 py-2 grid grid-cols-3 gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <span>Cookie</span>
                    <span>Purpose</span>
                    <span>Duration</span>
                  </div>
                  {[
                    { name: "connect.sid", purpose: "Session authentication — keeps you logged in", duration: "Session / 30 days" },
                    { name: "csrf_token", purpose: "Cross-site request forgery protection", duration: "Session" },
                  ].map((row, i) => (
                    <div key={i} className="px-4 py-3 grid grid-cols-3 gap-4 border-t border-border">
                      <span className="text-sm font-mono text-foreground text-xs">{row.name}</span>
                      <span className="text-sm text-muted-foreground col-span-1">{row.purpose}</span>
                      <span className="text-sm text-muted-foreground">{row.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">What We Don't Use</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">We do not use:</p>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>Tracking or advertising cookies</li>
                <li>Third-party analytics cookies (e.g. Google Analytics)</li>
                <li>Social media tracking pixels</li>
                <li>Cross-site tracking technologies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Third-Party Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                When connecting LinkedIn or other third-party services via OAuth, those services may use cookies on their own pages.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Managing Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                You can control cookies through your browser settings. Disabling the session cookie (<code className="text-xs bg-muted px-1 py-0.5 rounded">connect.sid</code>) will prevent you from staying logged in, but all other features will still work if you re-authenticate. Deleting cookies will log you out of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about this Cookie Policy, email us at{" "}
                <a href="mailto:privacy@pinnboxio.net" className="text-primary hover:underline">privacy@pinnboxio.net</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
