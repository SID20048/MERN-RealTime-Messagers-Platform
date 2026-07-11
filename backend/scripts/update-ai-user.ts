import mongoose from "mongoose";
import dotenv from "dotenv";
import UserModel from "../src/models/user.model";

dotenv.config();

async function updateAIUser() {
  await mongoose.connect(process.env.MONGO_URI!);

  const aiUser = await UserModel.findOneAndUpdate(
    { email: "ai@assistant.com" },
    {
      name: "AI Assistant",
      email: "ai@assistant.com",
      isAI: true,
      avatar: "/ai-avatar.png"
    },
    { upsert: true, new: true }
  );

  console.log("Updated AI User:", aiUser);

  await mongoose.disconnect();
}

updateAIUser();