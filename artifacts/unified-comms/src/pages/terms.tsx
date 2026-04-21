import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
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
            <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
            <p className="text-sm text-muted-foreground mt-2">Last updated: April 18, 2026 · Effective immediately</p>
          </div>

          <div className="prose prose-sm max-w-none text-foreground space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using PinnboxIO ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service. These Terms apply to all users of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                PinnboxIO is a unified communications platform that allows users to manage messages across multiple channels including email, WhatsApp, and LinkedIn in one place. The Service also provides cloud file storage, an AI assistant, and contact management tools.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify, suspend, or discontinue any part of the Service at any time with reasonable notice.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">3. User Accounts</h2>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>You must provide accurate and complete information when creating an account.</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You are responsible for all activities that occur under your account.</li>
                <li>You must notify us immediately of any unauthorized use of your account.</li>
                <li>You must be at least 16 years old to use the Service.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">4. Acceptable Use</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">You agree not to use the Service to:</p>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>Send spam, unsolicited messages, or bulk commercial communications.</li>
                <li>Violate any applicable laws or regulations.</li>
                <li>Infringe the intellectual property rights of others.</li>
                <li>Transmit harmful, offensive, or illegal content.</li>
                <li>Attempt to gain unauthorized access to our systems or other users' accounts.</li>
                <li>Reverse engineer, decompile, or disassemble any part of the Service.</li>
                <li>Use the Service to store or transmit malware or malicious code.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">5. Subscriptions and Payments</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Certain features of the Service, including additional cloud storage plans, are available on a paid subscription basis. By subscribing you agree to:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>Pay all fees associated with your chosen plan on the billing cycle you select.</li>
                <li>Keep your payment information current and accurate.</li>
                <li>Authorize us to charge your payment method for recurring subscription fees.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Mobile subscription payments are processed securely by RevenueCat and the applicable app store. We do not store your full payment card details. Prices are displayed in USD and may be subject to applicable taxes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">6. Data and Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your use of the Service is also governed by our{" "}
                <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>,
                which is incorporated into these Terms by reference. By using the Service you consent to our collection and use of data as described in that policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">7. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service and its original content, features, and functionality are owned by PinnboxIO and are protected by copyright, trademark, and other intellectual property laws. You retain ownership of all content you upload or transmit through the Service, and you grant us a limited license to store and process that content solely to provide the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">8. Disclaimers</h2>
              <p className="text-muted-foreground leading-relaxed">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. YOUR USE OF THE SERVICE IS AT YOUR OWN RISK.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">9. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, PINNBOXIO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">10. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may suspend or terminate your access to the Service at any time for violation of these Terms or for any other reason at our discretion. You may cancel your account at any time. Upon termination, your right to use the Service ceases immediately and we may delete your data in accordance with our data retention policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">11. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update these Terms from time to time. We will notify you of any material changes by email or by posting a notice in the Service. Your continued use of the Service after the effective date of the revised Terms constitutes your acceptance of the changes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">12. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these Terms, please contact us at{" "}
                <a href="mailto:legal@pinnboxio.net" className="text-primary hover:underline">legal@pinnboxio.net</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
