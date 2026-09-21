const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/authmiddleware");

const router = express.Router();
//router 1: post /api/rooms/create
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Room name is required",
      });
    }

    // Generate a simple room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create the room
    const roomResult = await pool.query(
      `INSERT INTO rooms (room_code, name, owner_id)
             VALUES ($1, $2, $3)
             RETURNING *`,
      [roomCode, name, req.user.id],
    );

    const room = roomResult.rows[0];

    // Add owner as a room member
    await pool.query(
      `INSERT INTO room_members (room_id, user_id, role)
             VALUES ($1, $2, $3)`,
      [room.id, req.user.id, "owner"],
    );

    res.status(201).json({
      message: "Room created successfully",
      room,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create room",
    });
  }
});
//Route 2: POST /api/rooms/join
router.post("/join", authMiddleware, async (req, res) => {
  try {
    const { roomCode } = req.body;

    if (!roomCode) {
      return res.status(400).json({
        message: "Room code is required",
      });
    }

    // Find the room
    const roomResult = await pool.query(
      "SELECT * FROM rooms WHERE room_code = $1",
      [roomCode.toUpperCase()],
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    const room = roomResult.rows[0];

    // Check if user is already a member
    const memberResult = await pool.query(
      `SELECT * FROM room_members
             WHERE room_id = $1 AND user_id = $2`,
      [room.id, req.user.id],
    );

    if (memberResult.rows.length > 0) {
      return res.status(409).json({
        message: "You are already a member of this room",
      });
    }

    // Add user to room
    await pool.query(
      `INSERT INTO room_members (room_id, user_id, role)
             VALUES ($1, $2, 'member')`,
      [room.id, req.user.id],
    );

    res.status(200).json({
      message: "Joined room successfully",
      room,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to join room",
    });
  }
});
//Route 3:GET /api/rooms/my-rooms login required
// Get all rooms for the logged-in user
router.get("/my-rooms", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
            SELECT 
                r.id,
                r.room_code,
                r.name,
                r.owner_id,
                r.created_at,
                rm.role,
                u.username AS owner
            FROM rooms r
            JOIN room_members rm
                ON r.id = rm.room_id
            JOIN users u
                ON r.owner_id = u.id
            WHERE rm.user_id = $1
            ORDER BY r.created_at DESC
            `,
      [req.user.id],
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch rooms",
    });
  }
});
//Route 4 : GET /api/rooms/:roomCode/messages
router.get("/:roomCode/messages", authMiddleware, async (req, res) => {
  try {
    const { roomCode } = req.params;

    // Find room
    const roomResult = await pool.query(
      "SELECT id FROM rooms WHERE room_code = $1",
      [roomCode.toUpperCase()],
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    const roomId = roomResult.rows[0].id;

    // Check membership
    const memberResult = await pool.query(
      `SELECT 1
             FROM room_members
             WHERE room_id = $1 AND user_id = $2`,
      [roomId, req.user.id],
    );

    if (memberResult.rows.length === 0) {
      return res.status(403).json({
        message: "You are not a member of this room",
      });
    }

    // Get messages
    const messagesResult = await pool.query(
      `SELECT
                m.id,
                m.user_id,
                u.username,
                m.content,
                m.created_at
             FROM messages m
             JOIN users u ON m.user_id = u.id
             WHERE m.room_id = $1
             ORDER BY m.created_at ASC`,
      [roomId],
    );

    res.json({
      messages: messagesResult.rows,
    });
  } catch (error) {
    console.error("Chat history error:", error);

    res.status(500).json({
      message: "Failed to fetch messages",
    });
  }
});
//route 5: GET /api/rooms/:roomCode
router.get("/:roomCode", authMiddleware, async (req, res) => {
  try {
    const { roomCode } = req.params;

    // Find the room
    const roomResult = await pool.query(
      `SELECT id, room_code, name, owner_id, created_at
             FROM rooms
             WHERE room_code = $1`,
      [roomCode.toUpperCase()],
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    const room = roomResult.rows[0];

    // Check whether the logged-in user is a member
    const memberCheck = await pool.query(
      `SELECT role
             FROM room_members
             WHERE room_id = $1 AND user_id = $2`,
      [room.id, req.user.id],
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        message: "You are not a member of this room",
      });
    }

    // Get all members
    const membersResult = await pool.query(
      `SELECT u.id, u.username, rm.role, rm.joined_at
             FROM room_members rm
             JOIN users u ON rm.user_id = u.id
             WHERE rm.room_id = $1
             ORDER BY rm.joined_at`,
      [room.id],
    );

    res.json({
      room,
      members: membersResult.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to get room details",
    });
  }
});
// ROUTE 6: DELETE /api/rooms/:roomCode
router.delete("/:roomCode", authMiddleware, async (req, res) => {
  const { roomCode } = req.params;
  const userId = req.user.id;

  try {
    // Find the room and make sure the requester is the owner
    const roomResult = await pool.query(
      `
      SELECT id, room_code, name
      FROM rooms
      WHERE room_code = $1
        AND owner_id = $2
      `,
      [roomCode, userId]
    );

    if (roomResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Only the room owner can delete this room.",
      });
    }

    const room = roomResult.rows[0];

    // Get all members BEFORE deleting the room
    const membersResult = await pool.query(
      `
      SELECT user_id
      FROM room_members
      WHERE room_id = $1
      `,
      [room.id]
    );

    // Delete the room
    await pool.query(
      `
      DELETE FROM rooms
      WHERE id = $1
      `,
      [room.id]
    );

    // Notify all members that the room was deleted
    const io = req.app.get("io");

    for (const member of membersResult.rows) {
      io.to(`user:${member.user_id}`).emit("room-deleted", {
        roomCode: room.room_code,
      });
    }

    res.json({
      success: true,
      message: "Room deleted successfully.",
      room,
    });
  } catch (error) {
    console.error("Delete room error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete room.",
    });
  }
});
module.exports = router;
