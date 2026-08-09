import { Router } from "express";
import { listHomeFeed, listExploreFeed } from "./feed.controller";

const router = Router();

router.get("/home", listHomeFeed);
router.get("/explore", listExploreFeed);

export default router;
