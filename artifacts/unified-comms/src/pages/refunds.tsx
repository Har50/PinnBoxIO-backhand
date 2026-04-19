import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function RefundsAndCancellations() {
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
                <span className="text-xs font-bold text-primary-foreground">PI</span>
              </div>
              <span className="text-sm font-semibold text-muted-foreground">PinnboxIO</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Refunds & Cancellations</h1>
            <p className="text-sm text-muted-foreground mt-2">Last updated: April 18, 2026</p>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-8">
            <p className="text-sm text-foreground font-medium">Summary</p>
            <p className="text-sm text-muted-foreground mt-1">
              You can cancel your subscription at any time. You will retain access until the end of your current billing period. We offer a 7-day money-back guarantee on all new paid plans.
            </p>
          </div>

          <div className="space-y-8 text-foreground">
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Money-Back Guarantee</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you are not satisfied with your purchase, you may request a full refund within <strong>7 days</strong> of your initial subscription payment. This applies to all new paid storage plans and applies only to the first payment of a subscription — not renewals.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                To request a refund within the guarantee period, contact us at{" "}
                <a href="mailto:billing@pinnboxio.net" className="text-primary hover:underline">billing@pinnboxio.net</a>{" "}
                with your account email and a brief description of the issue. We will process eligible refunds within 5–10 business days to your original payment method.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Cancelling Your Subscription</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">You can cancel your subscription at any time in one of two ways:</p>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>Go to <strong>Settings → Billing</strong> in the app and click "Manage Subscription".</li>
                <li>Email <a href="mailto:billing@pinnboxio.net" className="text-primary hover:underline">billing@pinnboxio.net</a> with your account email and request cancellation.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Once cancelled, your subscription will remain active until the end of your current billing period. You will not be charged again after that date. Your files and data will remain accessible until the end of the period, after which storage quota will revert to the free tier (2 GB).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Renewals</h2>
              <p className="text-muted-foreground leading-relaxed">
                Subscriptions renew automatically at the end of each billing period unless cancelled beforehand. We will send a reminder email at least 3 days before each renewal. Refunds are generally not issued for renewal charges unless you contact us within 48 hours of the charge and have not used the additional storage during that period.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Plan Upgrades & Downgrades</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you upgrade your storage plan mid-cycle, you will be charged a prorated amount for the remainder of the current period. If you downgrade, the change will take effect at the start of your next billing cycle — you will not receive a refund for the unused portion of the higher-tier plan.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Non-Refundable Items</h2>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>Subscription renewals beyond the 48-hour window.</li>
                <li>Any charges where significant use of the paid feature has occurred during the billing period.</li>
                <li>Charges for months already past when a cancellation request is received late.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Account Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                If your account is terminated due to a violation of our{" "}
                <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>,
                no refund will be issued regardless of the remaining subscription period.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Free Tier</h2>
              <p className="text-muted-foreground leading-relaxed">
                The free tier (2 GB storage, core messaging features) is always free and does not require a payment method. There is nothing to cancel or refund for free-tier usage.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Contact Billing Support</h2>
              <div className="bg-muted rounded-xl p-4 space-y-1">
                <p className="text-sm text-foreground font-medium">PinnboxIO Billing Support</p>
                <p className="text-sm text-muted-foreground">Email: <a href="mailto:billing@pinnboxio.net" className="text-primary hover:underline">billing@pinnboxio.net</a></p>
                <p className="text-sm text-muted-foreground">Response time: within 1 business day</p>
                <p className="text-sm text-muted-foreground">Hours: Monday–Friday, 9 AM–6 PM UTC</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
