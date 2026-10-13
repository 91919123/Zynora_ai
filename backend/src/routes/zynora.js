const express = require("express");
const { v4: uuidv4 } = require("uuid");

const db = require("../db");

const {
    retrieveRelevantChunks
} = require("../rag/retriever");

const {
    generateAnswer
} = require("../rag/answerGenerator");

const {
    authenticate
} = require("../middleware/auth");

const {
    detectPromptInjection
} = require("../middleware/security");

const router = express.Router();


// ======================================================
// CREATE CONVERSATION
// ======================================================


router.post("/conversations", authenticate, (req, res) => {
    try {
        const userId = Number(req.user?.id);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(401).json({
                success: false,
                error: "Invalid user session. Please log in again."
            });
        }

        // Confirm the authenticated user exists in this database.
        const user = db
            .prepare("SELECT id FROM users WHERE id = ?")
            .get(userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "User session is no longer valid. Please log out and register or log in again."
            });
        }

        const title =
            typeof req.body?.title === "string" && req.body.title.trim()
                ? req.body.title.trim()
                : "New Conversation";

        const result = db
            .prepare("INSERT INTO conversations (user_id, title) VALUES (?, ?)")
            .run(userId, title);

        const conversation = db
            .prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?")
            .get(result.lastInsertRowid, userId);

        return res.status(201).json({
            success: true,
            conversation
        });
    } catch (error) {
        console.error("Create conversation error:", error.message);

        return res.status(500).json({
            success: false,
            error: "Unable to create conversation."
        });
    }
});



// ======================================================
// GET CONVERSATIONS
// ======================================================

router.get("/conversations", authenticate, (req, res) => {

    const conversations = db.prepare(`
        SELECT
            c.id,
            c.title,
            c.created_at,
            c.updated_at,
            COUNT(m.id) AS message_count
        FROM conversations c
        LEFT JOIN conversation_messages m
            ON m.conversation_id = c.id
        WHERE c.user_id = ?
        GROUP BY c.id
        ORDER BY c.updated_at DESC
    `).all(req.user.id);

    res.json({
        success: true,
        conversations
    });
});


// ======================================================
// GET ONE CONVERSATION
// ======================================================

router.get(
    "/conversations/:id",
    authenticate,
    (req, res) => {

        const id = Number(req.params.id);

        const conversation = db.prepare(`
            SELECT *
            FROM conversations
            WHERE id = ?
              AND user_id = ?
        `).get(id, req.user.id);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: "Conversation not found"
            });
        }

        const messages = db.prepare(`
            SELECT *
            FROM conversation_messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC
        `).all(id);

        res.json({
            success: true,
            conversation,
            messages: messages.map(message => ({
                ...message,
                sources: message.sources
                    ? JSON.parse(message.sources)
                    : []
            }))
        });
    }
);


// ======================================================
// RENAME CONVERSATION
// ======================================================

router.patch(
    "/conversations/:id",
    authenticate,
    (req, res) => {

        const id = Number(req.params.id);

        const conversation = db.prepare(`
            SELECT *
            FROM conversations
            WHERE id = ?
              AND user_id = ?
        `).get(id, req.user.id);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: "Conversation not found"
            });
        }

        const title =
            req.body.title?.trim() ||
            "New Conversation";

        db.prepare(`
            UPDATE conversations
            SET title = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND user_id = ?
        `).run(title, id, req.user.id);

        res.json({
            success: true,
            message: "Conversation renamed"
        });
    }
);


// ======================================================
// DELETE CONVERSATION
// ======================================================

router.delete(
    "/conversations/:id",
    authenticate,
    (req, res) => {

        const result = db.prepare(`
            DELETE FROM conversations
            WHERE id = ?
              AND user_id = ?
        `).run(
            Number(req.params.id),
            req.user.id
        );

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: "Conversation not found"
            });
        }

        res.json({
            success: true,
            message: "Conversation deleted"
        });
    }
);


// ======================================================
// CLEAR CONVERSATION
// ======================================================

