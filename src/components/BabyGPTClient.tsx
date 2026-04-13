"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import {
  clearCompanionIntake,
  generateMemoryPrompt,
  loadMemory,
  saveMemory,
  setCompanionIntakeFromQuestionnaire,
  updateMemoryFromConversation,
} from "@/lib/agent-memory";
import { INTRO_SEVEN_QUESTIONS } from "@/lib/companion-onboarding";
import {
  clearIntroIntake,
  isIntroIntakeComplete,
  saveIntroIntake,
} from "@/lib/onboarding-intake-storage";
import { startHeartbeat } from "@/lib/heartbeat";
import { addReminder, parseReminderFromMessage } from "@/lib/reminders";
import {
  extractSseTextDelta,
  extractSseThinkingDelta,
  parseSseAgentMeta,
} from "@/lib/stream-parse";
import type { Skill } from "@/lib/skill-model";
import { lsKey } from "@/lib/storage";
import { skillSystemPrompt, suggestSkillForMessage } from "@/lib/skills";
import type { ChatMessage, Conversation, ModelTier } from "@/lib/types";
import {
  adjustBalance,
  creditMonthKey,
  hydrateCredits,
  loadCreditsState,
  saveCreditsState,
  setPlan,
  type CreditsStateV1,
} from "@/lib/credits-store";
import { fetchChatWithRetry, formatChatError } from "@/lib/fetch-chat";
import { planRank, type PowerTemplate } from "@/lib/instant-templates";
import { inferMood } from "@/lib/mood-engine";
import type { BillingAlertPayload, UsageHint } from "@/lib/billing-usage-hints";
import { APP_VERSION } from "@/lib/app-version";
import { markCapsuleOpened, nextDueTimeCapsule, type TimeCapsule } from "@/lib/time-capsule";
import {
  applyUiPreferences,
  footerShellClass,
  headerShellClass,
  loadUiPreferences,
  mainChatShellClass,
  subBannerClass,
  appRootBgClass,
  type UiPreferences,
} from "@/lib/ui-preferences";
import { PLANS, planAllowsModel, type PlanId, type PlanDefinition } from "@/lib/plans";
import { schrodingerPair } from "@/lib/schrodinger-pair";
import {
  describeCost,
  estimateSendCredits,
  planPermitsSend,
  type SendMode,
} from "@/lib/usage-cost";
import { ProactiveToast } from "./ProactiveToast";
import { ChatArea } from "./ChatArea";
import { ChatInput } from "./ChatInput";
import { CostPreview } from "./CostPreview";
import { SmartActions } from "./SmartActions";
import { CommunityPanel } from "./CommunityPanel";
import { QuantumControls, type QuantumFlags } from "./QuantumControls";
import { SearchOverlay } from "./SearchOverlay";
import { Sidebar } from "./Sidebar";
import { SkillsPanel } from "./SkillsPanel";
import { SettingsPanel } from "./SettingsPanel";
import { SubscriptionModal, type StripeBillingInfo } from "./SubscriptionModal";
import { TimeCapsuleReveal } from "./TimeCapsuleReveal";
import { OnboardingIntakeModal } from "./OnboardingIntakeModal";

const CONV_KEY = lsKey("conversations");
const ACTIVE_KEY = lsKey("active_conversation_id");

function pickModelForPlan(preferred: ModelTier, plan: PlanDefinition): ModelTier {
  if (planAllowsModel(plan, preferred)) return preferred;
  const order: ModelTier[] = ["glm-4", "glm-4-long", "glm-4-plus", "glm-4-air", "glm-4-flash"];
  for (const m of order) {
    if (planAllowsModel(plan, m)) return m;
  }
  return plan.allowedModels[0]!;
}

function loadConvos(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONV_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Conversation[];
  } catch {
    return [];
  }
}

