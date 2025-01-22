import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    Button,
    IconButton,
    Sheet,
    Grid,
    AspectRatio
} from "@mui/joy";
import { useTheme } from "@mui/joy";
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LockIcon from '@mui/icons-material/Lock';
import SpeedIcon from '@mui/icons-material/Speed';
import StorageIcon from '@mui/icons-material/Storage';
import SecurityIcon from '@mui/icons-material/Security';
import {useNavigate} from "react-router-dom";
import Footer from "../components/shared/Footer";

const Home = () => {
    const [scrolled, setScrolled] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const theme = useTheme();
    const navigate = useNavigate();
    const isLightMode = theme.palette.mode === 'light';

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setActiveIndex((current) => (current + 1) % 3);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const highlights = [
        {
            title: "Privacy-First Benchmarking",
            description: "Evaluate your text privatization methods securely and confidentially"
        },
        {
            title: "Comprehensive Metrics",
            description: "Get detailed insights across multiple privacy dimensions"
        },
        {
            title: "Active Community",
            description: "Join researchers pushing the boundaries of text privacy"
        }
    ];

    const features = [
        {
            icon: <LockIcon sx={{ fontSize: 32 }} />,
            title: "Privacy-First Architecture",
            description: "State-of-the-art privacy preservation with end-to-end encryption and secure data handling"
        },
        {
            icon: <SpeedIcon sx={{ fontSize: 32 }} />,
            title: "Real-time Analysis",
            description: "Get instant feedback on your privacy methods with comprehensive metrics and benchmarks"
        },
        {
            icon: <StorageIcon sx={{ fontSize: 32 }} />,
            title: "Scalable Infrastructure",
            description: "Handle large-scale datasets with our distributed computing infrastructure"
        },
        {
            icon: <SecurityIcon sx={{ fontSize: 32 }} />,
            title: "Advanced Security",
            description: "Enterprise-grade security protocols ensuring your data remains protected"
        }
    ];

    return (
        <Sheet
            sx={{
                marginTop: '-10px',
                marginRight: '-40px',
                marginLeft: '-40px',
                marginBottom: '-40px',
                minHeight: '100vh',
                bgcolor: 'background.body',
                background: isLightMode
                    ? 'linear-gradient(to bottom, #ffffff, #f5f5f5)'
                    : 'linear-gradient(to bottom, var(--joy-palette-neutral-900), var(--joy-palette-neutral-800))',
            }}
        >
            {/* Hero Section */}
            <Box sx={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Background Image with Parallax Effect */}
                <Box
                sx={{
                    position: 'fixed', 
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0, 
                    opacity: 0.2,
                    '&::before': {
                        content: '""',
                        position: 'fixed', 
                        inset: 0,
                        backgroundImage: 'url(/images/background.jpg)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundAttachment: 'fixed', 
                        transform: 'scale(1.1)',
                        filter: 'blur(5px)',
                        height: '100vh',
                        width: '100vw', 
                    }
                }}
            />
                <Box sx={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.2,
                }}>
                    <Box sx={{
                        position: 'absolute',
                        inset: 0,
                        background: isLightMode
                            ? 'linear-gradient(to right, #bbdefb, #64b5f6)'
                            : 'linear-gradient(to right, var(--joy-palette-primary-500), var(--joy-palette-primary-600))',
                        animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                            '0%, 100%': { opacity: 0.5 },
                            '50%': { opacity: 0.7 }
                        }
                    }} />
                    <Box sx={{
                        position: 'absolute',
                        inset: 0,
                        background: isLightMode
                            ? 'radial-gradient(circle 500px at 50% 50%, transparent, #e3f2fd)'
                            : 'radial-gradient(circle 500px at 50% 50%, transparent, #000)'
                    }} />
                </Box>

                <Box sx={{
                    textAlign: 'center',
                    zIndex: 1,
                    p: 4,
                    maxWidth: '4xl'
                }}>
                    <Typography
                        level="h1"
                        sx={{
                            fontSize: { xs: '2.5rem', md: '4rem' },
                            mb: 2,
                            background: 'linear-gradient(to right, var(--joy-palette-primary-300), var(--joy-palette-primary-400))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            animation: 'fadeIn 1s ease-out',
                            '@keyframes fadeIn': {
                                from: { opacity: 0, transform: 'translateY(20px)' },
                                to: { opacity: 1, transform: 'translateY(0)' }
                            }
                        }}
                    >
                        PrivBench
                    </Typography>

                    <Typography
                        level="h3"
                        sx={{
                            mb: 4,
                            color: isLightMode ? 'text.secondary' : 'neutral.300',
                            animation: 'fadeIn 1s ease-out 0.3s backwards'
                        }}
                    >
                        The Premier Platform for Text Privacy Benchmarking
                    </Typography>

                    <Box sx={{ height: '100px', position: 'relative', mt: 4 }}>
                        {highlights.map((highlight, idx) => (
                            <Box
                                key={idx}
                                sx={{
                                    position: 'absolute',
                                    width: '100%',
                                    transition: 'all 0.5s ease',
                                    opacity: idx === activeIndex ? 1 : 0,
                                    transform: `translateY(${idx === activeIndex ? 0 : '20px'})`
                                }}
                            >
                                <Typography level="h4" sx={{ mb: 1, color: isLightMode ? 'primary.main' : 'primary.400' }}>
                                    {highlight.title}
                                </Typography>
                                <Typography sx={{ color: isLightMode ? 'text.primary' : 'neutral.300' }}>
                                    {highlight.description}
                                </Typography>
                            </Box>
                        ))}
                    </Box>

                    <Box sx={{ mt: 8, display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <Button
                            size="lg"
                            onClick={() => navigate('/upload')}
                            sx={{
                                bgcolor: 'primary.500',
                                '&:hover': { 
                                    bgcolor: 'primary.600',
                                    transform: 'translateY(-2px)',
                                    transition: 'all 0.2s'
                                },
                                px: 4
                            }}
                        >
                            Get Started
                        </Button>
                        <Button
                            size="lg"
                            variant="outlined"
                            onClick={() => navigate('/information')}
                            sx={{
                                borderColor: 'primary.400',
                                color: 'primary.400',
                                '&:hover': {
                                    borderColor: 'primary.500',
                                    bgcolor: 'primary.50',
                                    transform: 'translateY(-2px)',
                                    transition: 'all 0.2s'
                                },
                                px: 4
                            }}
                        >
                            Learn More
                        </Button>
                    </Box>
                </Box>
            </Box>

            {/* Feature Cards Section */}
            <Box sx={{ px: { xs: 2, md: 4 }, py: 8, maxWidth: '6xl', mx: 'auto' }}>
                <Typography
                    level="h2"
                    sx={{
                        textAlign: 'center',
                        mb: 6,
                        color: isLightMode ? 'primary.main' : 'primary.300'
                    }}
                >
                    Key Features
                </Typography>
                <Grid container spacing={3}>
                    {features.map((feature, index) => (
                        <Grid key={index} item xs={12} md={6} lg={3}>
                            <Card
                                variant="outlined"
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                    p: 3,
                                    bgcolor: isLightMode ? 'background.paper' : 'neutral.800',
                                    borderColor: isLightMode ? 'divider' : 'neutral.700',
                                    '&:hover': {
                                        borderColor: 'primary.500',
                                        transform: 'translateY(-4px)',
                                        transition: 'all 0.3s',
                                        boxShadow: 'md'
                                    }
                                }}
                            >
                                <Box
                                    sx={{
                                        mb: 2,
                                        p: 2,
                                        borderRadius: 'xl',
                                        bgcolor: isLightMode ? 'primary.50' : 'primary.900',
                                        color: isLightMode ? 'primary.500' : 'primary.300'
                                    }}
                                >
                                    {feature.icon}
                                </Box>
                                <Typography level="h4" sx={{ mb: 2 }}>
                                    {feature.title}
                                </Typography>
                                <Typography level="body-md" sx={{ color: isLightMode ? 'text.secondary' : 'neutral.300' }}>
                                    {feature.description}
                                </Typography>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Rankings Section */}
            <Box 
                sx={{ 
                    px: { xs: 2, md: 4 }, 
                    py: 8, 
                    maxWidth: '6xl', 
                    mx: 'auto',
                    bgcolor: isLightMode ? 'primary.50' : 'neutral.800'
                }}
            >
                <Grid container spacing={4} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <Typography
                            level="h2"
                            sx={{
                                mb: 2,
                                color: isLightMode ? 'primary.main' : 'primary.300'
                            }}
                        >
                            Competitive Rankings
                        </Typography>
                        <Typography
                            level="body-lg"
                            sx={{
                                mb: 4,
                                color: isLightMode ? 'text.secondary' : 'neutral.300'
                            }}
                        >
                            Compare your privacy preservation methods against other researchers and institutions. 
                            Our ranking system provides transparent metrics and fair comparisons across different approaches.
                        </Typography>
                        <Grid container spacing={2} sx={{ mb: 4 }}>
                            <Grid item xs={6}>
                                <Card
                                    variant="soft"
                                    sx={{
                                        p: 2,
                                        textAlign: 'center',
                                        bgcolor: isLightMode ? 'background.surface' : 'neutral.700'
                                    }}
                                >
                                    <Typography level="h3" sx={{ color: 'primary.500' }}>
                                        100+
                                    </Typography>
                                    <Typography level="body-sm">
                                        Active Researchers
                                    </Typography>
                                </Card>
                            </Grid>
                            <Grid item xs={6}>
                                <Card
                                    variant="soft"
                                    sx={{
                                        p: 2,
                                        textAlign: 'center',
                                        bgcolor: isLightMode ? 'background.surface' : 'neutral.700'
                                    }}
                                >
                                    <Typography level="h3" sx={{ color: 'primary.500' }}>
                                        500+
                                    </Typography>
                                    <Typography level="body-sm">
                                        Submissions
                                    </Typography>
                                </Card>
                            </Grid>
                        </Grid>
                        <Button
                            size="lg"
                            onClick={() => navigate('/rankings')}
                            endDecorator="→"
                            sx={{
                                '&:hover': { 
                                    transform: 'translateX(4px)',
                                    transition: 'all 0.2s'
                                }
                            }}
                        >
                            View Rankings
                        </Button>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Card
                            variant="outlined"
                            sx={{
                                p: 2,
                                bgcolor: isLightMode ? 'background.surface' : 'neutral.900',
                                transition: 'transform 0.3s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 'lg'
                                }
                            }}
                        >
                            <AspectRatio ratio="4/3">
                                <img
                                    src="/api/placeholder/800/600"
                                    alt="Rankings Preview"
                                    style={{
                                        objectFit: 'cover',
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: 'md'
                                    }}
                                />
                            </AspectRatio>
                        </Card>
                    </Grid>
                </Grid>
            </Box>

                        {/* Dashboard Preview Section */}
                        <Box sx={{ px: { xs: 2, md: 4 }, py: 8, maxWidth: '6xl', mx: 'auto' }}>
                <Typography
                    level="h2"
                    sx={{
                        textAlign: 'center',
                        mb: 2,
                        color: isLightMode ? 'primary.main' : 'primary.300'
                    }}
                >
                    Powerful Dashboard
                </Typography>
                <Typography
                    level="body-lg"
                    sx={{
                        textAlign: 'center',
                        mb: 6,
                        color: isLightMode ? 'text.secondary' : 'neutral.300',
                        maxWidth: '800px',
                        mx: 'auto'
                    }}
                >
                    Monitor your privacy metrics in real-time with our comprehensive dashboard. 
                    Track performance, analyze trends, and make data-driven decisions to enhance your privacy preservation methods.
                </Typography>
                <Card
                    variant="outlined"
                    sx={{
                        p: 2,
                        transition: 'transform 0.3s',
                        '&:hover': {
                            transform: 'scale(1.02)',
                            boxShadow: 'lg'
                        }
                    }}
                >
                    <AspectRatio ratio="21/9">
                        <img
                            src="/api/placeholder/1200/600"
                            alt="Dashboard Preview"
                            style={{
                                objectFit: 'cover',
                                width: '100%',
                                height: '100%',
                                borderRadius: 'md'
                            }}
                        />
                    </AspectRatio>
                </Card>
            </Box>

            <IconButton
                onClick={scrollToTop}
                sx={{
                    position: 'fixed',
                    bottom: 32,
                    right: 32,
                    opacity: scrolled ? 1 : 0,
                    transform: `translateY(${scrolled ? 0 : '20px'})`,
                    transition: 'all 0.3s',
                    bgcolor: 'primary.500',
                    '&:hover': { 
                        bgcolor: 'primary.600',
                        transform: `translateY(${scrolled ? -4 : '20px'})`,
                    }
                }}
            >
                <KeyboardArrowUpIcon />
            </IconButton>
            <Footer />
        </Sheet>
    );
};

export default Home;