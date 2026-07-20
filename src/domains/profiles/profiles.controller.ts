import { Request, Response, NextFunction } from "express";
import { NotFoundError, UnauthorizedError } from "../../config/errors/errors";
import { ProfileQuerySchema } from "./profiles.validators";
import { listProfiles } from "./profiles.service";

export async function getProfiles(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const query = ProfileQuerySchema.parse(req.query);
    const profiles = await listProfiles(query, currentUserId);
    res.status(200).json(profiles);
  } catch (err) {
    next(err);
  }
}
