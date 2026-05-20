import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import dns from "dns";

import userRoutes from "./routes/user.route.js";
import promtRoutes from "./routes/promt.route.js";
import { User } from "./model/user.model.js";

dotenv.config();
dns.setDefaultResultOrder("ipv4first");

const app = express();
const port = process.env.PORT || 4001;
const MONGO_URL = process.env.MONGO_URI;

app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

mongoose
  .connect(MONGO_URL)
  .then(async () => {
    console.log("Connected to MongoDB");
    try {
      await User.collection.dropIndex("username_1");
      console.log("Dropped stale index: username_1");
    } catch (error) {
      const indexMissing = error?.codeName === "IndexNotFound" || error?.code === 27;
      if (!indexMissing) {
        console.log("Index cleanup warning:", error.message);
      }
    }
  })
  .catch((error) => console.error("MongoDB Connection Error: ", error));

app.use("/api/v1/user", userRoutes);
app.use("/api/v1/deepseekai", promtRoutes);

app.get("/health", (req, res) => {
  return res.status(200).json({ ok: true });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});
