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
  getCurrentProfile,
  editProfile,
} from "./profiles.service";
import { publicIdSchema } from "../../config/utils/validationUtils";

// Get list of profiles with a filter
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

// Create profile for the first time
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
      profileBanner?: Express.Multer.File[];
    };
    const data = ProfileRequestSchema.parse({
      pictureFile: files?.profilePicture?.[0],
      bannerFile: files?.profileBanner?.[0],
      ...req.body,
    });
    const profile = await createProfile(data, currentUserId);
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
}

// Get any profile
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

// Get current user's profile
export async function getMyProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const profile = await getCurrentProfile(currentUserId);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}
// Edit my Profile
export async function updateMyProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const files = req.files as {
      profilePicture?: Express.Multer.File[];
      profileBanner?: Express.Multer.File[];
    };
    const data = ProfileRequestSchema.parse({
      pictureFile: files?.profilePicture?.[0],
      bannerFile: files?.profileBanner?.[0],
      ...req.body,
    });
    const profile = await editProfile(data, currentUserId);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}
