import type { Metadata } from 'next';
import { ContactPageClient } from '@/components/landing/ContactPageClient';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wealix.app';

export const metadata: Metadata = {
  title: 'Contact Wealix',
  description:
    'Contact Wealix for product questions, onboarding help, partnerships, or support for the bilingual AI-powered investment platform.',
  alternates: {
    canonical: `${siteUrl}/contact`,
  },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
