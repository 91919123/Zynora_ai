const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const db = require("./db");

const zynoraRoutes = require("./routes/zynora");

const app = express();

const PORT = 5002;

app.use(cors());
app.use(express.json());



// Knowledge Base Loader
 

function loadKnowledgeBase() {

    const filePath = path.join(
        __dirname,
        "data",
        "knowledge.json"
    );

    if (!fs.existsSync(filePath)) {

        console.log(
            "Knowledge base file not found:",
            filePath
        );

        return;
    }

    const data = JSON.parse(
        fs.readFileSync(filePath, "utf-8")
    );

    const chunks = Array.isArray(data)
        ? data
        : data.chunks || [];

    console.log(
        `Knowledge chunks found: ${chunks.length}`
    );

    const existing = db
        .prepare(
            "SELECT COUNT(*) AS count FROM knowledge_chunks"
        )
        .get();

    if (existing.count > 0) {

        console.log(
            `Knowledge base already loaded: ${existing.count} chunks`
        );

        return;
    }

    const insertDocument = db.prepare(`
        INSERT INTO knowledge_documents
        (title, category, content, source, version, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertChunk = db.prepare(`
        INSERT INTO knowledge_chunks
        (document_id, title, category, section, version, source, status, content)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {

        const documents = new Map();

        for (const chunk of chunks) {

            let documentId =
                documents.get(chunk.document_id);

            if (!documentId) {

                const result = insertDocument.run(
                    chunk.title || "Zyngram Knowledge Document",
                    chunk.category || "Company",
                    chunk.content || "",
                    chunk.source || "Zyngram Knowledge Base",
                    chunk.version || "1.0",
                    chunk.status || "APPROVED"
                );

                documentId = Number(
                    result.lastInsertRowid
                );

                documents.set(
                    chunk.document_id,
                    documentId
                );
            }

            insertChunk.run(
                documentId,
                chunk.title || "",
                chunk.category || "",
                chunk.section || "",
                chunk.version || "1.0",
                chunk.source || "",
                chunk.status || "APPROVED",
                chunk.content || ""
            );
        }
    });

    transaction();

    console.log(
        "Knowledge base loaded successfully."
    );
}

loadKnowledgeBase();


//Routes

app.get("/api/health", (req, res) => {

    res.json({
        success: true,
        message: "Zynora Day-11 API is running."
    });
});

app.get("/api/knowledge/count", (req, res) => {

    const result = db
        .prepare(`
            SELECT COUNT(*) AS count
            FROM knowledge_chunks
            WHERE status IN ('APPROVED', 'ACTIVE')
        `)
        .get();

    res.json({
        success: true,
        count: result.count
    });
});

app.use("/api/zynora", zynoraRoutes);


//Start Server


app.listen(PORT, () => {

    console.log(
        `Zynora backend running at http://localhost:${PORT}`
    );

});