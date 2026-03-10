'use client';

import { useState, type FormEvent } from 'react';

import type { AssistantDraft, ChatMessage } from '@/lib/types';

import styles from './ChatPanel.module.css';

type ChatPanelProps = {
  messages: ChatMessage[];
  draft: AssistantDraft | null;
  followUpQuestions: string[];
  missingFields: string[];
  isPending: boolean;
  errorMessage: string | null;
  onSendMessage: (content: string) => Promise<void>;
  onApplyDraft: () => void;
  onDismissDraft: () => void;
};

export function ChatPanel({
  messages,
  draft,
  followUpQuestions,
  missingFields,
  isPending,
  errorMessage,
  onSendMessage,
  onApplyDraft,
  onDismissDraft,
}: ChatPanelProps) {
  const [input, setInput] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextInput = input.trim();
    if (!nextInput || isPending) {
      return;
    }

    setInput('');
    await onSendMessage(nextInput);
  };

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>作成支援チャット</h2>
        <p className={styles.description}>
          何を発表したいかを書いてください。不足情報は AI が追加で質問し、下書きを作ります。
        </p>
      </div>

      <div className={styles.messageList}>
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`${styles.message} ${
              message.role === 'assistant' ? styles.assistantMessage : styles.userMessage
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>

      {followUpQuestions.length > 0 ? (
        <div className={styles.metaBlock}>
          <p className={styles.metaTitle}>追加で確認したいこと</p>
          <ul className={styles.metaList}>
            {followUpQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {missingFields.length > 0 ? (
        <div className={styles.metaBlock}>
          <p className={styles.metaTitle}>不足している項目</p>
          <ul className={styles.metaList}>
            {missingFields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {draft ? (
        <div className={styles.draftCard}>
          <h3 className={styles.draftTitle}>{draft.title}</h3>
          <p className={styles.draftContent}>{draft.content}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primaryButton} onClick={onApplyDraft}>
              本文へ反映
            </button>
            <button type="button" className={styles.secondaryButton} onClick={onDismissDraft}>
              下書きを閉じる
            </button>
          </div>
        </div>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="例: 株式会社Exampleが中小企業向けAI要約サービスを発表します。"
          className={styles.textarea}
          disabled={isPending}
        />
        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
        <div className={styles.actions}>
          <button type="submit" className={styles.primaryButton} disabled={isPending || !input.trim()}>
            {isPending ? 'AI に送信中...' : '送信'}
          </button>
        </div>
      </form>
    </aside>
  );
}