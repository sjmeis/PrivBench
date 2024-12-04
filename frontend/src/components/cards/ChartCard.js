import React, {useState, useEffect} from 'react';
import {Card, CardContent, Typography} from '@mui/joy';
import {BarChart} from '@mui/x-charts';

const ChartCard = ({cardStyle, benchmarkScores, overallScore}) => {
    const [yData, setYData] = useState([])
    const [xLabels, setXLables] = useState([])


    useEffect(() => {
        setYData([overallScore].concat(benchmarkScores.map(item => item.score)));
        setXLables(["Overall Score"].concat(benchmarkScores.map(item => item.benchmarkModule.name)));

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
                        series={[
                            {data: yData, id: ''},
                        ]}
                        yAxis={[
                            {
                                colorMap: {
                                    type: 'ordinal',
                                    colors: ['#a8c2a5', '#86b2a0', '#5fa6a1', '#3a92a8', '#256b96', '#064474']

                                },
                                data: xLabels,
                                scaleType: 'band'
                            }
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
