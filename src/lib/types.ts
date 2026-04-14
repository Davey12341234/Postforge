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

export const QUANTUM_FEATURES = [
  { id: "schrodinger", name: "Schrödinger Chat", description: "Dual-model racing" },
  { id: "kolmogorov", name: "Kolmogorov Router", description: "Complexity-aware routing" },
  { id: "holographic", name: "Holographic Context", description: "Token-aware context folding" },
  { id: "dna", name: "Eigenresponse / DNA", description: "Style lock from prior turns" },
  { id: "bloch", name: "Bloch Sphere", description: "Intent state visualization" },
  { id: "entangle", name: "Entanglement", description: "Linked thread coherence" },
  { id: "adiabatic", name: "Adiabatic Prompts", description: "Smooth prompt morphing" },
  { id: "qec", name: "Quantum Error Correction", description: "Self-healing drafts" },
  { id: "topology", name: "Conversation Topology", description: "Branch graph view" },
  { id: "retro", name: "Retrocausal Prediction", description: "Next-turn priors" },
] as const;
