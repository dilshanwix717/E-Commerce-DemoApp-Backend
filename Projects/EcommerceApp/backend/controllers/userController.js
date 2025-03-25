import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Movie from '../models/Movie.js';
import firebaseStorage from '../utils/firebaseStorage.js'; // Assuming you've already set up firebaseStorage utility


// Update User Profile (First Name, Last Name, Contact)
export const updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, contact, email } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { firstName, lastName, contact, email },
            { new: true }
        ).select('-password'); // Exclude password field

        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};

// Update User Password
export const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Debugging logs
        console.log("Current Password:", currentPassword);
        console.log("New Password:", newPassword);
        console.log("Confirm Password:", confirmPassword);

        if (newPassword !== confirmPassword) {
            console.error("Passwords do not match");
            return res.status(400).json({ message: "Passwords do not match" });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            console.error("User not found");
            return res.status(404).json({ message: "User not found" });
        }

        const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);

        console.log("Password Match Status:", isPasswordMatch);

        if (!isPasswordMatch) {
            console.error("Incorrect current password");
            return res.status(400).json({ message: "Incorrect current password" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;
        await user.save();

        console.log("Password updated successfully");
        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Error updating password:", error.message);
        res.status(500).json({ message: "Failed to update password", error: error.message });
    }
};


export const updateProfilePicture = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Function to check if an image exists in the bucket
        const imageExists = async (publicId) => {
            try {
                const file = firebaseStorage.bucket.file(publicId);
                const [exists] = await file.exists();
                return exists;
            } catch (error) {
                return false;
            }
        };

        // Check if a new profile picture is being uploaded
        if (req.files?.profilePicture?.length > 0) {
            // If a profile picture already exists, delete the old one from Firebase
            if (user.profilePicture?.publicId) {
                if (await imageExists(user.profilePicture.publicId)) {
                    await firebaseStorage.deleteImage(user.profilePicture.publicId);
                } else {
                    console.log(`Profile picture not found, skipping delete: ${user.profilePicture.publicId}`);
                }
            }

            // Upload the new profile picture to Firebase Storage
            const profilePicUpload = await firebaseStorage.uploadImage(
                req.files.profilePicture[0],
                `users/${user.id}`,
                `${user.id}_profile`
            );

            // Update the user's profile picture field
            user.profilePicture = {
                url: profilePicUpload.url,
                publicId: profilePicUpload.path
            };

            await user.save();
            res.status(200).json(user);
        } else {
            return res.status(400).json({ message: 'Profile picture is required' });
        }
    } catch (error) {
        console.error('Error updating profile picture:', error);
        res.status(500).json({ message: 'Failed to update profile picture', error: error.message });
    }
};



export const addToWishlist = async (req, res) => {
    try {
        const { movieId } = req.body;  // Use movieId here
        console.log(movieId);
        // Find the movie by its custom movieId
        const movie = await Movie.findOne({ movieId });  // Use movieId here
        if (!movie) {
            return res.status(404).json({ message: 'Movie not found' });
        }
        console.log('user', req.user.id)
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Check if the movie is already in the wishlist
        if (!user.wishlist.includes(movie._id)) {  // Use movie._id here to add to wishlist
            user.wishlist.push(movie._id);
            await user.save();
        }
        // Send the updated user data back in the response
        res.status(200).json({
            message: 'Movie added to wishlist',
            updatedUser: user  // Include the updated user data
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error, message: 'Something went wrong' });
    }
};




export const removeFromWishlist = async (req, res) => {
    try {
        const { movieId } = req.body; // Use movieId here
        //console.log(movieId);
        // Find the movie by its custom movieId
        const movie = await Movie.findOne({ movieId }); // Use movieId here
        if (!movie) {
            return res.status(404).json({ message: 'Movie not found' });
        }
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Check if the movie is in the wishlist
        const index = user.wishlist.indexOf(movie._id); // Use movie._id here to remove from wishlist
        if (index > -1) {
            user.wishlist.splice(index, 1); // Remove the movie from the wishlist
            await user.save();
        } else {
            return res.status(400).json({ message: 'Movie is not in the wishlist' });
        }
        // Send the updated user data back in the response
        res.status(200).json({
            message: 'Movie removed from wishlist',
            updatedUser: user // Include the updated user data
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error, message: 'Something went wrong' });
    }
};


export const addToCart = async (req, res) => {
    try {
        const { movieId } = req.body;

        // Find the movie by its custom movieId
        const movie = await Movie.findOne({ movieId });
        if (!movie) {
            return res.status(404).json({ message: 'Movie not found' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the movie is already in the cart
        if (!user.cart.includes(movie._id)) {
            user.cart.push(movie._id);
            await user.save();
        }

        // Send the updated user data back in the response
        res.status(200).json({
            message: 'Movie added to cart',
            updatedUser: user,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error, message: 'Something went wrong' });
    }
};

export const removeFromCart = async (req, res) => {
    try {
        const { movieIds } = req.body;
        console.log(movieIds);
        // Ensure movieIds is an array
        if (!Array.isArray(movieIds)) {
            return res.status(400).json({ message: 'movieIds must be an array' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find all valid movies from the provided IDs
        const movies = await Movie.find({
            _id: { $in: movieIds }
        });

        if (movies.length === 0) {
            return res.status(404).json({ message: 'No valid movies found' });
        }

        // Get the movie IDs as strings for comparison
        const validMovieIds = movies.map(movie => movie._id.toString());

        // Filter out the valid movie IDs from the user's cart
        user.cart = user.cart.filter(cartItemId =>
            !validMovieIds.includes(cartItemId.toString())
        );

        await user.save();

        // Send the updated user data back in the response
        res.status(200).json({
            message: 'Movies removed from cart',
            updatedUser: user,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error, message: 'Something went wrong' });
    }
};
export const checkAndUpdatePurchasedMovies = async (req, res) => {
    // console.log(req.body)
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            message: 'No new movies added to your purchased list.',
            user: user,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};


export const getPurchasedMovies = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('purchasedMovies');
        res.status(200).json(user.purchasedMovies);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const getWatchHistory = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('watchHistory.movie');
        res.status(200).json(user.watchHistory);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const addToWatchHistory = async (req, res) => {
    try {
        const { movieId } = req.body;
        const user = await User.findById(req.user.id);
        const existingEntry = user.watchHistory.find(entry => entry.movie.toString() === movieId);
        if (existingEntry) {
            existingEntry.lastWatched = new Date();
        } else {
            user.watchHistory.push({ movie: movieId, lastWatched: new Date() });
        }
        await user.save();
        res.status(200).json({ message: 'Watch history updated' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};






export const toggleUserStatus = async (req, res) => {
    const { userId } = req.params; // Extract movieId from request parameters
    console.log('Received request for userId:', req.params.userId); // Add logging
    try {
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Toggle the isActive status
        user.isActive = !user.isActive;
        await user.save();
        return res.status(200).json({ message: 'User status updated successfully', user });
    } catch (error) {
        console.error('Error in toggleUserStatus:', error); // Add logging
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};
