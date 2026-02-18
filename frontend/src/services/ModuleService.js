import axios from "axios";
import { API_BASE_URL } from "../config";

const pollModuleStatus = async (taskId, onProgress) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/modules/${taskId}/status`,
      {
        withCredentials: true,
      }
    );

    if (response.data.status === "pending") {
      // If it is still pending, call onProgress callback and continue polling
      if (onProgress) {
        onProgress("Installing module dependencies...");
      }
      return { status: "pending" };
    } else if (response.data.status === "error") {
      throw new Error(response.data.message || "Module installation failed");
    }

    return { status: "completed", data: response.data };
  } catch (error) {
    throw new Error("Failed to check module status: " + error.message);
  }
};

const createBenchmarkingModule = async (formData, onProgress) => {
  try {
    if (onProgress) {
      onProgress("Creating module...");
    }

    const form = new FormData();

    form.append("name", formData.name);
    form.append("description", formData.description);
    form.append("deviceSpecification", formData.deviceSpecification || "cpu");

    if (formData.algorithmFile) {
      form.append("algorithmFile", formData.algorithmFile);
    }

    if (formData.requirementsFile) {
      form.append("requirementsFile", formData.requirementsFile);
    }

    if (formData.selectedDatasets && formData.selectedDatasets.length > 0) {
      form.append(
        "selectedDatasets",
        JSON.stringify(formData.selectedDatasets)
      );
    }

    if (formData.uploadedDatasets && formData.uploadedDatasets.length > 0) {
      formData.uploadedDatasets.forEach((dataset) => {
        form.append("uploadedDatasets", dataset);
      });
    }

    const response = await axios.post(`${API_BASE_URL}/modules/create`, form, {
      withCredentials: true,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    // If we have a task ID, start polling for status
    if (response.data.data.task_id) {
      if (onProgress) {
        onProgress("Module created, installing dependencies...");
      }

      // Keep polling until installation is complete
      let completed = false;
      let attempts = 0;
      const maxAttempts = 150; // 5 minutes with 2-second intervals

      while (!completed && attempts < maxAttempts) {
        try {
          const statusResult = await pollModuleStatus(
            response.data.data.task_id,
            onProgress
          );
          if (statusResult.status === "completed") {
            completed = true;
            return statusResult.data;
          }
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds between polls
          attempts++;
        } catch (error) {
          throw error;
        }
      }

      if (!completed) {
        throw new Error("Module installation timed out");
      }
    }

    return response.data;
  } catch (error) {
    if (error.response) {
      console.error("Error response:", error.response);
      throw new Error(error.response.data.message || "Failed to add module");
    } else if (error.request) {
      console.error("Error request:", error.request);
      throw new Error("No response received from server");
    } else {
      console.error("Error message:", error.message);
      throw new Error(error.message);
    }
  }
};

const fetchBenchmarkingModulesForSubmission = async (submissionId) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/modules/update/information`,
      { id: submissionId },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching benchmarking modules:", error);
    throw error;
  }
};

const deleteBenchmarkModule = async (moduleId) => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/modules/delete/${moduleId}`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting benchmark module:", error);
    throw error;
  }
};

const updateBenchmarkModule = async (moduleId, updatedData) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/modules/update/${moduleId}`,
      updatedData,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating benchmark module:", error);
    throw error;
  }
};

const fetchPendingModuleUpdates = async () => {
  const response = await axios.get(`${API_BASE_URL}/modules/updates/pending`, {
    withCredentials: true,
  });
  return response.data;
};

const hasPendingModuleUpdates = async () => {
  const res = await axios.get(`${API_BASE_URL}/modules/updates/has-pending`, {
    withCredentials: true,
  });
  return !!res.data?.hasPending;
};

const publishModuleUpdates = async (version, description, sendEmail = true) => {
  const response = await axios.post(
    `${API_BASE_URL}/modules/publish`,
    {
      version,
      description,
      send_email: sendEmail,
    },
    { withCredentials: true }
  );
  return response.data;
};

const downloadModuleLogic = async (moduleId, moduleName) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/modules/${moduleId}/logic/download`,
      {
        credentials: "include",
        cache: "no-cache",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to download module logic");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${moduleName}.py`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading module logic:", error);
    throw error;
  }
};

const updateModuleLogic = async (moduleId, formData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/modules/update/logic/${moduleId}`,
      formData,
      {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating module logic:", error);
    throw error;
  }
};

const updateModuleDataset = async (moduleId, formData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/modules/update/dataset/${moduleId}`,
      formData,
      {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating module dataset:", error);
    throw error;
  }
};

const updateModuleRequirements = async (moduleId, formData) => {
  const res = await axios.post(
    `${API_BASE_URL}/admin/modules/${moduleId}/requirements`,
    formData,
    {
      withCredentials: true,
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return res.data;
};

const downloadModuleRequirements = async (moduleId, moduleName = "module") => {
  const res = await axios.get(
    `${API_BASE_URL}/admin/modules/${moduleId}/requirements/download`,
    { withCredentials: true, responseType: "blob" }
  );
  const blob = new Blob([res.data], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${moduleName}_requirements.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const fetchModulesWithDatasets = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/modules/with-datasets`, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching modules with datasets:", error);
    throw error;
  }
};

export const ModuleService = {
  updateBenchmarkModule,
  deleteBenchmarkModule,
  fetchBenchmarkingModulesForSubmission,
  createBenchmarkingModule,
  pollModuleStatus,
  fetchPendingModuleUpdates,
  hasPendingModuleUpdates,
  publishModuleUpdates,
  downloadModuleLogic,
  updateModuleLogic,
  updateModuleDataset,
  updateModuleRequirements,
  downloadModuleRequirements,
  fetchModulesWithDatasets,
};
