/* Copyright (C) 2026 Stephen Meisenbacher

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.*/

import { useState, useEffect, useRef } from "react"; 
import { Typography, Box, Button } from "@mui/joy";
import { useSnackbar } from "../../contexts/SnackbarProvider";
import TaskProgressCard from "./TaskProgressCard";
import ScoreOverviewCard from "./ScoreOverviewCard";
import { RemoveRedEye, EmailOutlined } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import CancelEvaluationModal from "./CancelEvaluationModal";
import { API_BASE_URL } from "../../config";

const FinalStep = ({ metadata, onStart, onComplete, onCancel }) => {
  const [loading, setLoading] = useState(true);
  const [averageScore, setAverageScore] = useState(null);
  const [moduleScores, setModuleScores] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [queueEntries, setQueueEntries] = useState([]);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();

  // Keep tracking reference up to date on every state change frame
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    const initializeComponent = () => {
      const savedTasks = JSON.parse(localStorage.getItem("tasks"));
      const savedQueueEntries = JSON.parse(localStorage.getItem("queueEntries"));
      const savedSubmissionId = localStorage.getItem("submission_id");

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
      localStorage.removeItem("tasks");
      localStorage.removeItem("queueEntries");
      localStorage.removeItem("submission_id");
    }
  }, [loading]);

  const handleViewSubmissions = () => {
    navigate("/profile", { state: "submissions" });
  };

  const onStartRef = useRef(onStart);
  useEffect(() => {
    onStartRef.current = onStart;
  }, [onStart]);

  const startBenchmark = async () => {
    try {
      if (onStartRef.current) {
        onStartRef.current();
      }

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
      
      localStorage.setItem("tasks", JSON.stringify(initialTasks));
      localStorage.setItem("queueEntries", JSON.stringify(allQueueEntries));
      localStorage.setItem("submission_id", data.submission_id);
    } catch (err) {
      console.error("Benchmark error:", err);
      showSnackbar(err.message, "error");
      setLoading(false);
    }
  };

  const fetchQueueStatus = async (submissionId, moduleId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/queue-status/${submissionId}/${moduleId}`,
        { credentials: "include" }
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error(`Error fetching queue status for module ${moduleId}:`, error);
    }
    return null;
  };

  useEffect(() => {
    if (!loading || !submissionId) {
      return;
    }

    const pollStatus = async () => {
      try {
        const currentTasks = tasksRef.current;
        if (currentTasks.length === 0) return;

        if (currentTasks.every((t) => t.completed || t.error)) {
          setLoading(false);
          return;
        }

        const queuePositionInfos = new Map(); 
        const moduleQueueStatuses = new Map(); 

        const updatedTasks = await Promise.all(
          currentTasks.map(async (task) => {
            if (task.completed || task.error) {
              return task; 
            }

            const queueStatusResponse = await fetchQueueStatus(submissionId, task.module_id);
            const queuePositionInfo = queueStatusResponse?.queue_position_info;
            const moduleQueueStatus = queueStatusResponse?.module_queue_status;

            if (moduleQueueStatus) {
              moduleQueueStatuses.set(task.module_id, moduleQueueStatus);
            }
            if (queuePositionInfo) {
              queuePositionInfos.set(task.module_id, queuePositionInfo);
            }

            const activeTaskId = queuePositionInfo?.task_id || task.task_id;

            if (activeTaskId) {
              try {
                const response = await fetch(
                  `${API_BASE_URL}/task-status/${activeTaskId}`,
                  { credentials: "include" }
                );
                const data = await response.json();

                return {
                  ...task,
                  task_id: activeTaskId,
                  progress: data.total ? Math.round((data.current / data.total) * 100) : 100,
                  processedRows: data.processedRows || task.processedRows,
                  totalRows: data.totalRows || task.totalRows,
                  status: data.status || "Completed",
                  completed: data.state === "SUCCESS",
                  error: data.state === "FAILURE" ? (data.status || "Task execution aborted.") : null,
                  score: data.score !== undefined ? data.score : null,
                };
              } catch (error) {
                console.error(`Failed fetching fallback task status for ${activeTaskId}:`, error);
              }
            }

            if (!activeTaskId && queuePositionInfo) {
              const statusStr = (queuePositionInfo.status || "").toLowerCase();
              const isProcessing = statusStr === "processing" || queuePositionInfo.position === 0;

              return {
                ...task,
                status: isProcessing
                  ? "Processing..."
                  : `In queue (Position: ${Math.max(1, Number(queuePositionInfo.position ?? 1))})`,
              };
            }

            return task;
          })
        );

        setTasks(updatedTasks);
        localStorage.setItem("tasks", JSON.stringify(updatedTasks));

        setQueueEntries((currentQueueEntries) => {
          const updatedEntries = currentQueueEntries.map((entry) => {
            const correspondingTask = updatedTasks.find((t) => t.module_id === entry.module_id);
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
              ...(newPositionInfo || {}), 
              position: Math.max(1, Number(newPositionInfo?.position ?? entry.position ?? 1)),
              status: newStatus,
              moduleQueueStatus: moduleStatus,
            };
          });
          localStorage.setItem("queueEntries", JSON.stringify(updatedEntries));
          return updatedEntries;
        });

        const allFinished = updatedTasks.every((t) => t.completed || t.error);
        if (allFinished) {
          const successfulTasks = updatedTasks.filter((t) => t.completed);
          
          if (successfulTasks.length > 0) {
            const scores = successfulTasks.map((t) => ({
              module_name: t.module_name,
              score: t.score,
            }));
            
            setModuleScores(scores);
            setAverageScore(scores.reduce((sum, curr) => sum + curr.score, 0) / scores.length);
            setLoading(false);
            if (onComplete) onComplete();
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Error in pollStatus:", error);
      }
    };

    pollStatus();
    const intervalId = setInterval(pollStatus, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [loading, submissionId]);

  const handleCancel = async () => {
    try {
      if (!submissionId) throw new Error("No submission ID found");
      
      const response = await fetch(`${API_BASE_URL}/cancel-benchmark/${submissionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message;
        } catch {
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

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
      <Box sx={{ width: "100%", maxWidth: 1000, mx: "auto", p: 3, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Typography level="h2" mb={2}>
          {loading ? "Evaluation in progress!" : "Evaluation Summary"}
        </Typography>
        {metadata?.modelName && (
          <Typography level="h3" textColor="text.secondary" sx={{ mb: 2 }}>
            Method: <strong>{metadata.modelName}</strong>
          </Typography>
        )}

        {loading ? (
          <>
            <Box 
              sx={{ 
                mb: 2, 
                p: 2, 
                bgcolor: 'primary.softBg', 
                borderRadius: 'sm', 
                border: '1px solid', 
                borderColor: 'primary.softBorder',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2
              }}
            >
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <EmailOutlined color="primary" />
                <Typography level="body-sm" sx={{ color: 'primary.shortText' }}>
                  Feel free to navigate away or close the tab — your evaluation will continue to run in the background, and <strong>we will email you when it finishes!</strong>.
                </Typography>
              </Box>
              <Button 
                size="sm" 
                variant="outlined" 
                color="primary" 
                onClick={handleViewSubmissions}
                startDecorator={<RemoveRedEye />}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Go to My Submissions
              </Button>
            </Box>

            <TaskProgressCard tasks={tasks} queueEntries={queueEntries} />
            <Button variant="outlined" color="danger" onClick={() => setIsCancelModalOpen(true)} sx={{ mt: 2, alignSelf: 'flex-start', mb: 5 }}>
              Cancel Evaluation
            </Button>
          </>
        ) : moduleScores.length > 0 ? (
          <>
            <ScoreOverviewCard averageScore={averageScore} moduleScores={moduleScores} />
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.level1', borderRadius: 'sm', border: '1px border', borderColor: 'divider' }}>
              <Typography level="body-sm" sx={{ fontStyle: 'italic' }}>
                🔒 This submission is currently <strong>Private</strong>. You can make it public to appear on the Rankings leaderboard via your profile.
              </Typography>
            </Box>
            <Button fullWidth variant="solid" color="primary" sx={{ mt: 3 }} onClick={handleViewSubmissions} endDecorator={<RemoveRedEye />}>
              Finish and View My Submissions
            </Button>
          </>
        ) : (
          <Typography level="h2" mb={2} color="danger">
            Evaluation Failed
          </Typography>
        )}
      </Box>
      <CancelEvaluationModal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} handleCancel={handleCancel} />
    </>
  );
};

export default FinalStep;