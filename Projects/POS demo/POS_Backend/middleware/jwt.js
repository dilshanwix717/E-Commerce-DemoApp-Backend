import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import createError from "../utils/createError.js";

export const verifyToken = async (req, res, next) => {
    const token = req.cookies.accessToken;

    if (!token) {
        return next(createError(401, "You are not authenticated!"));
    }

    jwt.verify(token, process.env.JWT_KEY, async (err, payload) => {
        if (err) {
            console.error("JWT Verification Error:", err);
            return next(createError(403, "Token is not valid"));
        }

        // Ensure payload contains the correct fields
        if (!payload || !payload.userId || !payload.role || !payload.companyId || !payload.shopId) {
            return next(createError(403, "Token payload is missing required fields"));
        }

        const user = await User.findOne({userId: payload.userId});

        if (!user || user.sessionToken !== token) {
            return next(createError(401, "Session expired. Please login again."));
        }

        req.userId = payload.userId;
        req.role = payload.role;
        req.companyId = payload.companyId;
        req.shopId = payload.shopId;

        next();
    });
};
