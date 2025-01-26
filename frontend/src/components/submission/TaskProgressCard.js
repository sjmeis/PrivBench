import React from "react";
import { Card, Box, Typography, LinearProgress } from "@mui/joy";

const TaskProgressCard = ({ tasks }) => {
    return (
        <Card variant="outlined" sx={{ width: "100%", mt: 3 }}>
            {tasks.map((task, index) => (
                <Box key={index} sx={{ mb: 2, mt: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                        <Typography level="body1" fontWeight="bold">
                            {task.module_name}
                        </Typography>
                        <Typography level="body1">{task.progress}%</Typography>
                    </Box>
                    <LinearProgress
                        determinate
                        value={task.progress}
                        sx={{ mb: 1 }}
                        color={task.error ? "error" : "success"}
                    />
                    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                        <Typography
                            level="body2"
                            sx={{
                                color: task.error ? "error.main" : "text.secondary",
                                fontSize: "0.875rem",
                            }}
                        >
                            {task.error || task.status}
                        </Typography>
                        {task.totalRows > 0 && (
                            <Typography level="body2" sx={{ fontSize: "0.875rem" }}>
                                {task.processedRows.toLocaleString()} / {task.totalRows.toLocaleString()} rows
                            </Typography>
                        )}
                    </Box>
                </Box>
            ))}
        </Card>
    );
};

export default TaskProgressCard;
