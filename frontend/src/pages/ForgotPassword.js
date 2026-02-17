import React, { useState } from 'react';
import { 
    Box, Button, FormControl, FormLabel, Input, 
    Typography, Stack, Card, Divider, Link 
} from '@mui/joy';
import IconButton from "@mui/joy/IconButton";
import { Link as RouterLink } from 'react-router-dom';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import axios from 'axios';
import { useSnackbar } from '../contexts/SnackbarProvider';
import { API_BASE_URL } from '../config';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const { showSnackbar } = useSnackbar();

    const handleRequestReset = async (e) => {
        e.preventDefault();
        const trimmedEmail = email.trim();

        if (!trimmedEmail) {
            showSnackbar("Please enter your email address.", "error");
            return;
        }

        setIsLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email: trimmedEmail });
            
            // We show success even if the email doesn't exist (security best practice)
            setIsSent(true);
            showSnackbar("Check your inbox for reset instructions.", "success");
        } catch (error) {
            showSnackbar(error.response?.data?.message || "Something went wrong. Please try again.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '80vh',
            px: 2 
        }}>
            <Card sx={{ width: '100%', maxWidth: 400, boxShadow: 'lg', p: 4 }}>
                <Stack spacing={2} sx={{ mb: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <IconButton 
                            component={RouterLink} 
                            to="/login" 
                            variant="plain" 
                            size="sm"
                        >
                            <ArrowBackIosNewIcon sx={{ fontSize: 'sm' }} />
                        </IconButton>
                        <Typography level="h3" component="h1">
                            Forgot Password?
                        </Typography>
                    </Stack>
                    <Typography level="body-md">
                        {isSent 
                            ? "We've sent a recovery link to your email address." 
                            : "Enter your email and we'll send you a link to reset your password."}
                    </Typography>
                </Stack>
                
                <Divider />

                {!isSent ? (
                    <form onSubmit={handleRequestReset}>
                        <Stack spacing={3} sx={{ mt: 2 }}>
                            <FormControl required>
                                <FormLabel>Email Address</FormLabel>
                                <Input
                                    type="email"
                                    placeholder="your@email.com"
                                    startDecorator={<EmailRoundedIcon />}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoFocus
                                />
                            </FormControl>
                            <Button 
                                type="submit" 
                                fullWidth 
                                loading={isLoading}
                            >
                                Send Reset Link
                            </Button>
                        </Stack>
                    </form>
                ) : (
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        <Typography level="body-sm" color="neutral">
                            Didn't receive the email? Check your spam folder or try again in a few minutes.
                        </Typography>
                        <Button 
                            variant="outlined" 
                            color="neutral" 
                            onClick={() => setIsSent(false)}
                        >
                            Try another email
                        </Button>
                    </Stack>
                )}

                <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Typography level="body-sm">
                        Remember your password?{' '}
                        <Link component={RouterLink} to="/login" fontWeight="lg">
                            Log in
                        </Link>
                    </Typography>
                </Box>
            </Card>
        </Box>
    );
};

export default ForgotPassword;