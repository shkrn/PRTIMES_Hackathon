'use client';

import { useCallback, useState } from 'react';

import type {
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantDraft,
  AssistantStatus,
  ChatMessage,
  DraftContext,
} from '@/lib/types';
import { AssistantChatRequestSchema } from '@/lib/validation';

const INITIAL_ASSISTANT_MESSAGE =
  '作成したいプレスリリースの内容を教えてください。会社名、発表内容、背景が分かる範囲であればそのまま書いてください。';

type UseChatAssistantOptions = {
  apiBaseUrl: string;
  pressReleaseId?: number;
  getCurrentDraftContext: () => DraftContext;
};

type UseChatAssistantResult = {
  messages: ChatMessage[];
  draft: AssistantDraft | null;
  followUpQuestions: string[];
  missingFields: string[];
  status: AssistantStatus;
  isPending: boolean;
  errorMessage: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearDraft: () => void;
};

function buildAssistantUrl(apiBaseUrl: string): string {
  const normalizedBase = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`;
  return new URL('assistant/chat', normalizedBase).toString();
}

export function useChatAssistant({
  apiBaseUrl,
  pressReleaseId,
  getCurrentDraftContext,
}: UseChatAssistantOptions): UseChatAssistantResult {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: INITIAL_ASSISTANT_MESSAGE },
  ]);
  const [draft, setDraft] = useState<AssistantDraft | null>(null);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [status, setStatus] = useState<AssistantStatus>('asking');
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearDraft = useCallback(() => {
    setDraft(null);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmedContent = content.trim();
      if (!trimmedContent || isPending) {
        return;
      }

      const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmedContent }];
      const payload: AssistantChatRequest = {
        pressReleaseId,
        mode: 'draft',
        messages: nextMessages,
        currentDraftContext: getCurrentDraftContext(),
      };

      AssistantChatRequestSchema.parse(payload);

      setMessages(nextMessages);
      setIsPending(true);
      setErrorMessage(null);

      try {
        const response = await fetch(buildAssistantUrl(apiBaseUrl), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = (await response.json().catch(() => null)) as AssistantChatResponse | null;
        if (!response.ok || !data) {
          throw new Error(data?.error?.message ?? data?.assistantMessage ?? 'AI 応答の取得に失敗しました');
        }

        setStatus(data.status);
        setFollowUpQuestions(data.followUpQuestions ?? []);
        setMissingFields(data.missingFields ?? []);
        setMessages([...nextMessages, { role: 'assistant', content: data.assistantMessage }]);

        if (data.status === 'draft_ready' && data.draftTitle && data.draftContent) {
          setDraft({
            title: data.draftTitle,
            content: data.draftContent,
            meta: data.draftMeta,
          });
        } else {
          setDraft(null);
        }
      } catch (error) {
        setStatus('error');
        setFollowUpQuestions([]);
        setMissingFields([]);
        setDraft(null);
        setErrorMessage(error instanceof Error ? error.message : 'AI 応答の取得に失敗しました');
      } finally {
        setIsPending(false);
      }
    },
    [apiBaseUrl, getCurrentDraftContext, isPending, messages, pressReleaseId]
  );

  return {
    messages,
    draft,
    followUpQuestions,
    missingFields,
    status,
    isPending,
    errorMessage,
    sendMessage,
    clearDraft,
  };
}