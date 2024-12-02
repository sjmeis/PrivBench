import React from 'react';
import { Card, Typography, Box } from '@mui/joy';
import FlipCard from "../components/FlipCard";

const Information = () => {
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
                    overflowX: 'auto', // Enable horizontal scrolling
                    width: '80%', // Ensure the box takes full width
                    padding: 1, // Add some padding
                    '&::-webkit-scrollbar': {
                        height: 8, // Height of the horizontal scrollbar
                    },
                    '&::-webkit-scrollbar-thumb': {
                        backgroundColor: '#888', // Color of the scrollbar thumb
                        borderRadius: 4, // Round corners of the scrollbar thumb
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                        backgroundColor: '#555', // Hover effect for scrollbar thumb
                    },
                }}
            >
                {/* Render 5 FlipCards */}
                {Array.from({ length: 5 }, (_, index) => (
                    <Box
                        key={index}
                        sx={{
                            flex: '0 0 350px', // Fixed width for each FlipCard
                        }}
                    >
                        <FlipCard
                            title={`Module ${index + 1}`}
                            content={`Detailed information about Module ${index + 1}.`}
                        />
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default Information;
