import { Request, Response, NextFunction } from "express";
import { MessageCreateSchema, ReplyRequestSchema } from "./messages.validators";
import {
  createNewMessage,
  deactivateMessageById,
  replyToMessageById,
} from "./messages.service";
import { UnauthorizedError } from "../../../config/errors/errors";
import { publicIdSchema } from "../../../config/utils/validationUtils";
import io from "../../../config/socket";

export async function createMessage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const data = MessageCreateSchema.parse({
      ...req.body,
      chatId: req.params.chatId,
    });
    const { chatId, message } = await createNewMessage(data, currentUserId);
    io.to(`chat:${chatId}`).emit("message:new", message);
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
}

export async function replyToMessage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const data = ReplyRequestSchema.parse({
      ...req.body,
      chatId: req.params.chatId,
      replyToId: req.params.messageId,
    });
    const { message, chatId } = await replyToMessageById(data, currentUserId);
    io.to(`chat:${chatId}`).emit("message:new", message);
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
}

export async function deleteMessage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const messageId = publicIdSchema.parse(req.params.messageId);
    const chat = await deactivateMessageById(messageId, currentUserId);
    io.to(`chat:${chat.id}`).emit("message:delete:lite", {
      messageId,
      chatId: chat.publicId,
    });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
