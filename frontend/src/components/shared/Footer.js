import React from 'react';
import { Box, Typography } from '@mui/joy';

const Footer = () => {
    return (
        <Box
            component="footer"
            sx={{
                textAlign: 'center',
                py: 2,
                bottom: 0,
                width: '100%',
                mt: 'auto'
            }}
        >
            <Typography level="body2" textColor="text.primary">
                © 2025 PrivBench
            </Typography>
        </Box>
    );
};

export default Footer;
