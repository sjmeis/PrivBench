import React from "react";
import { Card, Box, Typography, LinearProgress, Chip } from "@mui/joy";

const TaskProgressCard = ({ tasks, queueEntries = [] }) => {
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
    if (queueInfo?.status === "processing")
      return task.status || "Processing...";
    if (queueInfo?.status === "waiting")
      return `Waiting in queue (Position ${queueInfo.position})`;
    return task.status || "Initializing...";
  };

  return (
    <Card variant="outlined" sx={{ width: "100%", mt: 3 }}>
      {tasks.map((task, index) => {
        const queueInfo = getQueueInfo(task.module_id);
        const isWaiting = queueInfo?.status === "waiting";

        return (
          <Box key={index} sx={{ mb: 2, mt: 2, p: 1 }}>
            {/* Module name and progress/queue status */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Typography level="body1" fontWeight="bold">
                {task.module_name}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {queueInfo && (
                  <Chip
                    size="sm"
                    color={getStatusColor(task, queueInfo)}
                    variant="soft"
                  >
                    {queueInfo.status === "waiting"
                      ? `Queue #${queueInfo.position}`
                      : queueInfo.status === "processing"
                      ? "Processing"
                      : queueInfo.status}
                  </Chip>
                )}
                <Typography level="body1" fontWeight="bold">
                  {isWaiting ? "0%" : `${task.progress}%`}
                </Typography>
              </Box>
            </Box>
            <LinearProgress
              determinate
              value={isWaiting ? 0 : task.progress}
              sx={{
                "--LinearProgress-thickness": "10px",
                mb: 1,
              }}
              color={getStatusColor(task, queueInfo)}
            />

            {/* Status and row information */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mt: 1,
              }}
            >
              <Typography
                level="body2"
                sx={{
                  color: task.error ? "danger.main" : "text.secondary",
                  fontSize: "0.875rem",
                  flex: 1,
                }}
              >
                {getStatusText(task, queueInfo)}
              </Typography>

              {/* Show row progress only when processing */}
              {!isWaiting && task.totalRows > 0 && (
                <Typography level="body2" sx={{ fontSize: "0.875rem" }}>
                  {task.processedRows.toLocaleString()} /{" "}
                  {task.totalRows.toLocaleString()} rows
                </Typography>
              )}

              {/* Show estimated time or queue position for waiting tasks */}
              {isWaiting && queueInfo.position > 1 && (
                <Typography
                  level="body2"
                  sx={{ fontSize: "0.875rem", color: "warning.main" }}
                >
                  {queueInfo.position - 1} ahead of you
                </Typography>
              )}
            </Box>

            {/* Score display for completed tasks */}
            {task.completed && task.score !== null && (
              <Box
                sx={{
                  mt: 1,
                  p: 1,
                  bgcolor: "success.softBg",
                  borderRadius: "sm",
                }}
              >
                <Typography
                  level="body2"
                  sx={{ color: "success.main", fontWeight: "bold" }}
                >
                  Score: {task.score.toFixed(2)}
                </Typography>
              </Box>
            )}
          </Box>
        );
      })}
    </Card>
  );
};

export default TaskProgressCard;
