import express from "express";
import {
  deleteChatPromts,
  getChatMessages,
  getUserChats,
  sendPromt,
} from "../controller/promt.controller.js";
import userMiddleware from "../middleware/promt.middlware.js";

const router = express.Router();

router.post("/promt", userMiddleware, sendPromt);
router.get("/chats", userMiddleware, getUserChats);
router.get("/chat/:chatId/messages", userMiddleware, getChatMessages);
router.delete("/chat/:chatId", userMiddleware, deleteChatPromts);

export default router;
