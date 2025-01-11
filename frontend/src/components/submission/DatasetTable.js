import React from "react";
import { Box, Checkbox, Typography } from "@mui/joy";

const DatasetsTable = ({
                           datasets,
                           downloadedDatasets,
                           selectedDatasets,
                           handleToggleSelect,
                           handleSelectAll,
                       }) => {
    return (
        <Box>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: "bold",
                    borderBottom: "1px solid",
                    paddingBottom: 1,
                }}
            >
                <Typography level="body1" sx={{ flex: 1 }}>
                    Dataset
                </Typography>
                <Typography level="body1" sx={{ flex: 1 }}>
                    Status
                </Typography>
                <Typography
                    level="body1"
                    sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        flex: 1,
                    }}
                >
                    Download
                </Typography>
            </Box>

            {datasets.map((dataset, index) => (
                <Box
                    key={dataset.name}
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingY: 1,
                        borderBottom: index === datasets.length - 1 ? "none" : "1px solid",
                    }}
                >
                    <Typography level="body2" sx={{ flex: 1 }}>
                        {dataset.name}
                    </Typography>
                    <Typography level="body2" sx={{ flex: 1 }}>
                        {downloadedDatasets.includes(dataset.name)
                            ? "Downloaded"
                            : "Not Downloaded"}
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            flex: 1,
                        }}
                    >
                        <Checkbox
                            checked={selectedDatasets.includes(dataset.name)}
                            onChange={() => handleToggleSelect(dataset.name)}
                            disabled={downloadedDatasets.includes(dataset.name)}
                            sx={{ mr: 3 }}
                        />
                    </Box>
                </Box>
            ))}

            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    paddingY: 1,
                    borderTop: "1px solid",
                }}
            >
                <Typography level="body2" sx={{ marginRight: 3 }}>
                    Select all
                </Typography>
                <Checkbox
                    indeterminate={
                        selectedDatasets.length > 0 &&
                        selectedDatasets.length <
                        datasets.filter((d) => !downloadedDatasets.includes(d.name))
                            .length
                    }
                    checked={
                        selectedDatasets.length ===
                        datasets.filter((d) => !downloadedDatasets.includes(d.name))
                            .length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    sx={{ mr: 3 }}
                />
            </Box>
        </Box>
    );
};

export default DatasetsTable;
