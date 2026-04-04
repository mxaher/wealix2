export type AgentRole =
  | 'ceo'
  | 'finance'
  | 'portfolio'
  | 'market'
  | 'risk'
  | 'growth'
  | 'infrastructure';

export type DecisionPriority = 'critical' | 'high' | 'medium' | 'low';
export type AgentHealth = 'healthy' | 'degraded' | 'down';
export type AgentConfidence = 'high' | 'medium' | 'low';
export type DispatchMode = 'local-execution' | 'remote-trigger' | 'queued-local';

export type CompanyMetric = {
  name: string;
  value: number | string;
  trend: 'up' | 'down' | 'stable';
  threshold?: { warning: number; critical: number };
};

export type CompanyMetricMap = Partial<Record<AgentRole | 'company', CompanyMetric[]>>;

export type AgentTask = {
  id: string;
  assignedTo: AgentRole;
  instruction: string;
  context: Record<string, unknown>;
  priority: DecisionPriority;
  deadline?: Date;
  status: 'pending' | 'running' | 'done' | 'failed';
  result?: TaskExecutionResult | null;
};

export type CompanyState = {
  totalUsers: number;
  totalAUM: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  criticalIssues: string[];
  lastUpdated: Date;
};

export type DecisionLog = {
  timestamp: Date;
  context: string;
  reasoning: string;
  decision: string;
  outcome?: string;
};

export type Alert = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  source: AgentRole;
  message: string;
  createdAt: Date;
  resolvedAt?: Date;
};

export type CEOMemory = {
  sessionId: string;
  companyState: CompanyState;
  decisions: DecisionLog[];
  activeAlerts: Alert[];
  agentStatuses: Record<AgentRole, AgentHealth>;
};

export type SubAgentBriefing = {
  role: AgentRole;
  headline: string;
  summary: string;
  findings: string[];
  recommendations: string[];
  metrics: CompanyMetric[];
  confidence: AgentConfidence;
  generatedAt: Date;
  rawContext?: Record<string, unknown>;
};

export type TaskExecutionResult = {
  summary: string;
  recommendations: string[];
  confidence: AgentConfidence;
  generatedAt: Date;
  remoteAgent?: string;
};

export type CEOResponse = {
  summary: string;
  decisions: string[];
  tasksDispatched: AgentTask[];
  alerts: Alert[];
  nextActions: string[];
  companyState: CompanyState;
  metrics: CompanyMetric[];
  briefings: SubAgentBriefing[];
  dispatchResults: ToolDispatchResult[];
};

export type ToolDispatchResult = {
  taskId: string;
  assignedTo: AgentRole;
  mode: DispatchMode;
  accepted: boolean;
  note: string;
  execution?: TaskExecutionResult | null;
};
