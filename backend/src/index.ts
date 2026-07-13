import "dotenv/config";
import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";
import passport from "passport";
import { Env } from "./config/env.config";
import { asyncHandler } from "./middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "./config/http.config";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import connectDatabase from "./config/database.config";
import { initializeSocket } from "./lib/socket";
import routes from "./routes";

import "./config/passport.config";

const app = express();
const server = http.createServer(app);

// 1. Initialize WebSockets
initializeSocket(server);

// 2. Define Allowed Origins (Must match your socket.ts whitelist)
const allowedOrigins = [
  "https://onrender.com",     // Prod Frontend
  "https://onrender.com",  // Prod Backend
  "http://localhost:5173",                                       // Local Frontend (Vite)
  "http://localhost:3000",                                       // Local Backend
];

// 3. Mount Security and Global Parsing Middleware FIRST
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(null, false); // Safe fallback matching socket setup
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Remounted only once above passport

// 4. Initialize Passport Authentication (After cookie-parser handles headers)
app.use(passport.initialize());

// 5. System Health Check Route
app.get(
  "/health",
  asyncHandler(async (req: Request, res: Response) => {
    res.status(HTTPSTATUS.OK).json({
      message: "Server is healthy",
      status: "OK",
    });
  })
);

// 6. Application API Routes (Now securely protected behind CORS and Cookie middleware)
app.use("/api", routes);

// 7. Global Error Catch-All Middleware
app.use(errorHandler);

// 8. Bootstrap Server Listener
server.listen(Env.PORT, async () => {
  await connectDatabase();
  console.log(`Server running on port ${Env.PORT} in ${Env.NODE_ENV} mode`);
});
