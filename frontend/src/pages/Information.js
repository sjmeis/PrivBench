import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Typography, Box } from '@mui/joy';
import FlipCard from '../components/FlipCard';

const Information = () => {
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Fetch modules from the backend
        const fetchModules = async () => {
            try {
                const response = await axios.get('http://localhost:5000/modules'); // Adjust endpoint as needed
                setModules(response.data);
            } catch (err) {
                setError('Failed to load modules');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchModules();
    }, []);

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: 4,
            }}
        >
            {/* Main Information Card */}
            <Card variant="outlined" sx={{ width: 800, padding: 4 }}>
                <Typography level="h2" mb={2} sx={{ textAlign: 'center' }}>
                    Platform Overview
                </Typography>

                <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography level="body1">
                        Welcome to our data privatization benchmarking platform! Here's how it works:
                    </Typography>
                </Box>

                <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography level="body1">
                        The process starts by downloading datasets from our platform. These datasets contain sensitive personal data. After downloading, users are required to fill out a metadata form detailing their chosen data privatization technique.
                    </Typography>
                </Box>

                <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography level="body1">
                        Once the metadata form is complete, users apply their own data privatization algorithm to the downloaded datasets. After the data is privatized, the resulting datasets must be uploaded back to the platform.
                    </Typography>
                </Box>

                <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography level="body1">
                        Our platform then evaluates the uploaded privatized datasets using various modules. These modules run advanced algorithms to calculate different metrics, providing insights into the effectiveness of the data privatization model in terms of privacy preservation and data utility.
                    </Typography>
                </Box>

                <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography level="body1" sx={{ fontWeight: 'bold' }}>
                        The flipcards below explain the different modules used in this evaluation process.
                    </Typography>
                </Box>
            </Card>

            {/* FlipCards Section */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center', // Center the content
                    flexWrap: 'wrap', // Allow wrapping for smaller screens
                    gap: 2, // Add spacing between cards
                    width: '80%',
                    padding: 1,
                }}
            >
                {loading ? (
                    <Typography level="body1" sx={{ textAlign: 'center', margin: 'auto' }}>
                        Loading modules...
                    </Typography>
                ) : error ? (
                    <Typography level="body1" sx={{ textAlign: 'center', color: 'red', margin: 'auto' }}>
                        {error}
                    </Typography>
                ) : modules.length > 0 ? (
                    modules.map((module) => (
                        <Box
                            key={module.id}
                            sx={{
                                width: 350, // Fixed width for each FlipCard
                                textAlign: 'center', // Center the FlipCard within the box
                            }}
                        >
                            <FlipCard
                                title={module.name}
                                content={module.description || 'No description available.'}
                            />
                        </Box>
                    ))
                ) : (
                    <Typography level="body1" sx={{ textAlign: 'center', margin: 'auto' }}>
                        No modules found.
                    </Typography>
                )}
            </Box>

        </Box>
    );
};

export default Information;

