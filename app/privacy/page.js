import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { StorefrontShell } from "@/components/storefront-shell";

export const metadata = {
  title: "Privacy Policy | Kanxi Collection",
  description: "Learn how Kanxi Collection collects, uses, and protects customer information.",
};

export default function PrivacyPolicyPage() {
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
              <ShieldCheck />
            </div>
            <p className="policy-eyebrow">Kanxi Collection</p>
            <h1>Privacy Policy</h1>
            <p className="policy-intro">
              We only collect the information needed to process orders, coordinate delivery, support your account, and keep your shopping experience secure.
            </p>
          </div>
        </section>

        <section className="policy-card">
          <div className="policy-meta-grid">
            <div>
              <span className="policy-meta-label">Store</span>
              <strong>Kanxi Collection</strong>
            </div>
            <div>
              <span className="policy-meta-label">Region</span>
              <strong>Maldives</strong>
            </div>
          </div>
        </section>

        <section className="policy-card">
          <h2>Information we collect</h2>
          <ul className="policy-list">
            <li>Your name, phone number, and delivery address.</li>
            <li>Order details, selected delivery type, and payment method.</li>
            <li>Transfer slip images or payment proof when bank transfer is used.</li>
            <li>Profile details you choose to save, such as date of birth or default address.</li>
            <li>Device and browser information needed to keep the website working properly.</li>
          </ul>
        </section>

        <section className="policy-card">
          <h2>How we use your information</h2>
          <ul className="policy-list">
            <li>To confirm, prepare, and deliver your orders.</li>
            <li>To send OTP login codes, order confirmations, delivery updates, and support messages.</li>
            <li>To verify payments and prevent fraud or misuse.</li>
            <li>To save your preferences for faster checkout and account access.</li>
            <li>To improve store operations, customer support, and delivery service quality.</li>
          </ul>
        </section>

        <section className="policy-card">
          <h2>When we share information</h2>
          <p>
            We do not sell your personal information. We may share limited order and contact details with trusted delivery, payment, SMS, hosting, and technical service providers only when needed to run Kanxi Collection.
          </p>
        </section>

        <section className="policy-card">
          <h2>Location and delivery data</h2>
          <p>
            If you choose to fetch your current location during checkout, we use that information only to help complete your delivery address, improve navigation for delivery, and reduce delivery issues.
          </p>
        </section>

        <section className="policy-card">
          <h2>Data storage and security</h2>
          <p>
            We use reasonable technical and administrative safeguards to protect customer data. No online platform can promise absolute security, but we work to keep your information protected and limited to business use only.
          </p>
        </section>

        <section className="policy-card">
          <h2>Your choices</h2>
          <ul className="policy-list">
            <li>You may ask to correct saved profile or address information.</li>
            <li>You may request removal of stored account information where legally and operationally possible.</li>
            <li>You can stop using saved account features at any time.</li>
          </ul>
        </section>

        <section className="policy-card">
          <h2>Policy updates</h2>
          <p>
            We may update this policy when our services, delivery process, payment methods, or legal obligations change. Updated versions will be published on this page.
          </p>
        </section>
      </div>
    </StorefrontShell>
  );
}
