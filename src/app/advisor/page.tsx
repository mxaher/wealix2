'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
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
import { DashboardShell } from '@/components/layout';
import { FeatureGate } from '@/components/shared';
import { useAppStore } from '@/store/useAppStore';
import ReactMarkdown from 'react-markdown';

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
  { en: 'How is my portfolio performing?', ar: 'كيف أداء محفظتي؟' },
  { en: 'Am I on track for my FIRE goal?', ar: 'هل أنا في الطريق الصحيح نحو FIRE؟' },
  { en: 'Where am I overspending this month?', ar: 'أين أنفق أكثر هذا الشهر؟' },
  { en: 'Give me your analysis of my top 3 holdings', ar: 'حلل أفضل 3 ممتلكات لدي' },
  { en: 'What should I rebalance in my portfolio?', ar: 'ماذا يجب أن أعيد توازنه في محفظتي؟' },
];

export default function AdvisorPage() {
  const { locale, attachPortfolioContext, setAttachPortfolioContext } = useAppStore();
  const isArabic = locale === 'ar';

  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: '1',
      title: isArabic ? 'محادثة جديدة' : 'New Conversation',
      messages: [],
      createdAt: new Date(),
    },
  ]);
  const [activeSessionId, setActiveSessionId] = useState('1');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, streamingContent]);

  const sendMessage = async (messageText: string = input) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
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

      // User context (mock data - in production, fetch from DB)
      const userContext = attachPortfolioContext ? {
        netWorth: 612450,
        portfolioValue: 485000,
        monthlyIncome: 28500,
        monthlyExpenses: 12450,
        fireGoal: 1500000,
        fireProgress: 40.8,
      } : undefined;

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          userContext,
          locale,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(Boolean);

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
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullContent,
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
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: isArabic 
          ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.' 
          : 'Sorry, an error occurred. Please try again.',
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
      id: Date.now().toString(),
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
    }
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(sessions.find(s => s.id !== sessionId)?.id || '');
    }
  };

  return (
    <DashboardShell>
      <FeatureGate feature="ai.advisor">
        <div className="flex h-[calc(100vh-8rem)] gap-4">
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
          <Card className="flex-1 flex flex-col">
            {/* Header */}
            <CardHeader className="border-b p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
                    <Bot className="w-5 h-5 text-navy-dark" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {isArabic ? 'المستشار المالي' : 'AI Financial Advisor'}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {isArabic ? 'متخصص في السوق السعودي والشرق أوسطي' : 'Specialized in Saudi & MENA market'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={attachPortfolioContext}
                      onCheckedChange={setAttachPortfolioContext}
                    />
                    <Label className="text-xs">
                      {isArabic ? 'إرفاق السياق' : 'Attach Context'}
                    </Label>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => inputRef.current?.focus()}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {activeSession?.messages.length === 0 && !isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-gold" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    {isArabic ? 'كيف يمكنني مساعدتك؟' : 'How can I help you today?'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md">
                    {isArabic
                      ? 'أسألني أي سؤال عن وضعك المالي، محفظتك، أو خططك للمستقبل.'
                      : 'Ask me anything about your finances, portfolio, or future plans.'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
                    {suggestedPrompts.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="justify-start h-auto py-2 px-3"
                        onClick={() => sendMessage(isArabic ? prompt.ar : prompt.en)}
                      >
                        <span className="text-left text-sm">
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
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className={message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-gold text-navy-dark'}>
                            {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                          <div
                            className={`inline-block p-3 rounded-lg max-w-[85%] ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {message.role === 'assistant' ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-sm">{message.content}</p>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {message.timestamp.toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
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
                      className="flex gap-3"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gold text-navy-dark">
                          <Bot className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="inline-block p-3 rounded-lg max-w-[85%] bg-muted">
                          <div className="prose prose-sm dark:prose-invert max-w-none">
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
                {attachPortfolioContext && (
                  <Badge variant="outline" className="text-xs">
                    <Paperclip className="w-3 h-3 mr-1" />
                    {isArabic ? 'السياق مرفق' : 'Context attached'}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {isArabic ? 'اضغط Enter للإرسال' : 'Press Enter to send'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </FeatureGate>
    </DashboardShell>
  );
}
