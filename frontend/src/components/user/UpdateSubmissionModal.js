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

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemDecorator,
  Modal,
  ModalClose,
  ModalDialog,
  Sheet,
  Typography,
} from "@mui/joy";
import {
  InfoOutlined,
  CloudDownload,
  Close,
  Update,
  RemoveRedEye,
  UploadFile,
  PlayArrow,
} from "@mui/icons-material";
import { useSnackbar } from "../../contexts/SnackbarProvider";
import { DatasetService } from "../../services/DatasetService";
import { BenchmarkService } from "../../services/BenchmarkService";
import DatasetTableUpdate from "../submission/DatasetTableUpdate";
import TaskProgressCard from "../submission/TaskProgressCard";
import ScoreOverviewCard from "../submission/ScoreOverviewCard";
import { API_BASE_URL } from "../../config";

const REASON_DETAILS = {
  dataset: { label: "Dataset change", color: "primary" },
  logic: { label: "Logic update", color: "success" },
  requirements: { label: "Requirements update", color: "warning" },
  modified: { label: "Major update", color: "danger" },
  new: { label: "New module", color: "info" },
};

const PROGRESS_STORAGE_PREFIX = "submission-update-progress-";
const hasWindow = typeof window !== "undefined";

const getProgressStorageKey = (submissionId) =>
  `${PROGRESS_STORAGE_PREFIX}${submissionId}`;

const loadPersistedProgress = (submissionId) => {
  if (!submissionId || !hasWindow) return null;
  try {
    const raw = window.localStorage.getItem(
      getProgressStorageKey(submissionId)
    );
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Failed to load persisted submission progress", error);
    return null;
  }
};

const persistProgressState = (submissionId, state = {}) => {
  if (!submissionId || !hasWindow) return;
  try {
    window.localStorage.setItem(
      getProgressStorageKey(submissionId),
      JSON.stringify({ ...state, timestamp: Date.now() })
    );
  } catch (error) {
    console.warn("Failed to persist submission progress", error);
  }
};

const clearPersistedProgress = (submissionId) => {
  if (!submissionId || !hasWindow) return;
  try {
    window.localStorage.removeItem(getProgressStorageKey(submissionId));
  } catch (error) {
    console.warn("Failed to clear persisted submission progress", error);
  }
};

const getModuleReasons = (module) => {
  if (Array.isArray(module?.reasons) && module.reasons.length > 0) {
    return module.reasons;
  }
  if (module?.reason) {
    return [module.reason];
  }
  return [];
};

const formatReasonChips = (module) => {
  const moduleReasons = getModuleReasons(module);
  const chips = [];
  if (module.requires_dataset_upload) {
    chips.push({
      key: `${module.module_id}-dataset`,
      label: REASON_DETAILS.dataset.label,
      color: REASON_DETAILS.dataset.color,
    });
  }

  moduleReasons
    .filter((reason) =>
      module.requires_dataset_upload ? reason !== "dataset" : true
    )
    .forEach((reason, idx) => {
      const meta = REASON_DETAILS[reason] || {
        label: reason,
        color: "neutral",
      };
      chips.push({
        key: `${module.module_id}-${reason}-${idx}`,
        label: meta.label,
        color: meta.color,
      });
    });
  return chips;
};

