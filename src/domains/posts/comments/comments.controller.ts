import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../../../config/errors/errors";
import {
  createComment,
  deleteComment,
  getCommentsByPost,
} from "./comments.service";
import { CommentRequestSchema } from "./comments.validators";
import { publicIdSchema } from "../../../config/utils/validationUtils";

export async function commentPost(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const data = CommentRequestSchema.parse({
      text: req.body.text,
      postId: req.params.postId,
    });
    const comment = await createComment(data, currentUserId);
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
}

export async function removeComment(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const commentId = publicIdSchema.parse(req.params.commentId);
    await deleteComment(commentId, currentUserId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function listCommentsByPost(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const postId = publicIdSchema.parse(req.params.postId);
    const comments = await getCommentsByPost(postId, currentUserId);
    res.status(200).json(comments);
  } catch (error) {
    next(error);
  }
}
