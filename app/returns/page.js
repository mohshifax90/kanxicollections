import Link from "next/link";
import { ChevronLeft, PackageCheck } from "lucide-react";
import { StorefrontShell } from "@/components/storefront-shell";

export const metadata = {
  title: "Returns Policy | Kanxi Collection",
  description: "Read the Kanxi Collection return windows, delivery timelines, and return conditions.",
};

export default function ReturnsPolicyPage() {
  return (
    <StorefrontShell active="/account">
      <div className="policy-page">
        <section className="policy-hero">
          <Link href="/account" className="policy-back-link">
            <ChevronLeft />
            <span>Back</span>
          </Link>
          <div className="policy-hero-card">
            <div className="policy-hero-icon" aria-hidden="true">
              <PackageCheck />
            </div>
            <p className="policy-eyebrow">Kanxi Collection</p>
            <h1>Returns Policy</h1>
            <p className="policy-intro">
              Please review the delivery timelines and return window carefully. Return requests must be raised soon after delivery.
            </p>
          </div>
        </section>

        <section className="policy-card">
          <h2>Delivery timelines</h2>
          <div className="policy-meta-grid">
            <div>
              <span className="policy-meta-label">Male&apos; & Hulhumale&apos;</span>
              <strong>About 2 hours</strong>
            </div>
            <div>
              <span className="policy-meta-label">Nationwide Maldives</span>
              <strong>1 to 7 days</strong>
            </div>
          </div>
        </section>

        <section className="policy-card">
          <h2>Return request window</h2>
          <ul className="policy-list">
            <li>Male&apos; and Hulhumale&apos; orders: return requests must be reported within 2 hours after delivery.</li>
            <li>Nationwide orders: return requests must be reported within 24 hours after delivery.</li>
          </ul>
        </section>

        <section className="policy-card">
          <h2>Eligible return reasons</h2>
          <ul className="policy-list">
            <li>You received the wrong item.</li>
            <li>The item arrived damaged, defective, or missing essential parts.</li>
            <li>You received the wrong shade, size, variant, or quantity compared to the confirmed order.</li>
          </ul>
        </section>

        <section className="policy-card">
          <h2>Return conditions</h2>
          <ul className="policy-list">
            <li>Items should be unused and returned in original packaging where possible.</li>
            <li>Tags, seals, and accessories should still be attached if applicable.</li>
            <li>Customers may be asked to share photos, video, or delivery proof before approval.</li>
          </ul>
        </section>

        <section className="policy-card">
          <h2>Non-returnable items</h2>
          <p>
            For hygiene and safety reasons, opened beauty, skincare, makeup, fragrance, or personal care items may not be accepted unless the item was delivered damaged, defective, or incorrect.
          </p>
        </section>

        <section className="policy-card">
          <h2>How to request a return</h2>
          <ol className="policy-list policy-list-numbered">
            <li>Contact Kanxi Collection with your order number as soon as the issue is noticed.</li>
            <li>Share clear photos or short video if the item is damaged, incorrect, or incomplete.</li>
            <li>Wait for confirmation before sending the item back or handing it to a rider.</li>
          </ol>
        </section>

        <section className="policy-card">
          <h2>Refunds and replacements</h2>
          <p>
            Once a return is reviewed and approved, we may offer a replacement, store credit, or refund based on stock availability, item condition, and payment status.
          </p>
        </section>

        <section className="policy-card">
          <h2>Important note</h2>
          <p>
            Requests raised after the allowed return window may not be accepted. Kanxi Collection reserves the right to reject returns that do not meet the conditions above.
          </p>
        </section>
      </div>
    </StorefrontShell>
  );
}
