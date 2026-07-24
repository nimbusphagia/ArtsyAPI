import { Request, Response, NextFunction } from "express";
import {
  NotFoundError,
  UnauthorizedError,
} from "../../../config/errors/errors";
import { publicIdSchema } from "../../../config/utils/validationUtils";
import {
  deleteLikeByPostId,
  getLikesByPost,
  likePostById,
} from "./likes.service";

export async function likePost(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const postId = publicIdSchema.parse(req.params.postId);
    if (!postId) throw new NotFoundError("No post id was provided");
    await likePostById(postId, currentUserId);
    res.status(201).end();
  } catch (error) {
    next(error);
  }
}

export async function removeLike(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const postId = publicIdSchema.parse(req.params.postId);
    if (!postId) throw new NotFoundError("No post id was provided");
    await deleteLikeByPostId(postId, currentUserId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function listLikesByPost(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const postId = publicIdSchema.parse(req.params.postId);
    if (!postId) throw new NotFoundError("No post id was provided");
    const likes = await getLikesByPost(postId, currentUserId);
    res.status(200).json(likes);
  } catch (error) {
    next(error);
  }
}
