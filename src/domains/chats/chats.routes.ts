import { Router } from "express";
import {
  archiveChat,
  createChat,
  getChat,
  listChatsByUser,
  unarchiveChat,
} from "./chats.controller";

const router = Router();

router.get("/", listChatsByUser);
router.post("/", createChat);
router.get("/:chatId", getChat);

router.delete("/:chatId/archive", archiveChat);
router.post("/:chatId/unarchive", unarchiveChat);

export default router;
