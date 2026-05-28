import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
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
            <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground mt-2">Last updated: May 27, 2026</p>
          </div>

          <div className="space-y-8 text-muted-foreground leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">1. Overview</h2>
              <p>
                PinnboxIO ("PinnboxIO," "we," "our," or "us") is a unified communications platform that helps you
                manage messages, files, and AI-assisted drafts across multiple channels in one place. This Privacy
                Policy explains what information we collect, how we use and share it, your rights, and how to
                contact us.
              </p>
              <p className="mt-3">
                This Policy applies to users of pinnboxio.net, the PinnboxIO web app, the PinnboxIO iOS app, and any
                future PinnboxIO apps.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">2. Data Controller</h2>
              <p>
                PinnboxIO is operated by <strong className="text-foreground">Plavena Corporation</strong>, registered
                at <strong className="text-foreground">SCO 202, The Summit, Ambala–Chandigarh Highway, Zirakpur, India – 140603</strong>. For all data protection
                inquiries, contact our Grievance Officer (Section 13).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">3. Information We Collect</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-foreground">Account information:</strong> Your name and email address when you sign in.</li>
                <li><strong className="text-foreground">Connected account data:</strong> OAuth tokens for third-party services you link (Gmail, Outlook, LinkedIn). Tokens are encrypted at rest. We never see or store your passwords.</li>
                <li><strong className="text-foreground">Message content:</strong> The subject, body, attachments, recipients, and metadata of messages you send, receive, or interact with through PinnboxIO.</li>
                <li><strong className="text-foreground">Files:</strong> Files you upload to PinnboxIO Storage.</li>
                <li><strong className="text-foreground">Voice input:</strong> Audio you record for voice-driven drafting. Audio is transcribed; raw audio is not retained after transcription unless you save it.</li>
                <li><strong className="text-foreground">Usage data:</strong> Feature usage, error logs, device type, and approximate location (from IP).</li>
                <li><strong className="text-foreground">Payment data:</strong> Subscription status and billing identifiers from our payment processors. We do not store your full payment card details.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">4. How We Use AI to Process Your Data</h2>
              <p>
                PinnboxIO uses third-party AI providers to draft replies, summarize messages, and answer questions
                about your inbox.
              </p>
              <p className="mt-3">
                When you use AI features, we send relevant content — which may include message subjects, bodies,
                attachments, contact names, and your voice transcripts — to one or more of the following providers
                to generate the requested AI output:
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-3">
                <li>OpenAI (GPT-4o and related models)</li>
                <li>Anthropic (Claude models)</li>
                <li>Google (Gemini models)</li>
              </ul>
              <p className="mt-3">Under our agreements with these providers:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Your data is not used to train any of their AI models.</li>
                <li>Your data is retained only briefly by the provider for abuse-monitoring purposes (typically 30 days) and is then deleted.</li>
                <li>Each provider operates under its own privacy and security commitments.</li>
              </ul>
              <p className="mt-3">
                You can disable AI features at any time in Settings. When disabled, no message content is sent to
                any AI provider.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">5. How We Use Your Information</h2>
              <p>We use the data above to:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Provide, operate, and maintain the PinnboxIO service.</li>
                <li>Authenticate you and keep your account secure.</li>
                <li>Sync, display, and search messages from your connected accounts.</li>
                <li>Generate AI drafts, summaries, and answers when you request them.</li>
                <li>Store and serve files you upload to PinnboxIO Storage.</li>
                <li>Process subscription payments through Razorpay (web) and RevenueCat with the applicable app store (mobile).</li>
                <li>Diagnose technical issues, improve reliability, and prevent abuse.</li>
                <li>Communicate service updates, security notices, and (if you opt in) product news.</li>
              </ul>
              <p className="mt-3">We do not sell, rent, or share your personal information with advertisers.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">6. Lawful Basis (GDPR / UK GDPR)</h2>
              <p>
                If you are in the European Economic Area, United Kingdom, or Switzerland, we process your personal
                data on the following lawful bases:
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong className="text-foreground">Performance of a contract</strong> — to provide the service you signed up for.</li>
                <li><strong className="text-foreground">Legitimate interests</strong> — to maintain security, prevent abuse, and improve reliability.</li>
                <li><strong className="text-foreground">Consent</strong> — for optional features such as AI processing and marketing communications.</li>
                <li><strong className="text-foreground">Legal obligation</strong> — where required by law.</li>
              </ul>
              <p className="mt-3">You may withdraw consent at any time.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">7. Subprocessors</h2>
              <p>We use the following subprocessors. Each is bound by contractual data protection obligations.</p>
              <div className="mt-4 border border-border rounded-xl overflow-hidden">
                <div className="bg-muted px-4 py-2 grid grid-cols-3 gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <span>Subprocessor</span>
                  <span>Purpose</span>
                  <span>Location</span>
                </div>
                {[
                  { name: "Google Cloud Storage", purpose: "File storage", location: "US, EU" },
                  { name: "Clerk", purpose: "Authentication", location: "US" },
                  { name: "Razorpay", purpose: "Web subscription payments", location: "India" },
                  { name: "RevenueCat", purpose: "Mobile subscription payments", location: "US" },
                  { name: "OpenAI", purpose: "AI text generation", location: "US" },
                  { name: "Anthropic", purpose: "AI text generation", location: "US" },
                  { name: "Google (Gemini)", purpose: "AI text generation", location: "US" },
                  { name: "Render", purpose: "Application hosting", location: "US" },
                  // TODO: Confirm analytics provider (GA4 currently loaded) and its data location.
                  { name: "Plausible Insights ehf.", purpose: "Privacy-friendly, cookie-less usage analytics (aggregate page views, referrers, device type — no personal identifiers)", location: "Iceland / EU" },
                ].map((row, i) => (
                  <div key={i} className="px-4 py-3 grid grid-cols-3 gap-4 border-t border-border text-sm">
                    <span className="text-foreground font-medium">{row.name}</span>
                    <span>{row.purpose}</span>
                    <span>{row.location}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3">Material changes to this list will be notified by email or in-app.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">8. International Transfers</h2>
              <p>
                PinnboxIO operates from India, and several subprocessors are based in the United States. For
                transfers outside your country, we rely on Standard Contractual Clauses (SCCs) or equivalent
                safeguards under applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">9. Data Security</h2>
              <p>
                Data is stored in encrypted databases. Files live in Google Cloud Storage and are served via
                presigned, access-controlled URLs. We use TLS in transit and encryption at rest. Production access
                is restricted to authorized personnel under formal access controls and audit logging.
              </p>
              <p className="mt-3">
                If we become aware of a breach affecting your data, we will notify you and applicable regulators as
                required by law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">10. Data Retention</h2>
              <p>
                We retain your data for as long as your account is active. You can delete your account at any time
                via Settings → Account or by emailing{" "}
                <a href="mailto:privacy@pinnboxio.net" className="text-primary hover:underline">privacy@pinnboxio.net</a>.
                Upon deletion, personal data is permanently removed within 30 days, subject to limited retention for
                legal, tax, or audit obligations. Backups containing deleted data cycle out within 90 days.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">11. Your Rights</h2>
              <p>
                Depending on your jurisdiction, you have the right to access, correct, delete, restrict, or object
                to processing of your personal data, receive a portable copy, withdraw consent, and lodge a
                complaint with your data protection authority.
              </p>
              <p className="mt-3">
                <strong className="text-foreground">Indian users (DPDP Act):</strong> You additionally have the right
                to nominate another person to exercise rights on your behalf and to grievance redressal through our
                Grievance Officer.
              </p>
              <p className="mt-3">
                Email{" "}
                <a href="mailto:privacy@pinnboxio.net" className="text-primary hover:underline">privacy@pinnboxio.net</a>{" "}
                to exercise any right. We respond within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">12. Children's Privacy</h2>
              <p>
                PinnboxIO is not directed at children. We do not knowingly collect personal data from users under 18
                in India, or under 16 in other jurisdictions. Contact{" "}
                <a href="mailto:privacy@pinnboxio.net" className="text-primary hover:underline">privacy@pinnboxio.net</a>{" "}
                if a child has provided data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">13. Grievance Officer (India)</h2>
              <p>In compliance with India's Digital Personal Data Protection Act, 2023:</p>
              <div className="bg-muted rounded-xl p-4 mt-3 space-y-1 text-sm">
                {/* TODO: Replace [GRIEVANCE OFFICER NAME] with the appointed officer's name. */}
                {/* TODO: Provision grievance@pinnboxio.net email alias (currently routes nowhere). */}
                <p className="text-foreground"><strong>Name:</strong> [GRIEVANCE OFFICER NAME]</p>
                <p><strong className="text-foreground">Email:</strong>{" "}
                  <a href="mailto:grievance@pinnboxio.net" className="text-primary hover:underline">grievance@pinnboxio.net</a>
                </p>
                <p><strong className="text-foreground">Address:</strong> Plavena Corporation, SCO 202, The Summit, Ambala–Chandigarh Highway, Zirakpur, India – 140603</p>
              </div>
              <p className="mt-3">Grievances are addressed within 7 working days.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">14. Cookies and Tracking</h2>
              <p>
                We use only essential session cookies. See our{" "}
                <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">15. Changes to This Policy</h2>
              <p>
                Material changes will be notified by email or in-app at least 14 days before they take effect. The
                "Last updated" date reflects the most recent revision.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">16. Contact Us</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-foreground">Privacy questions:</strong>{" "}
                  <a href="mailto:privacy@pinnboxio.net" className="text-primary hover:underline">privacy@pinnboxio.net</a>
                </li>
                <li><strong className="text-foreground">Grievance Officer (India):</strong>{" "}
                  <a href="mailto:grievance@pinnboxio.net" className="text-primary hover:underline">grievance@pinnboxio.net</a>
                </li>
                <li><strong className="text-foreground">Legal:</strong>{" "}
                  <a href="mailto:legal@pinnboxio.net" className="text-primary hover:underline">legal@pinnboxio.net</a>
                </li>
                <li><strong className="text-foreground">Address:</strong> Plavena Corporation, SCO 202, The Summit, Ambala–Chandigarh Highway, Zirakpur, India – 140603</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
