import { Request, Response, NextFunction } from "express";
import { NotFoundError, UnauthorizedError } from "../../config/errors/errors";
import { listPostsByProfile } from "./posts.service";
import { publicIdSchema } from "../../config/utils/validationUtils";

export async function getPublicPosts(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const profileId = publicIdSchema.parse(req.params.profileId);
    if (!profileId) throw new NotFoundError("No profile id was provided");
    const posts = await listPostsByProfile(profileId, currentUserId);
    res.status(200).json(posts);
  } catch (err) {
    next(err);
  }
}
