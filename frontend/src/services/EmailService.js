import axios from 'axios';

const sendEmail = async (to, subject, body, redirectUrl) => {
    try {
        const response = await axios.post('http://localhost:5000/send_email', {
            to,
            subject,
            body,
            redirect_url: redirectUrl
        });
        return response.data;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
};

export default sendEmail;