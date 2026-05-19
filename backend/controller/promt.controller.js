import OpenAI from "openai";
import axios from "axios";
import { Promt } from "../model/promt.model.js";

// GROQ CLIENT
const groq = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",

  apiKey: process.env.GROQ_API_KEY,
});

export const sendPromt = async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.userId;

    // Validation
    if (!content || content.trim() === "") {
      return res.status(400).json({
        error: "Prompt is required",
      });
    }

    // Save user prompt
    await Promt.create({
      userId,
      role: "user",
      content,
    });

    // =========================
    // STEP 1 -> SEARCH INTERNET
    // =========================

    const searchResponse = await axios.post(
      "https://google.serper.dev/search",

      {
        q: content,
      },

      {
        headers: {
          "X-API-KEY":
            process.env.SERPER_API_KEY,

          "Content-Type":
            "application/json",
        },
      }
    );

    // Extract search results
    const results =
      searchResponse.data.organic || [];

    const searchContext = results
      .slice(0, 5)
      .map((item, index) => {
        return `
Result ${index + 1}

Title:
${item.title}

Snippet:
${item.snippet}

Link:
${item.link}
`;
      })
      .join("\n\n");

    // =========================
    // STEP 2 -> SEND TO GROQ
    // =========================

    const completion =
      await groq.chat.completions.create({
        model: process.env.LLM_MODEL,

        messages: [
          {
            role: "system",

            content: `
You are a helpful AI assistant.

Use the realtime web search results
to answer accurately.

If search results are available,
prioritize them.
`,
          },

          {
            role: "user",

            content: `
User Question:
${content}

Realtime Search Results:
${searchContext}
`,
          },
        ],

        temperature: 0.7,
      });

    const aiContent =
      completion.choices[0].message.content;

    // Save assistant response
    await Promt.create({
      userId,
      role: "assistant",
      content: aiContent,
    });

    // Return response
    return res.status(200).json({
      reply: aiContent,
    });
  } catch (error) {
    console.log("AI Error:", error);

    return res.status(500).json({
      error:
        error?.response?.data ||
        error.message ||
        "Something went wrong",
    });
  }
};