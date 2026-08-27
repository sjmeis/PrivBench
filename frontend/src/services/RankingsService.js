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

const fetchRankings = async (
  searchTerm = "",
  page = 1,
  limit = 10,
  sortOrder = "desc",
  orderBy = "score",
  version = null,
  moduleIds = [],
  moduleWeights = {}
) => {
  try {
    const url = `${API_BASE_URL}/ranking`;

    const requestBody = {
      searchTerm: searchTerm,
      page: page,
      limit: limit,
      sortOrder: sortOrder,
      sortBy: orderBy,
      version: version,
      moduleIds: moduleIds,
      moduleWeights: moduleWeights,
    };

    const response = await axios.post(url, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.status === 200) {
      return response.data;
    } else {
      throw new Error("Failed to fetch rankings");
    }
  } catch (error) {
    console.error("Error fetching rankings:", error);
    throw error;
  }
};

const fetchRankingFilters = async (version = null) => {
  try {
    const url = version
      ? `${API_BASE_URL}/ranking/filters?version=${encodeURIComponent(version)}`
      : `${API_BASE_URL}/ranking/filters`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching ranking filters:", error);
    throw error;
  }
};

const fetchSubmissionDetails = async (
  submissionId,
  version = null,
  moduleWeights = {}
) => {
  try {
    const url = `${API_BASE_URL}/ranking/detail`;
    const response = await axios.post(
      url,
      {
        id: submissionId,
        version: version || null,
        moduleWeights: moduleWeights || {},
      },
      { withCredentials: true }
    );

    if (response.status === 200) {
      return response.data.submission;
    } else {
      throw new Error("Failed to fetch submission details");
    }
  } catch (error) {
    console.error("Error fetching submission details:", error);
    if (error.response) {
      return { error: error.response.data.message || "Something went wrong" };
    } else {
      return { error: "Network error or server is down" };
    }
  }
};

const getUserSubmissions = async () => {
  try {
    const url = `${API_BASE_URL}/ranking/user`;
    const response = await axios.get(url, { withCredentials: true });
    return response.data; // Return the API response data
  } catch (error) {
    console.error("Error fetching user submissions:", error);
    throw error.response ? error.response.data : error; // Throw error to be handled by caller
  }
};

const getUserSubmissionsCount = async () => {
  try {
    const url = `${API_BASE_URL}/ranking/user/count`;
    const response = await axios.get(url, { withCredentials: true });
    return response.data; // Return the API response data
  } catch (error) {
    console.error("Error fetching user submissions:", error);
    throw error.response ? error.response.data : error; // Throw error to be handled by caller
  }
};

const updateSubmissionVisibility = async (submissionId, isPublic) => {
  try {
    const url = `${API_BASE_URL}/ranking/update`;
    const response = await axios.post(
      url,
      {
        id: submissionId,
        isPublic,
      },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating submission visibility:", error);
    throw error.response ? error.response.data : error;
  }
};

export {
  fetchRankings,
  fetchRankingFilters,
  fetchSubmissionDetails,
  getUserSubmissions,
  getUserSubmissionsCount,
  updateSubmissionVisibility,
};
