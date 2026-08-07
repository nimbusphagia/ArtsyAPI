import { NotFoundError, UnauthorizedError } from "../../config/errors/errors";
import { prisma } from "../../config/prisma";
import { ProfileIsNotBlocked } from "../profiles/profiles.validators";
import {
  ChatLazyRes,
  ChatLazySelect,
  ChatRes,
  ChatSelect,
  parseChat,
  parseChatLazy,
} from "./chats.validators";

// Get chats by user
export async function getChatsByUser(
  currentUserId: string,
): Promise<ChatLazyRes[]> {
  const currentUser = await prisma.user.findFirst({
    where: {
      publicId: currentUserId,
      active: true,
      profile: {
        isNot: null,
      },
    },
    select: { profile: { select: { publicId: true, id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");
  const currentProfileId = currentUser.profile!.id;

  const rawChats = await prisma.chat.findMany({
    where: {
      AND: [
        {
          members: {
            some: { profileId: currentProfileId },
          },
        },
        {
          members: {
            every: {
              OR: [
                { profileId: currentProfileId },
                { profile: ProfileIsNotBlocked(currentProfileId) },
              ],
            },
          },
        },
      ],
    },
    select: ChatLazySelect,
  });
  const parsedChats = rawChats.map((c) =>
    parseChatLazy(c, currentUser.profile!.publicId),
  );
  return parsedChats;
}
// Get chat by id
export async function getChatById(
  chatId: string,
  currentUserId: string,
): Promise<ChatRes> {
  const currentUser = await prisma.user.findFirst({
    where: {
      publicId: currentUserId,
      active: true,
      profile: {
        isNot: null,
      },
    },
    select: { profile: { select: { id: true, publicId: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const currentProfileId = currentUser?.profile!.id;

  const rawChat = await prisma.chat.findUnique({
    where: {
      publicId: chatId,
      AND: [
        {
          members: {
            some: { profileId: currentProfileId },
          },
        },
        {
          members: {
            every: {
              OR: [
                { profileId: currentProfileId },
                { profile: ProfileIsNotBlocked(currentProfileId) },
              ],
            },
          },
        },
      ],
    },
    select: ChatSelect,
  });
  if (!rawChat) throw new NotFoundError("Chat not found");
  const parsedChat = parseChat(rawChat, currentUser.profile!.publicId);
  return parsedChat;
}

// Create
export async function createChatByProfiles(
  targetProfileId: string,
  currentUserId: string,
) {
  const currentUser = await prisma.user.findFirst({
    where: {
      publicId: currentUserId,
      active: true,
      profile: { isNot: null },
    },
    select: { profile: { select: { id: true, publicId: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");
  if (targetProfileId === currentUser.profile!.publicId) {
    throw new UnauthorizedError("Cannot start a chat with yourself");
  }
  const currentProfileId = currentUser.profile!.id;

  const targetProfile = await prisma.profile.findFirst({
    where: {
      publicId: targetProfileId,
      blocking: { none: { blockedId: currentProfileId } },
      blockedBy: { none: { blockerId: currentProfileId } },
      chatMember: {
        none: {
          chat: {
            members: { some: { profileId: currentProfileId } },
          },
        },
      },
    },
    select: { id: true },
  });
  if (!targetProfile) throw new NotFoundError("Profile not found");

  const rawChat = await prisma.chat.create({
    data: {
      members: {
        createMany: {
          data: [
            { profileId: currentProfileId },
            { profileId: targetProfile.id },
          ],
        },
      },
    },
    select: ChatLazySelect,
  });

  return parseChatLazy(rawChat, currentUser.profile!.publicId);
}

// Archive
export async function archiveLocalChatById(
  chatMemberId: string,
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

  await prisma.chatMember.update({
    where: {
      publicId: chatMemberId,
      profileId: currentProfileId,
    },
    data: {
      isArchived: true,
    },
  });
}
// Unarchive
export async function unarchiveLocalChatById(
  chatMemberId: string,
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

  await prisma.chatMember.update({
    where: {
      publicId: chatMemberId,
      profileId: currentProfileId,
    },
    data: {
      isArchived: false,
    },
  });
}
