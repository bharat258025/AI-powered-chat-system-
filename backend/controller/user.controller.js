import { User } from "../model/user.model.js";
import { SignupOtp } from "../model/signupOtp.model.js";
import bcrypt from "bcryptjs";
import config from "../config.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import axios from "axios";

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const sendOtpEmail = async (email, otp) => {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const from = process.env.SMTP_FROM;

  // Prefer Brevo HTTP API in production to avoid SMTP port timeout issues.
  if (brevoApiKey && from) {
    try {
      await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
          sender: { email: from, name: "DeepSeek OTP" },
          to: [{ email }],
          subject: "Your OTP for Signup",
          textContent: `Your OTP is ${otp}. It expires in 10 minutes.`,
        },
        {
          headers: {
            "api-key": brevoApiKey,
            "Content-Type": "application/json",
          },
          timeout: 20000,
        }
      );
      return { delivered: true };
    } catch (error) {
      console.log("Brevo API send failed:", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        from,
        to: email,
      });
    }
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !smtpFrom) {
    return { delivered: false };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    family: 4,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: "Your OTP for Signup",
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    });
    return { delivered: true };
  } catch (error) {
    console.log("SMTP send failed:", {
      message: error?.message,
      code: error?.code,
      response: error?.response,
      responseCode: error?.responseCode,
      command: error?.command,
      host,
      port,
      from: smtpFrom,
      to: email,
    });
    return { delivered: false, reason: error?.message || "Email delivery failed" };
  }
};

export const requestSignupOtp = async (req, res) => {
  try {
    const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();
    const normalizedFirstName = String(req.body?.firstName || "").trim();
    const normalizedLastName = String(req.body?.lastName || "").trim();
    const password = String(req.body?.password || "");

    if (!normalizedFirstName || !normalizedLastName || !normalizedEmail || !password) {
      return res.status(400).json({ errors: "All fields are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ errors: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ errors: "Email already registered. Please login." });
    }

    const otp = generateOtp();
    const passwordHash = await bcrypt.hash(password, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await SignupOtp.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        passwordHash,
        otp,
        expiresAt,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Verify OTP persistence before attempting email send.
    const savedOtpRecord = await SignupOtp.findOne({ email: normalizedEmail });
    if (!savedOtpRecord) {
      return res.status(500).json({ errors: "Failed to persist OTP. Please try again." });
    }

    const mailStatus = await sendOtpEmail(normalizedEmail, otp);
    if (!mailStatus.delivered) {
      return res.status(202).json({
        message:
          "OTP created, but email delivery failed. Please verify SMTP settings and try again.",
        details: mailStatus.reason || null,
      });
    }

    return res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    return res.status(500).json({ errors: "Failed to send OTP. Please try again." });
  }
};

export const verifySignupOtp = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const otp = String(req.body?.otp || "").trim();
    if (!email || !otp) {
      return res.status(400).json({ errors: "Email and OTP are required" });
    }

    const record = await SignupOtp.findOne({ email });
    if (!record) {
      return res.status(400).json({ errors: "OTP session not found. Request OTP again." });
    }
    if (record.expiresAt.getTime() < Date.now()) {
      await SignupOtp.deleteOne({ _id: record._id });
      return res.status(400).json({ errors: "OTP expired. Request OTP again." });
    }
    if (record.otp !== otp) {
      return res.status(400).json({ errors: "Invalid OTP" });
    }

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      await User.create({
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email,
        password: record.passwordHash,
      });
    }
    await SignupOtp.deleteOne({ _id: record._id });

    return res.status(201).json({ message: "Signup successful. Please login." });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ errors: "Email already registered. Please login." });
    }
    return res.status(500).json({ errors: error?.message || "Failed to verify OTP" });
  }
};

export const signup = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  try {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedFirstName = String(firstName || "").trim();
    const normalizedLastName = String(lastName || "").trim();

    if (!normalizedFirstName || !normalizedLastName || !normalizedEmail || !password) {
      return res.status(400).json({ errors: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ errors: "Password must be at least 6 characters" });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    // Idempotent signup: create user if missing, otherwise keep existing account.
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(200).json({
        message: "Account already exists. Please login.",
      });
    }

    await User.create({
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      email: normalizedEmail,
      password: hashPassword,
    });
    return res.status(201).json({ message: "signup succeeded" });
  } catch (error) {
    console.log("Error in signup: ", error);
    if (error?.code === 11000 && error?.keyPattern?.username) {
      return res.status(500).json({
        errors:
          "Database index issue detected (username_1). Restart backend once to apply index cleanup.",
      });
    }
    if (error?.code === 11000) {
      return res.status(200).json({
        message: "Account already exists. Please login.",
      });
    }
    return res.status(500).json({ errors: error?.message || "Error in signup" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(403).json({ errors: "Invalid Credentials" });
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(403).json({ errors: "Invalid Credentials" });
    }
    // jwt code
    const token = jwt.sign({ id: user._id }, config.JWT_USER_PASSWORD, {
      expiresIn: "1d",
    });

    const cookieOptions = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
    };

    res.cookie("jwt", token, cookieOptions);
    return res
      .status(201)
      .json({ message: "User loggedin succeeded", user, token });
  } catch (error) {
    console.log("Error in login: ", error);
    return res.status(500).json({ errors: "Error in login" });
  }
};

export const logout = (req, res) => {
  try {
    res.clearCookie("jwt");
    return res.status(200).json({ message: "Loggout succeeded" });
  } catch (error) {
    console.log("Error in logout: ", error);
    return res.status(500).json({ errors: "Error in logout" });
  }
};
