const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = process.env.ZYNORA_DB_PATH
    ? path.resolve(process.env.ZYNORA_DB_PATH)
    : path.join(__dirname, "data", "zynora.db");

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

const knowledgePath = path.join(__dirname, "data", "knowledge.json");

function ingestKnowledge() {
    const records = JSON.parse(
        fs.readFileSync(knowledgePath, "utf8")
    );

    if (!Array.isArray(records)) {
        throw new Error("knowledge.json must contain an array");
    }

    const approved = records.filter(
        item => String(item.status || "").trim().toUpperCase() === "APPROVED"
    );

    const runImport = db.transaction(() => {
        const findDocument = db.prepare(`
            SELECT id
            FROM knowledge_documents
            WHERE title = ? AND category = ? AND source = ? AND version = ?
            LIMIT 1
        `);

        const insertDocument = db.prepare(`
            INSERT INTO knowledge_documents
                (title, category, content, source, version, status)
            VALUES (?, ?, ?, ?, ?, 'APPROVED')
        `);

        const findChunk = db.prepare(`
            SELECT id
            FROM knowledge_chunks
            WHERE document_id = ?
              AND title = ?
              AND category = ?
              AND COALESCE(section, '') = ?
              AND version = ?
              AND source = ?
              AND content = ?
            LIMIT 1
        `);

        const insertChunk = db.prepare(`
            INSERT INTO knowledge_chunks
                (document_id, title, category, section, version, source, status, content)
            VALUES (?, ?, ?, ?, ?, ?, 'APPROVED', ?)
        `);

        const documentMap = new Map();
        let documentsInserted = 0;
        let chunksInserted = 0;
        let chunksSkipped = 0;

        for (const item of approved) {
            if (
                !item.document_id ||
                !item.title ||
                !item.category ||
                !item.content ||
                !item.source ||
                !item.version
            ) {
                throw new Error(
                    "Invalid required fields in chunk " +
                    (item.chunk_id || "unknown")
                );
            }

            let document = documentMap.get(item.document_id);

            if (!document) {
                document = findDocument.get(
                    item.title,
                    item.category,
                    item.source,
                    item.version
                );

                if (!document) {
                    insertDocument.run(
                        item.title,
                        item.category,
                        item.content,
                        item.source,
                        item.version
                    );

                    document = findDocument.get(
                        item.title,
                        item.category,
                        item.source,
                        item.version
                    );

                    documentsInserted++;
                }

                documentMap.set(item.document_id, document);
            }

            const section = item.section || "";

            const existingChunk = findChunk.get(
                document.id,
                item.title,
                item.category,
                section,
                item.version,
                item.source,
                item.content
            );

            if (existingChunk) {
                chunksSkipped++;
                continue;
            }

            insertChunk.run(
                document.id,
                item.title,
                item.category,
                section || null,
                item.version,
                item.source,
                item.content
            );

            chunksInserted++;
        }

        return {
            approvedChunks: approved.length,
            documentsInserted,
            chunksInserted,
            chunksSkipped
        };
    });

    console.log("Knowledge ingestion completed:");
    console.log(JSON.stringify(runImport(), null, 2));
}

try {
    ingestKnowledge();
} catch (error) {
    console.error("Knowledge ingestion failed:", error.message);
    process.exitCode = 1;
} finally {
    db.close();
}
