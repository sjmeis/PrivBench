import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Typography,
    FormControl,
    FormLabel,
    Input,
    Button,
    Alert,
    Stack,
    Divider
} from "@mui/joy";
import {Login as LoginIcon, PersonAdd} from "@mui/icons-material";
import { useAuth } from '../contexts/AuthContext';
import Footer from "../components/shared/Footer";

const Login = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const from = location.state?.from?.pathname || "/";

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(formData);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                maxWidth: 400,
                mx: 'auto',
                my: 4,
                py: 3,
                px: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 'sm',
                mt: "auto",
            }}
        >
            <Typography level="h4" component="h1" sx={{ mb: 2 }}>
                Login to PrivBench
            </Typography>

            {error && (
                <Alert
                    variant="soft"
                    color="danger"
                    sx={{ mb: 2, width: '100%' }}
                >
                    {error}
                </Alert>
            )}

            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <Stack spacing={2} sx={{ width: '100%' }}>
                    <FormControl required>
                        <FormLabel>Username</FormLabel>
                        <Input
                            name="username"
                            type="text"
                            value={formData.username}
                            onChange={handleInputChange}
                            autoComplete="username"
                        />
                    </FormControl>

                    <FormControl required>
                        <FormLabel>Password</FormLabel>
                        <Input
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            autoComplete="current-password"
                        />
                    </FormControl>

                    <Button
                        type="submit"
                        loading={isLoading}
                        loadingPosition="center"
                        endDecorator={<LoginIcon />}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </Button>

                    <Divider>or</Divider>

                    <Button
                        variant="outlined"
                        color="neutral"
                        onClick={() => navigate('/register')}
                        endDecorator={<PersonAdd />}
                    >
                        Create new account
                    </Button>
                </Stack>
            </form>
            <Footer />
        </Box>
    );
};

export default Login;