/* Copyright (C) 2026 Stephen Meisenbacher

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.*/

import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Chip, Box, Button, Stack } from '@mui/joy';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { getDateString } from "../../utils/Date";
import { fetchRankingFilters } from '../../services/RankingsService';

const RankingsPreview = () => {
  const [rankings, setRankings] = useState([]);
  const [currentVersion, setCurrentVersion] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const loadTopRankings = async () => {
      try {
        setLoading(true);
        // Fetch available versions to get the latest release
        const filterData = await fetchRankingFilters();
        const latestVersion = filterData.versions?.[0] || null;

        if (!isMounted) return;
        if (latestVersion) {
          setCurrentVersion(latestVersion);
        }

        // Fetch top 5 submissions strictly scoped to the latest version
        const response = await axios.post(`${API_BASE_URL}/ranking`, {
          page: 1,
          limit: 5,
          sortBy: 'score',
          sortOrder: 'desc',
          version: latestVersion,
        });

        if (isMounted) {
          setRankings(response.data.results || []);
        }
      } catch (error) {
        console.error('Error fetching rankings preview:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTopRankings();
    return () => {
      isMounted = false;
    };
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
      <Box className="p-4 flex justify-between items-center flex-wrap gap-2">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography level="h4">Top Submissions</Typography>
          {currentVersion && (
            <Chip color="primary" variant="soft" size="sm">
              v{currentVersion}
            </Chip>
          )}
        </Stack>
      </Box>
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
          {rankings.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center p-8 text-neutral-400">
                No public submissions evaluated for v{currentVersion || 'the latest version'} yet.
              </td>
            </tr>
          ) : (
            rankings.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.user.username}</td>
                <td>{getDateString(row.submissionDate)}</td>
                <td className="text-right">
                  {row.overallScore !== null && row.overallScore !== undefined
                    ? `${Number(row.overallScore).toFixed(2)}%`
                    : 'N/A'}
                </td>
                <td>
                  <Chip
                    size="sm"
                    variant="soft"
                    color={row.status === 'completed' ? 'success' : 'danger'}
                  >
                    {row.status}
                  </Chip>
                </td>
              </tr>
            ))
          )}
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