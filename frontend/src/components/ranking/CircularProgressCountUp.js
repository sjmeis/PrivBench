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
