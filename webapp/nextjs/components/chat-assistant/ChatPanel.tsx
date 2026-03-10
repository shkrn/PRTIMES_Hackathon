'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

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

type FollowUpQuestionFormProps = {
  questions: string[];
  fields: string[];
  isPending: boolean;
  errorMessage: string | null;
  onSendMessage: (content: string) => Promise<void>;
};

const SINGLE_LINE_FIELDS = new Set([
  'companyName',
  'announcementTitle',
  'announcementDate',
]);

function shouldUseSingleLineInput(fieldName: string | undefined, question: string): boolean {
  if (fieldName && SINGLE_LINE_FIELDS.has(fieldName)) {
    return true;
  }

  return /会社名|団体名|発表日|日付|タイトル|サービス名/.test(question);
}

function FollowUpQuestionForm({
  questions,
  fields,
  isPending,
  errorMessage,
  onSendMessage,
}: FollowUpQuestionFormProps) {
  const [questionAnswers, setQuestionAnswers] = useState<string[]>(() => questions.map(() => ''));

  const handleQuestionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedAnswers = questionAnswers.map((answer) => answer.trim());
    if (normalizedAnswers.some((answer) => !answer) || isPending) {
      return;
    }

    const mergedContent = questions
      .map((question, index) => `${question}\n回答: ${normalizedAnswers[index]}`)
      .join('\n\n');

    await onSendMessage(mergedContent);
    setQuestionAnswers(questions.map(() => ''));
  };

  const areAllQuestionsAnswered =
    questionAnswers.length === questions.length &&
    questionAnswers.every((answer) => answer.trim().length > 0);

  return (
    <form className={styles.form} onSubmit={handleQuestionSubmit}>
      <div className={styles.questionGrid}>
        {questions.map((question, index) => (
          <label key={question} className={styles.questionField}>
            <span className={styles.questionLabel}>{question}</span>
            {shouldUseSingleLineInput(fields[index], question) ? (
              <input
                type="text"
                value={questionAnswers[index] ?? ''}
                onChange={(event) => {
                  const nextAnswers = [...questionAnswers];
                  nextAnswers[index] = event.target.value;
                  setQuestionAnswers(nextAnswers);
                }}
                className={styles.textInput}
                placeholder="ここに回答を入力"
                disabled={isPending}
              />
            ) : (
              <textarea
                value={questionAnswers[index] ?? ''}
                onChange={(event) => {
                  const nextAnswers = [...questionAnswers];
                  nextAnswers[index] = event.target.value;
                  setQuestionAnswers(nextAnswers);
                }}
                className={`${styles.textarea} ${styles.questionTextarea}`}
                placeholder="ここに回答を入力"
                disabled={isPending}
              />
            )}
          </label>
        ))}
      </div>
      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
      <div className={styles.actions}>
        <button type="submit" className={styles.primaryButton} disabled={isPending || !areAllQuestionsAnswered}>
          {isPending ? 'AI に送信中...' : 'まとめて回答'}
        </button>
      </div>
    </form>
  );
}

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
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasOverflow, setHasOverflow] = useState(false);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const latestMessageRef = useRef<HTMLDivElement | null>(null);

  const updateScrollState = () => {
    const node = messageListRef.current;
    if (!node) {
      return;
    }

    const overflow = node.scrollHeight > node.clientHeight + 8;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;

    setHasOverflow(overflow);
    setIsAtBottom(distanceFromBottom < 24);
  };

  const scrollToLatest = () => {
    latestMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  useEffect(() => {
    updateScrollState();
  }, [messages.length, draft, followUpQuestions.length, missingFields.length, isPending]);

  useEffect(() => {
    if (isAtBottom) {
      latestMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [isAtBottom, messages.length, draft, followUpQuestions.length, missingFields.length, isPending]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextInput = input.trim();
    if (!nextInput || isPending) {
      return;
    }

    await onSendMessage(nextInput);
    setInput('');
  };

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>作成支援チャット</h2>
        <p className={styles.description}>
          何を発表したいかを書いてください。不足情報は AI が追加で質問し、下書きを作ります。
        </p>
      </div>

      <div className={styles.chatFrame}>
        <div
          ref={messageListRef}
          className={`${styles.messageList} ${hasOverflow ? styles.messageListScrollable : ''}`}
          onScroll={updateScrollState}
        >
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

          {followUpQuestions.length > 0 ? (
            <details className={styles.metaBlock} open>
              <summary className={styles.metaSummary}>
                <span className={styles.metaTitle}>追加で確認したいこと</span>
                <span className={styles.metaCount}>{followUpQuestions.length}件</span>
              </summary>
              <ul className={styles.metaList}>
                {followUpQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </details>
          ) : null}

          {missingFields.length > 0 ? (
            <details className={`${styles.metaBlock} ${styles.compactMetaBlock}`}>
              <summary className={styles.metaSummary}>
                <span className={styles.metaTitle}>不足している項目</span>
                <span className={styles.metaCount}>{missingFields.length}件</span>
              </summary>
              <ul className={`${styles.metaList} ${styles.compactMetaList}`}>
                {missingFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </details>
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

          <div ref={latestMessageRef} />
        </div>

        {!isAtBottom && hasOverflow ? (
          <div className={styles.scrollNoticeRow}>
            <span className={styles.scrollNotice}>新しい内容は下に続いています</span>
            <button type="button" className={styles.jumpToLatestButton} onClick={scrollToLatest}>
              最新へ移動
            </button>
          </div>
        ) : null}

        <div className={styles.composer}>
          {followUpQuestions.length > 0 ? (
            <FollowUpQuestionForm
              key={followUpQuestions.join('||')}
              questions={followUpQuestions}
              fields={missingFields}
              isPending={isPending}
              errorMessage={errorMessage}
              onSendMessage={onSendMessage}
            />
          ) : (
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
          )}
        </div>
      </div>
    </aside>
  );
}