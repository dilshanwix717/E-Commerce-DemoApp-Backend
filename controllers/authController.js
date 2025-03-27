import User from '../models/User.js';
import admin from '../firebase/firebase-admin.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'; // Add this import

export const register = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            password,
            contact
        } = req.body;

        // Validate input
        if (!firstName || !email || !password) {
            return res.status(400).json({
                message: 'Missing required fields'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                message: 'User already exists'
            });
        }

        // Create Firebase user (if not using Google/Social login)
        const firebaseUser = await admin.auth().createUser({
            email,
            password,
            displayName: `${firstName} ${lastName}`
        });

        // Generate userId
        const lastUser = await User.findOne().sort({ createdAt: -1 });
        const lastUserID = lastUser ? parseInt(lastUser.userId.split('-')[1]) : 0;
        const userId = `UID-${lastUserID + 1}`;

        // Hash password for additional security
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create MongoDB user
        const user = new User({
            userId,
            firstName,
            lastName,
            email,
            contact,
            password: hashedPassword,
            firebaseUid: firebaseUser.uid
        });

        await user.save();

        // Generate custom JWT for API interactions
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                isAdmin: user.isAdmin
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                isAdmin: user.isAdmin
            }
        });

    } catch (error) {
        res.status(500).json({
            message: 'Registration failed',
            error: error.message
        });
    }
};




export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required'
            });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the user has a password (for traditional login)
        if (!user.password) {
            return res.status(401).json({ message: 'Invalid login method' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verify Firebase authentication for the user
        try {
            // Create a Firebase custom token
            const firebaseToken = await admin.auth().createCustomToken(user.firebaseUid);

            // Generate custom JWT for API interactions
            const token = jwt.sign(
                {
                    userId: user._id,
                    email: user.email,
                    isAdmin: user.isAdmin
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.status(200).json({
                message: 'Login successful',
                token,
                firebaseToken,
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    isAdmin: user.isAdmin
                }
            });
        } catch (firebaseError) {
            console.error('Firebase token creation error:', firebaseError);
            return res.status(500).json({
                message: 'Authentication verification failed',
                error: firebaseError.message
            });
        }

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            message: 'Login failed',
            error: error.message
        });
    }
};
// export const register = async (req, res) => {
//     try {
//         const { firstName, lastName, contact, email, password, firebaseToken } = req.body;

//         // Verify Firebase token
//         const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
//         if (!decodedToken) {
//             return res.status(401).json({ message: 'Invalid Firebase token' });
//         }

//         // Check if user exists
//         const emailExists = await User.findOne({ email });
//         if (emailExists) {
//             return res.status(400).json({
//                 field: "email",
//                 message: "This email is already registered. Please use a different email."
//             });
//         }


//         // Generate userId
//         const lastUser = await User.findOne().sort({ createdAt: -1 });
//         const lastUserID = lastUser ? parseInt(lastUser.userId.split('-')[1]) : 0;
//         const userId = `UID-${lastUserID + 1}`;

//         // Hash password for additional security
//         const hashedPassword = await bcrypt.hash(password, 12);

//         // Create user in MongoDB
//         const user = new User({
//             userId,
//             firstName,
//             lastName,
//             contact,
//             email,
//             password: hashedPassword,
//             firebaseUid: decodedToken.uid
//         });
//         await user.save();

//         res.status(201).json({
//             message: 'User created successfully',
//             result: {
//                 id: user._id,
//                 email: user.email,
//                 contact: user.contact,
//                 firstName: user.firstName,
//                 lastName: user.lastName,
//                 wishlist: user.wishlist,
//                 cart: user.cart,
//                 purchasedMovies: user.purchasedMovies,
//                 isAdmin: user.isAdmin,
//                 profilePicture: user.profilePicture || "",
//             }
//         });
//     } catch (error) {
//         console.error('Registration error:', error);
//         res.status(500).json({ error: error.message || "Something went wrong" });
//     }
// };

// export const login = async (req, res) => {

//     try {
//         const { firebaseToken } = req.body;

//         // Verify Firebase token
//         const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
//         if (!decodedToken) {
//             return res.status(401).json({ message: 'Invalid Firebase token' });
//         }

//         // Find user in MongoDB
//         const user = await User.findOne({ firebaseUid: decodedToken.uid });
//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }
//         res.status(200).json({
//             result: {
//                 id: user._id,
//                 email: user.email,
//                 contact: user.contact,
//                 firstName: user.firstName,
//                 lastName: user.lastName,
//                 wishlist: user.wishlist,
//                 cart: user.cart,
//                 purchasedMovies: user.purchasedMovies,
//                 isAdmin: user.isAdmin,
//                 profilePicture: user.profilePicture || "",
//             }
//         });
//     } catch (error) {
//         console.error('Login error:', error);
//         res.status(500).json({ message: 'Something went wrong' });
//     }
// };

export const googleRegister = async (req, res) => {
    try {
        const { firebaseToken, firstName, lastName, email, contact, profilePicture } = req.body;

        // Verify Firebase token
        const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
        //console.log(decodedToken);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Invalid Firebase token' });
        }
        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(200).json({
                result: {
                    id: user._id,
                    email: user.email,
                    contact: user.contact,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    wishlist: user.wishlist,
                    cart: user.cart,
                    purchasedMovies: user.purchasedMovies,
                    isAdmin: user.isAdmin,
                    profilePicture: user.profilePicture || "",
                }
            });
        }
        // Generate userId for new user
        const lastUser = await User.findOne().sort({ createdAt: -1 });
        const lastUserID = lastUser ? parseInt(lastUser.userId.split("-")[1]) : 0;
        const userId = `UID-${lastUserID + 1}`;
        //console.log(decodedToken.uid)
        // Create new user
        const newUser = new User({
            userId,
            firstName,
            lastName,
            email,
            contact,
            profilePicture,
            firebaseUid: decodedToken.uid,
            wishlist: [],
            cart: [],
            purchasedMovies: [],
            isAdmin: false,
        });
        await newUser.save();
        res.status(201).json({
            result: {
                id: newUser._id,
                email: newUser.email,
                contact: newUser.contact,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                wishlist: newUser.wishlist,
                cart: newUser.cart,
                purchasedMovies: newUser.purchasedMovies,
                isAdmin: newUser.isAdmin,
                profilePicture: newUser.profilePicture || "",
            }
        });
    } catch (error) {
        console.error("Google registration error:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};