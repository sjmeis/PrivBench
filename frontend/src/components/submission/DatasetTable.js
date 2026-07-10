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
import { Box, Checkbox, Typography } from "@mui/joy";

const DatasetsTable = ({
                           datasets,
                           selectedDatasets,
                           downloadedDatasets,
                           handleToggleSelect,
                           handleSelectAll,
                       }) => {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", width: "100%", border: "1px solid #e0e0e0", borderRadius: 2, marginBottom: 2, marginTop: 2 }}>
            <Box sx={{ display: "flex", padding: "8px 16px", borderBottom: "1px solid #e0e0e0", fontWeight: "bold" }}>
                <Box sx={{ flex: 1 }}>Dataset</Box>
                <Box sx={{ flex: 1 }}>Status</Box>
                <Box sx={{ flex: 1, textAlign: "end" }}>Actions</Box>
            </Box>

            {datasets.map((dataset, index) => (
                <Box
                    key={dataset.name}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        padding: "8px 16px",
                        borderBottom: index === datasets.length - 1 ? "none" : "1px solid #e0e0e0",
                    }}
                >
                    <Box sx={{ flex: 1 }}>
                        {dataset.name}
                    </Box>

                    <Box sx={{ flex: 1 }}>
                        {downloadedDatasets.has(dataset.name) ? "Downloaded" : "Not Downloaded"}
                    </Box>

                    <Box sx={{ flex: 1, textAlign: "end" }}>
                        <Checkbox
                            checked={selectedDatasets.includes(dataset.name)}
                            onChange={() => handleToggleSelect(dataset.name)}
                        />
                    </Box>
                </Box>
            ))}

            <Box sx={{ display: "flex", padding: "8px 16px", borderTop: "1px solid #e0e0e0", alignItems: "end", justifyContent: "flex-end" }}>
                <Box sx={{ display: "flex", textAlign: "end" }}>
                    <Typography level="body2" sx={{ marginRight: 3 }}>
                        Select All
                    </Typography>
                    <Checkbox
                        indeterminate={selectedDatasets.length > 0 && selectedDatasets.length < datasets.length}
                        checked={selectedDatasets.length === datasets.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default DatasetsTable;



