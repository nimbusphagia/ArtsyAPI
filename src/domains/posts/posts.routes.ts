import { Router } from "express";
import {
  createNewPost,
  deletePost,
  editPostInfo,
  getMyPosts,
  getPublicPost,
} from "./posts.controller";
import likesRouter from "./likes/likes.routes";
import upload from "../../middleware/uploadFile";

const router = Router();

router.post("/", upload.array("media"), createNewPost);
router.get("/", getMyPosts);
router.get("/:postId", getPublicPost);
router.patch("/:postId", editPostInfo);
router.delete("/:postId", deletePost);

router.use("/:postId/likes", likesRouter);

export default router;
