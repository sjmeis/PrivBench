import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  ListItem,
  ListItemDecorator,
  Modal,
  ModalClose,
  ModalDialog,
  Typography,
  List,
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

const UpdateSubmissionModal = ({ isOpen, onClose, submission, onUpdated }) => {
  // State for file upload phase
  const [datasets, setDatasets] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [uploadingDatasetId, setUploadingDatasetId] = useState(null);

  // State for evaluation phase (single task)
  const [tasks, setTasks] = useState([]);
  const [queueEntries, setQueueEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);
  const [modulesToUpdate, setModulesToUpdate] = useState([]);
  const [rerunModules, setRerunModules] = useState([]);
  const [selectedRerunIds, setSelectedRerunIds] = useState(new Set());

  // State for results phase
  const [averageScore, setAverageScore] = useState(null);
  const [newModuleScores, setNewModuleScores] = useState([]);
  const [finalized, setFinalized] = useState(false);
  const { showSnackbar } = useSnackbar();

  const intervalRef = useRef(null);
  const tasksRef = useRef([]);

  // Effect to initialize datasets when modal opens
  useEffect(() => {
    if (!submission || !isOpen) {
      // Reset all state when modal is closed
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setTasks([]);
      tasksRef.current = [];
      setQueueEntries([]);
      setUploadedFiles({});
      setDatasets([]);
      setLoading(false);
      setSubmissionId(null);
      setAverageScore(null);
      setNewModuleScores([]);
      setFinalized(false);
      setModulesToUpdate([]);
      setRerunModules([]);
      setSelectedRerunIds(new Set());
      return;
    }

    // Fetch modules and datasets to update from backend
    const fetchUpdateData = async () => {
      try {
        const info = await BenchmarkService.getSubmissionUpdatesInfo(
          submission.id
        );
        const modules = info.modules_to_update || [];
        setModulesToUpdate(modules);

        // Build dataset list for modules that require dataset upload
        const datasets = modules
          .filter(
            (module) =>
              module.requires_dataset_upload &&
              module.dataset_id &&
              module.dataset_name
          )
          .map((module) => ({
            id: module.dataset_id,
            name: module.dataset_name,
            module_id: module.module_id,
            module_name: module.module_name,
            reasons: module.reasons || [],
          }));
        setDatasets(datasets);

        // Reruns exclude any module that requires dataset upload
        const reruns = modules
          .filter((module) => !module.requires_dataset_upload)
          .map((module) => ({
            ...module,
            reasons: module.reasons || [],
          }));
        setRerunModules(reruns);
        setSelectedRerunIds(new Set(reruns.map((module) => module.module_id))); // preselect all by default
      } catch (error) {
        showSnackbar("Failed to fetch update info", "error");
        setModulesToUpdate([]);
        setDatasets([]);
        setRerunModules([]);
        setSelectedRerunIds(new Set());
      }
    };

    fetchUpdateData();
  }, [isOpen, submission, showSnackbar]);

  // Polling effect
  useEffect(() => {
    if (!loading || !submissionId || tasks.length === 0) return;

    const fetchQueueStatus = async (subId, moduleId) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/queue-status/${subId}/${moduleId}`,
          { credentials: "include" }
        );
        if (response.ok) return await response.json();
      } catch (err) {
        console.error(`Queue status error for module ${moduleId}:`, err);
      }
      return null;
    };

    const pollStatus = async () => {
      try {
        const currentTasks = tasksRef.current;
        if (currentTasks.length === 0) return;

        const queuePositionInfos = new Map();
        const moduleQueueStatuses = new Map();

        const updatedTasks = await Promise.all(
          currentTasks.map(async (task) => {
            if (task.completed || task.error) return task;

            const queueStatusResponse = await fetchQueueStatus(
              submissionId,
              task.module_id
            );
            if (!queueStatusResponse) return task;

            const queuePositionInfo = queueStatusResponse.queue_position_info;
            const moduleQueueStatus = queueStatusResponse.module_queue_status;

            moduleQueueStatuses.set(task.module_id, moduleQueueStatus);
            if (queuePositionInfo) {
              queuePositionInfos.set(task.module_id, queuePositionInfo);
            }

            // Only trust queue task_id when the queue says "processing"
            const qStatusRaw = String(
              queuePositionInfo?.status || ""
            ).toLowerCase();
            const qIsProcessing = qStatusRaw === "processing";

            // Prefer an already-known task_id. Otherwise
            // use queue-provided task_id only if processing.
            let activeTaskId = task.task_id || null;
            if (!activeTaskId && qIsProcessing && queuePositionInfo?.task_id) {
              activeTaskId = queuePositionInfo.task_id;
            }

            if (activeTaskId) {
              try {
                const response = await fetch(
                  `${API_BASE_URL}/task-status/${activeTaskId}`,
                  { credentials: "include" }
                );
                const data = await response.json();
                const current = Number(data.current ?? data.processedRows ?? 0);
                const total = Number(data.total ?? data.totalRows ?? 0);
                const progress =
                  total > 0
                    ? Math.round((current / total) * 100)
                    : Number(data.progress) || 0;
                const state = data.state || data.status;

                // if we got a SUCCESS but queue isn't processing yet and
                // this task_id did not come from an already-known task, ignore it
                if (
                  String(state).toUpperCase() === "SUCCESS" &&
                  !qIsProcessing &&
                  task.task_id == null
                ) {
                  return {
                    ...task,
                    status: `In queue (Position: ${Math.max(
                      1,
                      Number(queuePositionInfo?.position ?? 1)
                    )})`,
                  };
                }

                return {
                  ...task,
                  task_id: activeTaskId,
                  progress,
                  processedRows: current,
                  totalRows: total,
                  status: data.status || state,
                  completed: String(state).toUpperCase() === "SUCCESS",
                  error:
                    String(state).toUpperCase() === "FAILURE"
                      ? data.error || data.status
                      : null,
                  score: data.score ?? data.result?.score ?? task.score ?? null,
                };
              } catch (error) {
                return { ...task, error: "Failed to fetch task status." };
              }
            }

            // No task id yet: infer waiting/processing only
            const statusStr = String(
              queuePositionInfo?.status || ""
            ).toLowerCase();
            const isProcessing =
              statusStr === "processing" ||
              queuePositionInfo?.position === 0 ||
              queuePositionInfo?.position === 1;

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
        tasksRef.current = updatedTasks;

        setQueueEntries((current) =>
          (current || []).map((entry) => {
            const correspondingTask = updatedTasks.find(
              (t) => t.module_id === entry.module_id
            );
            const moduleStatus = moduleQueueStatuses.get(entry.module_id);
            const newPositionInfo = queuePositionInfos.get(entry.module_id);
            if (!correspondingTask) return entry;

            let newStatus = "waiting";
            if (correspondingTask.completed) newStatus = "completed";
            else if (correspondingTask.error) newStatus = "failed";
            else if (correspondingTask.task_id) newStatus = "processing";

            return {
              ...entry,
              ...(newPositionInfo || {}),
              position: Math.max(
                1,
                Number(newPositionInfo?.position ?? entry.position ?? 1)
              ),
              status: newStatus,
              moduleQueueStatus: moduleStatus,
            };
          })
        );

        const allFinished = updatedTasks.every((t) => t.completed || t.error);
        if (allFinished && !finalized) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setLoading(false);

          const scores = updatedTasks
            .filter((t) => t.completed && t.score != null)
            .map((t) => ({ module_name: t.module_name, score: t.score }));
          setNewModuleScores(scores);

          const oldScores = (submission.benchmarkScores || []).map(
            (s) => s.score
          );
          const combined = [...oldScores, ...scores.map((s) => s.score)];
          setAverageScore(
            combined.length
              ? combined.reduce((a, b) => a + b, 0) / combined.length
              : null
          );

          try {
            const result = await BenchmarkService.finalizeBenchmarkUpdate(
              submissionId
            );
            showSnackbar(result.message || "Submission updated", "success");
          } catch (error) {
            showSnackbar(
              error.response?.data?.message ||
                "Failed to finalize submission update.",
              "error"
            );
          } finally {
            setFinalized(true);
            try {
              onUpdated && onUpdated();
            } catch {}
          }
        }
      } catch (err) {
        console.error("Error in pollStatus:", err);
      }
    };

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(pollStatus, 2000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [loading, submissionId, tasks.length]);

  const isFormValid = () => {
    // For dataset-required modules, ensure uploads exist
    const datasetOk =
      datasets.length === 0 ||
      datasets.every((dataset) => uploadedFiles[dataset.id]);
    // For rerun modules, require at least one selection when reruns exist
    const rerunOk = rerunModules.length === 0 || selectedRerunIds.size > 0;
    return datasetOk && rerunOk;
  };

  // Start the update process
  const updateSubmission = async () => {
    if (!isFormValid()) {
      showSnackbar("Please upload required datasets", "error");
      return;
    }

    try {
      setLoading(true);

      // Include dataset-required modules that now have an uploaded privatized dataset
      const datasetModuleIdsToQueue = (modulesToUpdate || [])
        .filter(
          (m) =>
            m.requires_dataset_upload &&
            m.dataset_id &&
            uploadedFiles[m.dataset_id]
        )
        .map((m) => m.module_id);

      // Union rerun selections and dataset-required modules
      const selectedIds = Array.from(
        new Set([...Array.from(selectedRerunIds), ...datasetModuleIdsToQueue])
      );

      const response = await BenchmarkService.startBenchmarkUpdate(
        submission.id,
        selectedIds
      );

      if (!response.queue_entries || response.queue_entries.length === 0) {
        showSnackbar(
          response.message ||
            "No modules were queued. Upload required datasets or select modules to update.",
          "warning"
        );
        setLoading(false);
        return;
      }

      // Initialize tasks state
      const allQueueEntries = response.queue_entries || [];
      const immediateTasks = response.immediate_tasks || [];
      const immediateIds = new Set(
        immediateTasks.map((task) => task.module_id)
      );

      const enrichedQueueEntries = allQueueEntries.map((queueEntry) => ({
        ...queueEntry,
        status: immediateIds.has(queueEntry.module_id)
          ? "processing"
          : String(queueEntry.status || "waiting").toLowerCase(),
        position: Math.max(1, Number(queueEntry.position ?? 1)),
      }));

      const initialTasks = enrichedQueueEntries.map((queueEntry) => {
        const immediate = immediateTasks.find(
          (task) => task.module_id === queueEntry.module_id
        );
        return {
          task_id: immediate?.task_id || null,
          module_id: queueEntry.module_id,
          module_name: queueEntry.module_name,
          queue_entry_id: queueEntry.queue_entry_id,
          progress: 0,
          processedRows: 0,
          totalRows: 0,
          status: immediate ? "Processing..." : "Waiting in queue...",
          completed: false,
          score: null,
          error: null,
        };
      });

      setTasks(initialTasks);
      tasksRef.current = initialTasks;
      setQueueEntries(enrichedQueueEntries);
      setSubmissionId(response.submission_id || submission.id);
      setFinalized(false);
    } catch (error) {
      console.error("Error starting benchmark update:", error);
      showSnackbar(
        error.response?.data?.message || "Failed to start benchmark update",
        "error"
      );
      setLoading(false);
    }
  };

  const handleModalClose = (event, reason) => {
    if (reason === "backdropClick" || reason === "escapeKeyDown") return;
    if (loading) return;
    onClose && onClose();
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
      onClose={handleModalClose}
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
          {tasks.length === 0 ? (
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
                  Step 2: Upload privatized datasets for new/updated modules
                  module
                </Typography>
                <Typography
                  sx={{ marginY: 2, p: 1 }}
                  startDecorator={<InfoOutlined />}
                  variant="soft"
                  color="neutral"
                  level="body1"
                >
                  A privatized .csv dataset is required for the modules below.
                  If a module only had logic/requirements changes, no dataset
                  upload is needed.
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

              {/* Section for modules requiring only reruns */}
              {rerunModules.length > 0 && (
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    mt: 3,
                  }}
                >
                  <Typography level="h5" fontWeight="bold">
                    Step 3: Select modules to rerun (logic/requirements changes)
                  </Typography>
                  <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                    Selected: {selectedRerunIds.size} / {rerunModules.length}
                  </Typography>
                  <Typography
                    sx={{ marginY: 2, p: 1 }}
                    startDecorator={<InfoOutlined />}
                    variant="soft"
                    color="neutral"
                    level="body1"
                  >
                    These modules changed and only require rerunning the
                    submission. No dataset upload is needed.
                  </Typography>
                  <List size="sm" sx={{ p: 0 }}>
                    {rerunModules.map((module) => (
                      <ListItem key={module.module_id} sx={{ px: 0 }}>
                        <ListItemDecorator sx={{ mr: 1 }}>
                          <Checkbox
                            checked={selectedRerunIds.has(module.module_id)}
                            onChange={(e) => {
                              setSelectedRerunIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked)
                                  next.add(module.module_id);
                                else next.delete(module.module_id);
                                return next;
                              });
                            }}
                          />
                        </ListItemDecorator>
                        <Typography>
                          {module.module_name}
                          {Array.isArray(module.reasons) &&
                          module.reasons.length > 0
                            ? ` — ${module.reasons.join(", ")}`
                            : ""}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </>
          ) : /* Phase 2: Processing */
          loading ? (
            <>
              <Typography level="h3">Evaluation in Progress</Typography>
              <TaskProgressCard tasks={tasks} queueEntries={queueEntries} />
              <Typography level="body2" sx={{ mt: 2, textAlign: "center" }}>
                Your submission is queued or processing. This may take a few
                minutes.
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
                moduleScores={newModuleScores}
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

        {tasks.length === 0 && (
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
