import { Router } from "express";
import {
  createNewPost,
  deletePost,
  editPostInfo,
  getPublicPost,
} from "./posts.controller";
import likesRouter from "./likes/likes.routes";
import commentsRouter from "./comments/comments.routes";
import upload from "../../middleware/uploadFile";
import { removeRepost, shareRepost } from "./reposts/reposts.controller";

const router = Router();

router.post("/", upload.array("slide"), createNewPost);
router.get("/:postId", getPublicPost);
router.patch("/:postId", editPostInfo);
router.delete("/:postId", deletePost);

router.use("/:postId/likes", likesRouter);

// Route params declared on the router
router.use("/", commentsRouter);

// Repost endpoint
router.post("/:postId/reposts", shareRepost);
// Remove a repost
router.delete("/:postId/reposts", removeRepost);

export default router;
