export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: April 10, 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Overview</h2>
          <p className="text-gray-600 leading-relaxed">
            PinnboxIO ("we", "our", or "us") is a unified communications platform that lets you manage
            messages across multiple channels in one place. This Privacy Policy explains what information
            we collect, how we use it, and the choices you have.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-600">
            <li>
              <strong>Account information:</strong> Your name and email address when you sign in.
            </li>
            <li>
              <strong>Message data:</strong> Content of messages you send and receive through connected
              accounts (e.g. WhatsApp, email). This data is processed solely to deliver the service
              and is never sold to third parties.
            </li>
            <li>
              <strong>Connected account credentials:</strong> OAuth tokens or session credentials for
              third-party services you link. These are stored encrypted and used only to fetch your
              messages on your behalf.
            </li>
            <li>
              <strong>Usage data:</strong> Basic analytics such as feature usage and error logs to
              help us improve the app.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-600">
            <li>To provide, operate, and maintain the PinnboxIO service.</li>
            <li>To authenticate you and keep your account secure.</li>
            <li>To sync and display your messages from connected accounts.</li>
            <li>To diagnose technical problems and improve reliability.</li>
          </ul>
          <p className="mt-3 text-gray-600">
            We do not sell, trade, or rent your personal information to third parties.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Data Storage &amp; Security</h2>
          <p className="text-gray-600 leading-relaxed">
            Your data is stored in a secure, encrypted database. We use industry-standard security
            measures including TLS in transit and encryption at rest. Access to production data is
            strictly limited to authorised personnel.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Third-Party Services</h2>
          <p className="text-gray-600 leading-relaxed">
            PinnboxIO integrates with third-party messaging platforms (such as WhatsApp) on your
            behalf. Your use of those platforms is governed by their own privacy policies. We only
            access the data needed to display your messages within the app.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Data Retention</h2>
          <p className="text-gray-600 leading-relaxed">
            We retain your data for as long as your account is active. You may request deletion of
            your account and associated data at any time by contacting us. Upon deletion, your data
            will be permanently removed within 30 days.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Your Rights</h2>
          <p className="text-gray-600 leading-relaxed">
            Depending on your location, you may have rights to access, correct, or delete your
            personal data, or to restrict or object to its processing. To exercise any of these
            rights, please contact us at the address below.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Children's Privacy</h2>
          <p className="text-gray-600 leading-relaxed">
            PinnboxIO is not directed at children under the age of 13. We do not knowingly collect
            personal information from children. If you believe a child has provided us with personal
            information, please contact us and we will delete it promptly.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Changes to This Policy</h2>
          <p className="text-gray-600 leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of significant
            changes by updating the date at the top of this page. Continued use of the app after
            changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Contact Us</h2>
          <p className="text-gray-600 leading-relaxed">
            If you have any questions about this Privacy Policy, please contact us at{" "}
            <a
              href="mailto:privacy@commshub.app"
              className="text-blue-600 hover:underline"
            >
              privacy@commshub.app
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
