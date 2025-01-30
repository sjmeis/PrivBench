import React from "react";
import {Card, Chip, Stack, Typography} from "@mui/joy";

const ModuleScoreCard = ({ moduleName, score, isNew = false }) => {
    return (
        <Card
            variant="soft"
            color={isNew ? 'success': 'neutral'}
            sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 2,
                borderColor: "#e0e0e0",
            }}
        >
            <Stack direction='row' spacing={1}>
                <Typography level="body1" sx={{ fontWeight: "bold" }}>
                    {moduleName} Score
                </Typography>
                {isNew && (
                    <Chip
                        variant="outlined"
                        color="success"
                        size="sm"
                        sx={{ fontWeight: "bold" }}
                    >
                        New
                    </Chip>
                )}
            </Stack>

            <Typography level="body1" color="primary">
                {score?.toFixed(2)}%
            </Typography>
        </Card>
    );
};

export default ModuleScoreCard;
