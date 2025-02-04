import React from "react";
import { Card, Box, Typography, Button } from "@mui/joy";
import { RemoveRedEye } from "@mui/icons-material";
import {useNavigate} from "react-router-dom";
import ModuleScoreCard from "./ModuleScoreCard";

const ScoreOverviewCard = ({ averageScore, moduleScores, oldModulesScores = [] }) => {
    const navigate = useNavigate();

    const handleViewSubmissions = () => {
        navigate("/profile", { state: "submissions" });
    };
    return (
        <>
            <Card variant="outlined" sx={{ p: 3, textAlign: "center" }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
                    <ModuleScoreCard moduleName={'Overall Score'} score={averageScore} isOverall={true}/>

                    {oldModulesScores.map((module, index) => (
                        <ModuleScoreCard
                            key={index}
                            moduleName={module.benchmarkModule.name}
                            score={module.score}
                        />
                    ))}
                    {moduleScores.map((module, index) => (
                        <ModuleScoreCard
                            isNew={oldModulesScores.length > 0}
                            key={index}
                            moduleName={module.module_name}
                            score={module.score}
                        />
                    ))}
                </Box>
            </Card>

            <Button
                fullWidth
                variant="solid"
                color="primary"
                sx={{ mt: 3 }}
                onClick={handleViewSubmissions}
                endDecorator={<RemoveRedEye />}
            >
                View My Submissions
            </Button>
        </>
    );
};

export default ScoreOverviewCard;
