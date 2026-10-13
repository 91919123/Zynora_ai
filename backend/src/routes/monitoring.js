const express = require("express");

const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();


// Overall monitoring summary
router.get(
    "/summary",
    authenticate,
    (req, res) => {

        const totalMessages = db.prepare(`
            SELECT COUNT(*) AS count
            FROM conversation_messages
            WHERE role = 'assistant'
        `).get().count;

        const grounded = db.prepare(`
            SELECT COUNT(*) AS count
            FROM conversation_messages
            WHERE role = 'assistant'
              AND grounded = 1
        `).get().count;

        const avgLatency = db.prepare(`
            SELECT AVG(latency_ms) AS avg
            FROM conversation_messages
            WHERE role = 'assistant'
        `).get().avg || 0;

        const avgConfidence = db.prepare(`
            SELECT AVG(confidence) AS avg
            FROM conversation_messages
            WHERE role = 'assistant'
        `).get().avg || 0;

        const totalConversations =
            db.prepare(`
                SELECT COUNT(*) AS count
                FROM conversations
            `).get().count;

        res.json({
            success: true,
            metrics: {
                total_messages: totalMessages,
                total_conversations: totalConversations,
                grounded_answers: grounded,
                grounding_rate:
                    totalMessages
                        ? Number(
                            (grounded / totalMessages)
                                .toFixed(3)
                        )
                        : 0,
                average_latency_ms:
                    Number(avgLatency.toFixed(2)),
                average_confidence:
                    Number(avgConfidence.toFixed(3))
            }
        });
    }
);


// Evaluation data
router.get(
    "/evaluations",
    authenticate,
    (req, res) => {

        const limit =
            Math.min(
                Number(req.query.limit) || 50,
                200
            );

        const rows = db.prepare(`
            SELECT *
            FROM evaluations
            ORDER BY created_at DESC
            LIMIT ?
        `).all(limit);

        res.json({
            success: true,
            evaluations: rows
        });
    }
);


// Logs
router.get(
    "/logs",
    authenticate,
    (req, res) => {

        if (req.user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                error: "Admin access required"
            });
        }

        const logs = db.prepare(`
            SELECT *
            FROM system_logs
            ORDER BY created_at DESC
            LIMIT 100
        `).all();

        res.json({
            success: true,
            logs
        });
    }
);

module.exports = router;