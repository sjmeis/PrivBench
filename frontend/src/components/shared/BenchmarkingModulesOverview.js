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