import axios from 'axios';

const sendEmail = async (to, subject, body, redirectUrl) => {
    try {
        await axios.post('http://localhost:5000/send_email', {
            to,
            subject,
            body,
            redirect_url: redirectUrl,
        });
        console.log('Email sent successfully to:', to);
    } catch (error) {
        console.error('Error sending email to:', to, error.message);
    }
};

export default sendEmail;
