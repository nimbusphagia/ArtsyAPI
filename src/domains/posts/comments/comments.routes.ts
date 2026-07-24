import { Router } from "express";
import {
  commentPost,
  listCommentsByPost,
  removeComment,
} from "./comments.controller";

const router = Router();

router.delete("/comments/:commentId", removeComment);

router.post("/:postId/comments", commentPost);
router.get("/:postId/comments", listCommentsByPost);

export default router;
