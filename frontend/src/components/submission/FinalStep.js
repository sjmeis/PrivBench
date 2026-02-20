import { useState, useEffect } from "react";
import { Typography, Box, Button } from "@mui/joy";
import { useSnackbar } from "../../contexts/SnackbarProvider";
import TaskProgressCard from "./TaskProgressCard";
import ScoreOverviewCard from "./ScoreOverviewCard";
import { RemoveRedEye } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import CancelEvaluationModal from "./CancelEvaluationModal";
import { API_BASE_URL } from "../../config";

const FinalStep = ({ onComplete, onCancel }) => {
  const [loading, setLoading] = useState(true);
  const [averageScore, setAverageScore] = useState(null);
  const [moduleScores, setModuleScores] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [queueEntries, setQueueEntries] = useState([]);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();

  useEffect(() => {
    const initializeComponent = () => {
      const savedTasks = JSON.parse(localStorage.getItem("tasks"));
      const savedQueueEntries = JSON.parse(
        localStorage.getItem("queueEntries")
      );
      const savedSubmissionId = localStorage.getItem("submission_id");

      // If resuming a previous session
      if (savedTasks && savedSubmissionId) {
        setTasks(savedTasks);
        setQueueEntries(savedQueueEntries || []);
        setSubmissionId(savedSubmissionId);
      } else {
        startBenchmark();
      }
    };

    initializeComponent();
  }, []);

  useEffect(() => {
    if (!loading) {
      // Clean up localStorage when evaluation is complete
      localStorage.removeItem("tasks");
      localStorage.removeItem("queueEntries");
      localStorage.removeItem("submission_id");
    }
  }, [loading]);

  const handleViewSubmissions = () => {
    navigate("/profile", { state: "submissions" });
  };

  const startBenchmark = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/run-benchmark`, {
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
      const initialTasks = allQueueEntries.map((queueEntry) => {
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

      setTasks(initialTasks);
      setQueueEntries(allQueueEntries);
      setSubmissionId(data.submission_id);
      // Save data to localStorage
      localStorage.setItem("tasks", JSON.stringify(initialTasks));
      localStorage.setItem("queueEntries", JSON.stringify(allQueueEntries));
      localStorage.setItem("submission_id", data.submission_id);
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
        `${API_BASE_URL}/queue-status/${submissionId}/${moduleId}`,
        {
          credentials: "include",
        }
      );
      if (response.ok) {
        return await response.json();
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
    if (!loading || !submissionId) {
      return;
    }

    const pollStatus = async () => {
      try {
        if (tasks.length === 0) return; // Don't poll if tasks aren't loaded yet

        // Use current tasks state directly
        if (tasks.every((t) => t.completed || t.error)) {
          setLoading(false);
          return;
        }

        const queuePositionInfos = new Map(); // To store updated position info
        const moduleQueueStatuses = new Map(); // Collect module queue status information for all modules

        // Process all tasks in parallel
        const updatedTasks = await Promise.all(
          tasks.map(async (task) => {
            if (task.completed || task.error) {
              return task; // Skip finished tasks
            }

            // Get the latest queue status for the module
            const queueStatusResponse = await fetchQueueStatus(
              submissionId,
              task.module_id
            );

            if (!queueStatusResponse) {
              return task; // Keep existing task if can't get status
            }

            const queuePositionInfo = queueStatusResponse.queue_position_info;
            const moduleQueueStatus = queueStatusResponse.module_queue_status;

            // Store the module queue status and queue position info for use in TaskProgressCard
            moduleQueueStatuses.set(task.module_id, moduleQueueStatus);
            if (queuePositionInfo) {
              queuePositionInfos.set(task.module_id, queuePositionInfo);
            }

            // If we have a task_id, poll the Celery task and also persist it on the task
            if (queuePositionInfo?.task_id) {
              try {
                const response = await fetch(
                  `${API_BASE_URL}/task-status/${queuePositionInfo.task_id}`,
                  {
                    credentials: "include",
                  }
                );
                const data = await response.json();

                return {
                  ...task,
                  task_id: queuePositionInfo.task_id,
                  progress: Math.round((data.current / data.total) * 100),
                  processedRows: data.processedRows,
                  totalRows: data.totalRows,
                  status: data.status,
                  completed: data.state === "SUCCESS",
                  error: data.state === "FAILURE" ? data.status : null,
                  score: data.score,
                };
              } catch (error) {
                return { ...task, error: "Failed to fetch task status." };
              }
            }

            // No task_id yet — reflect the queue status accurately
            const statusStr = (queuePositionInfo?.status || "").toLowerCase();
            const isProcessing =
              statusStr === "processing" || queuePositionInfo?.position === 0; // treat 0 as processing fallback

            // Task is waiting
            return {
              ...task,
              status: isProcessing
                ? "Processing..."
                : `In queue (Position: ${Math.max(
                    1,
                    Number(queuePositionInfo?.position ?? 1)
                  )})`,
            };
          })
        );

        setTasks(updatedTasks);

        // Update queue entries based on new task states
        setQueueEntries((currentQueueEntries) =>
          currentQueueEntries.map((entry) => {
            const correspondingTask = updatedTasks.find(
              (t) => t.module_id === entry.module_id
            );
            const moduleStatus = moduleQueueStatuses.get(entry.module_id);
            const newPositionInfo = queuePositionInfos.get(entry.module_id);

            if (!correspondingTask) return entry;

            let newStatus = "waiting";
            if (correspondingTask.completed) {
              newStatus = "completed";
            } else if (correspondingTask.error) {
              newStatus = "failed";
            } else if (correspondingTask.task_id) {
              newStatus = "processing";
            }
            return {
              ...entry,
              ...(newPositionInfo || {}), // Overwrite with fresh data (position, etc.)
              // Normalize position for display if backend emitted 0
              position: Math.max(
                1,
                Number(newPositionInfo?.position ?? entry.position ?? 1)
              ),
              status: newStatus,
              moduleQueueStatus: moduleStatus,
            };
          })
        );

        // Check for completion
        const allFinished = updatedTasks.every((t) => t.completed || t.error);
        if (allFinished) {
          setLoading(false);
          if (onComplete) onComplete();
          // Final score calculation
          const successfulTasks = updatedTasks.filter((t) => t.completed);
          if (successfulTasks.length > 0) {
            const scores = successfulTasks.map((t) => ({
              module_name: t.module_name,
              score: t.score,
            }));
            setModuleScores(scores);
            setAverageScore(
              scores.reduce((sum, curr) => sum + curr.score, 0) / scores.length
            );
          }
        }
      } catch (error) {
        console.error("Error in pollStatus:", error);
      }
    };

    const intervalId = setInterval(pollStatus, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [loading, submissionId]);

  const handleCancel = async () => {
    try {
      console.log("Attempting to cancel submission:", submissionId);

      if (!submissionId) {
        throw new Error("No submission ID found");
      }
      const response = await fetch(
        `${API_BASE_URL}/cancel-benchmark/${submissionId}`,
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
      if (onCancel) onCancel();
      navigate("/profile?state=submissions");
    } catch (error) {
      console.error("Error cancelling benchmark:", error);
      showSnackbar("Failed to cancel benchmark", "error");
    }
  };

  return (
    <>
      <Box sx={{ 
        width: "100%", 
        maxWidth: 1000, 
        mx: "auto", 
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}>
        <Typography level="h2" mb={2}>
          {loading ? "Evaluation in Progress" : "Evaluation Summary"}
        </Typography>

        {loading ? (
          <>
            <TaskProgressCard tasks={tasks} queueEntries={queueEntries} />
            <Button
              variant="outlined"
              color="danger"
              onClick={() => setIsCancelModalOpen(true)}
              sx={{ 
                mt: 2, 
                alignSelf: 'flex-start',
                mb: 5
              }}
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
