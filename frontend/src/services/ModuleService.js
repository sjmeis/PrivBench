import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

export const createBenchmarkingModule = async (formData) => {
    try {
        // Create a new FormData instance
        const form = new FormData();
        
        // Add basic text fields
        form.append('name', formData.name);
        form.append('description', formData.description);
        
        // Add the algorithm file
        if (formData.algorithmFile) {
            form.append('algorithmFile', formData.algorithmFile);
        }
        
        // Add selected datasets (convert to JSON string since it's an array)
        if (formData.selectedDatasets && formData.selectedDatasets.length > 0) {
            form.append('selectedDatasets', JSON.stringify(formData.selectedDatasets));
        }
        
        // Add uploaded datasets (these are files)
        if (formData.uploadedDatasets && formData.uploadedDatasets.length > 0) {
            formData.uploadedDatasets.forEach((dataset, index) => {
                form.append(`uploadedDatasets`, dataset);
            });
        }

        const response = await axios.post(`${API_BASE_URL}/modules/create`, form, {
            withCredentials: true,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        
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