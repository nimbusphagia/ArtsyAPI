import { Router } from "express";
import {
  archiveChat,
  createChat,
  getChat,
  listChatsByUser,
  unarchiveChat,
} from "./chats.controller";
import messagesRouter from "./messages/messages.routes";

const router = Router();

router.get("/", listChatsByUser);
router.post("/", createChat);
router.get("/:chatId", getChat);

router.delete("/:chatMemberId/archive", archiveChat);
router.post("/:chatMemberId/unarchive", unarchiveChat);

router.use("/:chatId/messages", messagesRouter);

export default router;
