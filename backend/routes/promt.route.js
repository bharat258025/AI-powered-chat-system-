import express from "express";
import { deleteChatPromts, sendPromt } from "../controller/promt.controller.js";
import userMiddleware from "../middleware/promt.middlware.js";

const router = express.Router();

router.post("/promt", userMiddleware, sendPromt);
router.delete("/chat/:chatId", userMiddleware, deleteChatPromts);

export default router;
