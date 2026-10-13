require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const db = require("./db");

const authRoutes =
    require("./routes/auth");

const zynoraRoutes =
    require("./routes/zynora");

const monitoringRoutes =
    require("./routes/monitoring");

const app = express();

app.set("trust proxy", 1);

const PORT =
    Number(process.env.PORT) || 5002;


// ======================================================
// MIDDLEWARE
// ======================================================

const allowedOrigins = [
    "http://localhost:5173",
    process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

app.use(express.json({ limit: "1mb" }));


// Rate limiting
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: "Too many requests. Please try again later."
    }
});

app.use("/api", limiter);


// ======================================================
// HEALTH
// ======================================================

app.get("/health", (req, res) => {

    try {

        db.prepare("SELECT 1").get();

        res.json({
            success: true,
            status: "healthy",
            service: "Zynora Day-12 API",
            version: "1.1.0",
            database: "connected"
        });

    } catch (error) {

        res.status(503).json({
            success: false,
            status: "unhealthy",
            database: "disconnected"
        });
    }
});


// ======================================================
// API ROUTES
// ======================================================

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/zynora",
    zynoraRoutes
);

app.use(
    "/api/monitoring",
    monitoringRoutes
);


// ======================================================
// ROOT
// ======================================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        service: "Zynora AI Assistant",
        version: "1.1.0",
        message: "Zynora Day-12 API is running."
    });
});


// ======================================================
// 404
// ======================================================

app.use((req, res) => {

    res.status(404).json({
        success: false,
        error: "Endpoint not found",
        path: req.originalUrl
    });
});


// ======================================================
// ERROR HANDLER
// ======================================================

app.use((error, req, res, next) => {

    console.error(error);

    res.status(500).json({
        success: false,
        error: "Internal server error"
    });
});


// ======================================================
// SERVER
// ======================================================

app.listen(PORT, () => {

    console.log(`
========================================
 ZYNORA AI ASSISTANT v1.1
========================================

 Server: http://localhost:${PORT}
 Health: http://localhost:${PORT}/health
 API:    http://localhost:${PORT}/api/zynora

 Database: SQLite
 RAG:      Approved Knowledge Base
 Security: JWT + Rate Limit + Injection Protection

========================================
`);
});