import { Router } from "express";
import { getProfiles } from "./profiles.controller";

const router = Router();
router.get("/", getProfiles);
//router.get("/:publicId");

export default router;
