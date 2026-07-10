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


import React, {useState, useEffect} from 'react';
import {Card, CardContent, Typography} from '@mui/joy';
import {BarChart} from '@mui/x-charts';

const ChartCard = ({cardStyle, benchmarkScores, overallScore}) => {
    const [chartData, setChartData] = useState([]);


    useEffect(() => {
        if (benchmarkScores && Array.isArray(benchmarkScores)) {
            const newChartData = [
                { x: overallScore, y: "Overall Score" },
                ...benchmarkScores.map((item) => ({
                    x: item.score,
                    y: `${item.benchmarkModule.name}`,
                })),
            ];
            setChartData(newChartData);
        }
    }, [benchmarkScores, overallScore]);


    return (
        <Card variant="outlined" sx={cardStyle}>
            <CardContent>
                <Typography level="h2">Benchmark Score Breakdown</Typography>
                {benchmarkScores ? (
                    <BarChart
                        margin={{
                            left: 140,
                            right: 15,
                            top: 20,
                            bottom: 20,
                        }}
                        barLabel="value"
                        yAxis={[
                            {
                                colorMap: {
                                    type: 'ordinal',
                                    colors: ['#52b202', '#86b2a0', '#5fa6a1', '#3a92a8', '#256b96', '#064474']

                                },
                                id: 'y-axis',
                                scaleType: 'band',
                                data: chartData.map(item => item.y),
                            },
                        ]}
                        series={[
                            {
                                id: 'benchmark-series',
                                type: 'bar',
                                data: chartData.map(item => parseFloat(item.x.toFixed(2))),
                            },
                        ]}
                        layout="horizontal"
                        tooltip={{trigger: 'none'}}
                    />
                ) : (
                    <Typography>No data available</Typography>
                )}
            </CardContent>
        </Card>
    );
};

export default ChartCard;
