import React from "react";
import {Box, Checkbox, Typography} from "@mui/joy";

const DatasetsTable = ({
                           datasets,
                           selectedDatasets,
                           handleToggleSelect,
                           handleSelectAll,
                       }) => {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", width: "100%", border: "1px solid #e0e0e0", borderRadius: 2, marginBottom: 2, marginTop: 2 }}>
            <Box sx={{ display: "flex", padding: "8px 16px", borderBottom: "1px solid #e0e0e0", fontWeight: "bold" }}>
                <Box sx={{ flex: 1 }}>Dataset</Box>
                <Box sx={{ flex: 1 }}>Status</Box>
                <Box sx={{ flex: 1, textAlign: "end"}}>Actions</Box>
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
                        {"Not Downloaded"}
                    </Box>

                    <Box sx={{ flex: 1, textAlign: "end"}}>
                        <Checkbox
                            checked={selectedDatasets.includes(dataset.name)}
                            onChange={() => handleToggleSelect(dataset.name)}
                        />
                    </Box>
                </Box>
            ))}

            <Box sx={{ display: "flex", padding: "8px 16px", borderTop: "1px solid #e0e0e0", alignItems: "end", justifyContent: "flex-end" }}>
                <Box sx={{ display: "flex", textAlign: "end"}}>
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



