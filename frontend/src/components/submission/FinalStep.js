import { useState, useEffect } from "react";
import { Typography, Box } from "@mui/joy";
import { useSnackbar } from "../../contexts/SnackbarProvider";
import TaskProgressCard from "./TaskProgressCard";
import ScoreOverviewCard from "./ScoreOverviewCard";

const FinalStep = () => {
    const [loading, setLoading] = useState(true);
    const [averageScore, setAverageScore] = useState(null);
    const [moduleScores, setModuleScores] = useState([]);
    const [tasks, setTasks] = useState([]);
    const { showSnackbar } = useSnackbar();

    // Load tasks from localStorage when component mounts
    useEffect(() => {
        const savedTasks = JSON.parse(localStorage.getItem("tasks"));
        if (savedTasks) {
            setTasks(savedTasks);
        } else {
            startBenchmark();
        }
    }, []);

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
                showSnackbar("No submissions available for benchmarking. Please submit your data first.", "error");
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
                showSnackbar(`${errorMessage}`, 'error');
            }

            const data = await response.json();
            const initialTasks = data.task_ids.map(task => ({
                ...task,
                progress: 0,
                processedRows: 0,
                totalRows: 0,
                status: 'Starting...',
                completed: false,
                score: null,
                error: null
            }));

            // Save tasks to localStorage
            localStorage.setItem("tasks", JSON.stringify(initialTasks));
            setTasks(initialTasks);

        } catch (err) {
            console.error("Benchmark error:", err);
            showSnackbar(err.message, "error");
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tasks.length === 0) return;

        const pollTasks = async () => {
            const updatedTasks = await Promise.all(
                tasks.map(async (task) => {
                    if (task.completed) return task; // Skip tasks that are already completed

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
                            showSnackbar('Failed to fetch submission status', 'error');
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
                clearInterval(intervalId); // Stop polling
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
                    localStorage.removeItem("tasks");
                }
            }
        };

        const intervalId = setInterval(pollTasks, 1000);
        return () => clearInterval(intervalId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks]);

    return (
        <Box  sx={{ width: "100%", maxWidth: 1000, mx: "auto", p: 3 }}>
            <Typography level="h2" mb={2}>
                {loading ? "Evaluation in Progress" : "Evaluation Summary"}
            </Typography>

            {loading ? (
                <TaskProgressCard tasks={tasks} />
            ) : moduleScores.length > 0 ? (
                <ScoreOverviewCard averageScore={averageScore} moduleScores={moduleScores}/>
            ) : (
                <Typography level="h2" mb={2} color="danger">
                    Evaluation Failed
                </Typography>
            )}
        </Box>
    );
};

export default FinalStep;

