import { Router } from "express";
import { createNewCollection } from "./collections.controller";

const router = Router();

router.post("/", createNewCollection);

export default router;