router.delete(
    "/conversations/:id/messages",
    authenticate,
    (req, res) => {

        const conversation = db.prepare(`
            SELECT id
            FROM conversations
            WHERE id = ?
              AND user_id = ?
        `).get(
            Number(req.params.id),
            req.user.id
        );

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: "Conversation not found"
            });
        }

        db.prepare(`
            DELETE FROM conversation_messages
            WHERE conversation_id = ?
        `).run(conversation.id);

        db.prepare(`
            UPDATE conversations
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(conversation.id);

        res.json({
            success: true,
            message: "Conversation cleared"
        });
    }
);


// ======================================================
// SEND MESSAGE
// ======================================================

router.post(
    "/conversations/:id/messages",
    authenticate,
    async (req, res) => {

        const requestId = uuidv4();
        const start = Date.now();

        try {

            const conversationId =
                Number(req.params.id);

            const { message } = req.body;

            if (
                !message ||
                typeof message !== "string" ||
                message.trim().length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    error: "Message is required",
                    requestId
                });
            }

            // ------------------------------------------
            // OWNERSHIP CHECK
            // ------------------------------------------

            const conversation = db.prepare(`
                SELECT *
                FROM conversations
                WHERE id = ?
                  AND user_id = ?
            `).get(
                conversationId,
                req.user.id
            );

            if (!conversation) {
                return res.status(404).json({
                    success: false,
                    error: "Conversation not found",
                    requestId
                });
            }


            // ------------------------------------------
            // PROMPT INJECTION
            // ------------------------------------------

            if (detectPromptInjection(message)) {

                const latency = Date.now() - start;

                db.prepare(`
                    INSERT INTO system_logs
                    (request_id, user_id, action, module, status, metadata)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(
                    requestId,
                    req.user.id,
                    "PROMPT_INJECTION",
                    "security",
                    "BLOCKED",
                    JSON.stringify({
                        message
                    })
                );

                return res.status(400).json({
                    success: false,
                    error:
                        "The request was blocked because it contains an unsupported instruction pattern.",
                    requestId,
                    latency_ms: latency
                });
            }


            // ------------------------------------------
            // STORE USER MESSAGE
            // ------------------------------------------

            const userMessageResult = db.prepare(`
                INSERT INTO conversation_messages
                (conversation_id, role, content)
                VALUES (?, ?, ?)
            `).run(
                conversationId,
                "user",
                message.trim()
            );


            // ------------------------------------------
            // RETRIEVE APPROVED KNOWLEDGE
            // ------------------------------------------

            const chunks =
                retrieveRelevantChunks(
                    message.trim(),
                    { limit: 5}
                );


            // ------------------------------------------
            // GENERATE GROUNDED ANSWER
            // ------------------------------------------

            const generated =
                generateAnswer(
                    message.trim(),
                    chunks
                );


            const latency =
                Date.now() - start;


            // ------------------------------------------
            // SAVE ASSISTANT MESSAGE
            // ------------------------------------------

            const assistantResult = db.prepare(`
                INSERT INTO conversation_messages
                (
                    conversation_id,
                    role,
                    content,
                    sources,
                    grounded,
                    confidence,
                    latency_ms
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                conversationId,
                "assistant",
                generated.answer,
                JSON.stringify(generated.sources),
                generated.grounded ? 1 : 0,
                generated.confidence,
                latency
            );


            // ------------------------------------------
            // EVALUATION RECORD
            // ------------------------------------------

            const bestSimilarity =
                chunks.length
                    ? chunks[0].similarity
                    : 0;

            db.prepare(`
                INSERT INTO evaluations
                (
                    conversation_id,
                    message_id,
                    question,
                    retrieved_chunks,
                    similarity,
                    answer,
                    source,
                    latency_ms,
                    grounded,
                    confidence
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                conversationId,
                assistantResult.lastInsertRowid,
                message.trim(),
                chunks.length,
                bestSimilarity,
                generated.answer,
                Array.isArray(generated.sources) && generated.sources.length > 0
                ? JSON.stringify(generated.sources)
                : null,
                latency,
                generated.grounded ? 1 : 0,
                generated.confidence
            );


            // ------------------------------------------
            // OLD CHAT HISTORY COMPATIBILITY
            // ------------------------------------------

            db.prepare(`
                INSERT INTO chat_history
                (
                    session_id,
                    user_message,
                    assistant_answer,
                    grounded
                )
                VALUES (?, ?, ?, ?)
            `).run(
                String(conversationId),
                message.trim(),
                generated.answer,
                generated.grounded ? 1 : 0
            );


            // ------------------------------------------
            // UPDATE CONVERSATION
            // ------------------------------------------

            db.prepare(`
                UPDATE conversations
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(conversationId);


            // ------------------------------------------
            // SYSTEM LOG
            // ------------------------------------------

            db.prepare(`
                INSERT INTO system_logs
                (
                    request_id,
                    user_id,
                    action,
                    module,
                    status,
                    metadata
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                requestId,
                req.user.id,
                "CHAT",
                "rag",
                "SUCCESS",
                JSON.stringify({
                    conversationId,
                    chunks: chunks.length,
                    grounded: generated.grounded,
                    confidence: generated.confidence,
                    latency
                })
            );


            // ------------------------------------------
            // RESPONSE
            // ------------------------------------------

            res.json({
                success: true,
                requestId,
                answer: generated.answer,
                grounded: generated.grounded,
                confidence: Number(
                    Number(generated.confidence || 0).toFixed(3)
                ),
                sources: generated.sources,
                retrieved_chunks: chunks.length,
                latency_ms: latency
            });

        } catch (error) {

            console.error(
                "Zynora chat error:",
                error
            );

            db.prepare(`
                INSERT INTO system_logs
                (
                    request_id,
                    user_id,
                    action,
                    module,
                    status,
                    error
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                requestId,
                req.user?.id || null,
                "CHAT",
                "rag",
                "ERROR",
                error.message
            );

            res.status(500).json({
                success: false,
                error: "Internal server error",
                requestId
            });
        }
    }
);


// ======================================================
// LEGACY /chat ENDPOINT
// ======================================================

router.post(
    "/chat",
    authenticate,
    async (req, res) => {

        try {

            const { message, session_id } =
                req.body;

            if (
                !message ||
                typeof message !== "string"
            ) {
                return res.status(400).json({
                    success: false,
                    error: "message is required"
                });
            }

            let conversation;

            if (session_id) {
                conversation =
                    db.prepare(`
                        SELECT *
                        FROM conversations
                        WHERE id = ?
                          AND user_id = ?
                    `).get(
                        Number(session_id),
                        req.user.id
                    );
            }

            if (!conversation) {

                const result =
                    db.prepare(`
                        INSERT INTO conversations
                        (user_id, title)
                        VALUES (?, ?)
                    `).run(
                        req.user.id,
                        message.substring(0, 40)
                    );

                conversation =
                    db.prepare(`
                        SELECT *
                        FROM conversations
                        WHERE id = ?
                    `).get(
                        result.lastInsertRowid
                    );
            }

            req.params.id =
                String(conversation.id);

            const chunks =
                retrieveRelevantChunks(
                    message,
                    5
                );

            const generated =
                generateAnswer(
                    message,
                    chunks
                );

            res.json({
                success: true,
                answer: generated.answer,
                sources: generated.sources,
                grounded: generated.grounded,
                confidence: generated.confidence,
                session_id: String(
                    conversation.id
                )
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                error: "Internal server error"
            });
        }
    }
);

module.exports = router;