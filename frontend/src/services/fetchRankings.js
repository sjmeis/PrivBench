import axios from 'axios';

const fetchRankings = async (searchTerm = '', page = 1, limit = 8) => {
    try {
        const url = 'http://localhost:5000/ranking'; // Replace with your actual backend URL

        const requestBody = {
            searchTerm: searchTerm,
            page: page,
            limit: limit,
        };

        const response = await axios.post(url, requestBody, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            console.log('Ranking data:', response.data);
            return response.data;
        }
    } catch (error) {
        console.error('Error fetching rankings:', error);
        throw error;
    }
};

export default fetchRankings;
