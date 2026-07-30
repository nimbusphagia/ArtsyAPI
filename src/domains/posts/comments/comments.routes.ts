import { Router } from "express";
import {
  commentPost,
  listCommentsByPost,
  removeComment,
  likeComment,
  removeLikeFromComment,
} from "./comments.controller";

const router = Router();

router.delete("/comments/:commentId", removeComment);
router.post("/comments/:commentId/likes", likeComment);
router.delete("/comments/:commentId/likes", removeLikeFromComment);

router.post("/:postId/comments", commentPost);
router.get("/:postId/comments", listCommentsByPost);

export default router;
