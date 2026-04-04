'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  BrainCircuit,
  Send,
  Plus,
  Trash2,
  Sparkles,
  User,
  MessageSquare,
  Loader2,
  RefreshCw,
  Paperclip,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DashboardShell } from '@/components/layout';
import { FeatureGate } from '@/components/shared';
import { InvestmentDecisionCheck } from '@/components/investment/InvestmentDecisionCheck';
import { useAppStore } from '@/store/useAppStore';
import ReactMarkdown from 'react-markdown';
import { createOpaqueId } from '@/lib/ids';

const ADVISOR_STORAGE_KEY = 'wealix-advisor-chat-v1';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

// Suggested prompts
const suggestedPrompts = [
  { en: 'How is my portfolio performing this week?', ar: 'كيف أداء محفظتي هذا الأسبوع؟' },
  { en: 'Am I on track for financial independence?', ar: 'هل أنا على المسار الصحيح نحو الاستقلال المالي؟' },
  { en: 'What should I be watching in the market right now?', ar: 'ما الذي يجب أن أراقبه في السوق الآن؟' },
  { en: 'I have cash to invest, where should it go?', ar: 'لدي سيولة للاستثمار، أين يجب أن أوجهها؟' },
  { en: 'Are there any risks in my portfolio I should know about?', ar: 'هل توجد مخاطر في محفظتي يجب أن أعرفها؟' },
  { en: 'Give me a full portfolio health check', ar: 'أعطني فحصاً كاملاً لصحة محفظتي' },
];

