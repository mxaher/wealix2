'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpenText, ChevronDown, HelpCircle, Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { findHelpTopicByPrompt, getLocalizedText, getPageHelpContext, getQuickHelp, getTopicParagraphs } from '@/lib/help/content';

interface ReemMessage {
  id: string;
  role: 'user' | 'reem';
  content: string;
  suggestions?: string[];
}

const OPEN_HELP_EN = 'Open the Help Center';
const OPEN_HELP_AR = 'افتح مركز المساعدة';

function buildReemReply(input: string, pathname: string, locale: 'ar' | 'en') {
  const topic = findHelpTopicByPrompt(input, pathname, locale);
  const pageContext = getPageHelpContext(pathname);
  const quickHelp = getQuickHelp(pageContext, locale);
  const openHelpLabel = locale === 'ar' ? OPEN_HELP_AR : OPEN_HELP_EN;

  if (!topic) {
    return {
      content: locale === 'ar'
        ? `يمكنني مساعدتك في شرح ميزات ${getLocalizedText(pageContext.page, locale)} والتنقل داخلها. جرّب أحد هذه الأسئلة أو افتح مركز المساعدة للاطلاع على الدليل الكامل.`
        : `I can help with product guidance for ${getLocalizedText(pageContext.page, locale)}. Try one of these questions, or open the full Help Center for the complete documentation.`,
      suggestions: [...quickHelp, openHelpLabel],
    };
  }

  const summary = getTopicParagraphs(topic, locale).slice(0, 2).join(' ');

  return {
    content: summary,
    suggestions: [...quickHelp.slice(0, 3), openHelpLabel],
  };
}

export function ReemAgent() {
  const pathname = usePathname() ?? '/dashboard';
  const locale = useAppStore((state) => state.locale);
  const isArabic = locale === 'ar';
  const pageContext = useMemo(() => getPageHelpContext(pathname), [pathname]);
  const quickHelp = useMemo(() => getQuickHelp(pageContext, locale), [pageContext, locale]);

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ReemMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setMessages([
      {
        id: 'welcome',
        role: 'reem',
        content: isArabic
          ? `أنا ريم، مرشدتك داخل Wealix. أنت الآن في ${getLocalizedText(pageContext.page, locale)}. كيف أساعدك؟`
          : `I’m Reem, your in-app Wealix guide. You are currently on ${getLocalizedText(pageContext.page, locale)}. What would you like help with?`,
        suggestions: quickHelp,
      },
    ]);
  }, [isArabic, isOpen, locale, pageContext, quickHelp]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async (value: string) => {
    const message = value.trim();
    if (!message || isTyping) return;

    const userMessage: ReemMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsTyping(true);

    await new Promise((resolve) => window.setTimeout(resolve, 350));

    const reply = buildReemReply(message, pathname, locale);

    setMessages((current) => [
      ...current,
      {
        id: `reem-${Date.now()}`,
        role: 'reem',
        content: reply.content,
        suggestions: reply.suggestions,
      },
    ]);

    setIsTyping(false);
  };

  const handleSuggestion = (suggestion: string) => {
    if (suggestion === OPEN_HELP_EN || suggestion === OPEN_HELP_AR) {
      setIsOpen(false);
      setMessages([]);
      return;
    }

    void sendMessage(suggestion);
  };

  return (
    <>
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className={cn(
            'fixed bottom-20 z-50 md:bottom-6',
            isArabic ? 'left-4 md:left-6' : 'right-4 md:right-6'
          )}
        >
          <Button
            onClick={() => setIsOpen(true)}
            className="h-auto rounded-lg bg-primary px-4 py-3 text-primary-foreground hover:bg-primary/90"
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            {isArabic ? 'اسأل ريم' : 'Ask Reem'}
          </Button>
        </motion.div>
      )}

      <AnimatePresence>
        {isOpen ? (
          <motion.aside
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            dir={isArabic ? 'rtl' : 'ltr'}
            className={cn(
              'fixed bottom-20 z-50 flex w-[min(92vw,26rem)] flex-col overflow-hidden rounded-[1.6rem] border border-border bg-background shadow-2xl md:bottom-6',
              isArabic ? 'left-4 md:left-6' : 'right-4 md:right-6'
            )}
          >
            <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
              <div className={cn('flex items-center gap-3', isArabic && 'flex-row-reverse')}>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className={cn(isArabic && 'text-right')}>
                  <p className="text-sm font-semibold">Reem</p>
                  <p className="text-xs text-white/80">
                    {isArabic ? 'دليل المساعدة داخل Wealix' : 'Wealix help guide'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-xl text-white hover:bg-white/15 hover:text-white"
                  onClick={() => setIsMinimized((current) => !current)}
                >
                  <ChevronDown className={cn('h-4 w-4 transition-transform', isMinimized && 'rotate-180')} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-xl text-white hover:bg-white/15 hover:text-white"
                  onClick={() => {
                    setIsOpen(false);
                    setMessages([]);
                    setIsMinimized(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!isMinimized ? (
              <>
                <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
                  {getLocalizedText(pageContext.greeting, locale)}
                </div>

                <div className="max-h-[24rem] space-y-4 overflow-y-auto px-4 py-4">
                  {messages.map((message) => (
                    <div key={message.id}>
                      <div className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cn(
                            'max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-6',
                            message.role === 'user'
                              ? 'rounded-tr-sm bg-primary text-primary-foreground'
                              : 'rounded-tl-sm bg-muted text-foreground'
                          )}
                        >
                          {message.content}
                        </div>
                      </div>

                      {message.role === 'reem' && message.suggestions?.length ? (
                        <div className={cn('mt-2 flex flex-wrap gap-2', isArabic && 'justify-start')}>
                          {message.suggestions.map((suggestion) =>
                            suggestion === OPEN_HELP_EN || suggestion === OPEN_HELP_AR ? (
                              <Button key={suggestion} asChild size="sm" variant="outline" className="rounded-full">
                                <Link href="/help" onClick={() => setIsOpen(false)}>
                                  <BookOpenText className={cn('h-3.5 w-3.5', isArabic ? 'ml-1.5' : 'mr-1.5')} />
                                  {isArabic ? 'مركز المساعدة' : 'Help Center'}
                                </Link>
                              </Button>
                            ) : (
                              <Button
                                key={suggestion}
                                size="sm"
                                variant="outline"
                                className="rounded-full"
                                onClick={() => handleSuggestion(suggestion)}
                              >
                                {suggestion}
                              </Button>
                            )
                          )}
                        </div>
                      ) : null}
                    </div>
                  ))}

                  {isTyping ? (
                  <div className="flex justify-start">
                      <div className="rounded-lg rounded-tl-sm bg-muted px-4 py-3 text-sm text-muted-foreground">
                        {isArabic ? 'ريم تكتب...' : 'Reem is typing...'}
                      </div>
                    </div>
                  ) : null}

                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-border px-3 py-3">
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 shadow-sm">
                    <input
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void sendMessage(input);
                        }
                      }}
                      placeholder={isArabic ? 'اسأل عن أي ميزة داخل Wealix' : 'Ask about any Wealix feature'}
                      className={cn('flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground', isArabic && 'text-right')}
                    />
                    <Button
                      size="icon"
                      className="h-8 w-8 rounded-xl"
                      disabled={isTyping || input.trim().length === 0}
                      onClick={() => void sendMessage(input)}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
}
