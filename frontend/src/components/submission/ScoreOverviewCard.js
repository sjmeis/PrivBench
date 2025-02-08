import React from "react";
import { Card, Box } from "@mui/joy";
import ModuleScoreCard from "./ModuleScoreCard";

const ScoreOverviewCard = ({ averageScore, moduleScores, oldModulesScores = [] }) => {



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


        </>
    );
};

export default ScoreOverviewCard;
