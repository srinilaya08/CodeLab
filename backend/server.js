const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const pool = require("./db");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");
const fileRoutes = require("./routes/files");
const executeRoutes = require("./routes/execute");


app.use(cors({
  origin: process.env.FRONTEND_URL,
}));
app.use(express.json());

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
  },
});
app.set("io", io);
//routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/execute", executeRoutes);

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = decoded;

    next();
  } catch (error) {
    next(new Error("Invalid or expired token"));
  }
});
const broadcastOnlineUsers = async (roomCode) => {
  try {
    const sockets = await io.in(roomCode).fetchSockets();

    const userIds = [
      ...new Set(sockets.map((socket) => socket.user?.id).filter(Boolean)),
    ];

    if (userIds.length === 0) {
      io.to(roomCode).emit("online-users", []);
      return;
    }

    const result = await pool.query(
      `SELECT id, username
             FROM users
             WHERE id = ANY($1::int[])`,
      [userIds],
    );

    io.to(roomCode).emit("online-users", result.rows);
  } catch (error) {
    console.error("Online users error:", error);
  }
};
//Socket.IO
io.on("connection", (socket) => {
  console.log("A user is connected", socket.id);
  socket.join(`user:${socket.user.id}`);
 socket.on("join-room", async (roomCode) => {
  try {
    roomCode = roomCode.toUpperCase();

    // Check whether the room exists
    const roomResult = await pool.query(
      `SELECT id FROM rooms WHERE room_code = $1`,
      [roomCode]
    );

    if (roomResult.rows.length === 0) {
      socket.emit("room-error", {
        message: "Room not found"
      });
      return;
    }

    const roomId = roomResult.rows[0].id;

    // Check whether the user is a member of the room
    const memberResult = await pool.query(
      `SELECT role
       FROM room_members
       WHERE room_id = $1 AND user_id = $2`,
      [roomId, socket.user.id]
    );

    if (memberResult.rows.length === 0) {
      socket.emit("room-error", {
        message: "You are not a member of this room"
      });
      return;
    }

    // User is authorized — allow them to join
    socket.join(roomCode);

    console.log(
      `${socket.user.id} joined authorized room ${roomCode}`
    );

    await broadcastOnlineUsers(roomCode);

  } catch (error) {
    console.error("Join room error:", error);

    socket.emit("room-error", {
      message: "Failed to join room"
    });
  }
});
socket.on("code-change", async ({ roomCode, code, fileId }) => {
  try {
    roomCode = roomCode.toUpperCase();

    // Find the room
    const roomResult = await pool.query(
      `SELECT id FROM rooms WHERE room_code = $1`,
      [roomCode]
    );

    if (roomResult.rows.length === 0) {
      return;
    }

    const roomId = roomResult.rows[0].id;

    // Verify that the user belongs to this room
    const memberResult = await pool.query(
      `SELECT 1
       FROM room_members
       WHERE room_id = $1 AND user_id = $2`,
      [roomId, socket.user.id]
    );

    if (memberResult.rows.length === 0) {
      console.log(
        `Unauthorized code-change attempt by user ${socket.user.id}`
      );
      return;
    }

    // Verify that the file belongs to this room
    const fileResult = await pool.query(
      `SELECT id
       FROM code_files
       WHERE id = $1 AND room_id = $2`,
      [fileId, roomId]
    );

    if (fileResult.rows.length === 0) {
      console.log(
        `Invalid file ${fileId} for room ${roomCode}`
      );
      return;
    }

    // Authorized — broadcast the change
    socket.to(roomCode).emit("code-change", {
      code,
      fileId
    });

  } catch (error) {
    console.error("Code change error:", error);
  }
});
socket.on("file-created", async ({ roomCode, file }) => {
  try {
    roomCode = roomCode.toUpperCase();

    // Find the room
    const roomResult = await pool.query(
      `SELECT id FROM rooms WHERE room_code = $1`,
      [roomCode]
    );

    if (roomResult.rows.length === 0) {
      return;
    }

    const roomId = roomResult.rows[0].id;

    // Verify that the user belongs to this room
    const memberResult = await pool.query(
      `SELECT 1
       FROM room_members
       WHERE room_id = $1 AND user_id = $2`,
      [roomId, socket.user.id]
    );

    if (memberResult.rows.length === 0) {
      console.log(
        `Unauthorized file creation attempt by user ${socket.user.id}`
      );
      return;
    }

    // Verify that the file actually belongs to this room
    if (file.room_id !== roomId) {
      console.log(`Invalid file room for ${roomCode}`);
      return;
    }

    // Broadcast only after authorization
    socket.to(roomCode).emit("file-created", file);

  } catch (error) {
    console.error("File creation socket error:", error);
  }
});
socket.on("file-renamed", async ({ roomCode, file }) => {
  try {
    roomCode = roomCode.toUpperCase();

    // Find the room
    const roomResult = await pool.query(
      `SELECT id FROM rooms WHERE room_code = $1`,
      [roomCode]
    );

    if (roomResult.rows.length === 0) {
      return;
    }

    const roomId = roomResult.rows[0].id;

    // Verify that the user belongs to this room
    const memberResult = await pool.query(
      `SELECT 1
       FROM room_members
       WHERE room_id = $1 AND user_id = $2`,
      [roomId, socket.user.id]
    );

    if (memberResult.rows.length === 0) {
      console.log(
        `Unauthorized file rename attempt by user ${socket.user.id}`
      );
      return;
    }

    // Verify that the file belongs to this room
    if (file.room_id !== roomId) {
      console.log(`Invalid file room for ${roomCode}`);
      return;
    }

    // Broadcast only after authorization
    socket.to(roomCode).emit("file-renamed", file);

  } catch (error) {
    console.error("File rename socket error:", error);
  }
});
socket.on("file-deleted", async ({ roomCode, fileId }) => {
  try {
    roomCode = roomCode.toUpperCase();

    // Find the room
    const roomResult = await pool.query(
      `SELECT id FROM rooms WHERE room_code = $1`,
      [roomCode]
    );

    if (roomResult.rows.length === 0) {
      return;
    }

    const roomId = roomResult.rows[0].id;

    // Verify that the user belongs to this room
    const memberResult = await pool.query(
      `SELECT 1
       FROM room_members
       WHERE room_id = $1 AND user_id = $2`,
      [roomId, socket.user.id]
    );

    if (memberResult.rows.length === 0) {
      console.log(
        `Unauthorized file deletion attempt by user ${socket.user.id}`
      );
      return;
    }

    // File was already deleted through the REST API.
    // Now notify the other members of the room.
    console.log(
      "[Socket] Broadcasting file-deleted:",
      roomCode,
      fileId
    );

    socket.to(roomCode).emit("file-deleted", fileId);

  } catch (error) {
    console.error("File deletion socket error:", error);
  }
});
socket.on("message", async ({ roomCode, message }) => {
  try {
    roomCode = roomCode.toUpperCase();

    // Validate message
    if (!message || !message.trim()) {
      return;
    }

    const trimmedMessage = message.trim();

    // Prevent excessively large messages
    if (trimmedMessage.length > 1000) {
      socket.emit("chat-error", {
        message: "Message cannot exceed 1000 characters"
      });
      return;
    }

    // Find the room
    const roomResult = await pool.query(
      `SELECT id
       FROM rooms
       WHERE room_code = $1`,
      [roomCode]
    );

    if (roomResult.rows.length === 0) {
      socket.emit("chat-error", {
        message: "Room not found"
      });
      return;
    }

    const roomId = roomResult.rows[0].id;

    // Verify that the user belongs to this room
    const memberResult = await pool.query(
      `SELECT 1
       FROM room_members
       WHERE room_id = $1 AND user_id = $2`,
      [roomId, socket.user.id]
    );

    if (memberResult.rows.length === 0) {
      console.log(
        `Unauthorized chat attempt by user ${socket.user.id}`
      );

      socket.emit("chat-error", {
        message: "You are not a member of this room"
      });

      return;
    }

    // Save message to database
    const messageResult = await pool.query(
      `INSERT INTO messages
       (room_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, room_id, user_id, content, created_at`,
      [roomId, socket.user.id, trimmedMessage]
    );

    // Get username for the other clients
    const userResult = await pool.query(
      `SELECT username
       FROM users
       WHERE id = $1`,
      [socket.user.id]
    );

    const savedMessage = {
      ...messageResult.rows[0],
      username: userResult.rows[0].username
    };

    // Send the message to other users in the room
    socket.to(roomCode).emit("message", savedMessage);

  } catch (error) {
    console.error("Chat message error:", error);

    socket.emit("chat-error", {
      message: "Failed to send message"
    });
  }
});
socket.on("disconnecting", async () => {
    for (const roomCode of socket.rooms) {
      if (roomCode === socket.id) continue;

      setTimeout(() => {
        broadcastOnlineUsers(roomCode);
      }, 100);
    }
  });
socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});
app.get("/", (req, res) => {
  res.send("CodeLab backend is running!");
});

server.listen(PORT, () => {
  console.log(`CodeLab backend server is running on port ${PORT}`);
});
