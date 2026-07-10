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

import * as React from 'react';
import AspectRatio from '@mui/joy/AspectRatio';
import Box from '@mui/joy/Box';
import Container from '@mui/joy/Container';
import {typographyClasses} from '@mui/joy/Typography';
import {Button, Stack, Typography} from "@mui/joy";
import Link from "@mui/joy/Link";
import {ArrowForward, Timeline} from "@mui/icons-material";
import {useNavigate} from "react-router-dom";

export default function Hero() {
    const navigate = useNavigate();

    return (
        <Container
            sx={[
                (theme) => ({
                    position: 'relative',
                    minHeight: 'calc(100vh - 450px)',
                    display: 'flex',
                    alignItems: 'center',
                    py: 10,
                    gap: 4,
                    [theme.breakpoints.up(834)]: {
                        flexDirection: 'row',
                        gap: 6,
                    },
                    [theme.breakpoints.up(1199)]: {
                        gap: 12,
                    },
                }),
                {flexDirection: 'column-reverse'},
            ]}
        >
            <Box
                sx={(theme) => ({
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                    maxWidth: '50ch',
                    textAlign: 'center',
                    flexShrink: 999,
                    [theme.breakpoints.up(834)]: {
                        minWidth: 420,
                        alignItems: 'flex-start',
                        textAlign: 'initial',
                    },
                    [`& .${typographyClasses.root}`]: {
                        textWrap: 'balance',
                    },
                })}
            >
                <Typography color="primary" sx={{fontSize: 'lg', fontWeight: 'lg'}}>
                    The power to do more
                </Typography>
                <Typography
                    level="h1"
                    sx={{
                        fontWeight: 'xl',
                        fontSize: 'clamp(1.875rem, 1.3636rem + 2.1818vw, 3rem)',
                    }}
                >
                    A large headlinerer about our product features & services
                </Typography>
                <Typography
                    textColor="text.secondary"
                    sx={{fontSize: 'lg', lineHeight: 'lg'}}
                >
                    A descriptive secondary text placeholder. Use it to explain your business
                    offer better.
                </Typography>
                <Stack direction='row' spacing={4}>
                    <Button variant="soft" color='primary' size="lg" endDecorator={<ArrowForward fontSize="xl"/>}
                            onClick={() => navigate("/upload")}>
                        Get Started
                    </Button>
                    <Button
                        color="neutral"
                        size="lg"
                        variant="soft"
                        endDecorator={<Timeline fontSize="xl"/>}
                        onClick={() => navigate("/rankings")} // Navigate to the rankings page
                    >
                        Rankings
                    </Button>
                </Stack>
                <Typography>
                    Already a member? <Link sx={{fontWeight: 'lg'}}>Sign in</Link>
                </Typography>
            </Box>
            <AspectRatio
                ratio={600 / 520}
                variant="outlined"
                maxHeight={300}
                sx={(theme) => ({
                    minWidth: 300,
                    alignSelf: 'stretch',
                    [theme.breakpoints.up(834)]: {
                        alignSelf: 'initial',
                        flexGrow: 1,
                        '--AspectRatio-maxHeight': '520px',
                        '--AspectRatio-minHeight': '400px',
                    },
                    borderRadius: 'sm',
                    bgcolor: 'background.level2',
                    flexBasis: '50%',
                })}
            >
                <img
                    src="https://images.unsplash.com/photo-1483791424735-e9ad0209eea2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=774&q=80"
                    alt=""
                />
            </AspectRatio>
        </Container>
    );
}