import React from 'react';
import {Box, Typography} from '@mui/joy';

const ModelCardTextPairs = ({icon, title, content}) => {
    return (
        <Box sx={{display: 'flex', flexDirection: 'row', gap: 1}}>
            <Typography
                level="body-sm"
                sx={{
                    fontWeight: 'bold',
                    marginBottom: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                }}
            >
                {icon && icon}
                {title}
            </Typography>
            <Typography level="body-sm" sx={{fontWeight: 'bold', p: '1px'}}/>
            {content && <Typography
                sx={{fontWeight: 'bold'}}
                level="body-sm"
                variant="soft"
            >
                {content}
            </Typography>}
        </Box>
    );
};

export default ModelCardTextPairs;
