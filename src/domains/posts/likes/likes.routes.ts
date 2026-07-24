import { Router } from "express";
import { likePost, listLikesByPost, removeLike } from "./likes.controller";

const router = Router({ mergeParams: true });

router.get("/", listLikesByPost);
router.post("/", likePost);
router.delete("/", removeLike);

export default router;
