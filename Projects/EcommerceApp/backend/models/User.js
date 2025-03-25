import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema({
    firebaseUid: { type: String, required: true },
    userId: { type: String, unique: true, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    contact: { type: String },
    password: { type: String, required: false },
    profilePicture: {
        url: { type: String },
        publicId: { type: String }
    },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
    cart: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
    purchasedMovies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
    watchHistory: [{
        movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
        lastWatched: Date
    }],
    isAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true } // Added isActive field
}, { timestamps: true });

export default mongoose.model('User', userSchema);
