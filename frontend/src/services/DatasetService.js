import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

export const fetchAllDatasets = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/datasets`);

        if (response.status === 200) {
            return response.data;
        } else {
            console.error('Unexpected response status:', response.status);
            throw new Error('Failed to fetch datasets. Please try again later.');
        }
    } catch (error) {
        console.error('Error fetching datasets:', error);
        throw error;
    }
};
