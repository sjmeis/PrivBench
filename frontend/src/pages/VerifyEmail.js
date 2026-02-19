import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/joy';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useSnackbar } from '../contexts/SnackbarProvider';

const VerifyEmail = () => {
    const { token: paramToken } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying');
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        const pathParts = location.pathname.split('/');
        const manualToken = pathParts[pathParts.length - 1];
        const token = paramToken || manualToken;

        const verify = async () => {
            if (!token || token === 'verify-email') {
                console.error("No token found in URL");
                setStatus('error');
                return;
            }

            try {
                await axios.get(`${API_BASE_URL}/verify-email/${token}`);
                showSnackbar("Account verified! You can now log in.", "success");
                navigate('/login', { state: { verified: true } });
            } catch (err) {
                console.error("Verification error:", err);
                setStatus('error');
            }
        };
        verify();
    }, [paramToken, location, navigate]);

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