import { Router } from "express";
import { createNewPost } from "./posts.controller";
import upload from "../../middleware/uploadFile";

const router = Router();

router.post("/", upload.array("media"), createNewPost);

export default router;
