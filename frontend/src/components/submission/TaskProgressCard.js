import React from "react";
import { Card, Box, Typography } from "@mui/joy";
import { CheckCircle, Error, Sync, HourglassEmpty } from "@mui/icons-material";
import { keyframes, LinearProgress } from "@mui/material";

// Define a spinning animation for the "processing" icon
const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const TaskProgressCard = ({ tasks, queueEntries = [] }) => {
  const isAnyTaskProcessing = queueEntries.some(
    (entry) => entry.moduleQueueStatus?.processing > 0
  );

  const getQueueInfo = (moduleId) => {
    return queueEntries.find((entry) => entry.module_id === moduleId);
  };

  const getStatusColor = (task, queueInfo) => {
    if (task.error) return "danger";
    if (task.completed) return "success";
    if (queueInfo?.status === "processing") return "primary";
    if (queueInfo?.status === "waiting") return "warning";
    return "neutral";
  };

  const getStatusText = (task, queueInfo) => {
    if (task.error) return task.status;
    if (task.completed) return "Completed";
    if (queueInfo?.status === "processing") return "Processing...";
    if (queueInfo?.status === "waiting") {
      // Calculate and display the relative position in the waiting queue.
      return isAnyTaskProcessing
        ? `In queue (Position: ${queueInfo.position - 1})`
        : "In queue";
    }
    return "Initializing...";
  };

  // Helper function to render the correct icon based on status
  const renderStatusIcon = (task, queueInfo) => {
    const color = getStatusColor(task, queueInfo);
    const status = queueInfo?.status;

    if (task.error) {
      return <Error sx={{ color: `${color}.main` }} />;
    }
    if (task.completed) {
      return <CheckCircle sx={{ color: `${color}.main` }} />;
    }
    if (status === "processing") {
      return (
        <Sync
          sx={{
            color: `${color}.main`,
            animation: `${spin} 2s linear infinite`,
          }}
        />
      );
    }
    if (status === "waiting") {
      return <HourglassEmpty sx={{ color: `${color}.main` }} />;
    }
    // Default icon for initializing state
    return <HourglassEmpty sx={{ color: "neutral.main" }} />;
  };

  const getProgressPercentage = (task) => {
    if (task.progress && task.progress > 0) {
      return task.progress;
    }
    return 0;
  };

  return (
    <Card variant="outlined" sx={{ width: "100%", mt: 3 }}>
      {tasks.map((task, index) => {
        const queueInfo = getQueueInfo(task.module_id);
        const isWaiting = queueInfo?.status === "waiting";
        const isProcessing = queueInfo?.status === "processing";
        const displayPosition =
          isWaiting && isAnyTaskProcessing
            ? queueInfo.position - 1
            : queueInfo?.position || 0;
        const progressPercentage = getProgressPercentage(task);

        return (
          <Box
            key={index}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              p: 1.5,
              // Add a divider between tasks, but not after the last one
              borderBottom: index < tasks.length - 1 ? "1px solid" : "none",
              borderColor: "divider",
            }}
          >
            {/* Main row with icon, text, and right-aligned content */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              {/* Status Icon */}
              <Box sx={{ display: "flex", alignItems: "center" }}>
                {renderStatusIcon(task, queueInfo)}
              </Box>

              {/* Module Name and Status Text */}
              <Box sx={{ flexGrow: 1 }}>
                <Typography level="body1" fontWeight="bold">
                  {task.module_name}
                </Typography>
                <Typography
                  level="body2"
                  sx={{
                    color: task.error ? "danger.main" : "text.secondary",
                    fontSize: "0.875rem",
                  }}
                >
                  {getStatusText(task, queueInfo)}
                </Typography>
              </Box>

              {/* Right-aligned content: Queue position or Score */}
              <Box sx={{ textAlign: "right" }}>
                {isWaiting && isAnyTaskProcessing && displayPosition > 1 && (
                  <Typography
                    level="body2"
                    sx={{ fontSize: "0.875rem", color: "warning.main" }}
                  >
                    {displayPosition - 1} ahead of you
                  </Typography>
                )}
                {task.completed && task.score !== null && (
                  <Typography
                    level="body1"
                    sx={{ color: "success.main", fontWeight: "bold" }}
                  >
                    Score: {task.score.toFixed(2)}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Progress bar for processing tasks */}
            {isProcessing && progressPercentage > 0 && (
              <Box sx={{ width: "100%" }}>
                <LinearProgress
                  variant="determinate"
                  value={progressPercentage}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "#e0e0e0",
                    "& .MuiLinearProgress-bar": {
                      backgroundColor: "#1976d2",
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>
            )}
          </Box>
        );
      })}
    </Card>
  );
};

export default TaskProgressCard;
