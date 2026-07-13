import { Response } from "express";
import jwt from "jsonwebtoken"; // 1. Added missing JWT library import

// Helper to determine environment setup
const isProduction = process.env.NODE_ENV === "production";

export const setCookie = (
  res: Response,
  token: string
) => {
  return res.cookie(
    "accessToken",
    token,
    {
      httpOnly: true,
      // 2. secure must be FALSE for localhost HTTP, TRUE for production HTTPS
      secure: isProduction,
      // 3. sameSite must be "lax" for localhost cross-port requests, "none" for production cross-domain
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    }
  );
};

export const setJwtAuthCookie = ({
  res,
  userId,
}: {
  res: Response;
  userId: string;
}) => {
  // 4. Generate an authentic, signed JWT containing the userId payload
  const token = jwt.sign(
    { id: userId }, 
    process.env.JWT_SECRET || "your_fallback_secret_key", 
    { expiresIn: "7d" }
  );
  
  return setCookie(res, token);
};

export const clearJwtAuthCookie = (res: Response) => {
  return res.clearCookie("accessToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  });
};
