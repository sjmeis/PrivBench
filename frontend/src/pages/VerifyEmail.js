import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/joy';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const VerifyEmail = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying');

    useEffect(() => {
        const verify = async () => {
            try {
                await axios.get(`${API_BASE_URL}/auth/verify-email/${token}`);
                navigate('/login', { state: { verified: true } });
            } catch (err) {
                setStatus('error');
            }
        };
        verify();
    }, [token, navigate]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10 }}>
            {status === 'verifying' ? (
                <>
                    <CircularProgress size="lg" />
                    <Typography level="h4" sx={{ mt: 2 }}>Verifying your account...</Typography>
                </>
            ) : (
                <Typography level="h4" color="danger">Verification failed. The link may be expired.</Typography>
            )}
        </Box>
    );
};

export default VerifyEmail;