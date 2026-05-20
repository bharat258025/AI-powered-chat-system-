import OpenAI from "openai";
import axios from "axios";
import { Promt } from "../model/promt.model.js";
import mongoose from "mongoose";

const groq = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

const fetchSerperContext = async (query) => {
  const searchResponse = await axios.post(
    "https://google.serper.dev/search",
    { q: query },
    {
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );

  return (searchResponse.data.organic || [])
    .slice(0, 6)
    .map(
      (item, index) => `Result ${index + 1}
Title: ${item.title}
Date: ${item.date || "N/A"}
Snippet: ${item.snippet}
Link: ${item.link}`
    )
    .join("\n\n");
};

export const sendPromt = async (req, res) => {
  try {
    const content = req.body?.content?.trim();
    const chatId = req.body?.chatId?.trim();
    const userId = req.userId;

    if (!content) {
      return res.status(400).json({ error: "Prompt is required" });
    }
    if (!chatId) {
      return res.status(400).json({ error: "chatId is required" });
    }

    await Promt.create({
      userId,
      chatId,
      role: "user",
      content,
    });

    // Always run Serper first, then pass context to LLM.
    const searchContext = await fetchSerperContext(content);

    const completion = await groq.chat.completions.create({
      model: process.env.LLM_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI assistant. Use provided web context for factual accuracy. By default, provide detailed but clear answers with a short definition, key points, and one simple example when relevant. Only keep answers very short if the user explicitly asks for a short answer. Do not mention Result numbering unless asked.",
        },
        {
          role: "user",
          content: `User Question:
${content}

Web Context:
${searchContext || "No search results found."}`,
        },
      ],
      temperature: 0.6,
    });

    const aiContent =
      completion.choices[0]?.message?.content || "I could not generate a response.";

    await Promt.create({
      userId,
      chatId,
      role: "assistant",
      content: aiContent,
    });

    return res.status(200).json({ reply: aiContent });
  } catch (error) {
    console.log("AI Error:", error);
    return res.status(500).json({
      error: error?.response?.data || error.message || "Something went wrong",
    });
  }
};

export const deleteChatPromts = async (req, res) => {
  try {
    const userId = req.userId;
    const { chatId } = req.params;
    if (!chatId) {
      return res.status(400).json({ error: "chatId is required" });
    }

    await Promt.deleteMany({ userId, chatId });
    return res.status(200).json({ message: "Chat deleted from database" });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Failed to delete chat",
    });
  }
};

export const getUserChats = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const chats = await Promt.aggregate([
      { $match: { userId } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$chatId",
          updatedAt: { $first: "$createdAt" },
          lastUserMessage: {
            $first: {
              $cond: [{ $eq: ["$role", "user"] }, "$content", null],
            },
          },
        },
      },
      { $sort: { updatedAt: -1 } },
    ]);

    return res.status(200).json({
      chats: chats.map((chat) => ({
        id: chat._id,
        title: (chat.lastUserMessage || "New Chat").slice(0, 60),
        updatedAt: chat.updatedAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Failed to fetch chats",
    });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const { chatId } = req.params;

    if (!chatId) {
      return res.status(400).json({ error: "chatId is required" });
    }

    const messages = await Promt.find({ userId, chatId })
      .sort({ createdAt: 1 })
      .select("role content createdAt -_id");

    return res.status(200).json({ messages });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Failed to fetch chat messages",
    });
  }
};
