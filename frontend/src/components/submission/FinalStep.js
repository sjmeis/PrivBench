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
  const [queueEntries, setQueueEntries] = useState([]);
  const [isAnyTaskFailed, setIsAnyTaskFailed] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const intervalRef = useRef(null);

  // Load tasks from localStorage when component mounts
  useEffect(() => {
    if (!loading) {
      localStorage.removeItem("tasks");
      localStorage.removeItem("queueEntries");
      localStorage.removeItem("submission_id");
      return;
    }
    const savedTasks = JSON.parse(localStorage.getItem("tasks"));
    const savedQueueEntries = JSON.parse(localStorage.getItem("queueEntries"));

    if (savedTasks) {
      setTasks(savedTasks);
      if (savedQueueEntries) {
        setQueueEntries(savedQueueEntries);
      }
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
        return;
      }

      const data = await response.json();

      // Handle queue entries and immediate tasks
      const allQueueEntries = data.queue_entries || [];
      const immediateTasks = data.immediate_tasks || [];
      console.log("data:", data);
      // Create initial tasks array combining queue info and immediate tasks
      const initialTasks = allQueueEntries.map((queueEntry) => {
        // Find if this module has an immediate task
        const immediateTask = immediateTasks.find(
          (task) => task.module_id === queueEntry.module_id
        );

        return {
          task_id: immediateTask?.task_id || null,
          module_id: queueEntry.module_id,
          module_name: queueEntry.module_name,
          queue_entry_id: queueEntry.queue_entry_id,
          progress: 0,
          processedRows: 0,
          totalRows: 0,
          status: immediateTask ? "Starting..." : "Waiting in queue...",
          completed: false,
          score: null,
          error: null,
        };
      });

      // Save data to localStorage
      localStorage.setItem("tasks", JSON.stringify(initialTasks));
      localStorage.setItem("queueEntries", JSON.stringify(allQueueEntries));
      localStorage.setItem("submission_id", data.submission_id);

      setTasks(initialTasks);
      setQueueEntries(allQueueEntries);
    } catch (err) {
      console.error("Benchmark error:", err);
      showSnackbar(err.message, "error");
      setLoading(false);
    }
  };

  // Function to fetch queue status for modules without running tasks
  const fetchQueueStatus = async (submissionId, moduleId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/queue-status/${submissionId}/${moduleId}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.queue_position;
      }
    } catch (error) {
      console.error(
        `Error fetching queue status for module ${moduleId}:`,
        error
      );
    }
    return null;
  };

  useEffect(() => {
    if (tasks.length === 0) return;

    const submissionId = localStorage.getItem("submission_id");
    const pollTasks = async () => {
      const updatedTasks = await Promise.all(
        tasks.map(async (task) => {
          if (task.completed) return task; // Skip tasks that are already completed

          // If task has a task_id, poll the task status
          if (task.task_id) {
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
          } else {
            // No task_id, check queue status
            const queueStatus = await fetchQueueStatus(
              submissionId,
              task.module_id
            );
            if (queueStatus) {
              return {
                ...task,
                status: `Waiting in queue (Position ${queueStatus.position})`,
              };
            }
            return task;
          }
        })
      );

      // Update queue entries based on current task status
      const updatedQueueEntries = await Promise.all(
        queueEntries.map(async (entry) => {
          const task = updatedTasks.find(
            (t) => t.module_id === entry.module_id
          );

          // If task is completed, mark queue entry as completed
          if (task && task.completed) {
            return { ...entry, status: "completed" };
          }

          // If task has task_id and is processing, mark as processing
          if (task && task.task_id && !task.completed && !task.error) {
            return { ...entry, status: "processing" };
          }

          // If task failed, mark as failed
          if (task && task.error) {
            return { ...entry, status: "failed" };
          }

          // Fetch current queue status for non-completed entries
          // This will catch when waiting tasks get assigned task_ids
          const queueStatus = await fetchQueueStatus(
            submissionId,
            entry.module_id
          );
          if (queueStatus) {
            // Add debug logging
            if (entry.status !== queueStatus.status) {
              console.log(
                `Queue status changed for module ${entry.module_id}: ${entry.status} → ${queueStatus.status}`
              );
            }
            return {
              ...entry,
              status: queueStatus.status,
              position: queueStatus.position,
            };
          }

          return entry;
        })
      );

      // Update tasks to get new task_ids
      const updatedTasksWithNewIds = await Promise.all(
        updatedTasks.map(async (task) => {
          // If task doesn't have task_id but queue shows it's processing, get the task_id
          const queueInfo = updatedQueueEntries.find(
            (q) => q.module_id === task.module_id
          );

          if (!task.task_id && queueInfo?.status === "processing") {
            // Task just started processing - we need to get the task_id
            const queueStatus = await fetchQueueStatus(
              submissionId,
              task.module_id
            );
            if (queueStatus && queueStatus.task_id) {
              return {
                ...task,
                task_id: queueStatus.task_id,
                status: "Starting...",
              };
            }
          }

          return task;
        })
      );
      setTasks(updatedTasksWithNewIds);
      setQueueEntries(updatedQueueEntries);

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
          localStorage.removeItem("queueEntries");
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
  }, [tasks, queueEntries, loading]);

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
      localStorage.removeItem("queueEntries");
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
            <TaskProgressCard tasks={tasks} queueEntries={queueEntries} />
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
