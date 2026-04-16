import { NextRequest } from 'next/server';
import { sanitizeUserMessage } from '@/lib/ai-safety';
import { hasCompleteFinancialContext } from '@/lib/financial-snapshot';
import { buildRateLimitHeaders, enforceRateLimit } from '@/lib/rate-limit';
import { isRemotePersistenceConfigured, loadRemoteWorkspace, type RemoteUserWorkspace } from '@/lib/remote-user-data';
import { requirePaidTier } from '@/lib/server-auth';
import { buildDashboardInsightLines, buildDeterministicAdvisorResponse, buildFinancialPersonaFromWorkspace } from '@/lib/financial-brain-surface';
import { buildCompactWealixAIContext, buildWealixAIContext } from '@/lib/wealix-ai-context';
import { AIService, type AIServiceMessage } from '@/lib/ai-service';
import { getResolvedAIModelSelection } from '@/lib/ai-model-storage';

// Dashboard AI insight system prompt — produces exactly 4 insight lines
const DASHBOARD_INSIGHT_SYSTEM_PROMPT = `You are the Wealix AI Financial Advisor generating a daily dashboard insight.

Your task is to produce EXACTLY 4 concise, actionable insight sentences based on the user's financial data.

Rules:
1. Each sentence must be ONE complete sentence, no more than 25 words
2. No markdown, no headers, no bullet points — plain text only
3. Ground every sentence in the actual data provided below
4. If the data shows stress, be direct about it
5. If the data shows strength, confirm it and point to the next level
6. Use SAR amounts, not percentages alone
7. Cover these 4 areas in order:
   - Line 1: Cash flow position (income vs expenses, surplus or deficit)
   - Line 2: Obligations status (funding gaps, upcoming due dates, or all clear)
   - Line 3: Portfolio or savings focus (largest expense, investment performance, or savings rate)
   - Line 4: Forward-looking action (FIRE progress, forecast stress, or next priority)

Do NOT contradict the financial brief provided in context.
Do NOT speculate or fabricate numbers.
Do NOT provide generic advice like "keep saving" — be specific to this user's situation.

If obligation gaps exist, prioritize them over investment recommendations.
If cash flow is negative, focus on deficit reduction before anything else.
If all clear, focus on FIRE progress and wealth accumulation.

Always format currency amounts with SAR suffix.
Current date: ${new Date().toISOString().split('T')[0]}

This is AI-generated financial insight, not licensed financial advice.`;

export async function POST(request: NextRequest) {
  try {
    const authResult = await requirePaidTier('pro');
    if (authResult.error) {
      return authResult.error;
    }

    const rateLimit = await enforceRateLimit(`ai-dashboard:${authResult.userId}`, 10, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMITED' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...buildRateLimitHeaders(rateLimit),
          },
        }
      );
    }

    const body = await request.json();
    const { locale = 'en', clientContext } = body;
    const clientWorkspace = hasCompleteFinancialContext(clientContext?.workspace)
      ? clientContext.workspace as RemoteUserWorkspace
      : null;

    // Load workspace data
    let workspace: RemoteUserWorkspace | null = clientWorkspace ?? null;
    if (!workspace && isRemotePersistenceConfigured()) {
      const remote = await loadRemoteWorkspace(authResult.userId!);
      workspace = remote.workspace;
    }

    if (!workspace) {
      return new Response(
        JSON.stringify({ error: 'No workspace data available' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build unified financial context
    const wealixContext = buildWealixAIContext(authResult.userId!, workspace);
    const compactContextText = buildCompactWealixAIContext(wealixContext, locale === 'ar' ? 'ar' : 'en');
    const persona = buildFinancialPersonaFromWorkspace(authResult.userId!, workspace, wealixContext);

    // Check for deterministic response
    const deterministicResponse = buildDeterministicAdvisorResponse({
      message: 'Generate dashboard insight',
      persona,
    });

    // Build user message with financial context
    const userMessage = `Generate exactly 4 insight sentences for my financial dashboard based on this context:

${compactContextText}

Financial Persona:
- Monthly Income: ${persona.income.monthlyTotal} SAR
- Monthly Expenses: ${persona.expenses.monthlyTotal} SAR
- Net Monthly Surplus: ${persona.cashFlow.netMonthlySurplus} SAR
- Savings Rate: ${persona.cashFlow.surplusRate}%
- Portfolio Value: ${persona.portfolio.totalPortfolioValue} SAR
- FIRE Progress: ${persona.fire.progressPct}% (${persona.fire.estimatedYearsToFire} years to FIRE)
- Total Obligations: ${persona.obligations.length}
- Health Score: ${wealixContext.healthScore}/100
- Risk Level: ${wealixContext.riskLevel}

Return exactly 4 plain text sentences, one per line. No markdown, no headers.`;

    // Get AI model selection
    const selection = await getResolvedAIModelSelection(authResult.userId!);
    const modelId = selection.preferredModelId;

    // Call AI service
    const messages: AIServiceMessage[] = [
      {
        role: 'system',
        content: DASHBOARD_INSIGHT_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: sanitizeUserMessage(userMessage).sanitized,
      },
    ];

    let responseContent = '';

    try {
      const selection = await getResolvedAIModelSelection(authResult.userId!);
      const aiResult = await AIService.chat(messages as AIServiceMessage[], {
        models: selection.models,
        selectedModelId: modelId,
        fallbackModelId: selection.defaultModelId,
      });
      responseContent = aiResult.content;
    } catch (aiError) {
      console.error('[ai/dashboard-insight] AI service error:', aiError);
      
      const message = aiError instanceof Error ? aiError.message : '';
      if (/API key is not configured|No active AI model is configured/i.test(message)) {
        // Fall back to deterministic insights
        const insightLines = buildDashboardInsightLines(persona, wealixContext);
        
        return new Response(
          JSON.stringify({
            insights: insightLines,
            source: 'deterministic-fallback',
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
      
      // For other errors, also fall back to deterministic
      const insightLines = buildDashboardInsightLines(persona, wealixContext);
      
      return new Response(
        JSON.stringify({
          insights: insightLines,
          source: 'deterministic-fallback',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Parse response into exactly 4 lines
    const lines = responseContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, 4);

    // If we got fewer than 4 lines, pad with fallback insights
    if (lines.length < 4) {
      const fallbackLines = buildDashboardInsightLines(persona, wealixContext);
      
      while (lines.length < 4) {
        lines.push(fallbackLines[lines.length] || 'Continue monitoring your financial data for more precise insights.');
      }
    }

    return new Response(
      JSON.stringify({
        insights: lines.slice(0, 4),
        source: 'ai-generated',
        timestamp: new Date().toISOString(),
        modelUsed: modelId,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[ai/dashboard-insight] Unexpected error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to generate AI insight',
        code: 'INSIGHT_GENERATION_ERROR',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
