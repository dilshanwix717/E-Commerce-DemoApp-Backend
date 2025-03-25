import Movie from '../models/Movie.js';
import User from '../models/User.js';


export const createMovie = async (req, res) => {
    try {
        const { title, year, genres, description, language, videoLink, trailerLink, price } = req.body;
        const movie = new Movie({
            title,
            year,
            genres,
            description,
            language,
            videoLink,
            trailerLink,
            price
        });

        await movie.save();
        res.status(201).json(movie);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const updateMovie = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedMovie = await Movie.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedMovie) {
            return res.status(404).json({ message: 'Movie not found' });
        }
        res.status(200).json(updatedMovie);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const deleteMovie = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedMovie = await Movie.findByIdAndDelete(id);
        if (!deletedMovie) {
            return res.status(404).json({ message: 'Movie not found' });
        }
        res.status(200).json({ message: 'Movie deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        // Retrieve users and populate the 'purchasedMovies' with movie data
        const users = await User.find()
            .select('-password') // Exclude passwords
            .populate('purchasedMovies', 'movieId title'); // Populate 'movieId' and 'title' of purchased movies

        // Map the purchasedMovies to show movieId and title instead of the whole movie object
        const result = users.map((user) => {
            return {
                ...user.toObject(), // Convert the mongoose document to plain object
                purchasedMovies: user.purchasedMovies.map((movie) => ({
                    movieId: movie.movieId,
                    title: movie.title
                }))
            };
        });

        res.status(200).json(result); // Send back the transformed data
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};


export const getAllAdmins = async (req, res) => {
    try {
        const admins = await User.find({ isAdmin: true }).select('-password'); // Exclude passwords
        res.status(200).json(admins);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const getAllNonAdmins = async (req, res) => {
    try {
        const nonAdmins = await User.find({ isAdmin: false }).select('-password'); // Exclude passwords
        res.status(200).json(nonAdmins);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

