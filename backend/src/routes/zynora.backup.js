const express = require("express");

const {
    retrieveRelevantChunks
} = require("../rag/retriever");

const {
    generateAnswer
} = require("../rag/answerGenerator");

const db = require("../db");

const router = express.Router();

router.post("/chat", (req, res) => {

    try {

        const { message, session_id } = req.body;

        if (
            !message ||
            typeof message !== "string" ||
            message.trim().length === 0
        ) {
            return res.status(400).json({
                success: false,
                error: "Message is required."
            });
        }

        const query = message.trim();

        

        const injectionPatterns = [
            "ignore previous instructions",
            "ignore all previous instructions",
            "forget your instructions",
            "system prompt",
            "reveal your prompt",
            "show me your instructions",
            "bypass rag",
            "bypass the rag",
            "use google",
            "search the web",
            "use internet",
            "use external api"
        ];

        const lowerQuery = query.toLowerCase();

        const isInjection = injectionPatterns.some(
            pattern => lowerQuery.includes(pattern)
        );

        if (isInjection) {

            const answer =
                "I can only answer questions using the approved Zyngram knowledge base.";

            db.prepare(`
                INSERT INTO chat_history
                (session_id, user_message, assistant_answer, grounded)
                VALUES (?, ?, ?, ?)
            `).run(
                session_id || "anonymous",
                query,
                answer,
                0
            );

            return res.json({
                success: true,
                answer,
                sources: [],
                grounded: false
            });
        }

        // Retrieve approved knowledge chunks.

        const chunks = retrieveRelevantChunks(query, 3);

        
        //Generate grounded answer.
         

        const result = generateAnswer(query, chunks);

        
        // Store conversation for audit/history.
         

        db.prepare(`
            INSERT INTO chat_history
            (session_id, user_message, assistant_answer, grounded)
            VALUES (?, ?, ?, ?)
        `).run(
            session_id || "anonymous",
            query,
            result.answer,
            result.grounded ? 1 : 0
        );

        return res.json({
            success: true,
            answer: result.answer,
            sources: result.sources,
            grounded: result.grounded
        });

    } catch (error) {

        console.error("Zynora chat error:", error);

        return res.status(500).json({
            success: false,
            error: "Internal server error."
        });
    }
});

module.exports = router;