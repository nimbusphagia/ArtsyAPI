import z from "zod";
import * as MemberValidators from "./members/members.validators";
import * as MessageValidators from "./messages/messages.validators";
import { Prisma } from "../../generated/prisma/client";

const ChatBasicSchema = z.object({
  publicId: z.uuidv7(),
  createdAt: z.coerce.date(),
  remoteMember: z.lazy(() => MemberValidators.MemberResponseSchema),
});
// Lazy
export const ChatLazyResponseSchema = ChatBasicSchema.extend({
  lastMessage: z.lazy(() => MessageValidators.MessageBasicSchema.optional()),
});
export type ChatLazyRes = z.infer<typeof ChatLazyResponseSchema>;

// With messages
export const ChatResponseSchema = ChatLazyResponseSchema.extend({
  localMember: z.lazy(() => MemberValidators.MemberResponseSchema),
  messages: z.lazy(() => MessageValidators.MessageResponseSchema.array()),
});
export type ChatRes = z.infer<typeof ChatResponseSchema>;

// Prisma
export const ChatSelect = {
  publicId: true,
  createdAt: true,
  get members() {
    return {
      select: MemberValidators.MemberLazySelect,
    };
  },

  get messages() {
    return {
      select: MessageValidators.MessageSelect,
      orderBy: { createdAt: Prisma.SortOrder.desc },
    };
  },
} satisfies Prisma.ChatSelect;

export const ChatLazySelect = {
  publicId: true,
  createdAt: true,
  get members() {
    return {
      select: MemberValidators.MemberLazySelect,
    };
  },
  get messages() {
    return {
      select: MessageValidators.MessageLazySelect,
      orderBy: { createdAt: Prisma.SortOrder.desc },
      take: 1,
    };
  },
} satisfies Prisma.ChatSelect;

// Parse
type ChatRaw = Prisma.ChatGetPayload<{ select: typeof ChatSelect }>;
type ChatLazyRaw = Prisma.ChatGetPayload<{ select: typeof ChatLazySelect }>;

export function parseChat(c: ChatRaw, currentUserId: string) {
  return ChatResponseSchema.parse({
    ...c,
    messages: c.messages,
    localMember: c.members.find((m) => m.profile?.publicId === currentUserId),
    remoteMember: c.members.find((m) => m.profile?.publicId !== currentUserId),
  });
}
export function parseChatLazy(c: ChatLazyRaw, currentUserId: string) {
  return ChatLazyResponseSchema.parse({
    ...c,
    lastMessage: c.messages[0],
    remoteMember: c.members.find((m) => m.profile?.publicId !== currentUserId),
  });
}
