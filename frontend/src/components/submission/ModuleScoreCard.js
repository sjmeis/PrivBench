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
                            variant="outlined"
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
