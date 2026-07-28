import { Router } from "express";
import {
  addPostToCollection,
  createNewCollection,
  deleteCollection,
  editCollection,
  getCollection,
  likeCollection,
  listCollectionLikes,
  removeLikeFromCollection,
  removePostFromCollection,
  reorderCollection,
} from "./collections.controller";

const router = Router();

router.post("/", createNewCollection);
router.get("/:collectionId", getCollection);
router.patch("/:collectionId", editCollection);
router.put("/:collectionId", reorderCollection);
router.delete("/:collectionId", deleteCollection);

// Posts
router.post("/:collectionId/posts", addPostToCollection);
router.delete("/:collectionId/posts", removePostFromCollection);

// Likes
router.get("/:collectionId/likes", listCollectionLikes);
router.post("/:collectionId/likes", likeCollection);
router.delete("/:collectionId/likes", removeLikeFromCollection);

export default router;
