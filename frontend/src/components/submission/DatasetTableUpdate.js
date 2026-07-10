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

import React from "react";
import { Box, Button } from "@mui/joy";
import { Upload } from "@mui/icons-material";

const DatasetTableUpdate = ({
  datasets,
  uploadedFiles,
  uploadingDatasetId,
  onFileSelect,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        border: "1px solid #e0e0e0",
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          padding: "8px 16px",
          borderBottom: "1px solid #e0e0e0",
          fontWeight: "bold",
        }}
      >
        <Box sx={{ flex: 1 }}>Original Dataset</Box>
        <Box sx={{ flex: 1 }}>Module Name</Box>
        <Box sx={{ flex: 1 }}>Uploaded Dataset</Box>
        <Box sx={{ flex: 1, textAlign: "center" }}>Actions</Box>
      </Box>

      {datasets.map((dataset) => (
        <Box
          key={dataset.id}
          sx={{
            display: "flex",
            alignItems: "center",
            padding: "8px 16px",
            borderBottom: "1px solid #e0e0e0",
          }}
        >
          <Box sx={{ flex: 1 }}>{dataset.name}</Box>
          <Box sx={{ flex: 1 }}>{dataset.module_name}</Box>
          <Box sx={{ flex: 1 }}>
            {uploadedFiles[dataset.id]
              ? uploadedFiles[dataset.id].name
              : "Not Uploaded"}
          </Box>
          <Box sx={{ flex: 1, textAlign: "center" }}>
            <Button
              variant="outlined"
              component="label"
              disabled={uploadingDatasetId === dataset.id}
              endDecorator={<Upload />}
            >
              {uploadingDatasetId === dataset.id ? "Uploading..." : "Upload"}
              <input
                type="file"
                accept=".csv"
                hidden
                onChange={(e) => onFileSelect(e, dataset.id)}
              />
            </Button>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default DatasetTableUpdate;
