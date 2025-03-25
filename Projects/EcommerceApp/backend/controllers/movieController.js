import Movie from '../models/Movie.js';
import firebaseStorage from '../utils/firebaseStorage.js';

export const createMovie = async (req, res) => {
    try {
        const {
            title,
            year,
            genres,
            description,
            duration,
            videoLink,
            trailerLink,
            price,
            isUpcoming
        } = req.body;

        // Ensure required fields are present
        if (!req.files?.portraitImage || !req.files?.landscapeImage) {
            return res.status(400).json({
                message: 'Both portrait and landscape images are required'
            });
        }

        if (!title || !year || !genres || !description || !duration || !videoLink || !trailerLink || !price) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Parse genres string into an array
        const genresArray = JSON.parse(genres);

        // Generate movieId
        const lastMovie = await Movie.findOne().sort({ createdAt: -1 });
        const lastMovieID = lastMovie ? parseInt(lastMovie.movieId.split('-')[1]) : 0;
        const movieId = `MID-${lastMovieID + 1}`;

        // Upload images to Firebase Storage
        const portraitUpload = await firebaseStorage.uploadImage(
            req.files.portraitImage[0],
            `movies/${movieId}`,
            `${movieId}_portrait`
        );
        const landscapeUpload = await firebaseStorage.uploadImage(
            req.files.landscapeImage[0],
            `movies/${movieId}`,
            `${movieId}_landscape`
        );

        // Create new movie
        const newMovie = new Movie({
            movieId,
            title,
            year,
            genres: genresArray, // Use the parsed array here
            description,
            duration,
            videoLink,
            trailerLink,
            price,
            isUpcoming,
            portraitImage: {
                url: portraitUpload.url,
                publicId: portraitUpload.path
            },
            landscapeImage: {
                url: landscapeUpload.url,
                publicId: landscapeUpload.path
            }
        });

        // Save movie to the database
        await newMovie.save();
        res.status(201).json(newMovie);
    } catch (error) {
        console.error('Movie Creation Error:', error);
        res.status(500).json({ message: 'Failed to create movie', error: error.message });
    }
};


export const updateMovie = async (req, res) => {
    try {
        const { movieId } = req.params;
        const { title, year, genres, description, duration, videoLink, trailerLink, price, isUpcoming, isActive } = req.body;

        if (!title || !year || !genres || !description || !duration || !videoLink || !trailerLink || !price) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const movie = await Movie.findOne({ movieId });
        if (!movie) {
            return res.status(404).json({ message: 'Movie not found' });
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

        if (req.files?.portraitImage?.length > 0) {
            if (await imageExists(movie.portraitImage.publicId)) {
                await firebaseStorage.deleteImage(movie.portraitImage.publicId);
            }
            const portraitUpload = await firebaseStorage.uploadImage(
                req.files.portraitImage[0],
                `movies/${movieId}`,
                `${movieId}_portrait`
            );
            movie.portraitImage = {
                url: portraitUpload.url,
                publicId: portraitUpload.path
            };
        }

        if (req.files?.landscapeImage?.length > 0) {
            if (await imageExists(movie.landscapeImage.publicId)) {
                await firebaseStorage.deleteImage(movie.landscapeImage.publicId);
            }
            const landscapeUpload = await firebaseStorage.uploadImage(
                req.files.landscapeImage[0],
                `movies/${movieId}`,
                `${movieId}_landscape`
            );
            movie.landscapeImage = {
                url: landscapeUpload.url,
                publicId: landscapeUpload.path
            };
        }

        // Parse genres string into an array
        const genresArray = JSON.parse(genres);

        movie.title = title;
        movie.year = year;
        movie.genres = genresArray;
        movie.description = description;
        movie.duration = duration;
        movie.videoLink = videoLink;
        movie.trailerLink = trailerLink;
        movie.price = price;
        movie.isUpcoming = isUpcoming !== undefined ? isUpcoming : movie.isUpcoming;
        movie.isActive = isActive !== undefined ? isActive : movie.isActive;

        await movie.save();
        res.status(200).json(movie);
    } catch (error) {
        if (error.portraitPublicId) {
            await firebaseStorage.deleteImage(error.portraitPublicId);
        }
        if (error.landscapePublicId) {
            await firebaseStorage.deleteImage(error.landscapePublicId);
        }
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};



export const toggleMovieStatus = async (req, res) => {
    const { movieId } = req.params; // Extract movieId from request parameters

    try {
        // Find the movie by movieId
        const movie = await Movie.findOne({ movieId });

        // If movie not found, return a 404 error
        if (!movie) {
            return res.status(404).json({ message: 'Movie not found' });
        }

        // Toggle the isActive status
        movie.isActive = !movie.isActive;

        // Save the updated movie
        await movie.save();

        // Return the updated movie
        return res.status(200).json({ message: 'Movie status updated successfully', movie });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};


export const getAllMovies = async (req, res) => {
    try {
        const movies = await Movie.find();
        res.status(200).json(movies);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const getActiveMovies = async (req, res) => {
    try {
        const activeMovies = await Movie.find({ isActive: true }); // Fetch movies where isActive is true
        res.status(200).json(activeMovies);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};


export const getMovie = async (req, res) => {
    try {
        const movie = await Movie.findOne({ movieId: req.params.id }); // Query by movieId
        if (!movie) {
            return res.status(404).json({ message: 'Movie not found' });
        }
        res.status(200).json(movie);
    } catch (error) {
        console.error('Error fetching movie:', error); // Log the error for debugging
        res.status(500).json({ message: 'Something went wrong' });
    }
};


export const getMoviePurchaseCounts = async (req, res) => {

    try {
        const purchaseCounts = await Payment.aggregate([
            // Unwind the movie array to get individual movie references
            { $unwind: "$movie" },
            // Only count completed payments
            { $match: { status: "completed" } },
            // Group by movie and count occurrences
            {
                $group: {
                    _id: "$movie",
                    count: { $sum: 1 }
                }
            },
            // Lookup movie details to get movieId
            {
                $lookup: {
                    from: "movies",
                    localField: "_id",
                    foreignField: "_id",
                    as: "movieDetails"
                }
            },
            // Unwind movie details
            { $unwind: "$movieDetails" },
            // Project final format
            {
                $project: {
                    _id: 0,
                    movieId: "$movieDetails.movieId",
                    count: 1
                }
            }
        ]);

        // Convert array to object with movieId as key
        const countsObject = purchaseCounts.reduce((acc, curr) => {
            acc[curr.movieId] = curr.count;
            return acc;
        }, {});

        res.status(200).json(countsObject);
    } catch (error) {
        console.error('Error getting movie purchase counts:', error);
        res.status(500).json({ message: 'Failed to get purchase counts' });
    }
};


export const getMoviesByGenre = async (req, res) => {
    try {
        const movies = await Movie.find({ genres: req.params.genre });
        res.status(200).json(movies);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const getUpcomingMovies = async (req, res) => {
    try {
        const movies = await Movie.find({ isUpcoming: true });
        res.status(200).json(movies);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};


