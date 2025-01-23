import Typography from "@mui/joy/Typography";
import {CardContent, Grid} from "@mui/joy";
import React from "react";
import BenchmarkCard from "../ranking/BenchmarkCard";

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
                        <BenchmarkCard description={item.benchmarkModule.description} title={item.benchmarkModule.title}></BenchmarkCard>
                    </Grid>
                );

            })}
        </Grid>
    </CardContent>);
}

export default BenchmarkingModulesOverview;