import dotenv from 'dotenv';
dotenv.config();
import nodemailer from 'nodemailer';


export const sendEmail = async (to, subject, html, body, attachments) => {
    // let transporter = nodemailer.createTransport({
    //     host: 'giow1107.siteground.us', // Replace with Outgoing Server value
    //     port: 465,                    // Use port 465 for SSL
    //     secure: true,                 // True for SSL
    //     auth: {
    //         user: process.env.EMAIL_USER,  // Your SiteGround email address
    //         pass: process.env.APP_PASSWORD, // Your SiteGround email password
    //     },
    // });
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.APP_PASSWORD,
        },
    });
    let mailOptions = {
        from: process.env.EMAIL_USER,  // Your SiteGround email address
        to: to,
        subject: subject,
        html: html,
        body: body,
        attachments: attachments,
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        return { success: true, info: info };
    } catch (error) {
        return { success: false, error: error };
    }
};
