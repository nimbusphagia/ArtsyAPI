import { Request, Response, NextFunction } from "express";
import { NotFoundError, UnauthorizedError } from "../../config/errors/errors";
import {
  ProfileQuerySchema,
  ProfileRequestSchema,
} from "./profiles.validators";
import {
  listProfiles,
  createProfile,
  getProfileById,
} from "./profiles.service";
import { publicIdSchema } from "../../config/utils/validationUtils";

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

export async function initiateProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const files = req.files as {
      profilePicture?: Express.Multer.File[];
      bannerFile?: Express.Multer.File[];
    };
    const data = ProfileRequestSchema.parse({
      pictureFile: files?.profilePicture?.[0],
      bannerFile: files?.bannerFile?.[0],
      ...req.body,
    });
    const profile = await createProfile(data, currentUserId);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}

export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const profileId = publicIdSchema.parse(req.params.profileId);
    if (!profileId) throw new NotFoundError("No profile id was provided");
    const profile = await getProfileById(profileId, currentUserId);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}
