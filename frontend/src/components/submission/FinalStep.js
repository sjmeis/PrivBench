import { useState, useEffect, useRef } from "react";
import { Typography, Box, Button } from "@mui/joy";
import { useSnackbar } from "../../contexts/SnackbarProvider";
import TaskProgressCard from "./TaskProgressCard";
import ScoreOverviewCard from "./ScoreOverviewCard";
import { RemoveRedEye } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import CancelEvaluationModal from "./CancelEvaluationModal";

const FinalStep = () => {
  const [loading, setLoading] = useState(true);
  const [averageScore, setAverageScore] = useState(null);
  const [moduleScores, setModuleScores] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isAnyTaskFailed, setIsAnyTaskFailed] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const intervalRef = useRef(null);

  // Load tasks from localStorage when component mounts
  useEffect(() => {
    if (!loading) {
      localStorage.removeItem("tasks");
      return;
    }
    const savedTasks = JSON.parse(localStorage.getItem("tasks"));
    if (savedTasks) {
      setTasks(savedTasks);
    } else {
      startBenchmark();
    }
  }, []);

  const handleViewSubmissions = () => {
    navigate("/profile", { state: "submissions" });
  };

  const startBenchmark = async () => {
    try {
      const response = await fetch("http://localhost:5000/run-benchmark", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        signal: AbortSignal.timeout(30000),
      });

      if (response.status === 404) {
        showSnackbar(
          "No submissions available for benchmarking. Please submit your data first.",
          "error"
        );
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
        showSnackbar(`${errorMessage}`, "error");
      }

      const data = await response.json();
      const initialTasks = data.task_ids.map((task) => ({
        ...task,
        progress: 0,
        processedRows: 0,
        totalRows: 0,
        status: "Starting...",
        completed: false,
        score: null,
        error: null,
      }));

      // Save tasks and submission ID to localStorage
      localStorage.setItem("tasks", JSON.stringify(initialTasks));
      localStorage.setItem("submission_id", data.submission_id);
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
                credentials: "include",
              }
            );

            if (!response.ok) {
              showSnackbar("Failed to fetch submission status", "error");
            }

            const data = await response.json();

            // Extract processed and total rows from status message if available
            let processedRows = 0;
            let totalRows = 0;
            if (data.status && data.status.includes("|")) {
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
              completed: data.state === "SUCCESS",
              error: data.state === "FAILURE" ? data.status : null,
              score: data.score,
              state: data.state,
            };
          } catch (error) {
            console.error(`Error polling task ${task.task_id}:`, error);
            return {
              ...task,
              error: error.message,
            };
          }
        })
      );

      setTasks(updatedTasks);

      const allTasksFinished = updatedTasks.every(
        (task) => task.completed || task.error || task.state === "FAILURE"
      );

      const hasFailedTasks = updatedTasks.some(
        (task) => task.error || task.state === "FAILURE"
      );
      if (hasFailedTasks) {
        setIsAnyTaskFailed(true);
      }

      if (allTasksFinished) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setLoading(false);
        const successfulTasks = updatedTasks.filter(
          (task) => task.completed && task.score !== null
        );

        if (successfulTasks.length > 0) {
          const scores = successfulTasks.map((t) => ({
            module_name: t.module_name,
            score: t.score,
          }));
          setModuleScores(scores);
          setAverageScore(
            scores.reduce((sum, curr) => sum + curr.score, 0) / scores.length
          );
          localStorage.removeItem("tasks");
        }
      }
    };

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start new interval
    intervalRef.current = setInterval(pollTasks, 1000);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [tasks, loading]);

  const handleCancel = async () => {
    try {
      const submissionId = localStorage.getItem("submission_id");
      console.log("Attempting to cancel submission:", submissionId);

      if (!submissionId) {
        throw new Error("No submission ID found");
      }
      const response = await fetch(
        `http://localhost:5000/cancel-benchmark/${submissionId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );
      console.log("Cancel response status:", response.status);

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          console.log("Error response data:", errorData);
          errorMessage = errorData.message;
        } catch (e) {
          console.error("Error parsing error response:", e);
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log("Success response data:", responseData);

      showSnackbar("Benchmark cancelled successfully", "success");
      setLoading(false);
      localStorage.removeItem("tasks");
      localStorage.removeItem("submission_id");
      navigate("/profile?state=submissions");
    } catch (error) {
      console.error("Error cancelling benchmark:", error);
      showSnackbar("Failed to cancel benchmark", "error");
    }
  };

  return (
    <>
      <Box sx={{ width: "100%", maxWidth: 1000, mx: "auto", p: 3 }}>
        <Typography level="h2" mb={2}>
          {loading ? "Evaluation in Progress" : "Evaluation Summary"}
        </Typography>

        {loading || isAnyTaskFailed ? (
          <>
            <TaskProgressCard tasks={tasks} />
            <Button
              variant="outlined"
              color="danger"
              onClick={() => setIsCancelModalOpen(true)}
              sx={{ mt: 2 }}
            >
              Cancel Evaluation
            </Button>
          </>
        ) : moduleScores.length > 0 ? (
          <>
            <ScoreOverviewCard
              averageScore={averageScore}
              moduleScores={moduleScores}
            />
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
        ) : (
          <Typography level="h2" mb={2} color="danger">
            Evaluation Failed
          </Typography>
        )}
      </Box>
      <CancelEvaluationModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        handleCancel={handleCancel}
      />
    </>
  );
};

export default FinalStep;
