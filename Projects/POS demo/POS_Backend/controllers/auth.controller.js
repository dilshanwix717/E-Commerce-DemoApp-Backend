import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import createError from "../utils/createError.js";
import Shop from "../models/shop.model.js";
import { io } from "../server.js"; // Import socket.io instance

export const register = async (req, res, next) => {
  try {
    const hash = bcrypt.hashSync(req.body.password, 5);
    const newUser = new User({
      ...req.body,
      userId: 'UserID-1',
      createdBy: 'CeylonX',
      password: hash,
    });

    await newUser.save();
    res.status(201).send("User has been created");
  } catch (err) {
    console.error(err); // Log the error for debugging purposes
    next(err);
  }
};

export const registerUser = async (req, res, next) => {
  if (req.role !== 'superAdmin') {
    return res.status(403).json({ message: "Only Super Admins are allowed to create users." });
  }

  try {
    const hash = bcrypt.hashSync(req.body.password, 5);
    const newUser = new User({
      ...req.body,
      userId: 'UserID-1',
      password: hash,
    });

    await newUser.save();
    res.status(201).send("User has been created");
  } catch (err) {
    console.error(err); // Log the error for debugging purposes
    next(err);
  }
}
// Function to get the company ID of the shop
// This function is used to get the company ID of the shop where the user is logging in.
function getCompanyIDoftheShop(shopId) {
  return Shop.findOne({ shopId: shopId }).select('companyId');
}

export const login = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    console.log(user);
    if (!user) return next(createError(404, "User not found!"));

    const isCorrect = bcrypt.compareSync(req.body.password, user.password);
    if (!isCorrect)
      return next(createError(400, "Wrong password or username!"));

    const token = jwt.sign(
      {
        userId: user.userId,
        role: user.role,
        companyId: user.companyId,
        shopId: req.body.shopId,
      },
      process.env.JWT_KEY
    );

    // Invalidate any existing session
    if (user.sessionToken) {
      console.log('Emitting session_expired to:', user.sessionToken); // Debug log
      io.to(user.sessionToken).emit('session_expired'); // Notify the old session
    }
    const companyIDoftheShop = await getCompanyIDoftheShop(req.body.shopId);
    user.sessionToken = token;
    await user.save();

    const userData = {
      userId: user.userId,
      role: user.role,
      username: user.username,
      companyId: companyIDoftheShop.companyId,
      shopId: req.body.shopId,
      usersAssignedCompanyID: user.companyId,
      email: user.email,
      sessionToken: token // Add sessionToken to userData
    };

    res
      .cookie("accessToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Set secure only in production
        sameSite: "none", // Required for cross-domain cookie access
      })
      .status(200)
      .send(userData);
  } catch (err) {
    next(err);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({});
    res.json(users);
    io.emit("users", users); // Emit the users event to all connected clients
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCashiers = async (req, res, next) => {
  try {
    const shopId = req.params.shopId;
    const cashiers = await User.find({ role: "cashier", shopIds: shopId });
    res.json(cashiers);
    io.emit("cashiers", cashiers); // Emit the cashiers event to all connected clients
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getUser = async (req, res, next) => {
  try {
    //const userId = req.params.userId; // Assuming the user ID is passed as a route parameter

    const user = await User.findOne({ userId: req.params.userId });

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    const userData = {
      userId: user.userId,
      username: user.username,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
    };

    res.status(200).json(userData);
    io.emit("user", userData); // Emit the user event to all connected clients
  } catch (err) {
    console.error(err); // Log the error for debugging purposes
    next(err);
  }
};

// NOT RECOMMENDED: Since this will expose the password in the response
/*
import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // Ensure this key is 32 bytes
const iv = Buffer.from(process.env.ENCRYPTION_IV, 'hex'); // Ensure this IV is 16 bytes

function decrypt(encryptedText) {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
// Get user details with decrypted password
export const getUserDetails = async (req, res, next) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    // Decrypt the password before sending it in the response
    const decryptedPassword = decrypt(user.password);

    const userData = {
      userId: user.userId,
      username: user.username,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      email: user.email,
      shopIds: user.shopIds,
      password: decryptedPassword, // Decrypted password
    };

    res.status(200).json(userData);
  } catch (err) {
    console.error(err); // Log the error for debugging purposes
    next(err);
  }
}
*/

// Update user details when password is not provided and provided.
export const updateUser = async (req, res, next) => {
  try {
    const { password, ...updateData } = req.body;

    // If a new password is provided, hash it; otherwise, leave the existing password unchanged.
    if (password) {
      const saltRounds = 10; // Adjust salt rounds as needed
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateData.password = hashedPassword;
    }

    // Update the user with the new data, excluding the password if it was not provided
    const updatedUser = await User.findOneAndUpdate(
      { userId: req.params.userId },
      updateData,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updatedUser);
    io.emit("user", updatedUser); // Emit the user event to all connected clients
  } catch (err) {
    next(err);
  }
};

// User logout
export const logout = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.userId });
    if (user) {
      user.sessionToken = null;
      await user.save();
    }
    res
      .clearCookie("accessToken", {
        sameSite: "none",
        secure: true,
      })
      .status(200)
      .send("User has been logged out!");
  } catch (err) {
    res.status(500).send("Logout failed!");
  }
};
