import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../../../config/errors/errors";
import {
  createRepost,
  deleteRepostById,
  getRepostsByUser,
} from "./reposts.service";
import { publicIdSchema } from "../../../config/utils/validationUtils";

export async function listMyReposts(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const reposts = await getRepostsByUser(currentUserId);
    res.status(200).json(reposts);
  } catch (err) {
    next(err);
  }
}
// Create a repost
export async function shareRepost(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const postId = publicIdSchema.parse(req.params.postId);
    const repost = await createRepost(postId, currentUserId);
    res.status(201).json(repost);
  } catch (err) {
    next(err);
  }
}

// Remove a repost
export async function removeRepost(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const postId = publicIdSchema.parse(req.params.postId);
    await deleteRepostById(postId, currentUserId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
