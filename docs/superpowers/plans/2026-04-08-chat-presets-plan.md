# Chat Presets & Sampling Expansion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the chat configuration options to support LM Studio's advanced sampling parameters (Top P, Min P, Repeat Penalty) and a customizable System Prompt.
**Architecture:** Update `ChatInput.tsx`'s advanced settings area. Update the frontend state to track these values and pass them down when sending messages.
**Tech Stack:** React, TailwindCSS, `lucide-react`.

---

### Task 1: Expand ChatInput State and UI

**Files:**
- Modify: `/workspace/frontend-vite/src/components/features/chat/ChatInput.tsx`

- [ ] **Step 1: Add new props to ChatInput**

Update the interface to include:
```typescript
  systemPrompt: string
  onSystemPromptChange: (value: string) => void
  chatTopP: number
  onTopPChange: (value: number) => void
  chatMinP: number
  onMinPChange: (value: number) => void
  chatRepeatPenalty: number
  onRepeatPenaltyChange: (value: number) => void
```

- [ ] **Step 2: Add UI Controls for new parameters**

In the `showAdvancedSettings` section of `ChatInput.tsx`, add a textarea for the System Prompt and sliders/inputs for Top P, Min P, and Repeat Penalty.

```tsx
// Inside showAdvancedSettings block:
<div className="space-y-3">
  <div>
    <Label className="text-xs text-slate-400">System Prompt</Label>
    <Textarea
      value={systemPrompt}
      onChange={(e) => onSystemPromptChange(e.target.value)}
      placeholder="You are a helpful assistant..."
      className="mt-1 bg-slate-800 border-slate-600 text-white text-xs min-h-[80px]"
    />
  </div>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <div>
      <Label className="text-xs text-slate-400">Temperature: {chatTemperature}</Label>
      <Slider
        value={[chatTemperature]}
        onValueChange={([v]) => onTemperatureChange(v)}
        min={0} max={2} step={0.1}
        className="mt-1"
      />
    </div>
    <div>
      <Label className="text-xs text-slate-400">Top P: {chatTopP}</Label>
      <Slider
        value={[chatTopP]}
        onValueChange={([v]) => onTopPChange(v)}
        min={0} max={1} step={0.05}
        className="mt-1"
      />
    </div>
    <div>
      <Label className="text-xs text-slate-400">Min P: {chatMinP}</Label>
      <Slider
        value={[chatMinP]}
        onValueChange={([v]) => onMinPChange(v)}
        min={0} max={1} step={0.01}
        className="mt-1"
      />
    </div>
    <div>
      <Label className="text-xs text-slate-400">Rep Penalty: {chatRepeatPenalty}</Label>
      <Slider
        value={[chatRepeatPenalty]}
        onValueChange={([v]) => onRepeatPenaltyChange(v)}
        min={1} max={2} step={0.05}
        className="mt-1"
      />
    </div>
    <div>
      <Label className="text-xs text-slate-400">Max Tokens</Label>
      <Input
        type="number"
        value={chatMaxTokens}
        onChange={(e) => onMaxTokensChange(parseInt(e.target.value) || 2048)}
        className="mt-1 h-7 bg-slate-800 border-slate-600 text-white text-xs"
      />
    </div>
    <div>
      <Label className="text-xs text-slate-400">Context Length</Label>
      <Select value={String(chatContextLength)} onValueChange={(v) => onContextLengthChange(parseInt(v))}>
        <SelectTrigger className="mt-1 h-7 bg-slate-800 border-slate-600 text-white text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700">
          <SelectItem value="2048" className="text-white text-xs">2K</SelectItem>
          <SelectItem value="4096" className="text-white text-xs">4K</SelectItem>
          <SelectItem value="8192" className="text-white text-xs">8K</SelectItem>
          <SelectItem value="16384" className="text-white text-xs">16K</SelectItem>
          <SelectItem value="32768" className="text-white text-xs">32K</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
</div>
```

### Task 2: Propagate State in ChatPanel & App

**Files:**
- Modify: `/workspace/frontend-vite/src/components/features/ChatPanel.tsx`
- Modify: `/workspace/frontend-vite/src/App.tsx` (or wherever state is held)

- [ ] **Step 1: Update ChatPanel props**
Pass the new props through `ChatPanel` down to `ChatInput`.

- [ ] **Step 2: Update App state and API call**
Ensure the root app component maintains state for `topP`, `minP`, `repeatPenalty`, and `systemPrompt`. Update the `sendChatMessage` function call to pass these new options to the backend.

```typescript
// Example api.ts update if needed:
export async function sendChatMessage(
  model: string,
  messages: { role: string; content: string }[],
  options?: {
    temperature?: number
    max_tokens?: number
    top_p?: number
    min_p?: number
    repeat_penalty?: number
    stream?: boolean
  }
)
```
