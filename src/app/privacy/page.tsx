import type { Metadata } from 'next';
import { LegalPageLayout, LegalSection, LegalSubsection } from '@/components/shared/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy | Wealix',
  description: 'Wealix Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" effectiveDate="27 March 2026" version="1.0">
      <LegalSection title="Introduction">
        <p>
          At Wealix, we handle some of the most sensitive data that exists — your personal financial
          life. We take that responsibility with the utmost seriousness. This Privacy Policy explains
          clearly and completely what data we collect, why we collect it, how we use it, who we share
          it with, and what rights you have over it.
        </p>
        <p>
          This Policy is written to comply with the Saudi Arabian Personal Data Protection Law (PDPL),
          enforced by the Saudi Data and Artificial Intelligence Authority (SDAIA) as of 14 September
          2024, the UAE Federal Data Protection Law, applicable Egyptian data protection regulations,
          and international best practices.
        </p>
      </LegalSection>

      <LegalSection title="1. Data Controller">
        <p>The data controller responsible for your personal data is:</p>
        <p>Wealix</p>
        <p>Email: privacy@wealix.app</p>
        <p>Website: https://wealix.app</p>
        <p>For Saudi Arabia residents, requests under the PDPL may be directed to: pdpl@wealix.app</p>
        <p>For UAE residents, requests may be directed to: uae-privacy@wealix.app</p>
      </LegalSection>

      <LegalSection title="2. Data We Collect">
        <p>We collect only the data that is necessary to provide the Service. We group this data into the following categories.</p>

        <LegalSubsection title="2.1 Account and Identity Data">
          <ul className="list-disc space-y-2 pl-6">
            <li>Full name, email address, and encrypted password (bcrypt, 12 rounds)</li>
            <li>Profile avatar (if uploaded)</li>
            <li>Date of birth year (for retirement calculations)</li>
            <li>Preferred language (Arabic or English)</li>
            <li>Preferred currency (SAR, AED, EGP, USD)</li>
            <li>Authentication tokens from Google OAuth if you sign in with Google</li>
            <li>IP address and browser/device metadata at login for security purposes</li>
            <li>Session metadata: device type, approximate location, last active time</li>
          </ul>
        </LegalSubsection>

        <LegalSubsection title="2.2 Financial Data You Provide">
          <p>This is the core data you voluntarily enter into the Service:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Income records: source, description, amount, currency, date, recurrence</li>
            <li>Expense records: category, description, merchant, amount, currency, date</li>
            <li>Investment portfolio: symbols, quantities, purchase prices, purchase dates, market</li>
            <li>Assets: type, name, estimated value, purchase date</li>
            <li>Liabilities: type, name, outstanding amount, interest rate, monthly payment</li>
            <li>Budget limits by category and month</li>
            <li>FIRE goal parameters: target amount, annual expenses, withdrawal rate</li>
            <li>Retirement plan parameters: ages, savings amounts, return rate assumptions</li>
            <li>Alert configurations: conditions, thresholds, types</li>
          </ul>
        </LegalSubsection>

        <LegalSubsection title="2.3 Receipt Images and OCR Data">
          <ul className="list-disc space-y-2 pl-6">
            <li>The original receipt image (uploaded or captured by camera)</li>
            <li>The raw OCR text extracted from the image by Tesseract.js</li>
            <li>Parsed fields: merchant name, total amount, date, currency, line items</li>
            <li>OCR confidence score</li>
            <li>Status of the receipt (linked to expense or not)</li>
          </ul>
          <p>Receipt images are stored in a private Supabase Storage bucket with access control and time-limited signed URLs.</p>
        </LegalSubsection>

        <LegalSubsection title="2.4 AI Conversation Data">
          <ul className="list-disc space-y-2 pl-6">
            <li>Full conversation history between you and the Wealix AI Advisor</li>
            <li>Token counts per message and model used (GPT-4o or GPT-4o-mini)</li>
            <li>The system prompt sent to OpenAI includes your summarized financial data (net worth, income, expenses, portfolio value, FIRE progress) to personalize responses. See Section 5 for how this works with OpenAI.</li>
          </ul>
        </LegalSubsection>

        <LegalSubsection title="2.5 Usage and Technical Data">
          <ul className="list-disc space-y-2 pl-6">
            <li>Pages visited, features used, and time spent (for service improvement)</li>
            <li>API response times and error logs (for performance monitoring)</li>
            <li>Sentry crash reports when errors occur (includes device info and anonymized stack trace)</li>
            <li>Rate limiting records (IP-based counts stored in Redis, auto-expire)</li>
          </ul>
        </LegalSubsection>

        <LegalSubsection title="2.6 Payment Data">
          <ul className="list-disc space-y-2 pl-6">
            <li>Subscription plan and status</li>
            <li>Billing period dates</li>
            <li>Moyasar-assigned subscription and payment identifiers</li>
          </ul>
          <p>We never store your card number, CVV, or full payment card details. All payment processing is handled exclusively by Moyasar on their PCI-DSS compliant infrastructure.</p>
        </LegalSubsection>

        <LegalSubsection title="2.7 Audit Logs">
          <p>A timestamped record of every create, update, and delete action you perform on your financial data retained for security accountability and legal compliance.</p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="3. Legal Bases for Processing">
        <p>Under the Saudi PDPL and applicable UAE law, we process your data on the following lawful bases:</p>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-secondary text-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Processing Activity</th>
                <th className="px-4 py-3 font-semibold">Legal Basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-muted-foreground">
              <tr><td className="px-4 py-3">Creating and managing your account</td><td className="px-4 py-3">Contractual necessity — required to deliver the Service</td></tr>
              <tr><td className="px-4 py-3">Storing your financial records</td><td className="px-4 py-3">Contractual necessity — core function of the Service</td></tr>
              <tr><td className="px-4 py-3">Processing subscription payments via Moyasar</td><td className="px-4 py-3">Contractual necessity and legal obligation</td></tr>
              <tr><td className="px-4 py-3">Receipt OCR and image storage</td><td className="px-4 py-3">Contractual necessity (feature you actively use)</td></tr>
              <tr><td className="px-4 py-3">AI Financial Advisor conversations</td><td className="px-4 py-3">Contractual necessity with explicit in-app consent for AI processing</td></tr>
              <tr><td className="px-4 py-3">Security logging and fraud prevention</td><td className="px-4 py-3">Legitimate interest — protecting you and the platform</td></tr>
              <tr><td className="px-4 py-3">Audit logging</td><td className="px-4 py-3">Legal obligation — regulatory compliance</td></tr>
              <tr><td className="px-4 py-3">Service performance monitoring (Sentry)</td><td className="px-4 py-3">Legitimate interest — maintaining service reliability</td></tr>
              <tr><td className="px-4 py-3">Sending transactional emails (alerts, billing)</td><td className="px-4 py-3">Contractual necessity</td></tr>
              <tr><td className="px-4 py-3">Marketing communications</td><td className="px-4 py-3">Consent — opt-in only, revocable anytime</td></tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="4. How We Use Your Data">
        <p>We use your data for the following specific purposes:</p>
        <LegalSubsection title="To deliver the Service">
          <ul className="list-disc space-y-2 pl-6">
            <li>Calculate and display your net worth, portfolio performance, FIRE progress, and retirement projections</li>
            <li>Generate budget comparisons and analytics charts</li>
            <li>Process receipt images and extract expense data via OCR</li>
            <li>Match your investment holdings to market prices via Polygon.io and CoinGecko</li>
            <li>Generate AI financial advisor responses personalized to your financial situation</li>
          </ul>
        </LegalSubsection>
        <LegalSubsection title="To operate the platform securely">
          <ul className="list-disc space-y-2 pl-6">
            <li>Authenticate your identity at login</li>
            <li>Detect and prevent unauthorized access, fraud, and abuse</li>
            <li>Enforce rate limits to protect service stability</li>
            <li>Maintain audit logs of data changes</li>
          </ul>
        </LegalSubsection>
        <LegalSubsection title="To process payments">
          <ul className="list-disc space-y-2 pl-6">
            <li>Share billing amount and subscription details with Moyasar for payment processing</li>
            <li>Handle subscription renewals, failures, and cancellations via webhook events</li>
          </ul>
        </LegalSubsection>
        <LegalSubsection title="To communicate with you">
          <ul className="list-disc space-y-2 pl-6">
            <li>Send alert notifications when your configured alerts are triggered</li>
            <li>Send billing confirmations, receipts, and payment failure notices</li>
            <li>Send important service updates and changes to Terms or Privacy Policy</li>
            <li>Send optional newsletter and feature announcements (consent required)</li>
          </ul>
        </LegalSubsection>
        <LegalSubsection title="To improve the Service">
          <ul className="list-disc space-y-2 pl-6">
            <li>Analyze anonymized, aggregated usage patterns to improve features</li>
            <li>Use crash reports and error logs to fix bugs</li>
            <li>Use anonymized financial data aggregates to improve AI model prompts</li>
          </ul>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="5. Third-Party Services and Data Sharing">
        <p>We share your data only as necessary and described below. We never sell your personal data to anyone.</p>
        <LegalSubsection title="5.1 OpenAI (AI Features)">
          <ul className="list-disc space-y-2 pl-6">
            <li>We send your conversation messages and a summarized financial context (net worth, income, expenses, portfolio, FIRE progress) to OpenAI&apos;s API.</li>
            <li>OpenAI processes this data to generate responses.</li>
            <li>Data sent to OpenAI is governed by OpenAI&apos;s Privacy Policy and API Data Usage Policies.</li>
            <li>Per OpenAI&apos;s API terms, data sent via the API is not used to train OpenAI&apos;s general models.</li>
            <li>Conversations are logged in our database and subject to our retention policy.</li>
          </ul>
        </LegalSubsection>
        <LegalSubsection title="5.2 Supabase (Database and Storage)">
          <p>All your financial data and receipt images are stored on Supabase (PostgreSQL + Storage). Supabase infrastructure is hosted on AWS Bahrain (me-south-1) region for MENA data residency compliance. Supabase processes data under a Data Processing Agreement as a data processor on our behalf.</p>
        </LegalSubsection>
        <LegalSubsection title="5.3 Upstash Redis (Caching and Rate Limiting)">
          <p>Stores temporary cached data (market prices, API responses) and rate limiting counters. No personal financial data is permanently stored in Redis. All Redis keys have automatic expiry (maximum 1 hour for market cache).</p>
        </LegalSubsection>
        <LegalSubsection title="5.4 Polygon.io and CoinGecko (Market Data)">
          <p>We send stock ticker symbols and cryptocurrency IDs to these services to retrieve current prices. These are not personally identifiable — they are market symbols, not linked to your name or account.</p>
        </LegalSubsection>
        <LegalSubsection title="5.5 Moyasar (Payments)">
          <p>We share your email, subscription amount, and plan details with Moyasar for payment processing. Moyasar is a SAMA-licensed payment gateway operating under Saudi financial regulations. Card data is processed entirely on Moyasar&apos;s infrastructure.</p>
        </LegalSubsection>
        <LegalSubsection title="5.6 Resend (Email)">
          <p>We use Resend to send transactional emails (alert notifications, billing receipts). Resend receives your email address and the content of each email.</p>
        </LegalSubsection>
        <LegalSubsection title="5.7 Sentry (Error Monitoring)">
          <p>Crash reports are sent to Sentry and include anonymized device/browser information and error stack traces. We configure Sentry to scrub personally identifiable information from error payloads before transmission.</p>
        </LegalSubsection>
        <LegalSubsection title="5.8 Vercel (Hosting)">
          <p>Wealix is deployed on Vercel&apos;s cloud infrastructure in the Bahrain region. Vercel processes request logs and infrastructure data as a data processor.</p>
        </LegalSubsection>
        <LegalSubsection title="5.9 Legal Requirements">
          <p>We may disclose your data to competent authorities if:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Required by a valid court order, subpoena, or legal process</li>
            <li>Required by SDAIA, SAMA, or other competent regulatory authority</li>
            <li>Necessary to prevent imminent physical harm or financial crime</li>
            <li>Required to enforce our Terms of Service</li>
          </ul>
          <p>We will notify you of any such request unless prohibited from doing so by law.</p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="6. Data Retention">
        <p>We retain your data for as long as your account is active and as required by law:</p>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-secondary text-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Data Type</th>
                <th className="px-4 py-3 font-semibold">Retention Period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-muted-foreground">
              <tr><td className="px-4 py-3">Account and profile data</td><td className="px-4 py-3">Until account deletion + 30 days</td></tr>
              <tr><td className="px-4 py-3">Financial records (income, expenses, investments)</td><td className="px-4 py-3">Until account deletion + 30 days</td></tr>
              <tr><td className="px-4 py-3">Receipt images</td><td className="px-4 py-3">Until deletion by user or account deletion + 30 days</td></tr>
              <tr><td className="px-4 py-3">OCR text data</td><td className="px-4 py-3">Until account deletion + 30 days</td></tr>
              <tr><td className="px-4 py-3">AI chat messages</td><td className="px-4 py-3">Until account deletion + 30 days</td></tr>
              <tr><td className="px-4 py-3">Audit logs</td><td className="px-4 py-3">5 years from creation (regulatory requirement)</td></tr>
              <tr><td className="px-4 py-3">Payment records</td><td className="px-4 py-3">7 years (Saudi VAT and financial recordkeeping law)</td></tr>
              <tr><td className="px-4 py-3">Security logs (IP, session)</td><td className="px-4 py-3">90 days</td></tr>
              <tr><td className="px-4 py-3">Backup copies</td><td className="px-4 py-3">Permanently deleted within 90 days of account deletion</td></tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="7. Your Rights Under PDPL and Applicable Law">
        <p>Under the Saudi Personal Data Protection Law (PDPL) and applicable UAE law, you have the following rights:</p>
        <p>7.1 Right of Access: You have the right to request a copy of all personal data we hold about you. We will respond within 30 days of a verified request.</p>
        <p>7.2 Right to Correction: You have the right to correct inaccurate or incomplete personal data. Most data can be corrected directly in your Account Settings.</p>
        <p>7.3 Right to Deletion: You have the right to request deletion of your personal data. You can exercise this right directly via Settings → Data → Delete Account. We will complete deletion within 30 days, subject to legal retention obligations noted in Section 6.</p>
        <p>7.4 Right to Data Portability: You have the right to receive your data in a structured, machine-readable format (JSON or CSV). Export is available directly from Account Settings at any time.</p>
        <p>7.5 Right to Withdraw Consent: Where processing is based on consent (marketing emails), you may withdraw consent at any time without penalty. This does not affect the lawfulness of prior processing.</p>
        <p>7.6 Right to Restrict Processing: In certain circumstances, you may request that we restrict processing of your data while a dispute is under review.</p>
        <p>7.7 Right to Object: You may object to processing based on legitimate interests. We will comply unless we have compelling legitimate grounds that override your interests.</p>
        <p>7.8 Right to Complain: You have the right to lodge a complaint with SDAIA (the Saudi Data and Artificial Intelligence Authority) at www.sdaia.gov.sa, or with the relevant data protection authority in your country of residence.</p>
        <p>To exercise any of these rights, contact us at privacy@wealix.app. We will verify your identity before processing any request. We will respond within 30 days (extendable to 60 days for complex requests with notification).</p>
      </LegalSection>

      <LegalSection title="8. Data Security">
        <p>We implement the following security measures to protect your data:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Encryption in transit: All data transmitted between your browser/app and our servers uses TLS 1.3</li>
          <li>Encryption at rest: Database data encrypted using AES-256 via Supabase</li>
          <li>Password security: bcrypt hashing with 12 rounds; passwords are never stored in plain text</li>
          <li>Authentication: JWT tokens with 24-hour expiry, secure HTTP-only cookies</li>
          <li>Rate limiting: Redis-based rate limiting on all API endpoints and authentication flows</li>
          <li>RBAC: Role-based access controls ensuring users can only access their own data</li>
          <li>Row-level security: Supabase row-level security policies enforced at the database level</li>
          <li>Signed URLs: Receipt images served only via time-limited signed URLs (1-hour expiry)</li>
          <li>Audit logging: All data modifications are logged with timestamp, action, and IP address</li>
          <li>Penetration testing: Periodic security reviews and testing</li>
        </ul>
        <p>Despite these measures, no system is perfectly secure. In the event of a data breach, we will notify affected users and SDAIA within the timeframes required by law.</p>
      </LegalSection>

      <LegalSection title="9. International Data Transfers">
        <p>Our primary infrastructure is located in the AWS Bahrain (me-south-1) region to maintain MENA data residency. However, some third-party processors (OpenAI, Resend, Sentry) operate servers outside Saudi Arabia and the UAE.</p>
        <p>For transfers of Saudi residents&apos; data outside the Kingdom:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>We ensure appropriate safeguards are in place as required by PDPL Article 29</li>
          <li>We conduct transfer impact assessments where required</li>
          <li>We include data protection clauses in our agreements with international processors</li>
        </ul>
      </LegalSection>

      <LegalSection title="10. Cookies and Tracking">
        <LegalSubsection title="10.1 We use the following types of cookies and storage">
          <p>Strictly Necessary:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Session authentication token (HTTP-only, secure, SameSite=Strict)</li>
            <li>CSRF protection token</li>
            <li>Language and theme preference (localStorage)</li>
          </ul>
          <p>Functional:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Sidebar collapse state (localStorage)</li>
            <li>Last viewed page for resume-on-return (sessionStorage)</li>
          </ul>
          <p>Analytics (optional, consent-based):</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Anonymized page view tracking to understand feature usage</li>
          </ul>
        </LegalSubsection>
        <p>10.2 We do not use third-party advertising cookies or tracking pixels. We do not share data with advertising networks.</p>
        <p>10.3 You may clear cookies and local storage at any time through your browser or device settings. Clearing session cookies will log you out.</p>
      </LegalSection>

      <LegalSection title="11. Children&apos;s Privacy">
        <p>The Service is not directed to children under the age of 18. We do not knowingly collect personal data from minors. If we become aware that we have collected data from a minor, we will delete it promptly. If you believe we have collected data from a minor, contact us at privacy@wealix.app.</p>
      </LegalSection>

      <LegalSection title="12. Changes to This Policy">
        <p>We may update this Privacy Policy periodically. When we make material changes:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>We will send an email notification to your registered address at least 14 days before changes take effect</li>
          <li>We will display a prominent notice within the app</li>
          <li>The &quot;Effective Date&quot; at the top will be updated</li>
        </ul>
        <p>Your continued use of the Service after the effective date constitutes acceptance of the updated policy. If you do not accept the changes you may delete your account and we will delete your data per this Policy.</p>
      </LegalSection>

      <LegalSection title="13. Contact and Complaints">
        <p>Privacy inquiries: privacy@wealix.app</p>
        <p>We commit to responding to all privacy inquiries within 10 business days and resolving them within 30 days.</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
