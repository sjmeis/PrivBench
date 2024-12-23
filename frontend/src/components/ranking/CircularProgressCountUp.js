import * as React from 'react';
import Stack from '@mui/joy/Stack';
import {Gauge, gaugeClasses} from '@mui/x-charts/Gauge';
import { useCountUp } from 'use-count-up';

export default function GaugeScore({ overallScore, duration = 4 }) {
    const { value } = useCountUp({
        isCounting: true,
        duration: duration,
        end: overallScore,
    });

    return (
        overallScore ? (
            <Stack
                direction="column"
                spacing={2}
                sx={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    padding: 2,
                }}
            >
                <Gauge
                    value={value}
                    width={180}
                    height={180}
                    innerRadius="70%"
                    outerRadius="100%"
                    max={100}
                    sx={(theme) => ({
                        [`& .${gaugeClasses.valueText}`]: {
                            fontSize: 40,
                        },
                        [`& .${gaugeClasses.valueArc}`]: {
                            fill: '#52b202',
                        },
                        [`& .${gaugeClasses.referenceArc}`]: {
                            fill: theme.palette.text.disabled,
                        },
                    })}
                />
            </Stack>
        ) : (
            <></>
        )
    );
}
