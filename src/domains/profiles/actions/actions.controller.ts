import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../../../config/errors/errors";
import {
  blockProfileById,
  followProfileById,
  getBlockedByProfile,
  getFollowedProfilesById,
  getFollowersByProfile,
  unblockProfileById,
  unfollowProfileById,
} from "./actions.service";
import { publicIdSchema } from "../../../config/utils/validationUtils";

// Get followers
export async function getFollowers(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const profileId = publicIdSchema.parse(req.params.profileId);
    const followers = await getFollowersByProfile(profileId, currentUserId);
    res.status(200).json(followers);
  } catch (err) {
    next(err);
  }
}
// Get following
export async function getFollowed(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const profileId = publicIdSchema.parse(req.params.profileId);
    const followed = await getFollowedProfilesById(profileId, currentUserId);
    res.status(200).json(followed);
  } catch (err) {
    next(err);
  }
}
// Follow
export async function followProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const profileId = publicIdSchema.parse(req.params.profileId);
    await followProfileById(profileId, currentUserId);
    res.status(201).end();
  } catch (err) {
    next(err);
  }
}
// Unfollow
export async function unfollowProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const profileId = publicIdSchema.parse(req.params.profileId);
    await unfollowProfileById(profileId, currentUserId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
// Block
export async function blockById(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const profileId = publicIdSchema.parse(req.params.profileId);
    await blockProfileById(profileId, currentUserId);
    res.status(200).end();
  } catch (err) {
    next(err);
  }
}
// Unblock
export async function unblockById(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const profileId = publicIdSchema.parse(req.params.profileId);
    await unblockProfileById(profileId, currentUserId);
    res.status(200).end();
  } catch (err) {
    next(err);
  }
}
// List Blocked
export async function listBlockedProfiles(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const blocked = await getBlockedByProfile(currentUserId);
    res.status(200).json(blocked);
  } catch (err) {
    next(err);
  }
}
