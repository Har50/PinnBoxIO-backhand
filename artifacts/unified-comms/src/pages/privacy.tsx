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
            <p className="text-sm text-muted-foreground mt-2">Last updated: April 18, 2026</p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Overview</h2>
              <p className="text-muted-foreground leading-relaxed">
                PinnboxIO ("we", "our", or "us") is a unified communications platform that lets you manage messages across multiple channels in one place. This Privacy Policy explains what information we collect, how we use it, and the choices you have.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Information We Collect</h2>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Account information:</strong> Your name and email address when you sign in.</li>
                <li><strong className="text-foreground">Message data:</strong> Content of messages you send and receive through connected accounts (e.g. WhatsApp, email, LinkedIn). This data is processed solely to deliver the service and is never sold to third parties.</li>
                <li><strong className="text-foreground">Connected account credentials:</strong> OAuth tokens or session credentials for third-party services you link. These are stored encrypted and used only to fetch your messages on your behalf.</li>
                <li><strong className="text-foreground">File storage data:</strong> Files you upload to PinnboxIO Storage are stored securely in our cloud and are accessible only to you.</li>
                <li><strong className="text-foreground">Usage data:</strong> Basic analytics such as feature usage and error logs to help us improve the app.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">How We Use Your Information</h2>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>To provide, operate, and maintain the PinnboxIO service.</li>
                <li>To authenticate you and keep your account secure.</li>
                <li>To sync and display your messages from connected accounts.</li>
                <li>To store and serve files you upload to PinnboxIO Storage.</li>
                <li>To process mobile subscription payments through RevenueCat and the applicable app store.</li>
                <li>To diagnose technical problems and improve reliability.</li>
              </ul>
              <p className="mt-3 text-muted-foreground">We do not sell, trade, or rent your personal information to third parties.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Data Storage & Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your data is stored in a secure, encrypted database. File uploads are stored in Google Cloud Storage with access-controlled presigned URLs. We use industry-standard security measures including TLS in transit and encryption at rest. Access to production data is strictly limited to authorised personnel.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Third-Party Services</h2>
              <p className="text-muted-foreground leading-relaxed">
                PinnboxIO integrates with third-party services (WhatsApp and LinkedIn) on your behalf. Your use of those platforms is governed by their own privacy policies. We only access the data needed to provide the requested features.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use essential session cookies to keep you logged in. We do not use advertising or tracking cookies. See our{" "}
                <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link> for details.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your data for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us. Upon deletion, your data will be permanently removed within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed">
                Depending on your location, you may have rights to access, correct, or delete your personal data, or to restrict or object to its processing. To exercise any of these rights, please contact us at the address below.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                PinnboxIO is not directed at children under the age of 16. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of significant changes by updating the date at the top of this page. Continued use of the app after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about this Privacy Policy, please contact us at{" "}
                <a href="mailto:privacy@pinnboxio.net" className="text-primary hover:underline">privacy@pinnboxio.net</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
