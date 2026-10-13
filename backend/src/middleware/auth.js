const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || "zynora-development-secret";

function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if(!authHeader) {
            return res.status(401).json({
                success: false,
                error: "Authentication required"
            });
        }

        const parts = authHeader.split(" ");

        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({
                success: false,
                error: "Invalid authorization format"
            });
        }

        const token = parts[1]

        const decoded =  jwt.verify(token, JWT_SECRET);
        
        req.user = decoded;

        next();
    } catch (error){
        console.error("Authentication error:", error.message);
        return res.status(401).json({
            success: false,
            error: "Invalid or expired token"
        });
    }
}

module.exports = {
    authenticate,
    JWT_SECRET
};


