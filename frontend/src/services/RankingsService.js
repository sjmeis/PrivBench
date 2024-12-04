import axios from 'axios';


const API_BASE_URL = 'http://localhost:5000';

const fetchRankings = async (searchTerm = '', page = 1, limit = 8, sortOrder = 'desc', orderBy = 'score') => {
    try {
        const url = `${API_BASE_URL}/ranking`;

        const requestBody = {
            searchTerm: searchTerm,
            page: page,
            limit: limit,
            sortOrder: sortOrder,
            orderBy: orderBy
        };

        const response = await axios.post(url, requestBody, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            console.log('Ranking data:', response.data);
            return response.data;
        } else {
            throw new Error('Failed to fetch rankings');
        }
    } catch (error) {
        console.error('Error fetching rankings:', error);
        throw error;
    }
};

const fetchSubmissionDetails = async (submissionId) => {
    try {
        const url = `${API_BASE_URL}/ranking/detail`;
        const response = await axios.post(url, {id: submissionId});

        if (response.status === 200) {
            return response.data.submission;
        } else {
            throw new Error('Failed to fetch submission details');
        }
    } catch (error) {
        console.error('Error fetching submission details:', error);
        if (error.response) {
            return {error: error.response.data.message || 'Something went wrong'};
        } else {
            return {error: 'Network error or server is down'};
        }
    }
};

const getUserSubmissions = async () => {
    try {
        const url = `${API_BASE_URL}/ranking/user`;
        const response = await axios.get(url, {withCredentials: true});
        return response.data; // Return the API response data
    } catch (error) {
        console.error('Error fetching user submissions:', error);
        throw error.response ? error.response.data : error; // Throw error to be handled by caller
    }
};

const updateSubmissionVisibility = async (submissionId, isPublic) => {
    try {
        const url = `${API_BASE_URL}/ranking/update`;
        const response = await axios.post(url, {
            id: submissionId,
            isPublic,
        }, {withCredentials: true});
        return response.data;
    } catch (error) {
        console.error('Error updating submission visibility:', error);
        throw error.response ? error.response.data : error;
    }
};

export {fetchRankings, fetchSubmissionDetails, getUserSubmissions, updateSubmissionVisibility};
