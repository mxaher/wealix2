'use client';

import { useMemo, useState } from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const COMPANY_EMAIL = 'hello@wealix.app';
const COMPANY_PHONE = '+966 53 730 2660';
const OFFICE_INFO = {
  en: 'Remote-first team serving investors across MENA',
  ar: 'فريق يعمل عن بُعد ويخدم المستثمرين في منطقة الشرق الأوسط وشمال أفريقيا',
};

type ContactFormProps = {
  isArabic: boolean;
  compact?: boolean;
  className?: string;
};

type FormValues = {
  name: string;
  email: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const emptyValues: FormValues = {
  name: '',
  email: '',
  message: '',
};

export function ContactForm({ isArabic, compact = false, className }: ContactFormProps) {
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const labels = useMemo(
    () => ({
      title: isArabic ? 'تواصل معنا' : 'Contact us',
      description: isArabic
        ? 'أرسل رسالتك وسيتواصل فريق Wealix معك. يمكنك أيضاً استخدام البريد الإلكتروني أو الهاتف مباشرة.'
        : 'Send a message and the Wealix team will get back to you. You can also reach us directly by email or phone.',
      name: isArabic ? 'الاسم' : 'Name',
      email: isArabic ? 'البريد الإلكتروني' : 'Email',
      message: isArabic ? 'الرسالة' : 'Message',
      namePlaceholder: isArabic ? 'اكتب اسمك' : 'Your name',
      emailPlaceholder: isArabic ? 'name@example.com' : 'name@example.com',
      messagePlaceholder: isArabic
        ? 'كيف يمكننا مساعدتك؟'
        : 'How can we help?',
      submit: isArabic ? 'إرسال الرسالة' : 'Send message',
      sending: isArabic ? 'جارٍ الإرسال...' : 'Sending...',
      successTitle: isArabic ? 'تم تجهيز رسالتك' : 'Your message is ready',
      successDescription: isArabic
        ? 'فتحنا قناة التواصل إلى بريد Wealix مع بياناتك المعبأة لتسريع الإرسال.'
        : 'We opened your preferred mail app with your message prefilled for Wealix.',
      errorTitle: isArabic ? 'تحقق من النموذج' : 'Check the form',
      invalidEmail: isArabic ? 'أدخل بريداً إلكترونياً صحيحاً.' : 'Enter a valid email address.',
      requiredName: isArabic ? 'الاسم مطلوب.' : 'Name is required.',
      requiredMessage: isArabic ? 'الرسالة مطلوبة.' : 'Message is required.',
      emailLabel: isArabic ? 'البريد' : 'Email',
      phoneLabel: isArabic ? 'الهاتف' : 'Phone',
      officeLabel: isArabic ? 'المكتب' : 'Office',
    }),
    [isArabic]
  );

  function validate(nextValues: FormValues) {
    const nextErrors: FormErrors = {};
    if (!nextValues.name.trim()) {
      nextErrors.name = labels.requiredName;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextValues.email.trim())) {
      nextErrors.email = labels.invalidEmail;
    }
    if (!nextValues.message.trim()) {
      nextErrors.message = labels.requiredMessage;
    }
    return nextErrors;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast({
        title: labels.errorTitle,
        description: Object.values(nextErrors)[0],
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const subject = encodeURIComponent(`Wealix contact request from ${values.name.trim()}`);
    const body = encodeURIComponent(
      `Name: ${values.name.trim()}\nEmail: ${values.email.trim()}\n\nMessage:\n${values.message.trim()}`
    );

    window.location.href = `mailto:${COMPANY_EMAIL}?subject=${subject}&body=${body}`;

    setTimeout(() => {
      setIsSubmitting(false);
      setValues(emptyValues);
      setErrors({});
      toast({
        title: labels.successTitle,
        description: labels.successDescription,
      });
    }, 250);
  }

  function setField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  return (
    <div className={cn('grid gap-6 lg:grid-cols-[1.1fr_0.9fr]', className)}>
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">{labels.title}</p>
        <h2 className={cn('mt-3 font-semibold tracking-tight text-3xl', compact && 'text-2xl')}>
          {labels.description}
        </h2>
      </div>

      {!compact && (
        <div className="grid gap-3">
          <div className="rounded-[22px] border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-1 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{labels.emailLabel}</p>
                <a href={`mailto:${COMPANY_EMAIL}`} className="mt-1 text-sm text-muted-foreground hover:text-foreground">
                  {COMPANY_EMAIL}
                </a>
              </div>
            </div>
          </div>
          <div className="rounded-[22px] border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <Phone className="mt-1 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{labels.phoneLabel}</p>
                <a href={`tel:${COMPANY_PHONE.replace(/\s+/g, '')}`} dir="ltr" className="mt-1 text-sm text-muted-foreground hover:text-foreground">
                  {COMPANY_PHONE}
                </a>
              </div>
            </div>
          </div>
          <div className="rounded-[22px] border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{labels.officeLabel}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{OFFICE_INFO[isArabic ? 'ar' : 'en']}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={cn('grid gap-4 lg:col-span-2', compact && 'lg:col-span-1')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="contact-name" className="text-sm font-medium text-foreground">
              {labels.name}
            </label>
            <Input
              id="contact-name"
              value={values.name}
              onChange={(event) => setField('name', event.target.value)}
              placeholder={labels.namePlaceholder}
              aria-invalid={Boolean(errors.name)}
              className="h-11 rounded-xl bg-background"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <div className="grid gap-2">
            <label htmlFor="contact-email" className="text-sm font-medium text-foreground">
              {labels.email}
            </label>
            <Input
              id="contact-email"
              type="email"
              value={values.email}
              onChange={(event) => setField('email', event.target.value)}
              placeholder={labels.emailPlaceholder}
              aria-invalid={Boolean(errors.email)}
              className="h-11 rounded-xl bg-background"
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>
        </div>
        <div className="grid gap-2">
          <label htmlFor="contact-message" className="text-sm font-medium text-foreground">
            {labels.message}
          </label>
          <Textarea
            id="contact-message"
            value={values.message}
            onChange={(event) => setField('message', event.target.value)}
            placeholder={labels.messagePlaceholder}
            aria-invalid={Boolean(errors.message)}
            className="min-h-36 rounded-2xl bg-background"
          />
          {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
        </div>
        <Button type="submit" disabled={isSubmitting} className="btn-primary h-11 rounded-xl px-5 sm:w-fit">
          {isSubmitting ? labels.sending : labels.submit}
        </Button>
      </form>
    </div>
  );
}
