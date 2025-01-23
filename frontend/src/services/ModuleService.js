import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

// Helper function to poll status
const pollModuleStatus = async (taskId, onProgress) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/modules/${taskId}/status`, {
      withCredentials: true
    });
    
    if (response.data.status === 'pending') {
      // If it's still pending, call onProgress callback and return null
      if (onProgress) {
        onProgress('Installing module dependencies...');
      }
      return null;
    } else if (response.data.status === 'error') {
      throw new Error(response.data.message || 'Module installation failed');
    }
    
    return response.data;
  } catch (error) {
    throw new Error('Failed to check module status: ' + error.message);
  }
};

// Main module creation function
export const createBenchmarkingModule = async (formData, onProgress) => {
  try {
    const form = new FormData();
    
    // Add basic text fields
    form.append('name', formData.name);
    form.append('description', formData.description);
    
    // Add the algorithm file
    if (formData.algorithmFile) {
      form.append('algorithmFile', formData.algorithmFile);
    }
    
    // Add the requirements file
    if (formData.requirementsFile) {
      form.append('requirementsFile', formData.requirementsFile);
    }
    
    // Add selected datasets (convert to JSON string since it's an array)
    if (formData.selectedDatasets && formData.selectedDatasets.length > 0) {
      form.append('selectedDatasets', JSON.stringify(formData.selectedDatasets));
    }
    
    // Add uploaded datasets (these are files)
    if (formData.uploadedDatasets && formData.uploadedDatasets.length > 0) {
      formData.uploadedDatasets.forEach((dataset) => {
        form.append('uploadedDatasets', dataset);
      });
    }

    // Initial module creation request
    const response = await axios.post(`${API_BASE_URL}/modules/create`, form, {
      withCredentials: true,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // If we have a task ID, start polling for status
    if (response.data.data.task_id) {
      if (onProgress) {
        onProgress('Module created, installing dependencies...');
      }

      // Poll until we get a final status
      return new Promise((resolve, reject) => {
        const pollInterval = setInterval(async () => {
          try {
            const status = await pollModuleStatus(response.data.data.task_id, onProgress);
            if (status) {
              clearInterval(pollInterval);
              resolve(status);
            }
          } catch (error) {
            clearInterval(pollInterval);
            reject(error);
          }
        }, 2000); // Poll every 2 seconds

        // Set a timeout of 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          reject(new Error('Module installation timed out'));
        }, 5 * 60 * 1000);
      });
    }

    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('Error response:', error.response);
      throw new Error(error.response.data.message || 'Failed to add module');
    } else if (error.request) {
      console.error('Error request:', error.request);
      throw new Error('No response received from server');
    } else {
      console.error('Error message:', error.message);
      throw new Error(error.message);
    }
  }
};