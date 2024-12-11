import { useState, useEffect } from "react";
import { Typography, Card, Box, Button, LinearProgress } from "@mui/joy";
import { useNavigate } from "react-router-dom";
import CustomSnackbar from "../shared/CustomSnackbar";
import { RemoveRedEye } from "@mui/icons-material";

const FinalStep = () => {
    const [loading, setLoading] = useState(true);
    const [averageScore, setAverageScore] = useState(null);
    const [moduleScores, setModuleScores] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("info");
    const navigate = useNavigate();

    useEffect(() => {
        const startBenchmark = async () => {
            try {
                const response = await fetch("http://localhost:5000/run-benchmark", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    signal: AbortSignal.timeout(30000)
                });

                if (response.status === 404) {
                    setSnackbarMessage("No submissions available for benchmarking. Please submit your data first.");
                    setSnackbarSeverity("warning");
                    setOpenSnackbar(true);
                    setLoading(false);
                    return;
                }

                if (!response.ok) {
                    let errorMessage;
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message;
                    } catch {
                        errorMessage = `HTTP error! status: ${response.status}`;
                    }
                    throw new Error(errorMessage || "Failed to run benchmark!");
                }

                const data = await response.json();
                setTasks(data.task_ids.map(task => ({
                    ...task,
                    progress: 0,
                    processedRows: 0,
                    totalRows: 0,
                    status: 'Starting...',
                    completed: false,
                    score: null,
                    error: null
                })));

            } catch (err) {
                console.error("Benchmark error:", err);
                setSnackbarMessage(err.message);
                setSnackbarSeverity("error");
                setOpenSnackbar(true);
                setLoading(false);
            }
        };

        startBenchmark();
    }, []);

    useEffect(() => {
        if (tasks.length === 0) return;

        const pollTasks = async () => {
            const updatedTasks = await Promise.all(
                tasks.map(async (task) => {
                    try {
                        const response = await fetch(
                            `http://localhost:5000/task-status/${task.task_id}`,
                            {
                                headers: {
                                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                                },
                                credentials: "include"
                            }
                        );
                        
                        if (!response.ok) {
                            throw new Error("Failed to fetch task status");
                        }
                        
                        const data = await response.json();
                        
                        // Extract processed and total rows from status message if available
                        let processedRows = 0;
                        let totalRows = 0;
                        if (data.status && data.status.includes('|')) {
                            const match = data.status.match(/(\d+)\/(\d+)/);
                            if (match) {
                                processedRows = parseInt(match[1]);
                                totalRows = parseInt(match[2]);
                            }
                        }
                        
                        return {
                            ...task,
                            progress: Math.round((data.current / data.total) * 100),
                            processedRows,
                            totalRows,
                            status: data.status,
                            completed: data.state === 'SUCCESS',
                            error: data.state === 'FAILURE' ? data.status : null,
                            score: data.score,
                            state: data.state
                        };
                    } catch (error) {
                        console.error(`Error polling task ${task.task_id}:`, error);
                        return {
                            ...task,
                            error: error.message
                        };
                    }
                })
            );

            setTasks(updatedTasks);

            const allTasksFinished = updatedTasks.every(
                task => task.completed || task.error || task.state === 'FAILURE'
            );

            if (allTasksFinished) {
                setLoading(false);
                const successfulTasks = updatedTasks.filter(
                    task => task.completed && task.score !== null
                );
                
                if (successfulTasks.length > 0) {
                    const scores = successfulTasks.map(t => ({
                        module_name: t.module_name,
                        score: t.score
                    }));
                    setModuleScores(scores);
                    setAverageScore(
                        scores.reduce((sum, curr) => sum + curr.score, 0) / scores.length
                    );
                }
            }
        };

        const intervalId = setInterval(pollTasks, 1000);
        return () => clearInterval(intervalId);
    }, [tasks.length]);

    const handleViewSubmissions = () => {
        navigate("/profile", { state: "submissions" });
    };

    return (
        <Card variant="outlined" sx={{ width: "100%", maxWidth: 800, mx: "auto", textAlign: "center", p: 3 }}>
            <Typography level="h2" mb={2}>
                {loading ? "Evaluation in Progress" : "Evaluation Completed"}
            </Typography>

            {loading ? (
                <Box sx={{ width: '100%', mt: 3 }}>
                    {tasks.map((task, index) => (
                        <Box key={index} sx={{ mb: 4 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography level="body1" fontWeight="bold">
                                    {task.module_name}
                                </Typography>
                                <Typography level="body1">
                                    {task.progress}%
                                </Typography>
                            </Box>
                            <LinearProgress 
                                determinate 
                                value={task.progress} 
                                sx={{ 
                                    mb: 1,
                                    height: 10,
                                    borderRadius: 5,
                                    [`& .MuiLinearProgress-bar`]: {
                                        transition: 'transform 0.3s linear'
                                    }
                                }}
                                color={task.error ? "danger" : "success"}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                <Typography 
                                    level="body2" 
                                    sx={{ 
                                        color: task.error ? 'error.main' : 'text.secondary',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    {task.error || task.status}
                                </Typography>
                                {task.totalRows > 0 && (
                                    <Typography level="body2" sx={{ fontSize: '0.875rem' }}>
                                        {task.processedRows.toLocaleString()} / {task.totalRows.toLocaleString()} rows
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    ))}
                </Box>
            ) : moduleScores.length > 0 ? (
                <>
                    <Card variant="outlined" sx={{ p: 3, textAlign: "center" }}>
                        <Typography level="h3" mb={3} sx={{ textAlign: "center", fontWeight: "bold" }}>
                            Evaluation Summary
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
                            <Card
                                variant="soft"
                                sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    p: 2
                                }}
                            >
                                <Typography level="body1" sx={{ fontWeight: "bold" }}>
                                    Overall Score
                                </Typography>
                                <Typography level="body1" color="success">
                                    {averageScore?.toFixed(2)}%
                                </Typography>
                            </Card>

                            {moduleScores.map((module, index) => (
                                <Card
                                    key={index}
                                    variant="soft"
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        p: 2,
                                        borderColor: "#e0e0e0",
                                    }}
                                >
                                    <Typography level="body1" sx={{ fontWeight: "bold" }}>
                                        {module.module_name} Score
                                    </Typography>
                                    <Typography level="body1" color="primary">
                                        {module.score?.toFixed(2)}%
                                    </Typography>
                                </Card>
                            ))}
                        </Box>
                    </Card>

                    <Button
                        variant="solid"
                        color="primary"
                        sx={{ mt: 3 }}
                        onClick={handleViewSubmissions}
                        endDecorator={<RemoveRedEye />}
                    >
                        View My Submissions
                    </Button>
                </>
            ) : (
                <Typography level="h2" mb={2} color="error">
                    Evaluation Failed
                    <Typography level="body1" color="error">
                        {snackbarMessage}
                    </Typography>
                </Typography>
            )}

            <CustomSnackbar
                open={openSnackbar}
                message={snackbarMessage}
                severity={snackbarSeverity}
                onClose={() => setOpenSnackbar(false)}
            />
        </Card>
    );
};

export default FinalStep;