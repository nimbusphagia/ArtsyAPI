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

const router = Router();

router.get("/", getProfiles);

router.post(
  "/",
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "profileBanner", maxCount: 1 },
  ]),
  initiateProfile,
);

router.get("/me", getMyProfile);

router.patch(
  "/me",
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "profileBanner", maxCount: 1 },
  ]),
  updateMyProfile,
);

router.get("/:profileId", getProfile);

// List posts by profile
router.get("/:profileId/posts", getPublicPosts);
export default router;
