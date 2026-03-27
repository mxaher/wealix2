import type { Metadata } from 'next';
import { LegalPageLayout, LegalSection, LegalSubsection } from '@/components/shared/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Terms of Service | Wealix',
  description: 'Wealix Terms of Service',
};

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" effectiveDate="27 March 2026" version="1.0">
      <LegalSection title="Part One — Agreement and Parties">
        <LegalSubsection title="1. Acceptance of Terms">
          <p>
            These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you
            (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;) and Wealix (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or
            &quot;our&quot;), governing your access to and use of the Wealix Personal Wealth Operating System,
            available at wealix.app and through any associated mobile applications (collectively, the
            &quot;Service&quot;).
          </p>
          <p>
            By creating an account, clicking &quot;I agree,&quot; or using the Service in any way, you confirm
            that you have read, understood, and agree to be bound by these Terms in their entirety.
            If you do not agree, you must not access or use the Service.
          </p>
          <p>
            If you are accepting these Terms on behalf of an organization, you represent and warrant
            that you have full authority to bind that organization to these Terms.
          </p>
        </LegalSubsection>

        <LegalSubsection title="2. Eligibility">
          <p>To use Wealix you must:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Be at least 18 years of age.</li>
            <li>Have the legal capacity to enter into a binding agreement under the laws of your country of residence.</li>
            <li>Not be prohibited from receiving the Service under applicable laws, including sanctions lists maintained by Saudi Arabia, UAE, or international bodies.</li>
            <li>Not have had a previous account terminated by Wealix for violation of these Terms.</li>
            <li>Provide accurate and truthful information during registration.</li>
          </ul>
          <p>
            Users in the Kingdom of Saudi Arabia, United Arab Emirates, Arab Republic of Egypt, and
            other jurisdictions where Wealix is offered must additionally comply with all applicable
            local financial, consumer protection, and data laws.
          </p>
        </LegalSubsection>

        <LegalSubsection title="3. Service Description">
          <p>Wealix is a personal wealth management platform that provides tools for:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Net worth tracking and financial dashboard</li>
            <li>Income and expense management</li>
            <li>Investment portfolio tracking across multiple global and regional markets</li>
            <li>FIRE (Financial Independence, Retire Early) goal planning</li>
            <li>Retirement planning projections</li>
            <li>Budget management</li>
            <li>Receipt scanning and OCR-based expense capture</li>
            <li>AI-powered financial insights and advisor chat</li>
            <li>Financial analytics and reporting</li>
          </ul>
          <p>
            <strong>IMPORTANT DISCLAIMER:</strong> Wealix is a personal finance management tool, not a
            licensed financial advisor, broker, dealer, investment advisor, or financial institution.
            Nothing on the Service constitutes financial advice, investment advice, legal advice, tax
            advice, or any other professional advice. All information, AI-generated recommendations,
            portfolio analyses, and projections are for informational and educational purposes only.
            You must make your own independent financial decisions and consult qualified licensed
            professionals before making any investment or financial decision. Past performance displayed
            is not indicative of future results.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="Part Two — Accounts and Access">
        <LegalSubsection title="4. Account Registration">
          <p>4.1 You must create an account to use the Service. You agree to provide accurate, current, and complete information at registration and keep it updated at all times.</p>
          <p>4.2 You are solely responsible for maintaining the confidentiality of your account credentials, including your password. You must use a strong, unique password and enable any available security features.</p>
          <p>4.3 You must immediately notify us at security@wealix.app if you suspect any unauthorized access to your account or security breach.</p>
          <p>4.4 You are responsible for all activity that occurs under your account, whether or not authorized by you, until you notify us of unauthorized access. We are not liable for any loss resulting from unauthorized use of your account.</p>
          <p>4.5 You may not create more than one personal account. Creating duplicate accounts to circumvent restrictions or extend trials is prohibited and will result in immediate termination of all associated accounts.</p>
          <p>4.6 When using Google OAuth or other third-party sign-in, your use of those services is also governed by their respective terms. We receive only the information you authorize those services to share.</p>
        </LegalSubsection>

        <LegalSubsection title="5. Account Security">
          <p>5.1 We implement industry-standard security measures including TLS encryption in transit, AES-256 encryption at rest, bcrypt password hashing, JWT authentication, rate limiting, and role-based access controls.</p>
          <p>5.2 You acknowledge that no system is completely secure and you use the Service at your own risk with respect to security breaches outside our reasonable control.</p>
          <p>5.3 We will never ask for your password via email, chat, or phone. Any such request should be treated as fraudulent.</p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="Part Three — Subscriptions and Billing">
        <LegalSubsection title="6. Subscription Plans">
          <p>6.1 Free Trial: New users receive a 14-day free trial with full Pro plan features. No credit card is required to start the trial. The trial begins on the date of account creation. Only one trial is permitted per person. Creating multiple accounts to obtain additional trials is a violation of these Terms.</p>
          <p>6.2 Core Plan: SAR 25.00 per month. Includes net worth dashboard, income and expense tracking, investment portfolio tracking, FIRE tracker, retirement planning, budget management, reports, and basic receipt OCR scanning.</p>
          <p>6.3 Pro Plan: SAR 49.00 per month. Includes everything in Core plus unlimited AI Financial Advisor messages, AI portfolio analysis, buy/sell/hold recommendations, smart rebalancing suggestions, multiple FIRE scenarios, custom smart alerts, monthly PDF reports, and AI-powered receipt OCR with auto-categorization.</p>
          <p>6.4 We reserve the right to modify plan pricing with at least 30 days&apos; written notice to existing subscribers before any price change takes effect. If you do not cancel before the price change takes effect, you agree to the new pricing.</p>
          <p>6.5 Features included in each plan may change from time to time. We will not materially reduce Core plan features without reasonable notice.</p>
        </LegalSubsection>

        <LegalSubsection title="7. Payment Terms">
          <p>7.1 Payments are processed by Moyasar, a licensed payment gateway regulated by the Saudi Arabian Monetary Authority (SAMA). Accepted payment methods include Mada, Visa, and Mastercard.</p>
          <p>7.2 Subscriptions are billed on a monthly recurring basis starting from the date the trial ends or the date you subscribe, whichever applies. Your subscription automatically renews each month unless cancelled before the renewal date.</p>
          <p>7.3 All prices are quoted in Saudi Riyals (SAR) and are inclusive of applicable VAT. Users outside Saudi Arabia are responsible for any additional local taxes, import duties, or fees that may apply in their jurisdiction.</p>
          <p>7.4 You authorize us to charge your payment method on file at the start of each billing period. If a payment fails, we will retry the charge and notify you. If payment remains unsuccessful for 7 days, your account will be downgraded to a limited access state and you will have an additional 7 days to update your payment information before subscription cancellation.</p>
          <p>7.5 All fees paid are non-refundable except as required by applicable law or as expressly stated in these Terms. If you cancel mid-month, you will retain access through the end of your current billing period and will not receive a pro-rated refund.</p>
          <p>7.6 In cases of billing errors clearly attributable to Wealix, we will apply a credit to your next billing cycle or issue a refund within 14 business days upon verification.</p>
        </LegalSubsection>

        <LegalSubsection title="8. Cancellation Policy">
          <p>8.1 You may cancel your subscription at any time from your Account Settings under the Subscription tab. Cancellation takes effect at the end of the current billing period. You will retain full plan access until that date.</p>
          <p>8.2 Cancellation does not delete your account or your data. Your data remains accessible at the free tier level after cancellation.</p>
          <p>8.3 To close your account entirely and request data deletion, use the Delete Account function in Settings. See Section 19 for data retention after deletion.</p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="Part Four — Acceptable Use">
        <LegalSubsection title="9. Permitted Use">
          <p>You may use the Service solely for personal, non-commercial wealth management purposes. Business or enterprise use requires a separate agreement with Wealix.</p>
        </LegalSubsection>

        <LegalSubsection title="10. Prohibited Conduct">
          <p>You must not:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Use the Service for any illegal purpose or in violation of any applicable law, including anti-money laundering laws, sanctions regulations, or financial crimes statutes.</li>
            <li>Input data relating to illegal assets, undeclared income, proceeds of crime, or any funds derived from prohibited activities.</li>
            <li>Attempt to reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of the Service.</li>
            <li>Use automated scripts, bots, scrapers, or crawlers to access, collect, or extract data from the Service.</li>
            <li>Sell, resell, sublicense, or transfer your account or access to any third party.</li>
            <li>Attempt to bypass security measures, rate limits, authentication systems, or access controls.</li>
            <li>Impersonate Wealix, its employees, or any other person or entity.</li>
            <li>Upload or transmit malicious code, viruses, or any software designed to damage or interfere with the Service.</li>
            <li>Use the AI features to generate harmful, fraudulent, defamatory, or illegal content.</li>
            <li>Attempt to exploit the 14-day trial multiple times by creating duplicate accounts.</li>
            <li>Use the Service to aggregate or resell financial data to third parties.</li>
          </ul>
          <p>Violation of any of these prohibitions may result in immediate account suspension or termination without notice or refund.</p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="Part Five — AI Features and Financial Data">
        <LegalSubsection title="11. AI Financial Advisor">
          <p>11.1 Nature of AI Advice: The AI Financial Advisor feature provides conversational financial information generated by artificial intelligence (OpenAI). These responses are not regulated financial advice and do not constitute recommendations from a licensed financial advisor, investment advisor, or broker.</p>
          <p>11.2 Islamic Finance: While the AI is designed to be aware of Islamic finance principles and to avoid recommending interest-bearing (riba) products, Wealix does not guarantee Shariah compliance of any output. Users are responsible for verifying compliance with applicable Islamic finance principles through their own scholars or advisors.</p>
          <p>11.3 AI Limitations: AI responses may be inaccurate, incomplete, or outdated. Market conditions, tax laws, and regulations change frequently. Always verify AI-generated information with current authoritative sources.</p>
          <p>11.4 No Professional Relationship: Use of the AI Advisor does not create a financial advisory, attorney-client, or any other professional relationship between you and Wealix.</p>
          <p>11.5 Conversation Storage: AI conversations are stored in our database linked to your account. They are used to provide context for future conversations and to improve the Service. See our Privacy Policy for details.</p>
        </LegalSubsection>

        <LegalSubsection title="12. Market Data and Investment Tracking">
          <p>12.1 Market data is sourced from third-party providers (Polygon.io, CoinGecko) and may be delayed, approximate, or unavailable for certain markets. Wealix is not responsible for the accuracy or timeliness of third-party market data.</p>
          <p>12.2 Portfolio valuations shown in Wealix are estimates based on available data and may differ from valuations provided by your actual broker or custodian.</p>
          <p>12.3 Wealix does not execute trades, hold assets, or act as a custodian of any kind. All investment transactions occur outside the Wealix platform through your own brokerage accounts.</p>
        </LegalSubsection>

        <LegalSubsection title="13. Receipt Scanning and OCR">
          <p>13.1 The receipt scanning and OCR feature uses Tesseract.js and optionally OpenAI to extract text from receipt images. OCR accuracy is not guaranteed and extracted data (merchant name, amount, date, category) may be inaccurate.</p>
          <p>13.2 You are responsible for reviewing and correcting all OCR-extracted data before saving it to your account. Any inaccuracies in extracted data that result in incorrect financial records are your responsibility.</p>
          <p>13.3 Receipt images are stored securely in Supabase Storage with private access controls and time-limited signed URLs. You may delete your receipt images at any time from the Receipts page.</p>
          <p>13.4 By uploading receipt images you confirm that you have the right to upload them and that they do not contain information about third parties who have not consented to such processing.</p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="Part Six — Intellectual Property">
        <LegalSubsection title="14. Wealix&apos;s Intellectual Property">
          <p>14.1 The Service, including its software, design, graphics, logos, text, charts, AI models, financial calculation algorithms, and all other content, is owned by or licensed to Wealix and is protected by copyright, trademark, and other intellectual property laws.</p>
          <p>14.2 You are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Service solely for your personal use in accordance with these Terms. This license does not include the right to copy, modify, distribute, or create derivative works.</p>
          <p>14.3 The Wealix name, logo, and tagline &quot;Personal Wealth Operating System&quot; are trademarks of Wealix. You may not use them without prior written consent.</p>
        </LegalSubsection>

        <LegalSubsection title="15. Your Content and Data">
          <p>15.1 You retain full ownership of all financial data, records, and content you input into the Service (&quot;Your Data&quot;).</p>
          <p>15.2 By using the Service, you grant Wealix a limited, worldwide, royalty-free license to store, process, and display Your Data solely for the purpose of providing the Service to you. This license terminates when you delete your data or close your account.</p>
          <p>15.3 You may export all Your Data at any time in JSON or CSV format from Account Settings. We will not hold your data hostage or restrict your ability to export it.</p>
          <p>15.4 You represent and warrant that Your Data does not violate any law, third-party rights, or these Terms.</p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="Part Seven — Liability and Warranties">
        <LegalSubsection title="16. Disclaimer of Warranties">
          <p>THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, COMPLETENESS, OR UNINTERRUPTED AVAILABILITY.</p>
          <p>We do not warrant that:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>The Service will be error-free, uninterrupted, or free of viruses.</li>
            <li>Financial projections and calculations will be accurate or realized.</li>
            <li>AI-generated advice will be suitable for your circumstances.</li>
            <li>Market data will be real-time, complete, or accurate.</li>
            <li>The Service will meet your specific requirements.</li>
          </ul>
        </LegalSubsection>

        <LegalSubsection title="17. Limitation of Liability">
          <p>17.1 TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WEALIX AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND LICENSORS SHALL NOT BE LIABLE FOR ANY:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Loss of profits, revenue, or data</li>
            <li>Financial losses arising from investment decisions made based on Service information</li>
            <li>Indirect, incidental, special, consequential, or punitive damages</li>
            <li>Losses arising from unauthorized account access</li>
            <li>Losses arising from inaccurate OCR extraction or AI advice</li>
            <li>Service interruptions, delays, or unavailability</li>
          </ul>
          <p>17.2 In jurisdictions that do not allow exclusion of consequential damages, our liability is limited to the maximum extent permitted by law.</p>
          <p>17.3 Our total aggregate liability to you for any claim arising from these Terms or use of the Service shall not exceed the total fees you paid to Wealix in the 12 months preceding the claim, or SAR 300 if you have not paid any fees.</p>
          <p>17.4 You acknowledge that financial decisions carry inherent risk and that Wealix is a tracking and planning tool only. Wealix is not liable for any financial losses you sustain as a result of decisions made with reference to the Service.</p>
        </LegalSubsection>

        <LegalSubsection title="18. Indemnification">
          <p>You agree to indemnify, defend, and hold harmless Wealix, its affiliates, officers, directors, and employees from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising from:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Your violation of these Terms</li>
            <li>Your violation of any applicable law</li>
            <li>Your infringement of any third-party rights</li>
            <li>Any inaccurate data you input into the Service</li>
            <li>Your use of the AI Advisor to make investment or financial decisions</li>
          </ul>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="Part Eight — Account Termination">
        <LegalSubsection title="19. Termination by You">
          <p>You may close your account at any time from Settings → Data → Delete Account. You must confirm deletion by entering your email address. Upon deletion:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>All your personal data is permanently deleted within 30 days</li>
            <li>Financial records, receipts, and chat history are removed from active databases</li>
            <li>Backup copies may persist in encrypted cold storage for up to 90 days before permanent deletion</li>
            <li>Audit logs required for legal compliance may be retained for 5 years per applicable regulations</li>
          </ul>
        </LegalSubsection>

        <LegalSubsection title="20. Termination by Wealix">
          <p>20.1 We may suspend or terminate your account immediately and without prior notice if:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>You violate these Terms</li>
            <li>You engage in fraudulent, abusive, or illegal activity</li>
            <li>We are required to do so by law or legal process</li>
            <li>You are subject to applicable sanctions</li>
          </ul>
          <p>20.2 We may terminate the Service with 60 days&apos; notice to all users, during which time you will retain full access and the ability to export all your data.</p>
          <p>20.3 Upon termination by Wealix for cause, no refund will be issued. Upon termination for business reasons, you will receive a pro-rated refund for unused prepaid subscription days.</p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="Part Nine — Governing Law and Disputes">
        <LegalSubsection title="21. Governing Law">
          <p>These Terms are governed by and construed in accordance with the laws of the Kingdom of Saudi Arabia, without regard to conflict of law principles.</p>
        </LegalSubsection>

        <LegalSubsection title="22. Dispute Resolution">
          <p>22.1 Informal Resolution: Before initiating formal proceedings, both parties agree to attempt good-faith resolution of any dispute by contacting legal@wealix.app. We will respond within 15 business days.</p>
          <p>22.2 Formal Proceedings: If informal resolution fails within 30 days, disputes shall be submitted to the competent courts of the Kingdom of Saudi Arabia in Riyadh.</p>
          <p>22.3 Class Action Waiver: To the maximum extent permitted by applicable law, you agree that any claim must be brought in your individual capacity and not as a plaintiff in any class action or representative proceeding.</p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="Part Ten — General Provisions">
        <LegalSubsection title="23. Changes to These Terms">
          <p>23.1 We may update these Terms from time to time. When we make material changes, we will:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Send an email notification to your registered address at least 14 days before the changes take effect</li>
            <li>Display a prominent notice within the app</li>
            <li>Update the &quot;Effective Date&quot; at the top of this document</li>
          </ul>
          <p>23.2 Your continued use of the Service after the effective date of revised Terms constitutes acceptance. If you do not agree to the changes you must cancel your subscription and stop using the Service before the effective date.</p>
        </LegalSubsection>

        <LegalSubsection title="24. Miscellaneous">
          <p>24.1 Entire Agreement: These Terms, together with the Privacy Policy and any other policies referenced herein, constitute the entire agreement between you and Wealix regarding the Service.</p>
          <p>24.2 Severability: If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.</p>
          <p>24.3 No Waiver: Our failure to enforce any provision of these Terms shall not constitute a waiver of our right to enforce it in the future.</p>
          <p>24.4 Force Majeure: Wealix shall not be liable for delays or failures in performance resulting from circumstances beyond our reasonable control, including natural disasters, cyberattacks, regulatory actions, or internet infrastructure failures.</p>
          <p>24.5 Assignment: You may not assign your rights under these Terms without prior written consent. Wealix may assign its rights and obligations in connection with a merger, acquisition, or sale of assets with reasonable notice to users.</p>
        </LegalSubsection>

        <LegalSubsection title="25. Contact Information">
          <p>Wealix</p>
          <p>Email: support@wealix.app</p>
          <p>Legal: legal@wealix.app</p>
          <p>Security: security@wealix.app</p>
          <p>Website: https://wealix.app</p>
        </LegalSubsection>
      </LegalSection>
    </LegalPageLayout>
  );
}