export default function AdvisorPage() {
  const {
    locale,
  } = useAppStore();
  const isArabic = locale === 'ar';

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  useEffect(() => {
    const defaultSession: ChatSession = {
      id: createOpaqueId('chat-session'),
      title: isArabic ? 'محادثة جديدة' : 'New Conversation',
      messages: [],
      createdAt: new Date(),
    };

    if (typeof window === 'undefined') {
      setSessions([defaultSession]);
      setActiveSessionId(defaultSession.id);
      return;
    }

    try {
      const raw = window.localStorage.getItem(ADVISOR_STORAGE_KEY);
      if (!raw) {
        setSessions([defaultSession]);
        setActiveSessionId(defaultSession.id);
        return;
      }

      const parsed = JSON.parse(raw) as {
        sessions?: Array<{
          id: string;
          title: string;
          messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: string }>;
          createdAt: string;
        }>;
        activeSessionId?: string;
      };

      const restoredSessions = Array.isArray(parsed.sessions)
        ? parsed.sessions.map((session) => ({
          id: session.id,
          title: session.title,
          messages: Array.isArray(session.messages)
            ? session.messages.map((message) => ({
                ...message,
                timestamp: new Date(message.timestamp),
              }))
            : [],
          createdAt: new Date(session.createdAt),
        }))
        : [];

      if (restoredSessions.length === 0) {
        setSessions([defaultSession]);
        setActiveSessionId(defaultSession.id);
        return;
      }

      setSessions(restoredSessions);
      setActiveSessionId(
        restoredSessions.some((session) => session.id === parsed.activeSessionId)
          ? parsed.activeSessionId ?? restoredSessions[0].id
          : restoredSessions[0].id
      );
    } catch {
      setSessions([defaultSession]);
      setActiveSessionId(defaultSession.id);
    }
  }, [isArabic]);

  useEffect(() => {
    if (typeof window === 'undefined' || sessions.length === 0) {
      return;
    }

    window.localStorage.setItem(ADVISOR_STORAGE_KEY, JSON.stringify({
      sessions,
      activeSessionId,
    }));
  }, [activeSessionId, sessions]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, streamingContent]);

  const sendMessage = async (messageText: string = input) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: createOpaqueId('chat-message'),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };

    // Update session with user message
    setSessions(prev => prev.map(s => 
      s.id === activeSessionId 
        ? { ...s, messages: [...s.messages, userMessage], title: s.messages.length === 0 ? messageText.slice(0, 30) : s.title }
        : s
    ));

    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    try {
      // Prepare messages for API
      const messages = [...(activeSession?.messages || []), userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          locale,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string; details?: string } | null;
        throw new Error(data?.details || data?.error || 'Failed to get response');
      }

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let bufferedChunk = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          bufferedChunk += decoder.decode(value, { stream: true });
          const lines = bufferedChunk.split('\n');
          bufferedChunk = lines.pop() ?? '';

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              fullContent += data.content;
              setStreamingContent(fullContent);
            } catch {
              // Skip invalid JSON
            }
          }
        }

        bufferedChunk += decoder.decode();
        const trailingLine = bufferedChunk.trim();
        if (trailingLine) {
          try {
            const data = JSON.parse(trailingLine);
            fullContent += data.content;
            setStreamingContent(fullContent);
          } catch {
            // Ignore a malformed trailing chunk and fall back to the error below if needed.
          }
        }
      }

      const finalContent = fullContent.trim();
      if (!finalContent) {
        throw new Error('The advisor returned an empty response.');
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: createOpaqueId('chat-message'),
        role: 'assistant',
        content: finalContent,
        timestamp: new Date(),
      };

      setSessions(prev => prev.map(s => 
        s.id === activeSessionId 
          ? { ...s, messages: [...s.messages, assistantMessage] }
          : s
      ));
    } catch (error) {
      console.error('Chat error:', error);
      // Add error message
      const errorMessage: Message = {
        id: createOpaqueId('chat-message'),
        role: 'assistant',
        content: error instanceof Error
          ? error.message
          : (isArabic
            ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
            : 'Sorry, an error occurred. Please try again.'),
        timestamp: new Date(),
      };

      setSessions(prev => prev.map(s => 
        s.id === activeSessionId 
          ? { ...s, messages: [...s.messages, errorMessage] }
          : s
      ));
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: createOpaqueId('chat-session'),
      title: isArabic ? 'محادثة جديدة' : 'New Conversation',
      messages: [],
      createdAt: new Date(),
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const deleteSession = (sessionId: string) => {
    if (sessions.length === 1) {
      createNewSession();
      return;
    }
    const remainingSessions = sessions.filter((session) => session.id !== sessionId);
    setSessions(remainingSessions);
    if (activeSessionId === sessionId) {
      setActiveSessionId(remainingSessions[0]?.id || '');
    }
  };

  return (
    <DashboardShell>
      <FeatureGate feature="ai.advisor">
        <div className="flex h-[calc(100vh-8rem)] min-w-0 gap-4 overflow-hidden">
          {/* Sidebar - Session List */}
          <Card className="hidden md:flex w-64 flex-col">
            <CardHeader className="border-b p-4">
              <Button onClick={createNewSession} className="w-full gap-2">
                <Plus className="w-4 h-4" />
                {isArabic ? 'محادثة جديدة' : 'New Chat'}
              </Button>
            </CardHeader>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                      session.id === activeSessionId 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setActiveSessionId(session.id)}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate text-sm">{session.title}</span>
                    {sessions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Main Chat Area */}
          <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* Header */}
            <CardHeader className="border-b p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
                    <Bot className="w-5 h-5 text-navy-dark" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {isArabic ? 'وائل - المستشار المالي' : 'Wael - AI Financial Advisor'}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {isArabic ? 'ذكاء مالي حواري لسوق السعودية والمنطقة' : 'Conversational financial intelligence for Saudi and MENA investors'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <BrainCircuit className="w-4 h-4" />
                        {isArabic ? 'Decision Check' : 'Decision Check'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>{isArabic ? 'محرك قرار الاستثمار' : 'Investment Decision Engine'}</DialogTitle>
                        <DialogDescription>
                          {isArabic
                            ? 'افحص أي فكرة استثمارية جديدة مقارنة بمحفظتك، السيولة، وصافي الثروة والأهداف.'
                            : 'Check any new investment idea against your portfolio, liquidity, net worth, and goals.'}
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-[72vh] pr-2">
                        <InvestmentDecisionCheck />
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="sm" onClick={() => inputRef.current?.focus()}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <ScrollArea className="min-w-0 flex-1 p-4">
              {activeSession?.messages.length === 0 && !isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-gold" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    {isArabic ? 'كيف أساعدك اليوم؟' : 'How can I help you today?'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md">
                    {isArabic
                      ? 'اسأل وائل عن محفظتك، الاستقلال المالي، السوق، أو أي قرار مالي تفكر فيه.'
                      : 'Ask Wael about your portfolio, FIRE progress, the market, or any financial decision you are thinking through.'}
                  </p>
                  <p className="text-xs text-muted-foreground mb-6 max-w-lg">
                    {isArabic
                      ? 'تحليلات وائل لأغراض معلوماتية فقط وليست استشارة مالية مرخّصة. راجع الشروط قبل اتخاذ قرارات استثمارية.'
                      : 'Wael provides informational analysis only and is not a licensed financial advisor. Review the Wealix terms before making investment decisions.'}
                  </p>
                  <div className="flex w-full max-w-3xl flex-wrap items-stretch justify-center gap-2 px-4">
                    {suggestedPrompts.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="h-auto min-h-12 max-w-full whitespace-normal px-4 py-3 text-left sm:flex-[1_1_320px]"
                        onClick={() => sendMessage(isArabic ? prompt.ar : prompt.en)}
                      >
                        <span className="block w-full break-words text-left text-sm leading-5">
                          {isArabic ? prompt.ar : prompt.en}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {activeSession?.messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex min-w-0 gap-3 ${
                          message.role === 'user' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className={message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-gold text-navy-dark'}>
                            {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`min-w-0 flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                          <div
                            className={`inline-block max-w-[85%] min-w-0 overflow-hidden rounded-lg p-3 align-top ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {message.role === 'assistant' ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_*]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_code]:whitespace-pre-wrap [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="break-words text-sm whitespace-pre-wrap">{message.content}</p>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {message.timestamp.toLocaleTimeString(locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Streaming message */}
                  {isLoading && streamingContent && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex min-w-0 gap-3"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gold text-navy-dark">
                          <Bot className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="inline-block max-w-[85%] min-w-0 overflow-hidden rounded-lg bg-muted p-3 align-top">
                          <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_*]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_code]:whitespace-pre-wrap [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto">
                            <ReactMarkdown>{streamingContent}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Loading indicator */}
                  {isLoading && !streamingContent && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gold text-navy-dark">
                          <Bot className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">
                          {isArabic ? 'جاري التفكير...' : 'Thinking...'}
                        </span>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isArabic ? 'اكتب رسالتك...' : 'Type your message...'}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading || !input.trim()}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="outline" className="text-xs">
                  <Paperclip className="w-3 h-3 mr-1" />
                  {isArabic ? 'بيانات Wealix مرفقة تلقائياً' : 'Wealix data attached automatically'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {isArabic ? 'الأسعار قد تكون آنية أو حسب آخر إغلاق بحسب المصدر' : 'Market data may be live or based on last close depending on source'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </FeatureGate>
    </DashboardShell>
  );
}
