import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Chip, Box, Button } from '@mui/joy';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { getDateString } from "../../utils/Date";

const RankingsPreview = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const response = await axios.post(`${API_BASE_URL}/ranking`, {
          page: 1,
          limit: 5,
          sortBy: 'score',
          sortOrder: 'desc'
        });
        setRankings(response.data.results);
      } catch (error) {
        console.error('Error fetching rankings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, []);

  if (loading) {
    return (
      <Box className="flex items-center justify-center w-full h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </Box>
    );
  }

  return (
    <Card className="w-full overflow-hidden">
      <Typography level="h4" className="p-4">
        Top Submissions
      </Typography>
      <Table aria-label="rankings preview" className="mb-4">
        <thead>
          <tr>
            <th className="text-left w-1/3">Name</th>
            <th className="text-left w-1/4">Submitted By</th>
            <th className="text-left w-1/6">Date</th>
            <th className="text-right w-1/6">Score</th>
             <th className="text-left w-1/4">Status</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.user.username}</td>
              <td>{getDateString(row.submissionDate)}</td>
              <td className="text-right">{row.overallScore.toFixed(2)}%</td>
              <td>
                <Chip
                  size="sm"
                  variant="soft"
                  color={row.status === 'completed' ? 'success' : 'warning'}
                >
                  {row.status}
                </Chip>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Box className="p-4 flex justify-center">
        <Button
          variant="solid"
          color="primary"
          onClick={() => navigate('/rankings')}
          className="w-full md:w-auto"
        >
          View Full Rankings
        </Button>
      </Box>
    </Card>
  );
};

export default RankingsPreview;