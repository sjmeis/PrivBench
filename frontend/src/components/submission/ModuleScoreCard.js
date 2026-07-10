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

import React from "react";
import {Card, CardContent, CardOverflow, Chip, Stack, Typography} from "@mui/joy";

const ModuleScoreCard = ({moduleName, score, isNew = false, isOverall = false}) => {
    return (
        <Card
            variant='soft'
            orientation="horizontal"
            color={isOverall ? 'primary' : 'neutral'}
            sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 2,
                borderColor: "#e0e0e0",
            }}
        >
            <CardContent>
                <Stack direction='row' spacing={1}>

                    <Typography level="h4" sx={{fontWeight: "bold"}}>
                        {moduleName} {isOverall ? '' : 'Score'}
                    </Typography>


                    {isNew && (
                        <Chip
                            variant="soft"
                            color="success"
                            size="sm"
                            sx={{fontWeight: "bold"}}
                        >
                            New
                        </Chip>
                    )}
                </Stack>
            </CardContent>
            <CardOverflow
                variant="soft"
                color={isOverall ? 'primary' : ''}
                sx={{
                    flex: '0 0 120px',
                    display: 'flex',
                    alignItems: 'center',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    px: 'var(--Card-padding)',
                }}
            >
                <Typography color={isNew? 'success': ''} level="h6" sx={{fontWeight: "bold"}}>
                    {score?.toFixed(2)}%
                </Typography>
            </CardOverflow>


        </Card>
    );
};

export default ModuleScoreCard;
