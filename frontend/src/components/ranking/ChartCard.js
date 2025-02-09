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
                            left: 100,
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
