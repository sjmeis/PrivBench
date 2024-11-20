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
    Stack
} from "@mui/joy";
import { useAuth } from '../contexts/AuthContext';

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
    
    // Get the page user tried to visit or default to home
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
            await login(formData.username, formData.password);
            // Navigate to the page user tried to visit or home
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
                        sx={{ mt: 2 }}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </Button>
                </Stack>
            </form>
        </Box>
    );
};

export default Login;