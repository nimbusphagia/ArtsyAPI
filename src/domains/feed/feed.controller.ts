import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../../config/errors/errors";
import { getHomeFeed, getExploreFeed } from "./feed.service";
import { HomeFeedQuerySchema, ExploreQuerySchema } from "./feed.validators";

export async function listHomeFeed(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const { before, limit } = HomeFeedQuerySchema.parse(req.query);
    const feed = await getHomeFeed(currentUserId, { before, limit });
    res.status(200).json(feed);
  } catch (error) {
    next(error);
  }
}

export async function listExploreFeed(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const { limit } = ExploreQuerySchema.parse(req.query);
    const feed = await getExploreFeed(currentUserId, { limit });
    res.status(200).json(feed);
  } catch (error) {
    next(error);
  }
}
