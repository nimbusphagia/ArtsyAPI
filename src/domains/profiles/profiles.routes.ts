import { Router } from "express";
import {
  initiateProfile,
  getProfiles,
  getProfile,
  getMyProfile,
  updateMyProfile,
} from "./profiles.controller";
import upload from "../../middleware/uploadFile";
import { getPublicPosts } from "../posts/posts.controller";
import { listMyReposts } from "../posts/reposts/reposts.controller";
import {
  listCollectionsByProfile,
  listMyCollections,
} from "../collections/collections.controller";

const router = Router();

// List profiles
router.get("/", getProfiles);

// List reposts by profile
router.get("/reposts", listMyReposts);

// List collections by profile
router.get("/collections", listMyCollections);

// Create profile for the first time
router.post(
  "/",
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "profileBanner", maxCount: 1 },
  ]),
  initiateProfile,
);

// Get current user's profile
router.get("/me", getMyProfile);

// Edit current user's profile
router.patch(
  "/me",
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "profileBanner", maxCount: 1 },
  ]),
  updateMyProfile,
);

// Get any profile
router.get("/:profileId", getProfile);

// List posts by profile
router.get("/:profileId/posts", getPublicPosts);

// List collections by profile
router.get("/:profileId/collections", listCollectionsByProfile);

export default router;
