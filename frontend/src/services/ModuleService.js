import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000'; //fixme: make this global to avoid multiple declarement

export const createBenchmarkingModule = async (formData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/modules/create`, formData, {withCredentials: true});

        return response.data;
    } catch (error) { //fixme: handle this errors properly using toast messages
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