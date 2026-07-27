import { Router } from "express";
import {
  createNewCollection,
  deleteCollection,
  editCollection,
  getCollection,
} from "./collections.controller";

const router = Router();

router.post("/", createNewCollection);
router.get("/:collectionId", getCollection);
router.patch("/:collectionId", editCollection);
router.delete("/:collectionId", deleteCollection);

export default router;
