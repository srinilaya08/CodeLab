const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");
const jwt = require("jsonwebtoken");
const router = express.Router();
//ROUTER 1 : post /api/auth/register
router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, username, email, created_at`,
            [username, email, passwordHash]
        );

        res.status(201).json({
            message: "User registered successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server from codelab error"
        });
    }
});
//route 2: post /api/auth/login
router.post("/login", async (req, res) => {
    try{
    const{email,password}=req.body;
    if(!email || !password){
        return res.status(400).json({
            message:"Email and password are required"
        });
    }
    const result=await pool.query("SELECT * FROM users WHERE email=$1",[email]);
    if(result.rows.length===0){
        return res.status(401).json({
            message:"Invalid email or password"
        });
    }   
    const user= result.rows[0];
    const passwordMatch= await bcrypt.compare(password,user.password_hash);
    if(!passwordMatch){
        return res.status(401).json({
            message:"Invalid email or password"
        });
    }
    const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );
        res.json({
            message:"Login successful",
            token:token,
            user:{
                id: user.id,
                username: user.username,
                email: user.email
            }
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

module.exports = router;