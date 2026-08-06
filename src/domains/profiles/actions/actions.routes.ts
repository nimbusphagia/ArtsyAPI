import { Router } from "express";
import {
  blockById,
  followProfile,
  getFollowers,
  getFollowed,
  unblockById,
  unfollowProfile,
} from "./actions.controller";

const router = Router();

router.post("/follow", followProfile);
router.delete("/follow", unfollowProfile);

router.get("/followers", getFollowers);
router.get("/followed", getFollowed);

router.post("/block", blockById);
router.delete("/block", unblockById);

export default router;
