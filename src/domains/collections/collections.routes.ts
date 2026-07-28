import { Router } from "express";
import {
  createNewCollection,
  deleteCollection,
  editCollection,
  getCollection,
  reorderCollection,
} from "./collections.controller";

const router = Router();

router.post("/", createNewCollection);
router.get("/:collectionId", getCollection);
router.patch("/:collectionId", editCollection);
router.put("/:collectionId", reorderCollection);
router.delete("/:collectionId", deleteCollection);

export default router;
