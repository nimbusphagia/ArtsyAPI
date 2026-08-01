import {
  NotFoundError,
  UnauthorizedError,
} from "../../../config/errors/errors";
import { prisma } from "../../../config/prisma";
import { Prisma } from "../../../generated/prisma/client";
import { ProfileIsNotBlocked } from "../../profiles/profiles.validators";
import {
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
): Promise<MessageRes> {
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
    case "POST":
      rawMessage = await prisma.message.create({
        data: {
          ...base,
          type: "POST",
          post: { connect: { publicId: data.postId } },
        },
        select: MessageSelect,
      });
      break;
    case "COLLECTION":
      rawMessage = await prisma.message.create({
        data: {
          ...base,
          type: "COLLECTION",
          collection: { connect: { publicId: data.collectionId } },
        },
        select: MessageSelect,
      });
      break;
    default: {
      const _exhaustive: never = data;
      throw new Error(
        `Unhandled message type: ${(_exhaustive as MessageCreateReq).type}`,
      );
    }
  }
  return parseMessage(rawMessage);
}

// Reply
export async function replyToMessageById(
  data: ReplyReq,
  currentUserId: string,
): Promise<MessageRes> {
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

  const rawReply = await prisma.message.create({
    data: {
      chat: { connect: { publicId: data.chatId } },
      owner: { connect: { id: currentProfileId } },
      replyTo: { connect: { publicId: data.replyToId } },
      type: "TEXT",
      text: data.text,
    },
    select: MessageSelect,
  });

  return parseMessage(rawReply);
}
// Soft delete
export async function deactivateMessageById(
  messageId: string,
  currentUserId: string,
): Promise<void> {
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

  await prisma.message.update({
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
  });
}
