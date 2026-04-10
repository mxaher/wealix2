'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Radio, Send, XCircle } from 'lucide-react';
import { DashboardShell } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useAgentTaskStore } from '@/store/useAgentTaskStore';

const FILTERS = ['all', 'queued', 'assigned', 'in_progress', 'completed', 'failed', 'cancelled'] as const;

export default function AdminAgentsPage() {
  const { agents, tasks, selectedTask, activeStatusFilter } = useAgentTaskStore((state) => state.data);
  const isLoading = useAgentTaskStore((state) => state.isLoading);
  const error = useAgentTaskStore((state) => state.error);
  const lastSyncedAt = useAgentTaskStore((state) => state.lastSyncedAt);
  const loadOverview = useAgentTaskStore((state) => state.loadOverview);
  const createTask = useAgentTaskStore((state) => state.createTask);
  const broadcast = useAgentTaskStore((state) => state.broadcast);
  const loadTaskDetail = useAgentTaskStore((state) => state.loadTaskDetail);
  const cancelTask = useAgentTaskStore((state) => state.cancelTask);
  const setStatusFilter = useAgentTaskStore((state) => state.setStatusFilter);

  const [agentId, setAgentId] = useState('');
  const [taskType, setTaskType] = useState('analysis');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [payloadText, setPayloadText] = useState('{\n  "scope": "portfolio"\n}');
  const [targetUserId, setTargetUserId] = useState('');
  const [scheduleValue, setScheduleValue] = useState('');
  const [broadcastText, setBroadcastText] = useState('');

  useEffect(() => {
    void loadOverview();
    const timer = window.setInterval(() => {
      void loadOverview();
    }, 10_000);

    return () => window.clearInterval(timer);
  }, [loadOverview]);

  const effectiveAgentId = agentId || agents[0]?.agentId || '';
  const selectedAgent = agents.find((agent) => agent.agentId === effectiveAgentId) ?? null;

  const submitTask = async () => {
    try {
        const payload = JSON.parse(payloadText || '{}') as Record<string, unknown>;
      await createTask({
        agentId: effectiveAgentId,
        taskType: taskType || selectedAgent?.capabilities[0] || 'analysis',
        priority,
        payload,
        scheduledAt: scheduleValue ? new Date(scheduleValue).toISOString() : null,
        targetUserId: targetUserId || null,
      });
      toast({ title: 'Task created', description: `Assigned to ${agentId}.` });
    } catch (error) {
      toast({
        title: 'Task creation failed',
        description: error instanceof Error ? error.message : 'Could not create task.',
        variant: 'destructive',
      });
    }
  };

  const submitBroadcast = async () => {
    if (!broadcastText.trim()) {
      return;
    }

    try {
      await broadcast(agentId || 'all', broadcastText.trim());
      setBroadcastText('');
      toast({ title: 'Broadcast sent', description: 'The instruction was queued for the agents.' });
    } catch (error) {
      toast({
        title: 'Broadcast failed',
        description: error instanceof Error ? error.message : 'Could not send the broadcast.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Agent Command Center</h1>
            <p className="text-sm text-muted-foreground">
              Monitor agent status, queue admin tasks, and send direct instructions.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}` : 'Waiting for first sync'}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Agents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {agents.map((agent) => (
                  <button
                    key={agent.agentId}
                    type="button"
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${agentId === agent.agentId ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}
                    onClick={() => {
                        setAgentId(agent.agentId);
                        setTaskType(agent.capabilities[0] ?? 'analysis');
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{agent.name}</div>
                        <div className="text-xs text-muted-foreground">{agent.role}</div>
                      </div>
                      <Badge variant={agent.status === 'busy' ? 'default' : agent.status === 'offline' ? 'destructive' : 'secondary'}>
                        {agent.status}
                      </Badge>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Tasks: {agent.currentTaskCount}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {agent.capabilities.map((capability) => (
                        <Badge key={capability} variant="outline">{capability}</Badge>
                      ))}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Broadcast</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={broadcastText}
                  onChange={(event) => setBroadcastText(event.target.value)}
                  placeholder="Send an instruction to the selected agent or all agents."
                  className="min-h-28"
                />
                <Button onClick={submitBroadcast} className="w-full gap-2">
                  <Send className="h-4 w-4" />
                  Send Broadcast
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>New Task</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Agent</Label>
                  <Select value={effectiveAgentId} onValueChange={setAgentId}>
                    <SelectTrigger><SelectValue placeholder="Choose an agent" /></SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.agentId} value={agent.agentId}>{agent.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Task Type</Label>
                  <Select value={taskType} onValueChange={setTaskType}>
                    <SelectTrigger><SelectValue placeholder="Choose task type" /></SelectTrigger>
                    <SelectContent>
                      {(selectedAgent?.capabilities ?? ['analysis']).map((capability) => (
                        <SelectItem key={capability} value={capability}>{capability}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(value) => setPriority(value as typeof priority)}>
                    <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target User</Label>
                  <Input value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} placeholder="Optional Clerk user id" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Schedule</Label>
                  <Input type="datetime-local" value={scheduleValue} onChange={(event) => setScheduleValue(event.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Payload (JSON)</Label>
                  <Textarea value={payloadText} onChange={(event) => setPayloadText(event.target.value)} className="min-h-40 font-mono text-xs" />
                </div>
                <div className="md:col-span-2">
                  <Button onClick={submitTask} disabled={!effectiveAgentId} className="gap-2">
                    <Radio className="h-4 w-4" />
                    Queue Task
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>Task Queue</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {FILTERS.map((filter) => (
                    <Button
                      key={filter}
                      variant={activeStatusFilter === filter ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setStatusFilter(filter);
                        void loadOverview({ status: filter });
                      }}
                    >
                      {filter}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading && !tasks.length ? (
                  <div className="text-sm text-muted-foreground">Loading tasks...</div>
                ) : tasks.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No tasks in this queue yet.</div>
                ) : (
                  tasks.map((task) => (
                    <button
                      key={task.taskId}
                      type="button"
                      className={`w-full rounded-xl border p-4 text-left transition-colors ${selectedTask?.taskId === task.taskId ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}
                      onClick={() => void loadTaskDetail(task.taskId)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">#{task.taskId} {task.taskType}</div>
                          <div className="text-sm text-muted-foreground">{task.agentId}</div>
                        </div>
                        <Badge variant={task.status === 'failed' ? 'destructive' : task.status === 'completed' ? 'secondary' : 'default'}>
                          {task.status}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground line-clamp-2">{task.instruction}</div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            {selectedTask && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <CardTitle>Task Detail #{selectedTask.taskId}</CardTitle>
                  {!['completed', 'failed', 'cancelled'].includes(selectedTask.status) && (
                    <Button variant="destructive" size="sm" className="gap-2" onClick={() => void cancelTask(selectedTask.taskId)}>
                      <XCircle className="h-4 w-4" />
                      Cancel
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Agent</div>
                      <div className="font-medium">{selectedTask.agentId}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Priority</div>
                      <div className="font-medium capitalize">{selectedTask.priority}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Status</div>
                      <div className="font-medium">{selectedTask.status}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Instruction</div>
                    <div className="rounded-xl border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{selectedTask.instruction}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Payload</div>
                    <pre className="overflow-x-auto rounded-xl border bg-muted/30 p-3 text-xs">{JSON.stringify(selectedTask.payload, null, 2)}</pre>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Logs</div>
                    <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
                      {selectedTask.logs.length ? selectedTask.logs.map((log) => (
                        <div key={log} className="font-mono text-xs">{log}</div>
                      )) : <div className="text-xs text-muted-foreground">No logs yet.</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
