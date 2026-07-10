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
import {Box, Card, Typography, Divider, Chip} from "@mui/joy";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";

const BenchmarkCardAdmin = ({item, handleCardClick, isSelected}) => {
    return (
        <Card
            onClick={() => handleCardClick(item)}
            variant={isSelected ? 'soft' : 'outlined'}
            sx={{
                height: '100%',
                width: '100%',
                cursor: 'pointer',
                '&:hover': {
                    borderColor: 'primary.500',
                    boxShadow: 'sm',
                },
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                padding: 2,
                alignItems: 'center',
            }}
        >
            <Box sx={{display: 'flex', flexDirection: 'column', gap: 1, flex: 1}}>
                <Typography
                    level="h4"
                    sx={{
                        textAlign: 'left',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}
                >
                    {item.title}
                </Typography>

                <Typography
                    level="body-sm"
                    sx={{textAlign: 'left', color: 'text.secondary'}}
                >
                    Active since: {new Date(item.createdAt).toLocaleDateString()}
                </Typography>
            </Box>

            <Divider orientation="vertical" flexItem/>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
                <Typography level="body-sm" sx={{ textAlign: 'left', fontWeight: 'bold' }}>
                Associated Datasets:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {item.compatibleDatasets && item.compatibleDatasets.length > 0 ? (
                    item.compatibleDatasets.map((ds) => (
                    <Chip
                        key={ds.id}
                        variant="outlined"
                        color="primary"
                        size="sm"
                        startDecorator={<InsertDriveFileRoundedIcon sx={{ fontSize: '1rem' }} />}
                        sx={{ borderRadius: 'sm' }}
                    >
                        {ds.name}
                    </Chip>
                    ))
                ) : (
                    <Typography level="body-xs" sx={{ fontStyle: 'italic', color: 'text.tertiary' }}>
                    No datasets linked
                    </Typography>
                )}
                </Box>
            </Box>
        </Card>
    );
};

export default BenchmarkCardAdmin;
