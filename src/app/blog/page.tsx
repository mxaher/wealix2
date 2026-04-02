import type { Metadata } from 'next';
import { BlogPageClient } from './BlogPageClient';

export const metadata: Metadata = {
  title: 'Blog — Personal Finance & Investment Insights | Wealix',
  description:
    'Expert guides on portfolio tracking, FIRE planning, net-worth growth, and AI-powered investing for MENA investors. Learn how to take control of your financial future.',
  alternates: { canonical: 'https://wealix.app/blog' },
  openGraph: {
    title: 'Wealix Blog — Personal Finance & Investment Insights',
    description:
      'Expert guides on portfolio tracking, FIRE planning, and AI-powered investing for MENA investors.',
    url: 'https://wealix.app/blog',
    type: 'website',
    images: [{ url: 'https://wealix.app/og/og-default.png', width: 1200, height: 630 }],
  },
};

export const posts = [
  {
    slug: 'how-to-track-investment-portfolio',
    title: 'How to Track Your Investment Portfolio in 2025 (The Right Way)',
    titleAr: 'كيفية تتبع محفظتك الاستثمارية في 2025 (الطريقة الصحيحة)',
    description:
      'Most investors check their brokerage app and call it tracking. That is not tracking — that is hoping. Here is how to build a real-time view of every asset you own.',
    descriptionAr:
      'معظم المستثمرين يتحققون من تطبيق الوساطة ويعتبرونه تتبعاً. هذا ليس تتبعاً — هذا أمل. إليك كيفية بناء رؤية فورية لكل أصل تملكه.',
    date: '2025-03-15',
    readTime: '8 min read',
    readTimeAr: '8 دقائق قراءة',
    tag: 'Portfolio',
    tagAr: 'المحفظة',
  },
  {
    slug: 'fire-number-calculator-mena',
    title: 'Your FIRE Number Explained — And Why It Is Different in the Gulf',
    titleAr: 'رقم FIRE الخاص بك — ولماذا يختلف في الخليج',
    description:
      'The classic 4% rule was built for US markets. Gulf investors face a different reality: no income tax, different inflation baselines, and SAR/AED pegging. Here is what to use instead.',
    descriptionAr:
      'قاعدة 4٪ الكلاسيكية صُممت للأسواق الأمريكية. مستثمرو الخليج يواجهون واقعاً مختلفاً: لا ضرائب دخل، خطوط أساس تضخم مختلفة، وربط الريال/الدرهم بالدولار. إليك ما يجب استخدامه بدلاً من ذلك.',
    date: '2025-03-22',
    readTime: '10 min read',
    readTimeAr: '10 دقائق قراءة',
    tag: 'FIRE',
    tagAr: 'الاستقلال المالي',
  },
  {
    slug: 'ai-financial-advisor-vs-human',
    title: 'AI Financial Advisor vs. Human Advisor — Which One Actually Makes You Richer?',
    titleAr: 'المستشار المالي بالذكاء الاصطناعي مقابل المستشار البشري — أيهما يجعلك أغنى؟',
    description:
      'The honest answer is: it depends on what question you are asking. Humans win on tax strategy and estate planning. AI wins on real-time data, 24/7 availability, and zero emotional bias.',
    descriptionAr:
      'الإجابة الصادقة هي: يعتمد على السؤال الذي تطرحه. البشر يفوزون في الاستراتيجية الضريبية والتخطيط العقاري. الذكاء الاصطناعي يفوز في البيانات الفورية والتوفر على مدار الساعة وعدم التحيز العاطفي.',
    date: '2025-04-01',
    readTime: '7 min read',
    readTimeAr: '7 دقائق قراءة',
    tag: 'AI',
    tagAr: 'الذكاء الاصطناعي',
  },
  {
    slug: 'net-worth-tracking-guide',
    title: 'Net Worth Tracking — The One Number That Tells You If You Are Actually Getting Wealthier',
    titleAr: 'تتبع صافي الثروة — الرقم الوحيد الذي يخبرك إذا كنت تزداد ثراءً فعلاً',
    description:
      'Income is vanity, net worth is sanity. Learn how to calculate, track, and grow your net worth using a system that updates automatically every day.',
    descriptionAr:
      'الدخل غرور، صافي الثروة عقل. تعلم كيفية حساب وتتبع وتنمية صافي ثروتك باستخدام نظام يتحدث تلقائياً كل يوم.',
    date: '2025-04-10',
    readTime: '6 min read',
    readTimeAr: '6 دقائق قراءة',
    tag: 'Net Worth',
    tagAr: 'صافي الثروة',
  },
  {
    slug: 'portfolio-rebalancing-guide',
    title: 'Portfolio Rebalancing: When to Do It, How Often, and What AI Gets Right',
    titleAr: 'إعادة توازن المحفظة: متى ومع أي تكرار وما يفهمه الذكاء الاصطناعي بشكل صحيح',
    description:
      'Rebalancing too often destroys returns through transaction costs. Rebalancing too rarely lets you drift into dangerous concentration. There is a sweet spot, and AI found it.',
    descriptionAr:
      'إعادة التوازن بشكل متكرر تدمر العوائد من خلال تكاليف المعاملات. إعادة التوازن بشكل نادر تجعلك تنجرف إلى تركيز خطير. هناك نقطة مثالية، والذكاء الاصطناعي وجدها.',
    date: '2025-04-18',
    readTime: '9 min read',
    readTimeAr: '9 دقائق قراءة',
    tag: 'Investing',
    tagAr: 'الاستثمار',
  },
  {
    slug: 'best-investment-apps-saudi-arabia',
    title: 'Best Investment Tracking Apps in Saudi Arabia (2025 Honest Review)',
    titleAr: 'أفضل تطبيقات تتبع الاستثمار في السعودية (مراجعة صادقة 2025)',
    description:
      'We tested 12 apps available to Saudi investors. Most look great and do almost nothing useful. Here are the ones actually worth your time — and why Wealix was built because none were good enough.',
    descriptionAr:
      'اختبرنا 12 تطبيقاً متاحاً للمستثمرين السعوديين. معظمها يبدو رائعاً ولا يفعل شيئاً مفيداً. إليك التطبيقات التي تستحق وقتك فعلاً — ولماذا تم بناء Wealix لأن أياً منها لم يكن جيداً بما يكفي.',
    date: '2025-04-25',
    readTime: '12 min read',
    readTimeAr: '12 دقيقة قراءة',
    tag: 'Reviews',
    tagAr: 'المراجعات',
  },
];

export default function BlogPage() {
  return <BlogPageClient posts={posts} />;
}
