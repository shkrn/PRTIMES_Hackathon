import { z } from 'zod';

export const PressReleaseInputSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4000),
});

export const DraftContextSchema = z.object({
  title: z.string(),
  contentText: z.string(),
  language: z.string().default('ja'),
});

export const AssistantChatRequestSchema = z.object({
  pressReleaseId: z.number().int().positive().optional(),
  mode: z.literal('draft'),
  messages: z.array(ChatMessageSchema).min(1),
  currentDraftContext: DraftContextSchema,
});

export type PressReleaseInput = z.infer<typeof PressReleaseInputSchema>;
export type AssistantChatRequestInput = z.infer<typeof AssistantChatRequestSchema>;
