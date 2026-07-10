/* Copyright (C) 2026 Stephen Meisenbacher

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.*/


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
