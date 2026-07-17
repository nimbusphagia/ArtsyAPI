import z from "zod";
import { MemberResponseSchema } from "./members/members.validators";
import { MessageResponseSchema } from "./messages/messages.validators";

const ChatBasicSchema = z.object({
  publicId: z.uuidv7(),
  createdAt: z.coerce.date(),
  members: MemberResponseSchema.array(),
});
// Lazy
export const ChatLazyResponseSchema = ChatBasicSchema.extend({
  lastMessage: MessageResponseSchema,
});
export type ChatLazyRes = z.infer<typeof ChatLazyResponseSchema>;

// With messages
export const ChatResponseSchema = ChatLazyResponseSchema.extend({
  messages: MessageResponseSchema.array(),
});
