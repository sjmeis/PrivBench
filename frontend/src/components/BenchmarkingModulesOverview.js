import Typography from "@mui/joy/Typography";
import {Card, CardContent, Chip, Grid} from "@mui/joy";
import React from "react";

const BenchmarkingModulesOverview = ({benchmarkScores}) => {

    const cardStyle = {
        '&:hover': {
            transform: 'scale(1.1)',
            transition: 'transform 0.2s ease-in-out',
        },
        overflow: 'hidden'
    }

    return (<CardContent>
        <Typography sx={{marginBottom: 1}} level='h2'>Benchmarking Modules</Typography>
        <Grid container spacing={2}>
            {benchmarkScores.map((item) => {
                return (
                    <Grid item xs={3}>
                        <Card
                            variant="soft"
                            orientation="horizontal"
                            sx={cardStyle}
                        >
                            <CardContent>

                                <Typography
                                    level="title-md"
                                    sx={{
                                        fontWeight: 'bold',
                                        marginBottom: 0.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    {item.benchmarkModule.name}
                                </Typography>
                                <Chip
                                    variant="outlined"
                                    color="primary"
                                    size="sm"
                                    sx={{pointerEvents: 'none'}}
                                >
                                    {item.benchmarkModule.version}
                                </Chip>
                            </CardContent>
                        </Card>
                    </Grid>
                );

            })}
        </Grid>
    </CardContent>);
}

export default BenchmarkingModulesOverview;