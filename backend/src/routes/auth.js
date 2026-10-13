const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../db");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: "Name, email and password are required"
            });
        }

        const existing = db
            .prepare("SELECT id FROM users WHERE email = ?")
            .get(email.toLowerCase());

        if (existing) {
            return res.status(409).json({
                success: false,
                error: "Email already registered"
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = db
            .prepare(`
                INSERT INTO users
                (name, email, password_hash, role)
                VALUES (?, ?, ?, ?)
            `)
            .run(
                name,
                email.toLowerCase(),
                passwordHash,
                "USER"
            );

        const token = jwt.sign(
            {
                id: result.lastInsertRowid,
                name,
                email: email.toLowerCase(),
                role: "USER"
            },
            JWT_SECRET,
            { expiresIn: "8h" }
        );

        res.status(201).json({
            success: true,
            token,
            user: {
                id: result.lastInsertRowid,
                name,
                email: email.toLowerCase(),
                role: "USER"
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: "Registration failed"
        });
    }
});


router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = db
            .prepare(`
                SELECT *
                FROM users
                WHERE email = ?
            `)
            .get(email?.toLowerCase());

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password"
            });
        }

        const valid = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!valid) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: "8h" }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: "Login failed"
        });
    }
});

module.exports = router;