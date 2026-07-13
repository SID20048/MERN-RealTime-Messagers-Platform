import { Response } from "express";
import jwt from "jsonwebtoken";

// Determine environment configuration setup
const isProduction = process.env.NODE_ENV === "production";

// Centralized cookie options to keep development and production configurations uniform
const getCookieOptions = () => ({
  httpOnly: true,
  // Must be true in production to support secure HTTPS transmission pipelines
  secure: isProduction,
  // Must be "none" in production to allow cross-site cookie attachment across different Render URLs
  sameSite: isProduction ? ("none" as const) : ("lax" as const),
  path: "/",
  // Uncomment and add your backend custom root domain if clearing cookies across deep subdomains:
  // domain: isProduction ? ".onrender.com" : undefined,
});

export const setCookie = (
  res: Response,
  token: string
) => {
  return res.cookie(
    "accessToken",
    token,
    {
      ...getCookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days matching token expiration metrics
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
  // Generate an authentic, cryptographically signed JWT containing the userId payload
  const token = jwt.sign(
    { id: userId }, 
    process.env.JWT_SECRET || "your_fallback_secret_key", 
    { expiresIn: "7d" }
  );
  
  return setCookie(res, token);
};

export const clearJwtAuthCookie = (res: Response) => {
  // Clear the cookie using the exact matching attributes used when setting it
  return res.clearCookie("accessToken", getCookieOptions());
};
