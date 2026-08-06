import { Router } from "express";
import actionsRouter from "./actions/actions.routes";
import {
  initiateProfile,
  getProfiles,
  getProfile,
  getMyProfile,
  updateMyProfile,
} from "./profiles.controller";
import upload from "../../middleware/uploadFile";
import { listPublicPosts, listMyPosts } from "../posts/posts.controller";
import { listMyReposts } from "../posts/reposts/reposts.controller";
import {
  listCollectionsByProfile,
  listMyCollections,
} from "../collections/collections.controller";
import { listBlockedProfiles } from "./actions/actions.controller";

const router = Router();

// List profiles
router.get("/", getProfiles);

// List current user's blocked
router.get("/blocked", listBlockedProfiles);

// List current user's posts
router.get("/posts", listMyPosts);

// List current user's reposts
router.get("/reposts", listMyReposts);

// List current user's collections
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
router.get("/:profileId/posts", listPublicPosts);

// List collections by profile
router.get("/:profileId/collections", listCollectionsByProfile);

// Follow & Block
router.use("/:profileId", actionsRouter);

export default router;
