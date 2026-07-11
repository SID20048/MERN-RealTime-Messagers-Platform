import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama", // any non-empty string
});

export async function askAI(message: string) {
  const response = await openai.chat.completions.create({
    model: "qwen2.5:7b",
    messages: [
      {
        role: "system",
        content:
          "You are an AI assistant inside a real-time messaging application.",
      },
      {
        role: "user",
        content: message,
      },
    ],
  });

  return response.choices[0].message.content;
}