const UpdateSubmissionModal = ({ isOpen, onClose, submission, onUpdated }) => {
  const [modulesToUpdate, setModulesToUpdate] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [uploadingDatasetId, setUploadingDatasetId] = useState(null);
  const [rerunModules, setRerunModules] = useState([]);
  const [selectedRerunIds, setSelectedRerunIds] = useState(new Set());

  const [tasks, setTasks] = useState([]);
  const [queueEntries, setQueueEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);
  const [newModuleScores, setNewModuleScores] = useState([]);
  const [averageScore, setAverageScore] = useState(null);
  const [finalized, setFinalized] = useState(false);
  const [isStartingUpdate, setIsStartingUpdate] = useState(false);

  const { showSnackbar } = useSnackbar();
  const intervalRef = useRef(null);
  const tasksRef = useRef([]);
  const queueEntriesRef = useRef([]);

  const resetState = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setModulesToUpdate([]);
    setDatasets([]);
    setUploadedFiles({});
    setUploadingDatasetId(null);
    setRerunModules([]);
    setSelectedRerunIds(new Set());
    setTasks([]);
    tasksRef.current = [];
    setQueueEntries([]);
    queueEntriesRef.current = [];
    setLoading(false);
    setSubmissionId(null);
    setNewModuleScores([]);
    setAverageScore(null);
    setFinalized(false);
  }, []);

  const previousSubmissionIdRef = useRef(null);

  useEffect(() => {
    const currentId = submission?.id;
    const previousId = previousSubmissionIdRef.current;

    // When switching to a different submission, reset state.
    if (currentId && previousId && currentId !== previousId) {
      resetState();
    }

    // Record the latest non-null submission id so we can detect switches.
    if (currentId) {
      previousSubmissionIdRef.current = currentId;
    }
  }, [submission?.id, resetState]);

  useEffect(() => {
    if (!isOpen || !submission) return;

    const stored = loadPersistedProgress(submission.id);
    if (stored?.tasks?.length) {
      setSubmissionId(submission.id);
      setTasks(stored.tasks);
      tasksRef.current = stored.tasks;
      const restoredQueueEntries = stored.queueEntries || [];
      setQueueEntries(restoredQueueEntries);
      queueEntriesRef.current = restoredQueueEntries;
      setLoading(true);
      return;
    }

    // No persisted progress: ensure we start from selection view.
    setLoading(false);
    setAverageScore(null);
    setNewModuleScores([]);
    setFinalized(false);
    setTasks([]);
    tasksRef.current = [];
    setQueueEntries([]);
    queueEntriesRef.current = [];
  }, [isOpen, submission]);

  const hydrateOngoingTasks = useCallback(async (subId, modules = []) => {
    if (!subId || modules.length === 0) return false;

    try {
      const statuses = await Promise.all(
        modules.map(async (module) => {
          try {
            const res = await fetch(
              `${API_BASE_URL}/queue-status/${subId}/${module.module_id}`,
              {
                credentials: "include",
              }
            );
            if (!res.ok) return null;
            const data = await res.json();
            return { module, data };
          } catch (error) {
            console.warn("queue-status hydrate error", module.module_id, error);
            return null;
          }
        })
      );

      const activeEntries = statuses.filter((status) => {
        if (!status?.data?.queue_position_info) return false;
        const info = status.data.queue_position_info;
        const statusStr = String(info.status || "").toLowerCase();
        const hasId = Boolean(info.queue_entry_id || info.task_id);
        const isActive = statusStr === "waiting" || statusStr === "processing";
        return hasId && isActive;
      });

      if (activeEntries.length === 0) {
        return false;
      }

      const enrichedQueueEntries = activeEntries.map(({ module, data }) => {
        const queueInfo = data.queue_position_info || {};
        return {
          module_id: module.module_id,
          module_name: module.module_name,
          queue_entry_id: queueInfo.queue_entry_id,
          task_id: queueInfo.task_id,
          position: Number.isFinite(Number(queueInfo.position))
            ? Number(queueInfo.position)
            : null,
          status: String(queueInfo.status || "waiting").toLowerCase(),
          moduleQueueStatus: data.module_queue_status,
        };
      });

      const initialTasks = enrichedQueueEntries.map((entry) => {
        const isProcessing = entry.status === "processing";
        return {
          task_id: isProcessing ? entry.task_id || null : null,
          module_id: entry.module_id,
          module_name: entry.module_name,
          queue_entry_id: entry.queue_entry_id,
          progress: 0,
          processedRows: 0,
          totalRows: 0,
          status: isProcessing
            ? "Processing..."
            : entry.position != null
            ? `In queue (Position: ${entry.position})`
            : "Waiting in queue...",
          completed: false,
          score: null,
          error: null,
        };
      });

      setSubmissionId(subId);
      setTasks(initialTasks);
      tasksRef.current = initialTasks;
      setQueueEntries(enrichedQueueEntries);
      queueEntriesRef.current = enrichedQueueEntries;
      setLoading(true);
      persistProgressState(subId, {
        tasks: initialTasks,
        queueEntries: enrichedQueueEntries,
      });
      return true;
    } catch (error) {
      console.error("Failed to hydrate ongoing tasks", error);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !submission) return;
    let ignore = false;

    const fetchUpdateData = async () => {
      try {
        const info = await BenchmarkService.getSubmissionUpdatesInfo(
          submission.id
        );
        if (ignore) return;
        const modules = info.modules_to_update || [];
        setModulesToUpdate(modules);

        const datasetModules = modules
          .filter(
            (module) =>
              module.requires_dataset_upload &&
              (module.dataset_id || module.dataset_ids?.length > 0)
          )
          .flatMap((module) => {
            const ids = module.dataset_ids ?? (module.dataset_id ? [module.dataset_id] : []);
            const names = module.dataset_names ?? (module.dataset_name ? [module.dataset_name] : []);
            return ids.map((id, idx) => ({
              id,
              name: names[idx] ?? module.dataset_name ?? String(id),
              module_id: module.module_id,
              module_name: module.module_name,
              reasons: getModuleReasons(module),
            }));
          });
        setDatasets(datasetModules);

        const reruns = modules
          .filter((module) => !module.requires_dataset_upload)
          .map((module) => ({
            ...module,
            reasons: getModuleReasons(module),
          }));
        setRerunModules(reruns);
        setSelectedRerunIds(new Set(reruns.map((module) => module.module_id)));

        const hydrated = await hydrateOngoingTasks(submission.id, modules);
        if (!hydrated && tasksRef.current.length === 0) {
          clearPersistedProgress(submission.id);
          setLoading(false);
          setAverageScore(null);
          setNewModuleScores([]);
          setFinalized(false);
          setTasks([]);
          tasksRef.current = [];
          setQueueEntries([]);
          queueEntriesRef.current = [];
        }
      } catch (error) {
        if (!ignore) {
          showSnackbar("Failed to fetch update info", "error");
          setModulesToUpdate([]);
          setDatasets([]);
          setRerunModules([]);
          setSelectedRerunIds(new Set());
        }
      }
    };

    fetchUpdateData();
    return () => {
      ignore = true;
    };
  }, [isOpen, submission, hydrateOngoingTasks, showSnackbar]);

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

            const qStatusRaw = String(
              queuePositionInfo?.status || ""
            ).toLowerCase();
            const qIsProcessing = qStatusRaw === "processing";

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
                : queuePositionInfo
                ? `In queue (Position: ${queuePositionInfo.position ?? "—"})`
                : "Waiting in queue...",
            };
          })
        );

        setTasks(updatedTasks);
        tasksRef.current = updatedTasks;

        const currentQueueEntries = queueEntriesRef.current || [];
        const nextQueueEntries = currentQueueEntries.map((entry) => {
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
        });
        queueEntriesRef.current = nextQueueEntries;
        setQueueEntries(nextQueueEntries);
        persistProgressState(submissionId, {
          tasks: updatedTasks,
          queueEntries: nextQueueEntries,
        });

        const allFinished = updatedTasks.every((t) => t.completed || t.error);
        if (allFinished && !finalized) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setLoading(false);

          const scores = updatedTasks
            .filter((t) => t.completed && t.score != null)
            .map((t) => ({
              module_id: t.module_id,
              module_name: t.module_name,
              score: t.score,
            }));
          setNewModuleScores(scores);

          const previousScoresMap = new Map(
            (submission?.benchmarkScores || []).map((score) => [
              score.benchmarkModule?.id,
              score.score,
            ])
          );
          const updatedScoreMap = new Map(
            scores.map((score) => [score.module_id, score.score])
          );

          const mergedScores = (submission?.benchmarkScores || []).map(
            (score) =>
              updatedScoreMap.has(score.benchmarkModule?.id)
                ? updatedScoreMap.get(score.benchmarkModule?.id)
                : score.score
          );
          const brandNewModules = scores.filter(
            (score) => !previousScoresMap.has(score.module_id)
          );
          const combined = [
            ...mergedScores,
            ...brandNewModules.map((moduleScore) => moduleScore.score),
          ];

          const calculatedAverage = combined.length
            ? combined.reduce((a, b) => a + b, 0) / combined.length
            : null;
          setAverageScore(calculatedAverage);

          try {
            const result = await BenchmarkService.finalizeBenchmarkUpdate(
              submissionId
            );
            const newScoreValue =
              result?.new_score !== undefined ? Number(result.new_score) : null;
            if (!Number.isNaN(newScoreValue) && newScoreValue !== null) {
              setAverageScore(newScoreValue);
            }
            clearPersistedProgress(submissionId);
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
  }, [
    finalized,
    loading,
    onUpdated,
    showSnackbar,
    submission,
    submissionId,
    tasks.length,
  ]);

  const isFormValid = () => {
    const datasetOk =
      datasets.length === 0 ||
      datasets.every((dataset) => uploadedFiles[dataset.id]);
    const rerunOk = rerunModules.length === 0 || selectedRerunIds.size > 0;
    return datasetOk && rerunOk;
  };

  const updateSubmission = async () => {
    if (!submission) return;
    if (!isFormValid()) {
      showSnackbar("Please upload required datasets", "error");
      return;
    }

    try {
      setIsStartingUpdate(true);
      setAverageScore(null);
      setNewModuleScores([]);
      setFinalized(false);

      const datasetModuleIdsToQueue = (modulesToUpdate || [])
        .filter(
          (module) =>
            module.requires_dataset_upload &&
            module.dataset_id &&
            uploadedFiles[module.dataset_id]
        )
        .map((module) => module.module_id);

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
        clearPersistedProgress(submission.id);
        setLoading(false);
        setAverageScore(null);
        setNewModuleScores([]);
        setFinalized(false);
        setTasks([]);
        tasksRef.current = [];
        setQueueEntries([]);
        queueEntriesRef.current = [];
        setIsStartingUpdate(false);
        return;
      }

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

      const newSubmissionId = response.submission_id || submission.id;
      setLoading(true);
      setSubmissionId(newSubmissionId);
      setTasks(initialTasks);
      tasksRef.current = initialTasks;
      setQueueEntries(enrichedQueueEntries);
      queueEntriesRef.current = enrichedQueueEntries;
      setFinalized(false);
      persistProgressState(newSubmissionId, {
        tasks: initialTasks,
        queueEntries: enrichedQueueEntries,
      });
    } catch (error) {
      console.error("Error starting benchmark update:", error);
      showSnackbar(
        error.response?.data?.message || "Failed to start benchmark update",
        "error"
      );
      setLoading(false);
    } finally {
      setIsStartingUpdate(false);
    }
  };

  const handleModalClose = () => {
    onClose && onClose();
  };

