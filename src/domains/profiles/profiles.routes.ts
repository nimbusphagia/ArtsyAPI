import { Router } from "express";
import {
  initiateProfile,
  getProfiles,
  getProfile,
  getMyProfile,
  updateMyProfile,
} from "./profiles.controller";
import upload from "../../middleware/uploadFile";

const router = Router();
router.get("/me", getMyProfile);
router.get("/", getProfiles);
router.post(
  "/",
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "profileBanner", maxCount: 1 },
  ]),
  initiateProfile,
);
router.patch(
  "/me",
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "profileBanner", maxCount: 1 },
  ]),
  updateMyProfile,
);

router.get("/:profileId", getProfile);

export default router;
