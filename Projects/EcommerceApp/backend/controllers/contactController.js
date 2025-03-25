import ContactMessage from '../models/ContactMessage.js';

export const createContactMessage = async (req, res) => {
    try {
        const { name, email, message } = req.body;
        const contactMessage = new ContactMessage({ name, email, message });

        await contactMessage.save();

        res.status(200).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error saving contact message:', error);
        res.status(500).json({ error: 'Failed to send message. Please try again later.' });
    }
};

export const getAllContactMessages = async (req, res) => {
    try {
        const messages = await ContactMessage.find().sort({ createdAt: -1 });
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching contact messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages.' });
    }
};
