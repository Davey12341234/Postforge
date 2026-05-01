export type ModelTier =
  | "glm-4-flash"
  | "glm-4-air"
  | "glm-4-plus"
  | "glm-4-long"
  | "glm-4";

export type Role = "system" | "user" | "assistant";

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result: string;
}

export type ErrorCorrectionKind = "tool_retry" | "parse_fix" | "rate_limit" | "api_malformed";

export interface ErrorCorrectionLogEntry {
  at: number;
  kind: ErrorCorrectionKind;
  detail: string;
}

/** File or image attached to a user message (sent to Gemini multimodal). */
export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  /** Raw base64 (no data: prefix). Small files only — omitted when using Gemini Files API. */
  dataBase64?: string;
  /** Gemini Files API URI (large uploads via `/api/gemini/files`). */
  geminiFileUri?: string;
  /** Resource name, e.g. `files/abc123` — used to verify the file before chat. */
  geminiFileName?: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  thinking?: string;
  createdAt: number;
  toolCalls?: ToolCall[];
  errorCorrectionLog?: ErrorCorrectionLogEntry[];
  /** User uploads (images, PDFs, etc.) — requires `GEMINI_API_KEY` and `/api/chat/gemini`. */
  attachments?: ChatAttachment[];
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

/** Shipped behaviors only — names are thematic; descriptions match server/client code. */
export const QUANTUM_FEATURES = [
  {
    id: "thinking",
    name: "Thinking",
    description:
      "GLM (Z.AI): native extended-reasoning channel in the API. OpenAI: adds a stronger step-by-step system instruction (no separate reasoning stream).",
  },
  {
    id: "schrodinger",
    name: "Two models",
    description: "Two models stream in parallel; one winning reply is kept (same feature as the header toggle).",
  },
  {
    id: "agent",
    name: "Agent",
    description: "Tool-using loop (web, calculator, …) with a streamed final answer.",
  },
  {
    id: "kolmogorov",
    name: "Kolmogorov router",
    description:
      "Keyword + length heuristics pick a model tier for this send, overriding the dropdown for that request.",
  },
  {
    id: "holographic",
    name: "Holographic context",
    description: "If the transcript exceeds ~12k characters, older messages are folded to cap prompt size.",
  },
  {
    id: "dna",
    name: "Eigenresponse / DNA",
    description: "Injects a short style hint from recent assistant replies.",
  },
  {
    id: "adiabatic",
    name: "Adiabatic morph",
    description: "Slider merges explore / balance / commit wording into the system prompt.",
  },
  {
    id: "qec",
    name: "Error correction",
    description: "In Agent mode, malformed tool JSON may be retried or repaired — not a separate header toggle.",
  },
] as const;
