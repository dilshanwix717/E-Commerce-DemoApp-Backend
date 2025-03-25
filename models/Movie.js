import mongoose from 'mongoose';
const { Schema } = mongoose;

const movieSchema = new Schema({
    movieId: { type: String, unique: true, required: true },
    title: { type: String, required: true },
    year: { type: Number, required: true },
    genres: [{ type: String, required: true }],
    description: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isUpcoming: { type: Boolean, default: true },
    duration: { type: String, required: true },
    videoLink: { type: String, required: true },
    trailerLink: { type: String, required: false },
    price: { type: Number, required: true },
    portraitImage: {
        url: { type: String, required: true },
        publicId: { type: String, required: true }
    },
    landscapeImage: {
        url: { type: String, required: true },
        publicId: { type: String, required: true }
    }
}, { timestamps: true });

// Pre-save hook to generate custom movieId
movieSchema.pre('save', async function (next) {
    if (this.isNew) {
        const lastMovie = await mongoose.model('Movie').findOne().sort({ createdAt: -1 });
        const lastMovieID = lastMovie ? parseInt(lastMovie.movieId.split('-')[1]) : 0;
        this.movieId = `MID-${lastMovieID + 1}`;
    }
    next();
});

export default mongoose.model('Movie', movieSchema);