const formatDatasetReasonText = (reasons = []) => {
  const normalized = Array.isArray(reasons)
    ? reasons
    : typeof reasons === "string"
    ? [reasons]
    : [];
  const seen = new Set();
  return normalized
    .filter((reason) => {
      if (!reason || seen.has(reason)) return false;
      seen.add(reason);
        return true;
      })
      .map((reason) => REASON_DETAILS[reason]?.label || reason)
      .join(", ");
  };

  const handleFileSelect = async (event, originalDatasetId) => {
    const file = event.target.files[0];
    if (!file || !submission) return;

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

  const handleDownloadMissingDatasets = async () => {
    if (datasets.length === 0) return;
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

  if (!submission) {
    return null;
  }

  const stepForRerun = datasets.length > 0 ? "2" : "1";

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
          {loading ? (
            <>
              <Typography level="h3">Evaluation in progress!</Typography>
              {tasks.length > 0 ? (
                <>
                  <TaskProgressCard tasks={tasks} queueEntries={queueEntries} />
                  <Typography level="body2" sx={{ mt: 2, textAlign: "center" }}>
                    Processing continues even if you close this window. Reopen the
                    modal from the submissions table at any time to check the progress.
                  </Typography>
                </>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 8,
                    gap: 2,
                  }}
                >
                  <CircularProgress />
                  <Typography level="body-sm" color="text.secondary">
                    Preparing update tasks...
                  </Typography>
                </Box>
              )}
            </>
          ) : tasks.length === 0 && averageScore === null ? (
            <>
              <Card variant="soft" color="primary" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography level="h4" fontWeight="bold">
                    Modules Requiring Action
                  </Typography>
                  <Typography level="body-sm" sx={{ mb: 2 }}>
                    Review which modules changed, then upload datasets and rerun
                    as needed.
                  </Typography>
                  <Box
                    sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}
                  >
                    <Chip
                      startDecorator={<UploadFile />}
                      color="primary"
                      variant="solid"
                    >
                      Dataset updates: {datasets.length}
                    </Chip>
                    <Chip
                      startDecorator={<PlayArrow />}
                      color="success"
                      variant="soft"
                    >
                      Logic/Rerun only: {rerunModules.length}
                    </Chip>
                  </Box>
                  {modulesToUpdate.length === 0 ? (
                    <Typography level="body-sm">
                      Your submission is already aligned with the latest
                      modules.
                    </Typography>
                  ) : (
                    <List size="sm" sx={{ p: 0 }}>
                      {modulesToUpdate.map((module) => (
                        <ListItem key={module.module_id} sx={{ px: 1 }}>
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.5,
                            }}
                          >
                            <Typography level="body-md" fontWeight="bold">
                              {module.module_name}
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.75,
                              }}
                            >
                              {formatReasonChips(module).map((chip) => (
                                <Chip
                                  key={chip.key}
                                  size="sm"
                                  variant="soft"
                                  color={chip.color}
                                >
                                  {chip.label}
                                </Chip>
                              ))}
                            </Box>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <Chip color="primary" variant="solid" size="lg">
                      1
                    </Chip>
                    <Typography level="h4" fontWeight="bold">
                      Upload updated datasets
                    </Typography>
                  </Box>

                  {datasets.length === 0 ? (
                    <Typography level="body-sm" color="text.secondary">
                      Great! No dataset uploads are required for this update.
                    </Typography>
                  ) : (
                    <>
                      <Typography
                        sx={{ mb: 2, p: 1.5, borderRadius: "sm" }}
                        startDecorator={<InfoOutlined />}
                        variant="soft"
                        color="neutral"
                        level="body-md"
                      >
                        Download the original datasets, apply your privacy
                        mechanism, then upload the privatized versions for the
                        modules below.
                      </Typography>

                      <Sheet
                        variant="soft"
                        sx={{ p: 2, mb: 2, borderRadius: "sm" }}
                      >
                        <Typography
                          level="body-sm"
                          fontWeight="bold"
                          sx={{ mb: 1 }}
                        >
                          Modules with dataset updates:
                        </Typography>
                        <List size="sm" sx={{ p: 0 }}>
                          {datasets.map((dataset) => (
                            <ListItem key={dataset.id} sx={{ px: 1, py: 0.5 }}>
                              <Box>
                                <Typography level="body-sm" fontWeight="bold">
                                  {dataset.module_name}
                                </Typography>
                                <Typography
                                  level="body-xs"
                                  color="text.secondary"
                                >
                                  Dataset: {dataset.name}
                                </Typography>
                                {(() => {
                                  const datasetReasonText =
                                    formatDatasetReasonText(dataset.reasons);
                                  return datasetReasonText ? (
                                    <Chip
                                      size="sm"
                                      variant="soft"
                                      color="warning"
                                      sx={{ mt: 0.5 }}
                                    >
                                      {datasetReasonText}
                                    </Chip>
                                  ) : null;
                                })()}
                              </Box>
                            </ListItem>
                          ))}
                        </List>
                      </Sheet>

                      <Box sx={{ mb: 3 }}>
                        <Button
                          fullWidth
                          size="lg"
                          variant="solid"
                          color="primary"
                          startDecorator={<CloudDownload />}
                          onClick={handleDownloadMissingDatasets}
                          disabled={datasets.length === 0}
                        >
                          Download Original Datasets
                        </Button>
                      </Box>

                      <Divider sx={{ my: 2 }}>
                        <Typography level="body-sm">
                          Then upload privatized files
                        </Typography>
                      </Divider>

                      <DatasetTableUpdate
                        datasets={datasets}
                        uploadedFiles={uploadedFiles}
                        uploadingDatasetId={uploadingDatasetId}
                        onFileSelect={handleFileSelect}
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <Chip color="success" variant="solid" size="lg">
                      {stepForRerun}
                    </Chip>
                    <Typography level="h4" fontWeight="bold">
                      Rerun modules (logic/requirements updates)
                    </Typography>
                  </Box>

                  {rerunModules.length === 0 ? (
                    <Typography level="body-sm" color="text.secondary">
                      No additional reruns are required.
                    </Typography>
                  ) : (
                    <>
                      <Typography
                        level="body-sm"
                        sx={{ color: "text.secondary", mb: 1 }}
                      >
                        Selected: {selectedRerunIds.size} /{" "}
                        {rerunModules.length}
                      </Typography>
                      <Typography
                        sx={{ mb: 2, p: 1.5, borderRadius: "sm" }}
                        startDecorator={<InfoOutlined />}
                        variant="soft"
                        color="neutral"
                        level="body-md"
                      >
                        These modules changed without requiring new datasets.
                        Select which ones to rerun.
                      </Typography>
                      <List size="sm" sx={{ p: 0 }}>
                        {rerunModules.map((module) => (
                          <ListItem
                            key={module.module_id}
                            sx={{ px: 1, py: 0.5 }}
                          >
                            <ListItemDecorator>
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
                            <Box sx={{ flex: 1 }}>
                              <Typography level="body-md" fontWeight="bold">
                                {module.module_name}
                              </Typography>
                              {module.reasons?.length > 0 && (
                                <Box
                                  sx={{
                                    mt: 0.5,
                                    display: "flex",
                                    gap: 0.75,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {module.reasons.map((reason, idx) => {
                                    const meta = REASON_DETAILS[reason] || {
                                      label: reason,
                                      color: "neutral",
                                    };
                                    return (
                                      <Chip
                                        key={`${module.module_id}-${reason}-${idx}`}
                                        size="sm"
                                        variant="soft"
                                        color={meta.color}
                                      >
                                        {meta.label}
                                      </Chip>
                                    );
                                  })}
                                </Box>
                              )}
                            </Box>
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          ) : averageScore !== null || newModuleScores.length > 0 ? (
            <>
              <Typography level="h3" mb={2}>
                Updated Results
              </Typography>
              <ScoreOverviewCard
                averageScore={averageScore}
                previousAverage={
                  submission?.overallScore ?? submission?.score ?? null
                }
                moduleScores={newModuleScores}
                oldModulesScores={submission?.benchmarkScores || []}
              />
            </>
          ) : null}
        </DialogContent>

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
              disabled={
                !isFormValid() ||
                loading ||
                isStartingUpdate ||
                modulesToUpdate.length === 0
              }
              color={
                isFormValid() && modulesToUpdate.length > 0
                  ? "success"
                  : "primary"
              }
              endDecorator={<Update />}
            >
              Start Update Process
            </Button>
            <Button
              onClick={onClose}
              variant="soft"
              color="neutral"
              startDecorator={<Close />}
            >
              Close
            </Button>
          </DialogActions>
        )}

        {loading && tasks.length > 0 && (
          <DialogActions>
            <Button
              onClick={handleModalClose}
              variant="soft"
              color="neutral"
              startDecorator={<Close />}
            >
              Close and Continue in Background
            </Button>
          </DialogActions>
        )}

        <ModalClose />
      </ModalDialog>
    </Modal>
  );
};

export default UpdateSubmissionModal;
