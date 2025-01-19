import axios from 'axios';
import { API_BASE_URL } from '../config';

export const BenchmarkService = {
    uploadPrivatizedDataset: async (file, submissionId, datasetId, onUploadProgress) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('submission_id', submissionId);
            formData.append('dataset_id', datasetId);

            const response = await axios.post(
                `${API_BASE_URL}/upload-privatized-dataset`,
                formData,
                {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    onUploadProgress: (progressEvent) => {
                        if (onUploadProgress) {
                            const percentCompleted = Math.round(
                                (progressEvent.loaded * 100) / progressEvent.total
                            );
                            onUploadProgress(percentCompleted);
                        }
                    },
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error uploading privatized dataset:', error);
            throw error;
        }
    },

    startBenchmarkUpdate: async (submissionId) => {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/run-benchmark/update/${submissionId}`,
                {},
                { withCredentials: true }
            );
            return response.data;
        } catch (error) {
            console.error('Error starting benchmark update:', error);
            throw error;
        }
    }
}; 