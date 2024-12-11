import React, { useState } from 'react';
import {Card, Box, Typography, Chip} from '@mui/joy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const FlipCard = ({ title, content }) => {
    const [flipped, setFlipped] = useState(false);

    return (
        <Box
            onClick={() => setFlipped(!flipped)}
            sx={{
                perspective: '1000px',
                cursor: 'pointer',
                width: '100%',
                height: '100%',
                minWidth: 150,
                minHeight: 150,
                aspectRatio: '1 / 1',
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    transformStyle: 'preserve-3d',
                    transform: flipped ? 'rotateY(180deg)' : 'none',
                    transition: 'transform 0.6s',
                }}
            >
                {/* Front Side */}
                <Card
                    variant="outlined"
                    sx={{
                        '&:hover': {
                            borderColor: 'primary.500'},
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        backfaceVisibility: 'hidden',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Typography level="h4">{title}</Typography>
                    <Chip startDecorator={<CheckCircleIcon></CheckCircleIcon>} color='success'>Active</Chip>


                </Card>

                {/* Back Side */}
                <Card
                    variant="soft"
                    sx={{
                        '&:hover': {
                            borderColor: 'primary.500'},
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        transform: 'rotateY(180deg)',
                        backfaceVisibility: 'hidden',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 2,
                    }}
                >
                    <Typography level="body1" sx={{ textAlign: 'center' }}>
                        {content}
                    </Typography>
                </Card>
            </Box>
        </Box>
    );
};

export default FlipCard;
