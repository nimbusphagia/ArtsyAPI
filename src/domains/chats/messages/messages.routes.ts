import { Router } from "express";
import {
  createMessage,
  deleteMessage,
  replyToMessage,
} from "./messages.controller";

const router = Router();

router.post("/", createMessage);
router.post("/:messageId", replyToMessage);
router.delete("/:messageId", deleteMessage);

export default router;
