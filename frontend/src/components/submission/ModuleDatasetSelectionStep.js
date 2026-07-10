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

import React, { useEffect, useState } from "react";
import { Box, Chip, Typography, Table, Sheet } from "@mui/joy";
import { InfoOutlined } from "@mui/icons-material";
import { ModuleService } from "../../services/ModuleService";

const ModuleDatasetSelectionStep = ({ onRequiredDatasetsResolved }) => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const data = await ModuleService.fetchModulesWithDatasets();
        setModules(data);

        // Derive unique required datasets across all modules
        const uniqueDatasets = new Map();
        for (const mod of data) {
          for (const ds of mod.compatibleDatasets) {
            uniqueDatasets.set(ds.id, ds);
          }
        }
        onRequiredDatasetsResolved(Array.from(uniqueDatasets.values()));
      } catch (error) {
        console.error("Error fetching modules with datasets:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchModules();
    // eslint-disable-next-line
  }, []);

  if (loading) {
    return (
      <Box>
        <Typography level="h2" mb={2}>
          Dataset Overview
        </Typography>
        <Typography>Loading modules...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography level="h2" mb={2}>
        Dataset Overview
      </Typography>
      <Typography
        sx={{ marginY: 2, p: 1 }}
        startDecorator={<InfoOutlined />}
        variant="soft"
        color="neutral"
        level="body1"
      >
        Each benchmark module uses one or more datasets. The table below shows
        which datasets are required for each module. You will need to download
        and privatize all unique datasets listed.
      </Typography>

      <Sheet variant="outlined" sx={{ borderRadius: "sm", overflow: "auto" }}>
        <Table stripe="odd" hoverRow>
          <thead>
            <tr>
              <th style={{ width: "50%" }}>Module</th>
              <th style={{ width: "50%" }}>Required Datasets</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((module) => (
              <tr key={module.id}>
                <td>
                  <Typography level="body-md" fontWeight="md">
                    {module.title}
                  </Typography>
                </td>
                <td>
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    {module.compatibleDatasets.map((ds) => (
                      <Chip key={ds.id} size="sm" variant="soft" color="primary">
                        {ds.name}
                      </Chip>
                    ))}
                  </Box>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Sheet>
    </Box>
  );
};

export default ModuleDatasetSelectionStep;
