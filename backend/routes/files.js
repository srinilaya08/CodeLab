const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/authmiddleware");

const router = express.Router();
// ROUTE 1: POST /api/files/create  login required
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const { roomCode, filename, language, content } = req.body;

    if (!roomCode || !filename || !language) {
      return res.status(400).json({
        message: "Room code, filename and language are required",
      });
    }

    // Find the room
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

    // Check whether user belongs to the room
    const memberResult = await pool.query(
      `SELECT * FROM room_members
             WHERE room_id = $1 AND user_id = $2`,
      [roomId, req.user.id],
    );

    if (memberResult.rows.length === 0) {
      return res.status(403).json({
        message: "You are not a member of this room",
      });
    }

    // Create the file
    const result = await pool.query(
      `INSERT INTO code_files
             (room_id, filename, language, content, updated_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
      [roomId, filename, language, content || "", req.user.id],
    );

    res.status(201).json({
      message: "File created successfully",
      file: result.rows[0],
    });
  } 
  catch (error) {
    console.error(error);
    if (error.code === "23505") {
        return res.status(409).json({
            message: "A file with this name already exists in this room",
        });
    }
    res.status(500).json({
        message: "Failed to create file",
    });
}
});
//ROUTE 2: GET /api/files/room/:roomCode  login required  GET ALL FILES in a room
router.get("/room/:roomCode", authMiddleware, async (req, res) => {
  try {
    const { roomCode } = req.params;

    // Find the room
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

    // Check whether user belongs to the room
    const memberResult = await pool.query(
      `SELECT * FROM room_members
             WHERE room_id = $1 AND user_id = $2`,
      [roomId, req.user.id],
    );

    if (memberResult.rows.length === 0) {
      return res.status(403).json({
        message: "You are not a member of this room",
      });
    }

    // Get all files in the room
    const result = await pool.query(
      `SELECT id, filename, language, content, updated_by, updated_at
             FROM code_files
             WHERE room_id = $1
             ORDER BY id`,
      [roomId],
    );

    res.json({
      message: "Files retrieved successfully",
      files: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to retrieve files",
    });
  }
});
//ROUTE 3: GET /api/files/:fileId  login required  GET A SINGLE FILE by fileId
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Get the file
    const fileResult = await pool.query(
      `SELECT *
             FROM code_files
             WHERE id = $1`,
      [id],
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        message: "File not found",
      });
    }

    const file = fileResult.rows[0];

    // Check whether user belongs to the room
    const memberResult = await pool.query(
      `SELECT *
             FROM room_members
             WHERE room_id = $1 AND user_id = $2`,
      [file.room_id, req.user.id],
    );

    if (memberResult.rows.length === 0) {
      return res.status(403).json({
        message: "You are not a member of this room",
      });
    }

    res.json({
      message: "File retrieved successfully",
      file,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to retrieve file",
    });
  }
});
//ROUTE 4: PUT /api/files/:fileId  login required  UPDATE A SINGLE FILE by fileId
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (content === undefined) {
      return res.status(400).json({
        message: "Content is required",
      });
    }

    // Get the file
    const fileResult = await pool.query(
      `SELECT *
             FROM code_files
             WHERE id = $1`,
      [id],
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        message: "File not found",
      });
    }

    const file = fileResult.rows[0];

    // Check room membership
    const memberResult = await pool.query(
      `SELECT *
             FROM room_members
             WHERE room_id = $1 AND user_id = $2`,
      [file.room_id, req.user.id],
    );

    if (memberResult.rows.length === 0) {
      return res.status(403).json({
        message: "You are not a member of this room",
      });
    }

    // Update the file
    const updateResult = await pool.query(
      `UPDATE code_files
             SET content = $1,
                 updated_by = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
      [content, req.user.id, id],
    );

    // Save version to history
    await pool.query(
      `INSERT INTO code_history
             (file_id, user_id, content)
             VALUES ($1, $2, $3)`,
      [id, req.user.id, content],
    );

    res.json({
      message: "File updated successfully",
      file: updateResult.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update file",
    });
  }
});
//ROUTE 5: RENAME /api/files/:fileId/rename  login required  RENAME A SINGLE FILE by fileId
router.patch("/:id/rename", authMiddleware, async (req, res) => {
  try {
    const fileId = req.params.id;
    const { filename } = req.body;

    if (!filename || !filename.trim()) {
      return res.status(400).json({
        message: "Filename is required",
      });
    }

    const newFilename = filename.trim();

    // Find the file
    const fileResult = await pool.query(
      `SELECT id, room_id
       FROM code_files
       WHERE id = $1`,
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        message: "File not found",
      });
    }

    const file = fileResult.rows[0];

    // Check whether user belongs to the room
    const memberResult = await pool.query(
      `SELECT *
       FROM room_members
       WHERE room_id = $1 AND user_id = $2`,
      [file.room_id, req.user.id]
    );

    if (memberResult.rows.length === 0) {
      return res.status(403).json({
        message: "You are not a member of this room",
      });
    }

    // Rename the file
    const result = await pool.query(
      `UPDATE code_files
       SET filename = $1,
           updated_by = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [newFilename, req.user.id, fileId]
    );

    res.json({
      message: "File renamed successfully",
      file: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    // Duplicate filename in the same room
    if (error.code === "23505") {
      return res.status(409).json({
        message: "A file with this name already exists in this room",
      });
    }

    res.status(500).json({
      message: "Failed to rename file",
    });
  }
});
//ROUTE 6: DELETE /api/files/:fileId  login required  DELETE A SINGLE FILE by fileId
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const fileId = req.params.id;
    // Find the file
    const fileResult = await pool.query(
      `SELECT id, room_id, filename
       FROM code_files
       WHERE id = $1`,
      [fileId]
    );
    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        message: "File not found",
      });
    }
    const file = fileResult.rows[0];
    // Check whether user belongs to the room
    const memberResult = await pool.query(
      `SELECT *
       FROM room_members
       WHERE room_id = $1 AND user_id = $2`,
      [file.room_id, req.user.id]
    );
    if (memberResult.rows.length === 0) {
      return res.status(403).json({
        message: "You are not a member of this room",
      });
    }
    // Delete the file
    await pool.query(
      `DELETE FROM code_files
       WHERE id = $1`,
      [fileId]
    );

    res.json({
      message: "File deleted successfully",
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to delete file",
    });
  }
});
//ROUTE 7: GET /api/files/:fileId/history  login required  GET FILE HISTORY by fileId
router.get("/:id/history", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Check whether the file exists
    const fileResult = await pool.query(
      `SELECT room_id
             FROM code_files
             WHERE id = $1`,
      [id],
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        message: "File not found",
      });
    }

    const roomId = fileResult.rows[0].room_id;

    // Check room membership
    const memberResult = await pool.query(
      `SELECT *
             FROM room_members
             WHERE room_id = $1 AND user_id = $2`,
      [roomId, req.user.id],
    );

    if (memberResult.rows.length === 0) {
      return res.status(403).json({
        message: "You are not a member of this room",
      });
    }

    // Get file history
    const historyResult = await pool.query(
      `SELECT
                ch.id,
                ch.file_id,
                ch.user_id,
                u.username,
                ch.content,
                ch.created_at
             FROM code_history ch
             LEFT JOIN users u ON ch.user_id = u.id
             WHERE ch.file_id = $1
             ORDER BY ch.created_at ASC`,
      [id],
    );

    res.json({
      message: "File history retrieved successfully",
      history: historyResult.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to retrieve file history",
    });
  }
});
module.exports = router;
