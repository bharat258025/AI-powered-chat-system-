import express from "express";
import {
  login,
  logout,
  requestSignupOtp,
  signup,
  verifySignupOtp,
} from "../controller/user.controller.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/signup/request-otp", requestSignupOtp);
router.post("/signup/verify-otp", verifySignupOtp);
router.post("/login", login);
router.get("/logout", logout);

export default router;
