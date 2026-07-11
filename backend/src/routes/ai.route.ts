import { Router } from "express";
import { askAI } from "../services/ai.service";

const router = Router();

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const reply = await askAI(message);

    res.json({
      reply,
    });
  } catch (error: any) {
    console.error("AI ERROR:", error);

    res.status(500).json({
      message: error?.message || "AI request failed",
    });
  }
});

export default router;