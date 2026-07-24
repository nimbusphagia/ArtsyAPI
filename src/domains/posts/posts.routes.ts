import { Router } from "express";
import {
  createNewPost,
  editPostInfo,
  getMyPosts,
  getPublicPost,
} from "./posts.controller";
import upload from "../../middleware/uploadFile";

const router = Router();

router.get("/", getMyPosts);
router.get("/:postId", getPublicPost);
router.post("/", upload.array("media"), createNewPost);
router.patch("/:postId", editPostInfo);

export default router;
