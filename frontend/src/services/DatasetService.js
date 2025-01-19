import axios from 'axios';
import { API_BASE_URL } from '../config';

const fetchAllDatasets = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/datasets`);
        if (response.status === 200) {
            return response.data;
        } else {
            throw new Error('Failed to fetch datasets. Please try again later.');
        }
    } catch (error) {
        console.error('Error fetching datasets:', error);
        throw error;
    }
};

const fetchAllDatasetsForUpdate = async (submissionId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/update/datasets/list/${submissionId}`);
        if (response.status === 200) {
            return response.data;
        } else {
            throw new Error('Failed to fetch datasets for update. Please try again later.');
        }
    } catch (error) {
        console.error('Error fetching datasets for update:', error);
        throw error;
    }
};

export const DatasetService = {
    fetchAllDatasets,
    fetchAllDatasetsForUpdate,
};
