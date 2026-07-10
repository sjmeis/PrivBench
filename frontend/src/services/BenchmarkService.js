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

const pollTasks = async (tasks, showSnackbar) => {
  return await Promise.all(
    tasks.map(async (task) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/task-status/${task.task_id}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          showSnackbar &&
            showSnackbar("Failed to fetch submission status", "error");
        }

        const data = await response.json();

        let processedRows = 0;
        let totalRows = 0;
        if (data.status && data.status.includes("|")) {
          const match = data.status.match(/(\d+)\/(\d+)/);
          if (match) {
            processedRows = parseInt(match[1], 10);
            totalRows = parseInt(match[2], 10);
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
};

const startBenchmarkUpdate = async (submissionId, selectedModuleIds = []) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/run-benchmark/update`,
      { submissionId, selectedModuleIds },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error starting benchmark update:", error);
    throw error;
  }
};

const finalizeBenchmarkUpdate = async (submissionId) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/submission/finalize-update`,
      { submissionId: submissionId },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error finalizing benchmark update:", error);
    throw error;
  }
};

const deleteLatestSubmission = async () => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/delete-latest-submission`,
      {},
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting latest submission:", error);
    throw error;
  }
};

const getSubmissionUpdatesInfo = async (submissionId) => {
  try {
    const res = await axios.get(
      `${API_BASE_URL}/submission/${submissionId}/updates-info`,
      { withCredentials: true }
    );
    return res.data;
  } catch (error) {
    console.error("Error fetching submission updates info:", error);
    throw error;
  }
};

export const BenchmarkService = {
  startBenchmarkUpdate,
  pollTasks,
  deleteLatestSubmission,
  finalizeBenchmarkUpdate,
  getSubmissionUpdatesInfo,
};
