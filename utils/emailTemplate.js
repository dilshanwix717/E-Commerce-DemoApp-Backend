import dotenv from 'dotenv';
dotenv.config();
const createPurchaseConfirmationEmail = (userData, movies, session) => {
    const moviesHtml = movies.map(movie => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                <strong>${movie.title} (${movie.year})</strong><br>
                <span style="color: #888; font-size: 0.9em;">ID: ${movie.movieId}</span>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
                LKR ${movie.price.toFixed(2)}
            </td>
        </tr>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; color: #333; }
                .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
                .header { background-color: #CA168C; color: white; padding: 20px; text-align: center; }
                .header img { max-width: 150px; margin-bottom: 10px; }
                .content { padding: 20px; }
                .order-details { background: #F8E1EC; padding: 15px; border-radius: 5px; }
                .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .total-row { font-weight: bold; background: #F8E1EC; }
                .footer { background: #CA168C; color: white; text-align: center; padding: 15px; font-size: 14px; }
                .button { display: inline-block; padding: 10px 20px; margin-top: 15px; background: #CA168C; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
                .button:hover { background: #B0137A; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                 
                    <h2>Purchase Confirmation</h2>
                </div>
                <div class="content">
                    <p>Dear ${userData.firstName},</p>
                    <p>Thank you for your purchase! Your transaction has been successfully completed.</p>
                    
                    <div class="order-details">
                        <p><strong>Order ID:</strong> ${session.payment_intent}</p>
                        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                    </div>

                    <h3>Purchase Details:</h3>
                    <table class="table">
                        <thead>
                            <tr>
                                <th style="padding: 12px; text-align: left;">Movie Details</th>
                                <th style="padding: 12px; text-align: right;">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${moviesHtml}
                            <tr class="total-row">
                                <td style="padding: 12px; border-top: 2px solid #CA168C;">
                                    <strong>Total (${movies.length} movies)</strong>
                                </td>
                                <td style="padding: 12px; border-top: 2px solid #CA168C; text-align: right;">
                                    <strong>LKR ${(session.amount_total / 100).toFixed(2)}</strong>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <p>You can now access your purchased movies in your library. Simply log in to your account to start watching.</p>
                    <p>If you have any questions about your purchase, please contact our support team.</p>
                    <p>Best regards,<br><strong>Home Cinema Team</strong></p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} Home Cinema. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};

export { createPurchaseConfirmationEmail };
