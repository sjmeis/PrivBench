import Typography from "@mui/joy/Typography";
import {CardContent, Grid} from "@mui/joy";
import React from "react";
import BenchmarkCardSmall from "../ranking/BenchmarkCardSmall";

const BenchmarkingModulesOverview = ({benchmarkScores}) => {

    return (<CardContent>
        <Typography sx={{marginBottom: 1}} level='h2'>Benchmarking Modules</Typography>
        <Grid container columns={12} spacing={2}>
            {benchmarkScores.map((item) => {
                return (
                    <Grid item xs={2}>
                        <BenchmarkCardSmall small={true} description={item.benchmarkModule.description} title={item.benchmarkModule.title}></BenchmarkCardSmall>
                    </Grid>
                );

            })}
        </Grid>
    </CardContent>);
}

export default BenchmarkingModulesOverview;