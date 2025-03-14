import express from "express";
import { register, registerUser, login, getUsers, getUser, logout, updateUser, getCashiers } from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/jwt.js";

const router = express.Router();

// api/auth
router.post("/login", login);                   // Login route
router.post("/logout", verifyToken, logout);    // Logout route

// api/users
router.get("/", getUsers);                                  // Get all users
router.get("/:userId", getUser);                            // Get a specific user by ID
router.post("/register", register);                         // Register a new user
router.post("/registerUser", verifyToken, registerUser);    // Register a new user (admin function)
router.put("/:userId", verifyToken, updateUser);            // Update a specific user by ID
router.get("/cashiers/:shopId", getCashiers);
export default router;
