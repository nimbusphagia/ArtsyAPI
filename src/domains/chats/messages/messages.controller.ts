import { Request, Response, NextFunction } from "express";
import { MessageCreateSchema, ReplyRequestSchema } from "./messages.validators";
import {
  createNewMessage,
  deactivateMessageById,
  replyToMessageById,
} from "./messages.service";
import { UnauthorizedError } from "../../../config/errors/errors";
import { publicIdSchema } from "../../../config/utils/validationUtils";

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
    const message = await createNewMessage(data, currentUserId);
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
    });
    const reply = await replyToMessageById(data, currentUserId);
    res.status(201).json(reply);
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
    await deactivateMessageById(messageId, currentUserId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