export default function BabyGPTClient() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [model, setModel] = useState<ModelTier>("glm-4-flash");
  const [thinking, setThinking] = useState(false);
  const [schrodinger, setSchrodinger] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const [quantum, setQuantum] = useState<QuantumFlags>({
    kolmogorov: false,
    holographic: false,
    dna: false,
    adiabatic: 0.5,
  });
  const [communityOpen, setCommunityOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [routingReason, setRoutingReason] = useState<string | null>(null);
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null);
  const [skillHint, setSkillHint] = useState<Skill | null>(null);
  /** Composer text — drives skills, mood, and templates */
  const [chatDraft, setChatDraft] = useState("");
  const [streamingAssistantId, setStreamingAssistantId] = useState<string | null>(null);
  /** Aborts in-flight chat SSE when starting a new send or clicking Stop. */
  const streamAbortRef = useRef<AbortController | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; body: string; draft: string; open: boolean }>>([]);
  const [introGateOpen, setIntroGateOpen] = useState(false);
  /** Mirrors local questionnaire + memory; drives Welcome copy and Settings redo. */
  const [introIntakeDone, setIntroIntakeDone] = useState(false);
  const [credits, setCredits] = useState<CreditsStateV1 | null>(null);
  /** Server wallet + login gate (when BABYGPT_APP_PASSWORD is set). */
  const [serverCredits, setServerCredits] = useState(false);
  /** Stripe linkage from GET /api/credits (when gate on, or env-only flags when gate off). */
  const [stripeBilling, setStripeBilling] = useState<StripeBillingInfo | null>(null);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [billingAlert, setBillingAlert] = useState<BillingAlertPayload | null>(null);
  const [usageHints, setUsageHints] = useState<UsageHint[]>([]);
  const [billingAlertLocalDismiss, setBillingAlertLocalDismiss] = useState(false);
  const [uiPrefs, setUiPrefs] = useState<UiPreferences | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [timeCapsuleReveal, setTimeCapsuleReveal] = useState<TimeCapsule | null>(null);
  const notifEnabledRef = useRef(false);

  useEffect(() => {
    const p = loadUiPreferences();
    applyUiPreferences(p);
    setUiPrefs(p);
  }, []);

  useEffect(() => {
    const done = isIntroIntakeComplete();
    setIntroGateOpen(!done);
    setIntroIntakeDone(done);
  }, []);

  useEffect(() => {
    notifEnabledRef.current = Boolean(uiPrefs?.notificationsEnabled);
  }, [uiPrefs?.notificationsEnabled]);

  useEffect(() => {
    function tick() {
      setTimeCapsuleReveal((cur) => {
        if (cur) return cur;
        return nextDueTimeCapsule();
      });
    }
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setBillingAlertLocalDismiss(false);
  }, [billingAlert?.at]);

  const showBillingBanner = useMemo(() => {
    if (!billingAlert || billingAlertLocalDismiss) return false;
    if (typeof sessionStorage !== "undefined") {
      if (sessionStorage.getItem(`babygpt_dismiss_billing_${billingAlert.at}`) === "1") return false;
    }
    return true;
  }, [billingAlert, billingAlertLocalDismiss]);

  const dismissBillingAlert = useCallback(() => {
    if (!billingAlert) return;
    sessionStorage.setItem(`babygpt_dismiss_billing_${billingAlert.at}`, "1");
    setBillingAlertLocalDismiss(true);
  }, [billingAlert]);

  useEffect(() => {
    setConversations(loadConvos());
    setActiveId(localStorage.getItem(ACTIVE_KEY));
  }, []);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const res = await fetch("/api/credits", { credentials: "include" });
        const data = (await res.json()) as {
          source?: string;
          planId?: PlanId;
          balance?: number;
          accrualMonth?: string;
          welcomeApplied?: boolean;
          billingAlert?: BillingAlertPayload | null;
          usageHints?: UsageHint[];
          stripe?: {
            configured?: boolean;
            customerId?: string | null;
            subscriptionStatus?: string | null;
          };
        };
        if (cancelled) return;
        if (data.stripe && typeof data.stripe.configured === "boolean") {
          setStripeBilling({
            configured: data.stripe.configured,
            customerId: data.stripe.customerId ?? null,
            subscriptionStatus: data.stripe.subscriptionStatus ?? null,
          });
        }
        if (data.billingAlert?.kind === "payment_failed") {
          setBillingAlert(data.billingAlert);
        } else {
          setBillingAlert(null);
        }
        if (Array.isArray(data.usageHints)) {
          setUsageHints(data.usageHints);
        } else {
          setUsageHints([]);
        }
        if (data.source === "server" && typeof data.balance === "number" && data.planId) {
          setServerCredits(true);
          setCredits({
            version: 1,
            planId: data.planId,
            balance: data.balance,
            accrualMonth: data.accrualMonth ?? creditMonthKey(),
            welcomeApplied: Boolean(data.welcomeApplied),
          });
          return;
        }
      } catch {
        /* local fallback */
      }
      if (cancelled) return;
      setBillingAlert(null);
      setUsageHints([]);
      const raw = loadCreditsState();
      const h = hydrateCredits(raw, PLANS[raw.planId].monthlyCredits);
      saveCreditsState(h);
      setCredits(h);
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const openStripeCheckout = useCallback(async (planId: Exclude<PlanId, "free">) => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    const data = (await res.json()) as { error?: string; url?: string };
    if (!res.ok) {
      setBanner(data.error ?? "Checkout could not start.");
      setSubscriptionOpen(false);
      return;
    }
    if (!data.url) {
      setBanner("Checkout did not return a redirect URL. Check Stripe keys and server logs.");
      setSubscriptionOpen(false);
      return;
    }
    window.location.href = data.url;
  }, []);

  const openStripePortal = useCallback(async () => {
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      credentials: "include",
    });
    const data = (await res.json()) as { error?: string; url?: string };
    if (!res.ok) {
      setBanner(data.error ?? "Could not open the billing portal.");
      return;
    }
    if (!data.url) {
      setBanner("Portal did not return a URL. Ensure you have an active Stripe customer (subscribe once first).");
      return;
    }
    window.location.href = data.url;
  }, []);

  const scrollToQuantumBar = useCallback(() => {
    document.getElementById("babygpt-quantum-bar")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const activePlanId = credits?.planId;
  useEffect(() => {
    if (!activePlanId) return;
    const p = PLANS[activePlanId];
    setModel((cur) => (planAllowsModel(p, cur) ? cur : p.allowedModels[0]));
    setAgentMode((a) => (p.features.agent ? a : false));
    setSchrodinger((s) => (p.features.schrodinger ? s : false));
    setQuantum((q) => ({
      kolmogorov: p.features.kolmogorov ? q.kolmogorov : false,
      holographic: p.features.holographic ? q.holographic : false,
      dna: p.features.dna ? q.dna : false,
      adiabatic: p.features.dna ? q.adiabatic : 0.5,
    }));
  }, [activePlanId]);

  useEffect(() => {
    try {
      localStorage.setItem(CONV_KEY, JSON.stringify(conversations));
    } catch {
      // ignore quota
    }
  }, [conversations]);

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const convRef = useRef(conversations);
  const activeRef = useRef(activeId);
  useEffect(() => {
    convRef.current = conversations;
  }, [conversations]);
  useEffect(() => {
    activeRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    const stop = startHeartbeat({
      getLastUserMessage: () => {
        const c = convRef.current.find((x) => x.id === activeRef.current);
        const last = [...(c?.messages ?? [])].reverse().find((m) => m.role === "user");
        return last?.content ?? null;
      },
      onSuggest: (s) => {
        setToasts((prev) => [...prev, { ...s, open: true }]);
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          notifEnabledRef.current &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification(s.title, { body: s.body.slice(0, 240) });
          } catch {
            /* ignore */
          }
        }
      },
    });
    return stop;
  }, []);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const lastUserBubble = useMemo(() => {
    const msgs = active?.messages ?? [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i]?.role === "user") return msgs[i]!.content;
    }
    return "";
  }, [active?.messages]);

  const lastAssistantText = useMemo(() => {
    const msgs = active?.messages ?? [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i]?.role === "assistant" && msgs[i]!.content.trim()) return msgs[i]!.content;
    }
    return "";
  }, [active?.messages]);

  const mood = useMemo(
    () => inferMood(`${chatDraft}\n${lastUserBubble}`),
    [chatDraft, lastUserBubble],
  );

  const applyPowerTemplate = useCallback(
    (t: PowerTemplate) => {
      if (!credits) {
        setBanner("Loading credits…");
        return;
      }
      const plan = PLANS[credits.planId];
      if (planRank(plan.id) < planRank(t.minPlan)) {
        setBanner(`That template needs ${t.minPlan}+ — open Plans to upgrade.`);
        setSubscriptionOpen(true);
        return;
      }
      const a = t.apply;
      setModel(pickModelForPlan(a.model, plan));
      setThinking(a.thinking && plan.features.thinking);
      setAgentMode(a.agentMode && plan.features.agent);
      setSchrodinger(a.schrodinger && plan.features.schrodinger);
      setQuantum(() => ({
        kolmogorov: plan.features.kolmogorov ? a.quantum.kolmogorov : false,
        holographic: plan.features.holographic ? a.quantum.holographic : false,
        dna: plan.features.dna ? a.quantum.dna : false,
        adiabatic: a.quantum.adiabatic,
      }));
      setChatDraft(a.draft);
      setBanner(null);
    },
    [credits],
  );

  const upsertConversation = useCallback((next: Conversation) => {
    setConversations((prev) => {
      const i = prev.findIndex((c) => c.id === next.id);
      if (i === -1) return [next, ...prev];
      const copy = [...prev];
      copy[i] = next;
      return copy.sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }, []);

  const newChat = useCallback(() => {
    const id = uuidv4();
    const conv: Conversation = {
      id,
      title: "New chat",
      updatedAt: Date.now(),
      messages: [],
    };
    upsertConversation(conv);
    setActiveId(id);
  }, [upsertConversation]);

  const onDelete = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveId((cur) => (cur === id ? null : cur));
  }, []);

  useEffect(() => {
    setSkillHint(suggestSkillForMessage(chatDraft));
  }, [chatDraft]);

  const sendMessage = useCallback(
    async (text: string, options?: { regenerate?: boolean }) => {
      const regenerate = options?.regenerate === true;
      const trimmed = text.trim();
      if (!regenerate && !trimmed) return;

      if (!isIntroIntakeComplete()) {
        setBanner("Finish the connection questionnaire to start chatting.");
        return;
      }

      if (!credits) {
        setBanner("Loading credits… try again in a moment.");
        return;
      }

      const planDef = PLANS[credits.planId];
      const useSchrodinger = schrodinger && !agentMode;
      const mode: SendMode = agentMode ? "agent" : useSchrodinger ? "schrodinger" : "chat";
      const costInput = { model, thinking, mode };
      if (!planPermitsSend(planDef, costInput)) {
        setBanner(
          `Not included on ${planDef.label}: adjust model or modes, or open Plans to upgrade.`,
        );
        return;
      }
      const cost = estimateSendCredits(costInput);
      if (credits.balance < cost) {
        setBanner(
          `Need ${cost} credits for this send (${describeCost(costInput, cost)}). Balance: ${credits.balance}. Open Plans.`,
        );
        return;
      }

      let reminderForBanner: ReturnType<typeof parseReminderFromMessage> = null;
      if (!regenerate) {
        reminderForBanner = parseReminderFromMessage(trimmed);
        if (reminderForBanner) {
          addReminder({
            id: uuidv4(),
            text: reminderForBanner.reminderText,
            triggerAt: reminderForBanner.at,
            createdAt: Date.now(),
          });
          setBanner(`Reminder set for ${new Date(reminderForBanner.at).toLocaleString()}`);
        }
      }

      streamAbortRef.current?.abort();
      const ac = new AbortController();
      streamAbortRef.current = ac;

      setBusy(true);
      if (regenerate) {
        setBanner(null);
      } else if (!reminderForBanner) {
        setBanner(null);
      }
      setRoutingReason(null);

      let convId: string;
      let withUser: Conversation;
      let assistantId: string;

      if (regenerate) {
        if (!activeId) {
          setBanner("Open a chat to regenerate the last reply.");
          setBusy(false);
          streamAbortRef.current = null;
          return;
        }
        const prev = conversations.find((c) => c.id === activeId);
        if (!prev?.messages.length) {
          setBusy(false);
          streamAbortRef.current = null;
          return;
        }
        const last = prev.messages[prev.messages.length - 1];
        if (last.role !== "assistant") {
          setBanner("Regenerate replaces the last assistant message — send a message first.");
          setBusy(false);
          streamAbortRef.current = null;
          return;
        }
        convId = activeId;
        const trimmedMsgs = prev.messages.slice(0, -1);
        withUser = {
          ...prev,
          messages: trimmedMsgs,
          updatedAt: Date.now(),
        };
        upsertConversation(withUser);
        setActiveId(convId);
        const mem = updateMemoryFromConversation(withUser);
        saveMemory(mem);
        assistantId = uuidv4();
        const assistantShell: ChatMessage = {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: Date.now(),
          toolCalls: [],
          errorCorrectionLog: [],
        };
        upsertConversation({
          ...withUser,
          updatedAt: Date.now(),
          messages: [...withUser.messages, assistantShell],
        });
      } else {
        convId = activeId ?? uuidv4();
        const prev = conversations.find((c) => c.id === convId);
        const userMsg: ChatMessage = {
          id: uuidv4(),
          role: "user",
          content: trimmed,
          createdAt: Date.now(),
        };

        const base: Conversation =
          prev ??
          ({
            id: convId,
            title: trimmed.slice(0, 72) || "New chat",
            updatedAt: Date.now(),
            messages: [],
          } satisfies Conversation);

        withUser = {
          ...base,
          title: base.title === "New chat" ? trimmed.slice(0, 72) : base.title,
          updatedAt: Date.now(),
          messages: [...base.messages, userMsg],
        };

        upsertConversation(withUser);
        setActiveId(convId);

        const mem = updateMemoryFromConversation(withUser);
        saveMemory(mem);

        assistantId = uuidv4();
        const assistantShell: ChatMessage = {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: Date.now(),
          toolCalls: [],
          errorCorrectionLog: [],
        };

        upsertConversation({
          ...withUser,
          updatedAt: Date.now(),
          messages: [...withUser.messages, assistantShell],
        });
      }

      const memoryPrompt = generateMemoryPrompt(loadMemory());
      const skillPrompt = skillSystemPrompt(activeSkill);

      const payloadMessages = withUser.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const endpoint = useSchrodinger
        ? "/api/chat/schrodinger"
        : agentMode
          ? "/api/chat/agent"
          : "/api/chat";

      const schPair = schrodingerPair(model, PLANS[credits.planId].allowedModels);
      const body = useSchrodinger
        ? JSON.stringify({
            messages: payloadMessages,
            modelA: schPair.modelA,
            modelB: schPair.modelB,
          })
        : JSON.stringify({
            messages: payloadMessages,
            model,
            thinking: thinking ? "on" : "off",
            memoryPrompt,
            skillPrompt: skillPrompt || undefined,
            quantum: {
              kolmogorov: quantum.kolmogorov,
              holographic: quantum.holographic,
              dna: quantum.dna,
              adiabatic: quantum.adiabatic,
            },
          });

      let res: Response;
      try {
        res = await fetchChatWithRetry(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: ac.signal,
        });
      } catch (e) {
        setBusy(false);
        setStreamingAssistantId(null);
        streamAbortRef.current = null;
        if (e instanceof DOMException && e.name === "AbortError") {
          setBanner("Generation stopped.");
          return;
        }
        setBanner("Network error — check your connection and try again.");
        return;
      }

      const rr = res.headers.get("X-BabyGPT-Routing-Reason");
      if (rr) setRoutingReason(decodeURIComponent(rr));

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setBanner(formatChatError(res.status, err.error));
        setBusy(false);
        streamAbortRef.current = null;
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setBanner("No response stream");
        setBusy(false);
        streamAbortRef.current = null;
        return;
      }

      setStreamingAssistantId(assistantId);

      const dec = new TextDecoder();
      let buffer = "";
      let acc = "";
      let thinkingAcc = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += dec.decode(value, { stream: true });
          const parts = buffer.split("\n");
          buffer = parts.pop() ?? "";
          for (const line of parts) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith("data:")) continue;
            const payload = trimmedLine.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              const j = JSON.parse(payload) as { schrodinger?: boolean; winner?: string };
              if (j.schrodinger && j.winner) {
                setBanner(`Schrödinger winner: ${j.winner}`);
              }
            } catch {
              // ignore
            }

            const meta = parseSseAgentMeta(trimmedLine);
            if (meta) {
              setConversations((prev) => {
                const c = prev.find((x) => x.id === convId);
                if (!c) return prev;
                const msgs = c.messages.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        toolCalls: meta.toolCalls,
                        errorCorrectionLog: meta.errorCorrectionLog,
                      }
                    : m,
                );
                return prev
                  .map((x) => (x.id === convId ? { ...x, messages: msgs, updatedAt: Date.now() } : x))
                  .sort((a, b) => b.updatedAt - a.updatedAt);
              });
              continue;
            }

            acc += extractSseTextDelta(trimmedLine);
            thinkingAcc += extractSseThinkingDelta(trimmedLine);
          }

          setConversations((prev) => {
            const c = prev.find((x) => x.id === convId);
            if (!c) return prev;
            const msgs = c.messages.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: acc,
                    thinking: thinkingAcc.trim() || undefined,
                  }
                : m,
            );
            return prev
              .map((x) => (x.id === convId ? { ...x, messages: msgs, updatedAt: Date.now() } : x))
              .sort((a, b) => b.updatedAt - a.updatedAt);
          });
        }

        buffer += dec.decode();
        if (buffer.trim()) {
          for (const line of buffer.split("\n")) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith("data:")) continue;
            const meta = parseSseAgentMeta(trimmedLine);
            if (meta) {
              setConversations((prev) => {
                const c = prev.find((x) => x.id === convId);
                if (!c) return prev;
                const msgs = c.messages.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        toolCalls: meta.toolCalls,
                        errorCorrectionLog: meta.errorCorrectionLog,
                      }
                    : m,
                );
                return prev
                  .map((x) => (x.id === convId ? { ...x, messages: msgs, updatedAt: Date.now() } : x))
                  .sort((a, b) => b.updatedAt - a.updatedAt);
              });
              continue;
            }
            acc += extractSseTextDelta(trimmedLine);
            thinkingAcc += extractSseThinkingDelta(trimmedLine);
          }
          setConversations((prev) => {
            const c = prev.find((x) => x.id === convId);
            if (!c) return prev;
            const msgs = c.messages.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: acc,
                    thinking: thinkingAcc.trim() || undefined,
                  }
                : m,
            );
            return prev
              .map((x) => (x.id === convId ? { ...x, messages: msgs, updatedAt: Date.now() } : x))
              .sort((a, b) => b.updatedAt - a.updatedAt);
          });
        }

        if (!serverCredits) {
          setCredits((prev) => {
            if (!prev) return prev;
            const next = adjustBalance(prev, -cost);
            saveCreditsState(next);
            return next;
          });
        } else {
          void (async () => {
            const r = await fetch("/api/credits", { credentials: "include" });
            if (!r.ok) return;
            const d = (await r.json()) as {
              source?: string;
              planId?: PlanId;
              balance?: number;
              accrualMonth?: string;
              welcomeApplied?: boolean;
            };
            if (d.source !== "server" || typeof d.balance !== "number" || !d.planId) return;
            setCredits({
              version: 1,
              planId: d.planId,
              balance: d.balance,
              accrualMonth: d.accrualMonth ?? creditMonthKey(),
              welcomeApplied: Boolean(d.welcomeApplied),
            });
          })();
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          setBanner("Generation stopped.");
        } else {
          setBanner("Stream interrupted — try again.");
        }
      } finally {
        setBusy(false);
        setStreamingAssistantId(null);
        streamAbortRef.current = null;
      }
    },
    [
      activeId,
      activeSkill,
      agentMode,
      conversations,
      credits,
      model,
      quantum,
      schrodinger,
      serverCredits,
      thinking,
      upsertConversation,
    ],
  );

  const onIntroIntakeComplete = useCallback((answers: string[]) => {
    saveIntroIntake(answers);
    setCompanionIntakeFromQuestionnaire(INTRO_SEVEN_QUESTIONS, answers);
    setIntroGateOpen(false);
    setIntroIntakeDone(true);
  }, []);

  const redoConnectionQuestionnaire = useCallback(() => {
    clearIntroIntake();
    clearCompanionIntake();
    setIntroIntakeDone(false);
    setIntroGateOpen(true);
    setSettingsOpen(false);
  }, []);

  const regenerateLastResponse = useCallback(() => {
    void sendMessage("", { regenerate: true });
  }, [sendMessage]);

  const stopStreaming = useCallback(() => {
    streamAbortRef.current?.abort();
  }, []);

  const canRegenerateLast = useMemo(() => {
    if (!active?.messages.length || busy) return false;
    return active.messages[active.messages.length - 1]!.role === "assistant";
  }, [active?.messages, busy]);

  const runSmartAction = useCallback(
    (prompt: string) => {
      void sendMessage(prompt);
    },
    [sendMessage],
  );

  const previewMode: SendMode = agentMode ? "agent" : schrodinger && !agentMode ? "schrodinger" : "chat";
  const appearance = uiPrefs?.appearance ?? "dark";

  return (
    <div className={`babygpt-app-root flex h-[100dvh] w-full flex-col ${appRootBgClass(appearance)}`}>
      {introGateOpen ? (
        <OnboardingIntakeModal appearance={appearance} onComplete={onIntroIntakeComplete} />
      ) : null}
      {showBillingBanner && billingAlert ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/45 bg-amber-950/35 px-4 py-2">
          <p className="min-w-0 text-xs text-amber-100/95">{billingAlert.message}</p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void openStripePortal()}
              className="rounded-full bg-amber-500/20 px-3 py-1.5 text-[11px] font-semibold text-amber-50 ring-1 ring-amber-500/40 hover:bg-amber-500/30"
            >
              Manage billing
            </button>
            <button
              type="button"
              onClick={dismissBillingAlert}
              className="rounded-full px-3 py-1.5 text-[11px] text-amber-200/90 ring-1 ring-amber-800/80 hover:bg-amber-950/50"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      <header className={headerShellClass(appearance)}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div
              className={`truncate text-sm font-semibold ${appearance === "light" ? "text-zinc-900" : "text-zinc-100"}`}
            >
              BabyGPT
            </div>
            <span
              className={`hidden items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ring-1 sm:inline-flex ${mood.accentClass}`}
              title="Inferred from your draft and last message"
            >
              <span aria-hidden>{mood.emoji}</span>
              {mood.label}
            </span>
            <span
              className={`inline-flex max-w-[min(420px,40vw)] cursor-help truncate rounded-full px-2 py-0.5 text-[10px] ring-1 ${
                appearance === "light"
                  ? "bg-zinc-200 text-zinc-700 ring-zinc-300"
                  : "bg-zinc-900 text-zinc-500 ring-zinc-800"
              }`}
              title={routingReason ?? "Model routing appears after each reply when Kolmogorov routing is on."}
            >
              {routingReason ? routingReason : "Model reason"}
            </span>
          </div>
          <div
            className={`truncate text-[11px] ${appearance === "light" ? "text-zinc-600" : "text-zinc-600"}`}
          >
            Plans gate models · credits per send · memory · Cmd/Ctrl+K search
          </div>
        </div>
        <QuantumControls
          id="babygpt-quantum-bar"
          plan={credits ? PLANS[credits.planId] : PLANS.free}
          model={model}
          onModel={setModel}
          thinking={thinking}
          onThinking={setThinking}
          schrodinger={schrodinger}
          onSchrodinger={setSchrodinger}
          agentMode={agentMode}
          onAgentMode={setAgentMode}
          quantum={quantum}
          onQuantum={setQuantum}
          onRequestUpgrade={() => setSubscriptionOpen(true)}
        />
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="babygpt-header-btn rounded-full bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-100 ring-1 ring-zinc-800 hover:bg-zinc-800"
            title="Font size, theme, notifications, time capsule"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => setSubscriptionOpen(true)}
            className="babygpt-header-btn rounded-full bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-100 ring-1 ring-zinc-800 hover:bg-zinc-800"
            title="Subscription tiers, model access, and credit balance"
          >
            Plans
          </button>
          <span
            className={`hidden rounded-full px-2 py-1 font-mono text-[10px] ring-1 sm:inline ${
              appearance === "light"
                ? "bg-cyan-100/90 text-cyan-900 ring-cyan-300"
                : "bg-zinc-900/80 text-cyan-200 ring-zinc-800"
            }`}
            title={
              serverCredits
                ? "Credits stored on the server (enforced when app password is enabled)."
                : "Local credit balance in this browser. Enable BABYGPT_APP_PASSWORD for server wallet."
            }
          >
            {credits ? `${credits.balance} cr` : "…"}
          </span>
          {serverCredits ? (
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                router.push("/login");
                router.refresh();
              }}
              className="babygpt-header-btn hidden rounded-full bg-zinc-900 px-2 py-1 text-[10px] text-zinc-400 ring-1 ring-zinc-800 hover:bg-zinc-800 sm:inline"
            >
              Sign out
            </button>
          ) : null}
          {activeSkill ? (
            <span className="hidden max-w-[160px] truncate rounded-full bg-cyan-950/40 px-2 py-1 text-[10px] text-cyan-200 ring-1 ring-cyan-900 sm:inline">
              Skill: {activeSkill.name}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setSkillsOpen(true)}
            className="babygpt-header-btn rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-100 ring-1 ring-zinc-800 hover:bg-zinc-800"
          >
            Skills
          </button>
          <button
            type="button"
            onClick={() => setCommunityOpen(true)}
            className="babygpt-header-btn rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-100 ring-1 ring-zinc-800 hover:bg-zinc-800"
          >
            Community
          </button>
        </div>
      </header>

      {banner || busy || canRegenerateLast ? (
        <div className={subBannerClass(appearance)}>
          <div className="min-w-0 text-xs text-zinc-300">
            {banner ?? (busy ? <span className="text-zinc-400">Generating…</span> : null)}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {busy ? (
              <button
                type="button"
                onClick={stopStreaming}
                className="rounded-full bg-zinc-800 px-3 py-1.5 text-[11px] font-semibold text-zinc-100 ring-1 ring-zinc-700 hover:bg-zinc-700"
              >
                Stop
              </button>
            ) : null}
            {canRegenerateLast ? (
              <button
                type="button"
                onClick={regenerateLastResponse}
                className="rounded-full bg-zinc-800 px-3 py-1.5 text-[11px] font-semibold text-cyan-200 ring-1 ring-zinc-700 hover:bg-zinc-700"
              >
                Regenerate
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onNew={newChat}
          onSelect={setActiveId}
          onDelete={onDelete}
          appearance={appearance}
        />
        <div className={mainChatShellClass(appearance, mood.shellClass)}>
          <ChatArea
            messages={active?.messages ?? []}
            empty={!active || active.messages.length === 0}
            onOpenPlans={() => setSubscriptionOpen(true)}
            onOpenSearch={() => setSearchOpen(true)}
            onJumpToQuantum={scrollToQuantumBar}
            busy={busy}
            streamingAssistantId={streamingAssistantId}
            plan={credits ? PLANS[credits.planId] : PLANS.free}
            onPickTemplate={applyPowerTemplate}
            introIntakeComplete={introIntakeDone}
            onInsertComposerText={(text, how) => {
              if (how === "prefixFirst") {
                setChatDraft((d) => {
                  const cur = d.trim();
                  return cur ? `${text}${cur}` : text;
                });
              } else {
                setChatDraft(text);
              }
            }}
          />
          {active && active.messages.length > 0 && lastAssistantText && !busy ? (
            <SmartActions
              assistantText={lastAssistantText}
              lastUserText={lastUserBubble}
              onAction={runSmartAction}
              disabled={busy || !credits || introGateOpen}
            />
          ) : null}
          <ChatInput
            disabled={busy || !credits || introGateOpen}
            value={chatDraft}
            onValueChange={setChatDraft}
            onSend={sendMessage}
            skillSuggestion={skillHint}
            onUseSkill={() => {
              if (skillHint) setActiveSkill(skillHint);
            }}
          >
            {credits ? (
              <CostPreview
                balance={credits.balance}
                model={model}
                thinking={thinking}
                mode={previewMode}
              />
            ) : null}
          </ChatInput>
        </div>
      </div>

      <SearchOverlay
        key={searchOpen ? "open" : "closed"}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        conversations={conversations}
        onPick={(id) => setActiveId(id)}
      />
      <CommunityPanel
        open={communityOpen}
        onClose={() => setCommunityOpen(false)}
        creditsBalance={credits?.balance ?? 0}
        serverCredits={serverCredits}
        onAfterServerDebate={async () => {
          const r = await fetch("/api/credits", { credentials: "include" });
          if (!r.ok) return;
          const d = (await r.json()) as {
            source?: string;
            planId?: PlanId;
            balance?: number;
            accrualMonth?: string;
            welcomeApplied?: boolean;
            billingAlert?: BillingAlertPayload | null;
            usageHints?: UsageHint[];
            stripe?: {
              configured?: boolean;
              customerId?: string | null;
              subscriptionStatus?: string | null;
            };
          };
          if (d.source !== "server" || typeof d.balance !== "number" || !d.planId) return;
          if (d.stripe && typeof d.stripe.configured === "boolean") {
            setStripeBilling({
              configured: d.stripe.configured,
              customerId: d.stripe.customerId ?? null,
              subscriptionStatus: d.stripe.subscriptionStatus ?? null,
            });
          }
          if (d.billingAlert?.kind === "payment_failed") {
            setBillingAlert(d.billingAlert);
          } else {
            setBillingAlert(null);
          }
          if (Array.isArray(d.usageHints)) {
            setUsageHints(d.usageHints);
          }
          setCredits({
            version: 1,
            planId: d.planId,
            balance: d.balance,
            accrualMonth: d.accrualMonth ?? creditMonthKey(),
            welcomeApplied: Boolean(d.welcomeApplied),
          });
        }}
        onSpendCredits={(amount) => {
          let ok = false;
          flushSync(() => {
            setCredits((prev) => {
              if (!prev || prev.balance < amount) return prev;
              ok = true;
              const next = adjustBalance(prev, -amount);
              saveCreditsState(next);
              return next;
            });
          });
          return ok;
        }}
      />
      <SkillsPanel
        open={skillsOpen}
        onClose={() => setSkillsOpen(false)}
        onActivateSkill={(s) => setActiveSkill(s)}
      />
      <SubscriptionModal
        open={subscriptionOpen}
        onClose={() => setSubscriptionOpen(false)}
        currentPlanId={credits?.planId ?? "free"}
        balance={credits?.balance ?? 0}
        serverCredits={serverCredits}
        stripeBilling={stripeBilling}
        usageHints={usageHints}
        onCheckout={openStripeCheckout}
        onManageBilling={openStripePortal}
        onSelectPlan={async (id: PlanId) => {
          if (!credits) {
            setSubscriptionOpen(false);
            return;
          }
          if (serverCredits) {
            const res = await fetch("/api/credits", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ planId: id }),
            });
            const data = (await res.json()) as {
              source?: string;
              planId?: PlanId;
              balance?: number;
              accrualMonth?: string;
              welcomeApplied?: boolean;
              error?: string;
            };
            if (!res.ok) {
              setBanner(data.error ?? "Could not update plan on server.");
              setSubscriptionOpen(false);
              return;
            }
            if (data.source === "server" && data.planId) {
              setCredits({
                version: 1,
                planId: data.planId,
                balance: data.balance ?? 0,
                accrualMonth: data.accrualMonth ?? creditMonthKey(),
                welcomeApplied: Boolean(data.welcomeApplied),
              });
            }
            setSubscriptionOpen(false);
            return;
          }
          setCredits((prev) => {
            if (!prev) return prev;
            const next = setPlan(prev, id);
            saveCreditsState(next);
            return next;
          });
          setSubscriptionOpen(false);
        }}
      />
      <ProactiveToast
        items={toasts}
        onDismiss={(id) => setToasts((t) => t.map((x) => (x.id === id ? { ...x, open: false } : x)))}
        onAsk={(draft) => void sendMessage(draft)}
      />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onPreferencesSaved={(p) => {
          applyUiPreferences(p);
          setUiPrefs(p);
        }}
        introIntakeComplete={introIntakeDone}
        onRedoConnectionQuestionnaire={redoConnectionQuestionnaire}
      />
      {timeCapsuleReveal ? (
        <TimeCapsuleReveal
          capsule={timeCapsuleReveal}
          onDismiss={() => {
            markCapsuleOpened(timeCapsuleReveal.id);
            setTimeCapsuleReveal(null);
            const next = nextDueTimeCapsule();
            if (next) setTimeCapsuleReveal(next);
          }}
        />
      ) : null}
      <footer className={footerShellClass(appearance)}>
        <span className="text-zinc-500">v{APP_VERSION}</span>
        {" · "}
        BabyGPT is not affiliated with or endorsed by OpenAI. &quot;ChatGPT&quot; is a trademark of OpenAI.
      </footer>
    </div>
  );
}
