export interface PressRelease {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
}

export interface PressReleaseTemplateSummary {
  id: number;
  name: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface PressReleaseTemplate extends PressReleaseTemplateSummary {
  content: string;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type AssistantStatus = 'asking' | 'draft_ready' | 'error';

export interface DraftContext {
  title: string;
  contentText: string;
  language: string;
}

export interface AssistantError {
  code: string;
  message: string;
}

export interface DraftMeta {
  format: 'plain_text';
  version: number;
}

export interface AssistantChatRequest {
  pressReleaseId?: number;
  mode: 'draft';
  messages: ChatMessage[];
  currentDraftContext: DraftContext;
}

export interface AssistantChatResponse {
  status: AssistantStatus;
  assistantMessage: string;
  followUpQuestions: string[];
  missingFields: string[];
  draftTitle: string | null;
  draftContent: string | null;
  draftMeta: DraftMeta | null;
  error: AssistantError | null;
}

export interface AssistantDraft {
  title: string;
  content: string;
  meta: DraftMeta | null;
}

export interface TipTapContent {
  type: string;
  content?: TipTapNode[];
  attrs?: Record<string, unknown>;
}

export interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  text?: string;
  attrs?: Record<string, unknown>;
}
