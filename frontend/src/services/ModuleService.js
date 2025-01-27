import axios from 'axios';
import { API_BASE_URL } from '../config';

// Helper function to poll status
const pollModuleStatus = async (taskId, onProgress) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/modules/${taskId}/status`, {
            withCredentials: true
        });
        
        if (response.data.status === 'pending') {
            // If it's still pending, call onProgress callback and continue polling
            if (onProgress) {
                onProgress('Installing module dependencies...');
            }
            return { status: 'pending' };
        } else if (response.data.status === 'error') {
            throw new Error(response.data.message || 'Module installation failed');
        }
        // Installation completed successfully
        return { status: 'completed', data: response.data };
    } catch (error) {
        throw new Error('Failed to check module status: ' + error.message);
    }
};

// Main module creation function
export const createBenchmarkingModule = async (formData, onProgress) => {
    try {
        // Show initial progress
        if (onProgress) {
            onProgress('Creating module...');
        }

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
        
        // Add selected datasets
        if (formData.selectedDatasets && formData.selectedDatasets.length > 0) {
            form.append('selectedDatasets', JSON.stringify(formData.selectedDatasets));
        }
        
        // Add uploaded datasets
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

            // Keep polling until installation is complete
            let completed = false;
            let attempts = 0;
            const maxAttempts = 150; // 5 minutes with 2-second intervals

            while (!completed && attempts < maxAttempts) {
                try {
                    const statusResult = await pollModuleStatus(response.data.data.task_id, onProgress);
                    if (statusResult.status === 'completed') {
                        completed = true;
                        return statusResult.data;
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between polls
                    attempts++;
                } catch (error) {
                    throw error;
                }
            }

            if (!completed) {
                throw new Error('Module installation timed out');
            }
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

export const fetchBenchmarkingModulesForSubmission = async (submissionId) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/modules/update/information`,
      { id: submissionId },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching benchmarking modules:', error);
    throw error;
  }
};
