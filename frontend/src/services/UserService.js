import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000'; // Fixme: Consider centralizing the API base URL in a config file


export const updateUser = async (userData) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/user/update`, userData, {
            withCredentials: true,
        });

        return response.data;
    } catch (error) {
        if (error.response) {
            console.error('Error response:', error.response);
            throw new Error(error.response.data.error || 'Failed to update user');
        } else if (error.request) {
            console.error('Error request:', error.request);
            throw new Error('No response received from the server');
        } else {
            console.error('Error message:', error.message);
            throw new Error(error.message);
        }
    }
};
