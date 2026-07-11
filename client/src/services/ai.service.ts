import axios from "axios";

export async function askAI(message: string) {
  const response = await axios.post(
    "http://localhost:5000/api/ai/chat",
    {
      message,
    },
    {
      withCredentials: true,
    }
  );

  return response.data.reply;
}