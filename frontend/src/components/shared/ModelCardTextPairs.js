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
