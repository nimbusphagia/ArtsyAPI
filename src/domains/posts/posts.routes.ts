import { Router } from "express";
import { getPublicPosts } from "./posts.controller";

const router = Router();

router.get("/", getPublicPosts);

export default router;
