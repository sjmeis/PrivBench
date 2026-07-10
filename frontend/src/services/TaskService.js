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

import axios from "axios";
import { API_BASE_URL } from "../config";

export const TaskService = {
  pollTaskStatus: async (taskId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/task-status/${taskId}`,
        {
          withCredentials: true,
        }
      );

      const data = response.data;

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
      console.error(`Error polling task ${taskId}:`, error);
      throw error;
    }
  },

  pollMultipleTasks: async (tasks, onTasksUpdate) => {
    const updatedTasks = await Promise.all(
      tasks.map(async (task) => {
        try {
          const taskStatus = await TaskService.pollTaskStatus(task.task_id);
          return {
            ...task,
            ...taskStatus,
          };
        } catch (error) {
          return {
            ...task,
            error: error.message,
          };
        }
      })
    );

    onTasksUpdate(updatedTasks);

    const allTasksFinished = updatedTasks.every(
      (task) => task.completed || task.error || task.state === "FAILURE"
    );

    if (allTasksFinished) {
      const successfulTasks = updatedTasks.filter(
        (task) => task.completed && task.score !== null
      );

      return {
        finished: true,
        scores: successfulTasks.map((t) => ({
          module_name: t.module_name,
          score: t.score,
        })),
        averageScore:
          successfulTasks.length > 0
            ? successfulTasks.reduce((sum, curr) => sum + curr.score, 0) /
              successfulTasks.length
            : null,
      };
    }

    return { finished: false };
  },

  startPolling: (initialTasks, onUpdate, onComplete) => {
    let isPolling = true;
    const pollInterval = setInterval(async () => {
      try {
        const updatedTasks = [...initialTasks];
        let allCompleted = true;
        let hasError = false;

        for (let i = 0; i < updatedTasks.length; i++) {
          const task = updatedTasks[i];
          if (!task.completed && !task.error) {
            try {
              const response = await axios.get(
                `${API_BASE_URL}/task-status/${task.task_id}`,
                { withCredentials: true }
              );

              const status = response.data;

              if (status.state === "SUCCESS") {
                task.completed = true;
                task.progress = 100;
                task.score = status.score;
              } else if (status.state === "FAILURE") {
                task.error = true;
                task.completed = true;
                hasError = true;
                task.errorMessage = status.status || "Task failed";
                // Stop polling immediately when a task fails
                clearInterval(pollInterval);
                isPolling = false;
              } else {
                allCompleted = false;
                task.progress =
                  Math.round((status.current / status.total) * 100) || 0;
                task.status = status.status;
              }
            } catch (error) {
              console.error(`Error polling task ${task.task_id}:`, error);
              task.error = true;
              task.completed = true;
              hasError = true;
              task.errorMessage = error.message;
              // Stop polling immediately when a task fails
              clearInterval(pollInterval);
              isPolling = false;
            }
          }
        }

        onUpdate(updatedTasks);

        if (allCompleted || hasError) {
          clearInterval(pollInterval);
          isPolling = false;
          onComplete({
            scores: updatedTasks
              .map((t) => ({
                moduleId: t.module_id,
                score: t.score,
              }))
              .filter((s) => s.score !== null),
            hasError,
            errorMessage: hasError ? "One or more tasks failed" : null,
          });
        }
      } catch (error) {
        console.error("Error in polling loop:", error);
        clearInterval(pollInterval);
        isPolling = false;
        onComplete({
          hasError: true,
          errorMessage: error.message,
        });
      }
    }, 2000);

    return () => {
      clearInterval(pollInterval);
      isPolling = false;
    };
  },
};
