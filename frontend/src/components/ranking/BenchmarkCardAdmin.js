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
