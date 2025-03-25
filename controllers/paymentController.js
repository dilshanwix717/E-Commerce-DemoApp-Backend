import dotenv from 'dotenv';
dotenv.config();
import Stripe from 'stripe';
import User from '../models/User.js';
import Movie from '../models/Movie.js';
import Payment from '../models/Payment.js';
import { sendPurchaseConfirmationEmail } from '../controllers/emailController.js';

const stripe = Stripe(process.env.STRIPE_SECRET_KEY)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;



export const stripeCheckoutSession = async (req, res) => {
    try {
        const { movieIds } = req.body;
        // console.log(movieIds);
        // Fetch all movies based on the provided IDs
        const movies = await Movie.find({
            _id: { $in: movieIds }
        });

        if (!movies.length) {
            return res.status(404).json({
                error: 'No movies found with the provided IDs'
            });
        }

        // Create line items for each movie
        const lineItems = movies.map(movie => ({

            price_data: {
                currency: 'lkr',
                product_data: {
                    name: movie.title,
                    description: `${movie.year} • ${movie.duration}`,
                    // Optional: Add movie image as product image
                    images: [movie.portraitImage.url]
                },
                unit_amount: Math.round(movie.price * 100),

            },
            quantity: 1,

        }));

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            line_items: lineItems,
            mode: 'payment',
            success_url: `${process.env.WEB_URL}/checkout-success`,
            cancel_url: `${process.env.WEB_URL}/cart`,
            metadata: {
                movieIds: JSON.stringify(movieIds), // Store movieIds for reference
                userId: req.user.id, // Pass the authenticated user's ID
            }
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({
            error: 'Failed to create checkout session'
        });
    }
};


// Stripe webhook handler
export const stripeWebhook = async (req, res) => {
    console.log('webhook')
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log('Stripe session received:', session);

        try {
            const movieIds = JSON.parse(session.metadata.movieIds);
            const userId = session.metadata.userId;

            // Fetch user and movies
            const user = await User.findById(userId);
            if (!user) {
                console.error('User not found');
                return res.status(404).send('User not found');
            }

            // Process purchased movies
            const purchasedMovies = movieIds.filter(id => !user.purchasedMovies.includes(id));
            if (purchasedMovies.length > 0) {
                user.purchasedMovies.push(...purchasedMovies);
                user.cart = user.cart.filter(cartItemId => !movieIds.includes(cartItemId.toString()));
                user.wishlist = user.wishlist.filter(wishlistItemId => !movieIds.includes(wishlistItemId.toString()));

                await user.save();
                console.log('User updated with purchased movies.');
            }

            // Save payment record
            const payment = new Payment({
                user: user._id,
                movie: purchasedMovies,
                amount: session.amount_total / 100,
                stripePaymentId: session.payment_intent,
                status: 'completed',
            });
            await payment.save();
            console.log('Payment saved successfully.');

            // Send purchase confirmation email
            try {
                const emailData = {
                    user: {
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName
                    },
                    movieIds: purchasedMovies,
                    session: {
                        amount_total: session.amount_total,
                        payment_intent: session.payment_intent
                    }
                };

                await sendPurchaseConfirmationEmail({
                    body: emailData
                }, {
                    status: () => ({
                        json: () => { }
                    })
                });

                console.log('Purchase confirmation email sent successfully.');
            } catch (emailError) {
                console.error('Error sending purchase confirmation email:', emailError);
                // Don't throw error here to avoid affecting the webhook response
            }
        } catch (err) {
            console.error('Error processing session:', err.message);
        }
    }

    res.status(200).send('Webhook received.');
};


export const getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('user', 'userId firstName lastName email') // Populate user details
            .populate('movie', 'movieId title price') // Populate movie details
            .sort({ createdAt: -1 }); // Sort by the most recent payments

        // Transforming data to include purchasedMovies array
        const transformedPayments = payments.map(payment => ({
            _id: payment._id,
            userId: payment.user?.userId || 'Unknown User', // Use `userId` from User schema
            userName: payment.user ? `${payment.user.firstName} ${payment.user.lastName || ''}`.trim() : 'Unknown User',
            purchasedMovies: payment.movie.map(movie => ({
                movieId: movie.movieId || 'Unknown Movie',
                title: movie.title || 'Unknown Title',
            })),
            amount: payment.amount,
            stripePaymentId: payment.stripePaymentId,
            status: payment.status,
            date: payment.createdAt
        }));

        res.json(transformedPayments);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({
            error: 'Failed to fetch payments',
        });
    }
};


// In paymentController.js
export const getPaymentById = async (req, res) => {
    const { id } = req.params;

    try {
        const payment = await Payment.findById(id)
            .populate('user', 'name email') // Optionally populate the user details
            .populate('movie', 'title price'); // Optionally populate the movie details

        if (!payment) {
            return res.status(404).json({
                error: 'Payment not found'
            });
        }

        res.json(payment);
    } catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).json({
            error: 'Failed to fetch payment'
        });
    }
};

