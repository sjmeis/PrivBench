import { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    Card, 
    Button, 
    IconButton,
    Sheet
} from "@mui/joy";
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const Home = () => {
    const [scrolled, setScrolled] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

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

    return (
        <Sheet 
            sx={{ 
                minHeight: '100vh',
                bgcolor: 'background.body',
                background: `linear-gradient(to bottom, var(--joy-palette-neutral-900), var(--joy-palette-neutral-800))`,
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
                {/* Animated background */}
                <Box sx={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.2,
                }}>
                    <Box sx={{
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(to right, var(--joy-palette-primary-500), var(--joy-palette-primary-600))`,
                        animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                            '0%, 100%': { opacity: 0.5 },
                            '50%': { opacity: 0.7 }
                        }
                    }} />
                    <Box sx={{
                        position: 'absolute',
                        inset: 0,
                        background: 'radial-gradient(circle 500px at 50% 50%, transparent, #000)'
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
                            background: `linear-gradient(to right, var(--joy-palette-primary-300), var(--joy-palette-primary-400))`,
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
                            color: 'neutral.300',
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
                                <Typography level="h4" sx={{ mb: 1, color: 'primary.400' }}>
                                    {highlight.title}
                                </Typography>
                                <Typography sx={{ color: 'neutral.300' }}>
                                    {highlight.description}
                                </Typography>
                            </Box>
                        ))}
                    </Box>

                    <Box sx={{ mt: 8, display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <Button
                            size="lg"
                            sx={{ 
                                bgcolor: 'primary.500',
                                '&:hover': { bgcolor: 'primary.600' },
                                px: 4
                            }}
                        >
                            Get Started
                        </Button>
                        <Button
                            size="lg"
                            variant="outlined"
                            sx={{ 
                                borderColor: 'primary.400',
                                color: 'primary.400',
                                '&:hover': { 
                                    bgcolor: 'primary.400',
                                    opacity: 0.1 
                                },
                                px: 4
                            }}
                        >
                            Learn More
                        </Button>
                    </Box>
                </Box>
            </Box>

            {/* Features Grid */}
            <Box sx={{ px: { xs: 2, md: 4 }, py: 8, maxWidth: '6xl', mx: 'auto' }}>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    gap: 4
                }}>
                    <Card
                        variant="outlined"
                        sx={{
                            bgcolor: 'neutral.800',
                            borderColor: 'neutral.700',
                            '&:hover': { 
                                borderColor: 'primary.500',
                                transform: 'translateY(-4px)',
                                transition: 'all 0.3s'
                            }
                        }}
                    >
                        <Typography level="h3" sx={{ color: 'primary.400', mb: 2 }}>
                            Comprehensive Evaluation
                        </Typography>
                        <Typography level="body-md" sx={{ color: 'neutral.300', mb: 2 }}>
                            Our platform provides thorough assessment of text privatization methods across multiple dimensions
                        </Typography>
                        <Box component="ul" sx={{ color: 'neutral.400', pl: 4 }}>
                            <li>Privacy preservation metrics</li>
                            <li>Real-time performance analysis</li>
                            <li>Comparative benchmarking</li>
                            <li>Detailed reporting</li>
                        </Box>
                    </Card>

                    <Card
                        variant="outlined"
                        sx={{
                            bgcolor: 'neutral.800',
                            borderColor: 'neutral.700',
                            '&:hover': { 
                                borderColor: 'primary.500',
                                transform: 'translateY(-4px)',
                                transition: 'all 0.3s'
                            }
                        }}
                    >
                        <Typography level="h3" sx={{ color: 'primary.400', mb: 2 }}>
                            How It Works
                        </Typography>
                        <Typography level="body-md" sx={{ color: 'neutral.300', mb: 4 }}>
                            Submit your privatized datasets for evaluation using our standardized benchmarking process. Track your progress in real-time and compare your results with other researchers.
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
                            <Button
                                sx={{ 
                                    flex: 1,
                                    bgcolor: 'primary.500',
                                    '&:hover': { bgcolor: 'primary.600' }
                                }}
                                onClick={() => window.location.href = "/rankings"}
                            >
                                View Rankings
                            </Button>
                            <Button
                                variant="outlined"
                                sx={{ 
                                    flex: 1,
                                    borderColor: 'neutral.600',
                                    color: 'neutral.300',
                                    '&:hover': { borderColor: 'primary.400' }
                                }}
                                onClick={() => window.location.href = "/documentation"}
                            >
                                Documentation
                            </Button>
                        </Box>
                    </Card>
                </Box>
            </Box>

            {/* Scroll to Top Button */}
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
                    '&:hover': { bgcolor: 'primary.600' }
                }}
            >
                <KeyboardArrowUpIcon />
            </IconButton>
        </Sheet>
    );
};

export default Home;