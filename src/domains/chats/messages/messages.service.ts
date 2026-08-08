import {
  NotFoundError,
  UnauthorizedError,
} from "../../../config/errors/errors";
import { prisma } from "../../../config/prisma";
import { Prisma } from "../../../generated/prisma/client";
import { ProfileIsNotBlocked } from "../../profiles/profiles.validators";
import {
  MessageDeleteResponse,
  MessageCreateReq,
  MessageRes,
  MessageSelect,
  parseMessage,
  ReplyReq,
} from "./messages.validators";

// Create
export async function createNewMessage(
  data: MessageCreateReq,
  currentUserId: string,
): Promise<{ message: MessageRes; chatId: number }> {
  const currentUser = await prisma.user.findFirst({
    where: {
      publicId: currentUserId,
      active: true,
      profile: { isNot: null },
    },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const currentProfileId = currentUser.profile!.id;

  const chatMember = await prisma.chatMember.findFirst({
    where: {
      profileId: currentProfileId,
      chat: {
        publicId: data.chatId,
        members: {
          every: {
            OR: [
              { profileId: currentProfileId },
              { profile: ProfileIsNotBlocked(currentProfileId) },
            ],
          },
        },
      },
    },
    select: { chatId: true },
  });
  if (!chatMember) throw new NotFoundError("Chat not found");

  const base = {
    chat: { connect: { id: chatMember.chatId } },
    owner: { connect: { id: currentProfileId } },
  } satisfies Partial<Prisma.MessageCreateInput>;
  let rawMessage;
  switch (data.type) {
    case "TEXT":
      rawMessage = await prisma.message.create({
        data: { ...base, type: "TEXT", text: data.text },
        select: MessageSelect,
      });
      break;
    case "POST": {
      const post = await prisma.post.findFirst({
        where: {
          publicId: data.postId,
          OR: [{ private: false }, { authorId: currentProfileId }],
          author: ProfileIsNotBlocked(currentProfileId),
        },
        select: { id: true },
      });
      if (!post) throw new NotFoundError("Post not found");
      rawMessage = await prisma.message.create({
        data: { ...base, type: "POST", post: { connect: { id: post.id } } },
        select: MessageSelect,
      });
      break;
    }
    case "COLLECTION": {
      const collection = await prisma.collection.findFirst({
        where: {
          publicId: data.collectionId,
          OR: [{ private: false }, { ownerId: currentProfileId }],
          owner: ProfileIsNotBlocked(currentProfileId),
        },
        select: { id: true },
      });
      if (!collection) throw new NotFoundError("Collection not found");
      rawMessage = await prisma.message.create({
        data: {
          ...base,
          type: "COLLECTION",
          collection: { connect: { id: collection.id } },
        },
        select: MessageSelect,
      });
      break;
    }
    default: {
      const _exhaustive: never = data;
      throw new Error(
        `Unhandled message type: ${(_exhaustive as MessageCreateReq).type}`,
      );
    }
  }
  return { message: parseMessage(rawMessage), chatId: chatMember.chatId };
}

// Reply
export async function replyToMessageById(
  data: ReplyReq,
  currentUserId: string,
): Promise<{ message: MessageRes; chatId: number }> {
  const currentUser = await prisma.user.findFirst({
    where: {
      publicId: currentUserId,
      active: true,
      profile: { isNot: null },
    },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const currentProfileId = currentUser.profile!.id;

  const chatMember = await prisma.chatMember.findFirst({
    where: {
      profileId: currentProfileId,
      chat: {
        publicId: data.chatId,
        members: {
          every: {
            OR: [
              { profileId: currentProfileId },
              { profile: ProfileIsNotBlocked(currentProfileId) },
            ],
          },
        },
      },
    },
    select: { chatId: true },
  });
  if (!chatMember) throw new NotFoundError("Chat not found");

  const originalMessage = await prisma.message.findFirst({
    where: { publicId: data.replyToId, chatId: chatMember.chatId },
    select: { id: true },
  });
  if (!originalMessage)
    throw new NotFoundError("Message not found in this chat");

  const rawReply = await prisma.message.create({
    data: {
      chat: { connect: { id: chatMember.chatId } },
      owner: { connect: { id: currentProfileId } },
      replyTo: { connect: { id: originalMessage.id } },
      type: "TEXT",
      text: data.text,
    },
    select: MessageSelect,
  });

  return { message: parseMessage(rawReply), chatId: chatMember.chatId };
}
// Soft delete

export async function deactivateMessageById(
  messageId: string,
  currentUserId: string,
): Promise<MessageDeleteResponse> {
  const currentUser = await prisma.user.findFirst({
    where: {
      publicId: currentUserId,
      active: true,
      profile: { isNot: null },
    },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const currentProfileId = currentUser.profile!.id;

  const message = await prisma.message.update({
    where: {
      publicId: messageId,
      ownerId: currentProfileId,
      chat: {
        members: {
          every: {
            OR: [
              { profileId: currentProfileId },
              { profile: ProfileIsNotBlocked(currentProfileId) },
            ],
          },
        },
      },
    },
    data: {
      active: false,
    },
    select: { chat: { select: { id: true, publicId: true } } },
  });
  return { id: message.chat.id, publicId: message.chat.publicId };
}
