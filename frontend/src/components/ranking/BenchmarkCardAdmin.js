import React from 'react';
import {Box, Card, Typography, Divider} from "@mui/joy";
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

            <Box sx={{display: 'flex', flexDirection: 'column', gap: 1, flex: 1}}>
                <Typography level="body-sm" sx={{textAlign: 'center', fontWeight: 'bold'}}>
                    Associated Datasets:
                </Typography>
                <Box sx={{display: 'flex', flexDirection: 'column', gap: 0.5}}>
                    {/*//todo: add iteration for multiple datasets here*/}
                    <table>
                        <tbody>
                            <tr>
                                <td>
                                    <Typography
                                        level="title-sm"
                                        startDecorator={<InsertDriveFileRoundedIcon color="primary"/>}
                                        sx={{alignItems: 'flex-start'}}
                                    >
                                        {item.name}
                                    </Typography>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </Box>
            </Box>
        </Card>
    );
};

export default BenchmarkCardAdmin;
