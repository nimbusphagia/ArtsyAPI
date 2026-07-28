import { Router } from "express";
import {
  addPostToCollection,
  createNewCollection,
  deleteCollection,
  editCollection,
  getCollection,
  removePostFromCollection,
  reorderCollection,
} from "./collections.controller";

const router = Router();

router.post("/", createNewCollection);
router.get("/:collectionId", getCollection);
router.patch("/:collectionId", editCollection);
router.put("/:collectionId", reorderCollection);
router.delete("/:collectionId", deleteCollection);

router.post("/:collectionId/posts", addPostToCollection);
router.delete("/:collectionId/posts", removePostFromCollection);

export default router;
