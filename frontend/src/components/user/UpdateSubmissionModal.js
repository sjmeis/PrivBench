import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Modal,
  ModalClose,
  ModalDialog,
  Typography,
} from "@mui/joy";
import {
  InfoOutlined,
  CloudDownload,
  Close,
  Update,
  RemoveRedEye,
} from "@mui/icons-material";
import { useSnackbar } from "../../contexts/SnackbarProvider";
import { DatasetService } from "../../services/DatasetService";
import { BenchmarkService } from "../../services/BenchmarkService";
import DatasetTableUpdate from "../submission/DatasetTableUpdate";
import TaskProgressCard from "../submission/TaskProgressCard";
import ScoreOverviewCard from "../submission/ScoreOverviewCard";
import { API_BASE_URL } from "../../config";

const UpdateSubmissionModal = ({ isOpen, onClose, submission }) => {
  // State for file upload phase
  const [datasets, setDatasets] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [uploadingDatasetId, setUploadingDatasetId] = useState(null);

  // State for evaluation phase (single task)
  const [task, setTask] = useState(null);
  const [queueEntry, setQueueEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);

  // State for results phase
  const [averageScore, setAverageScore] = useState(null);
  const [newModuleScore, setNewModuleScore] = useState(null);

  const { showSnackbar } = useSnackbar();

  // Effect to initialize datasets when modal opens
  useEffect(() => {
    if (!submission || !isOpen) {
      // Reset all state when modal is closed
      setTask(null);
      setQueueEntry(null);
      setUploadedFiles({});
      setDatasets([]);
      setLoading(false);
      setSubmissionId(null);
      setAverageScore(null);
      setNewModuleScore(null);
      return;
    }

    const fetchData = async () => {
      try {
        const data = await DatasetService.fetchAllDatasetsForUpdate(
          submission.id
        );
        setDatasets(data.datasets);
      } catch (error) {
        showSnackbar("Failed to fetch required datasets", "error");
      }
    };

    fetchData();
  }, [isOpen, submission]);

  // Helper function to fetch queue status for the single module
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

  // Simplified polling effect for single task
  useEffect(() => {
    if (!loading || !submissionId || !task) {
      return;
    }

    const pollStatus = async () => {
      try {
        // Check if the single task is finished
        if (task.completed || task.error) {
          setLoading(false);

          // Calculate final score if task completed successfully
          if (task.completed && task.score !== null) {
            const newScore = {
              module_name: task.module_name,
              score: task.score,
            };
            setNewModuleScore(newScore);
            // Combine old scores with new score for final average
            const oldScores = submission.benchmarkScores.map((s) => s.score);
            const combinedScores = [...oldScores, task.score];
            const totalScore = combinedScores.reduce(
              (sum, score) => sum + score,
              0
            );
            const finalAverage = totalScore / combinedScores.length;

            setAverageScore(finalAverage);

            // Call backend to finalize and save - only once
            try {
              const result = await BenchmarkService.finalizeBenchmarkUpdate(
                submissionId
              );
              showSnackbar(result.message, "success");
            } catch (error) {
              showSnackbar(
                error.response?.data?.message ||
                  "Failed to finalize submission update.",
                "error"
              );
            }
          }
          return;
        }

        // Get queue status for the single module
        const queueStatusResponse = await fetchQueueStatus(
          submissionId,
          task.module_id
        );

        if (!queueStatusResponse) {
          return;
        }

        const queuePositionInfo = queueStatusResponse.queue_position_info;
        const moduleQueueStatus = queueStatusResponse.module_queue_status;

        let updatedTask = { ...task };

        // If task is actively processing
        if (queuePositionInfo.task_id) {
          try {
            const response = await fetch(
              `${API_BASE_URL}/task-status/${queuePositionInfo.task_id}`,
              {
                credentials: "include",
              }
            );
            const data = await response.json();

            updatedTask = {
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
            updatedTask = { ...task, error: "Failed to fetch task status." };
          }
        } else {
          // Task is waiting in queue
          updatedTask = {
            ...task,
            status: `In queue (Position: ${queuePositionInfo.position})`,
          };
        }

        setTask(updatedTask);

        // Update queue entry status
        if (queueEntry) {
          let newStatus = "waiting";
          if (updatedTask.completed) {
            newStatus = "completed";
          } else if (updatedTask.error) {
            newStatus = "failed";
          } else if (updatedTask.task_id) {
            newStatus = "processing";
          }

          setQueueEntry({
            ...queueEntry,
            ...queuePositionInfo,
            status: newStatus,
            moduleQueueStatus: moduleQueueStatus,
          });
        }
      } catch (error) {
        console.error("Error in pollStatus:", error);
      }
    };

    const intervalId = setInterval(pollStatus, 2000);
    return () => clearInterval(intervalId);
  }, [loading, submissionId, task]);

  // Form validation
  const isFormValid = () => {
    return (
      Array.isArray(datasets) &&
      datasets.every((dataset) => uploadedFiles[dataset.id])
    );
  };

  // Start the update process
  const updateSubmission = async () => {
    if (!isFormValid()) {
      showSnackbar("Please upload all required datasets", "error");
      return;
    }

    try {
      setLoading(true);
      const data = await BenchmarkService.startBenchmarkUpdate(submission.id);

      if (data.message === "No new modules to benchmark") {
        showSnackbar("This submission is already up-to-date.", "info");
        setLoading(false);
        onClose();
        return;
      }

      // Since we have only one new module, get the first (and only) entry
      const queueEntry = data.queue_entries[0];
      const immediateTask = data.immediate_tasks?.find(
        (task) => task.module_id === queueEntry.module_id
      );

      // Initialize single task state
      const initialTask = {
        task_id: immediateTask?.task_id || null,
        module_id: queueEntry.module_id,
        module_name: queueEntry.module_name,
        queue_entry_id: queueEntry.queue_entry_id,
        progress: 0,
        processedRows: 0,
        totalRows: 0,
        status: immediateTask
          ? "Starting..."
          : `In queue (Position: ${queueEntry.position})`,
        completed: false,
        score: null,
        error: null,
      };

      setTask(initialTask);
      setQueueEntry(queueEntry);
      setSubmissionId(data.submission_id || submission.id);
    } catch (error) {
      console.error("Error starting benchmark update:", error);
      showSnackbar(
        error.response?.data?.message || "Failed to start benchmark update",
        "error"
      );
      setLoading(false);
    }
  };

  // Handle file selection for datasets
  const handleFileSelect = async (event, originalDatasetId) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingDatasetId(originalDatasetId);

    const result = await DatasetService.uploadPrivatizedDataset({
      file,
      submissionId: submission.id,
      originalDatasetId,
      setUploadingDatasetId,
      setUploadedFiles,
      event,
    });

    if (result.success) {
      setUploadedFiles((prev) => ({
        ...prev,
        [originalDatasetId]: file,
      }));
      showSnackbar(result.message, "success");
    } else {
      showSnackbar(result.message, "error");
    }
  };

  // Download missing datasets
  const handleDownloadMissingDatasets = async () => {
    try {
      await DatasetService.downloadDatasets(
        datasets.map((dataset) => dataset.name)
      );
      showSnackbar(
        "All selected datasets were downloaded successfully!",
        "success"
      );
    } catch (error) {
      showSnackbar("Error downloading datasets", "error");
    }
  };

  // Don't render if modal is closed or submission is null
  if (!isOpen || !submission) {
    return null;
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <ModalDialog
        sx={{ width: "90vw", maxWidth: "1200px", overflowX: "hidden" }}
      >
        <DialogTitle sx={{ alignItems: "center" }}>
          Update Submission
          <Typography variant="soft" color="primary">
            {submission ? submission.name : "Loading..."}
          </Typography>
        </DialogTitle>
        <Divider sx={{ marginBottom: "10px" }} />

        <DialogContent sx={{ overflowX: "hidden" }}>
          {/* Phase 1: File Upload */}
          {!task ? (
            <>
              <Box
                sx={{
                  mb: 3,
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <Typography level="h5" fontWeight="bold">
                  Step 1: Download missing datasets
                </Typography>
                <Box sx={{ textAlign: "center" }}>
                  <Button
                    fullWidth
                    variant="solid"
                    startDecorator={<CloudDownload />}
                    onClick={handleDownloadMissingDatasets}
                    disabled={datasets.length === 0}
                  >
                    Download Missing Datasets
                  </Button>
                </Box>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <Typography level="h5" fontWeight="bold">
                  Step 2: Upload privatized dataset for the new benchmarking
                  module
                </Typography>
                <Typography
                  sx={{ marginY: 2, p: 1 }}
                  startDecorator={<InfoOutlined />}
                  variant="soft"
                  color="neutral"
                  level="body1"
                >
                  A privatized version of the dataset in .csv format must be
                  uploaded for the new module.
                </Typography>
                {datasets.length > 0 && (
                  <DatasetTableUpdate
                    datasets={datasets}
                    uploadedFiles={uploadedFiles}
                    uploadingDatasetId={uploadingDatasetId}
                    onFileSelect={handleFileSelect}
                  />
                )}
              </Box>
            </>
          ) : /* Phase 2: Processing */
          loading ? (
            <>
              <Typography level="h3">Evaluation in Progress</Typography>
              {/* Pass single task as array to TaskProgressCard for compatibility */}
              <TaskProgressCard
                tasks={[task]}
                queueEntries={queueEntry ? [queueEntry] : []}
              />
              <Typography level="body2" sx={{ mt: 2, textAlign: "center" }}>
                {task.status.includes("Position")
                  ? "Your submission is queued. Please wait for your turn."
                  : "Your submission is being processed."}
              </Typography>
            </>
          ) : (
            /* Phase 3: Results */
            <>
              <Typography level="h3" mb={2}>
                Updated Results
              </Typography>
              <ScoreOverviewCard
                oldModulesScores={submission.benchmarkScores}
                moduleScores={newModuleScore ? [newModuleScore] : []}
                averageScore={averageScore}
              />
            </>
          )}
        </DialogContent>

        {/* Action buttons based on current phase */}
        {!loading && averageScore !== null && (
          <DialogActions>
            <Button
              fullWidth
              variant="solid"
              color="primary"
              onClick={onClose}
              endDecorator={<RemoveRedEye />}
            >
              View My Submissions
            </Button>
          </DialogActions>
        )}

        {!task && (
          <DialogActions>
            <Button
              onClick={updateSubmission}
              disabled={!isFormValid() || loading}
              color={isFormValid() ? "success" : "primary"}
              endDecorator={<Update />}
            >
              Update Submission
            </Button>
            <Button
              onClick={onClose}
              variant="soft"
              color="neutral"
              disabled={loading}
              startDecorator={<Close />}
            >
              {loading ? "Please wait..." : "Close"}
            </Button>
          </DialogActions>
        )}

        <ModalClose />
      </ModalDialog>
    </Modal>
  );
};

export default UpdateSubmissionModal;
