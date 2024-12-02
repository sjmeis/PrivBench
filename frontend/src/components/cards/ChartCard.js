import React, {useState, useEffect} from 'react';
import {Card, CardContent, Typography} from '@mui/joy';
import {BarChart} from '@mui/x-charts';

const ChartCard = ({cardStyle, benchmarkScores, overallScore}) => {
    const [yData, setYData] = useState([])
    const [xLabels, setXLables] = useState([])


    useEffect(() => {
        setYData(benchmarkScores.map(item => item.score).concat(overallScore));
        setXLables(benchmarkScores.map(item => item.benchmarkModule.name).concat('Overall Score'));

    }, [benchmarkScores]);


    return (
        <Card variant="outlined" sx={cardStyle}>
            <CardContent>
                <Typography level="h2">Benchmark Scores by Module</Typography>
                {benchmarkScores ? (
                    <BarChart
                        series={[
                            {data: yData, id: ''},
                        ]}
                        yAxis={[
                            {
                                colorMap: {
                                    type: 'ordinal',
                                    colors: ['#ccebc5', '#a8ddb5', '#7bccc4', '#4eb3d3', '#2b8cbe', '#08589e']
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
