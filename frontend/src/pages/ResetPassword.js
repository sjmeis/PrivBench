import React, { useState } from 'react';
import { 
    Box, Button, FormControl, FormLabel, Input, 
    Typography, Stack, Card, Divider, IconButton, FormHelperText 
} from '@mui/joy';
import { useParams, useNavigate } from 'react-router-dom';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import axios from 'axios';
import { useSnackbar } from '../contexts/SnackbarProvider';
import { API_BASE_URL } from '../config';

const ResetPassword = () => {
    const { token } = useParams(); // Grabs the JWT from the URL
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();

    const [passwords, setPasswords] = useState({
        newPassword: "",
        confirmPassword: ""
    });
    const [showPasswords, setShowPasswords] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const isNewPasswordSecure = (pwd) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pwd);

    const handleInputChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        
        const trimmedPassword = passwords.newPassword.trim();

        // 1. Validation
        if (!isNewPasswordSecure(trimmedPassword)) {
            showSnackbar("Password does not meet requirements.", "error");
            return;
        }

        if (trimmedPassword !== passwords.confirmPassword.trim()) {
            showSnackbar("Passwords do not match.", "error");
            return;
        }

        setIsLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/auth/reset-password`, { 
                token, 
                newPassword: trimmedPassword 
            });
            
            setIsSuccess(true);
            showSnackbar("Password reset successful!", "success");
            
            // Redirect to login after 3 seconds
            setTimeout(() => navigate('/login'), 3000);
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Link expired or invalid.";
            showSnackbar(errorMsg, "error");
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
                <Card sx={{ maxWidth: 400, textAlign: 'center', p: 4 }}>
                    <CheckCircleOutlineIcon color="success" sx={{ fontSize: 60, mx: 'auto', mb: 2 }} />
                    <Typography level="h4">All set!</Typography>
                    <Typography sx={{ mt: 1, mb: 3 }}>
                        Your password has been changed. You are being redirected to the login page.
                    </Typography>
                    <Button onClick={() => navigate('/login')}>Go to Login Now</Button>
                </Card>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', px: 2 }}>
            <Card sx={{ width: '100%', maxWidth: 400, boxShadow: 'lg' }}>
                <Typography level="h3" component="h1">Reset Password</Typography>
                <Typography level="body-sm" sx={{ mb: 2 }}>
                    Please choose a strong new password for your account.
                </Typography>
                <Divider />

                <form onSubmit={handleResetSubmit}>
                    <Stack spacing={2.5} sx={{ mt: 2 }}>
                        {/* New Password */}
                        <FormControl error={passwords.newPassword.length > 0 && !isNewPasswordSecure(passwords.newPassword)}>
                            <FormLabel>New Password</FormLabel>
                            <Input
                                type={showPasswords ? "text" : "password"}
                                name="newPassword"
                                startDecorator={<LockRoundedIcon />}
                                value={passwords.newPassword}
                                onChange={handleInputChange}
                                endDecorator={
                                    <IconButton onClick={() => setShowPasswords(!showPasswords)}>
                                        {showPasswords ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                }
                            />
                            <FormHelperText sx={{ fontSize: 'xs' }}>
                                <InfoOutlined sx={{ fontSize: 'sm' }} />
                                At least 8 characters, with 1 letter and 1 number.
                            </FormHelperText>
                        </FormControl>

                        {/* Confirm Password */}
                        <FormControl error={passwords.confirmPassword.length > 0 && passwords.newPassword !== passwords.confirmPassword}>
                            <FormLabel>Confirm Password</FormLabel>
                            <Input
                                type={showPasswords ? "text" : "password"}
                                name="confirmPassword"
                                startDecorator={<LockRoundedIcon />}
                                value={passwords.confirmPassword}
                                onChange={handleInputChange}
                            />
                            {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                                <FormHelperText color="danger">Passwords do not match.</FormHelperText>
                            )}
                        </FormControl>

                        <Button 
                            type="submit" 
                            fullWidth 
                            loading={isLoading}
                            disabled={!isNewPasswordSecure(passwords.newPassword) || passwords.newPassword !== passwords.confirmPassword}
                        >
                            Reset Password
                        </Button>
                    </Stack>
                </form>
            </Card>
        </Box>
    );
};

export default ResetPassword;