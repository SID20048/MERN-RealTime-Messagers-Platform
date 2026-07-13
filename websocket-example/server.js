import express from "express"; // Added missing import
import http from "http";
import { Server } from "socket.io";
const cors = require('cors'); // If using ESM, change to: import cors from "cors";

const app = express();

// 1. Define allowed origins
const allowedOrigins = [
  'https://mern-realtime-messagers-platform-1.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000'
];

// 2. Configure CORS for Express APIs
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allows tools like Postman
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// 3. Connect Express to the HTTP Server
const server = http.createServer(app); 

// 4. Configure CORS for Socket.io using the array
const io = new Server(server, { 
  cors: { 
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  } 
});

io.on("connection", (socket) => {
  console.log("✅ New user connected:", socket.id);

  io.emit("welcome", `Welcome on onboard`);
  socket.emit("only-socket", `Hello Socket - ${socket.id}`);
  socket.broadcast.emit("user:joined", `A Socket ${socket.id} joined`);
  socket.join("room1");
  io.to("room1").emit("room1:message", `Welcome to room1`);
  io.to("room1").except(socket.id).emit("Someone joined the room");
  socket.to("room1").emit("room1:message", "New message from ", socket.id);

  socket.on("welcome", (msg) => {
    console.log(msg);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(3000, () => {
  console.log(`Server running on port 3000`);
});
