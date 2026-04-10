'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useAIModelStore } from '@/store/useAIModelStore';

export default function AdminAIModelsPage() {
  const { models, defaultModelId } = useAIModelStore((state) => state.data);
  const isLoading = useAIModelStore((state) => state.isLoading);
  const loadFromBackend = useAIModelStore((state) => state.loadFromBackend);
  const createModel = useAIModelStore((state) => state.createModel);
  const updateModel = useAIModelStore((state) => state.updateModel);
  const [draft, setDraft] = useState({
    modelId: '',
    displayName: '',
    provider: 'openai',
    tier: 'standard',
    description: '',
    isActive: true,
    isDefault: false,
  });

  useEffect(() => {
    void loadFromBackend();
  }, [loadFromBackend]);

  const submit = async () => {
    try {
      await createModel({
        modelId: draft.modelId,
        displayName: draft.displayName,
        provider: draft.provider as 'openai' | 'anthropic' | 'google' | 'nvidia' | 'gemma',
        tier: draft.tier as 'standard' | 'premium',
        description: draft.description || null,
        isActive: draft.isActive,
        isDefault: draft.isDefault,
      });
      setDraft({
        modelId: '',
        displayName: '',
        provider: 'openai',
        tier: 'standard',
        description: '',
        isActive: true,
        isDefault: false,
      });
      toast({ title: 'Model created', description: 'The model is now available in Wealix.' });
    } catch (error) {
      toast({
        title: 'Create failed',
        description: error instanceof Error ? error.message : 'Could not create model.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">AI Models</h1>
          <p className="text-sm text-muted-foreground">Manage available providers, defaults, and premium gates.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Add Model</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Model ID</Label>
                <Input value={draft.modelId} onChange={(event) => setDraft((current) => ({ ...current, modelId: event.target.value }))} placeholder="gpt-4o" />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} placeholder="GPT-4o" />
              </div>
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={draft.provider} onValueChange={(value) => setDraft((current) => ({ ...current, provider: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="nvidia">NVIDIA</SelectItem>
                    <SelectItem value="gemma">Gemma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tier</Label>
                <Select value={draft.tier} onValueChange={(value) => setDraft((current) => ({ ...current, tier: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={draft.isActive} onCheckedChange={(checked) => setDraft((current) => ({ ...current, isActive: checked }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Default</Label>
                <Switch checked={draft.isDefault} onCheckedChange={(checked) => setDraft((current) => ({ ...current, isDefault: checked }))} />
              </div>
              <Button onClick={submit} disabled={isLoading}>Save Model</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configured Models</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {models.map((model) => (
                <div key={model.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold">{model.displayName}</div>
                        {model.id === defaultModelId && <Badge>Default</Badge>}
                        <Badge variant="outline">{model.provider}</Badge>
                        <Badge variant="outline">{model.tier}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{model.modelId}</div>
                      {model.description && <div className="mt-2 text-sm text-muted-foreground">{model.description}</div>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant={model.isActive ? 'secondary' : 'outline'} size="sm" onClick={() => void updateModel(model.id, { isActive: !model.isActive })}>
                        {model.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void updateModel(model.id, { isDefault: true, isActive: true })}>
                        Set Default
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
