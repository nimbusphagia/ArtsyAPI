import io from "../../config/socket";
import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../../config/errors/errors";
import { publicIdSchema } from "../../config/utils/validationUtils";
import {
  archiveLocalChatById,
  createChatByProfiles,
  getChatById,
  getChatsByUser,
  unarchiveLocalChatById,
} from "./chats.service";

export async function createChat(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const targetProfileId = publicIdSchema.parse(req.body.profileId);
    const { chat, profileIds } = await createChatByProfiles(
      targetProfileId,
      currentUserId,
    );
    io.in([
      `profile:${profileIds.current}`,
      `profile:${profileIds.target}`,
    ]).socketsJoin(`chat:${chat.id}`);

    io.to(`profile:${profileIds.target}`).emit("chat:new", chat.data);
    res.status(201).json(chat.data);
  } catch (error) {
    next(error);
  }
}

export async function listChatsByUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const chats = await getChatsByUser(currentUserId);
    res.status(200).json(chats);
  } catch (error) {
    next(error);
  }
}

export async function getChat(req: Request, res: Response, next: NextFunction) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const chatId = publicIdSchema.parse(req.params.chatId);
    const chat = await getChatById(chatId, currentUserId);
    res.status(200).json(chat);
  } catch (error) {
    next(error);
  }
}

export async function archiveChat(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const chatMemberId = publicIdSchema.parse(req.params.chatMemberId);
    await archiveLocalChatById(chatMemberId, currentUserId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function unarchiveChat(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const chatMemberId = publicIdSchema.parse(req.params.chatMemberId);
    await unarchiveLocalChatById(chatMemberId, currentUserId);
    res.status(200).end();
  } catch (error) {
    next(error);
  }
}
