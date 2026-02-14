import React, { useEffect, useState } from "react";
import { Box, Typography, Table, Sheet, Select, Option } from "@mui/joy";
import { InfoOutlined } from "@mui/icons-material";
import { ModuleService } from "../../services/ModuleService";

const ModuleDatasetSelectionStep = ({ datasetChoices, onChoicesChange }) => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const data = await ModuleService.fetchModulesWithDatasets();
        setModules(data);

        // Initialize choices for all modules; auto-select when only one dataset
        const autoSelected = { ...datasetChoices };
        let changed = false;
        for (const mod of data) {
          const hasKey = Object.prototype.hasOwnProperty.call(autoSelected, mod.id);

          if (!hasKey) {
            if (mod.compatibleDatasets.length === 1) {
              autoSelected[mod.id] = mod.compatibleDatasets[0].id;
            } else {
              autoSelected[mod.id] = null;
            }
            changed = true;
          } else if (
            mod.compatibleDatasets.length === 1 &&
            !autoSelected[mod.id]
          ) {
            autoSelected[mod.id] = mod.compatibleDatasets[0].id;
            changed = true;
          }
        }
        if (changed) {
          onChoicesChange(autoSelected);
        }
      } catch (error) {
        console.error("Error fetching modules with datasets:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchModules();
    // eslint-disable-next-line
  }, []);

  const handleDatasetSelect = (moduleId, datasetId) => {
    const updated = { ...datasetChoices, [moduleId]: datasetId };
    onChoicesChange(updated);
  };

  if (loading) {
    return (
      <Box>
        <Typography level="h2" mb={2}>
          Select Datasets for Modules
        </Typography>
        <Typography>Loading modules...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography level="h2" mb={2}>
        Select Datasets for Modules
      </Typography>
      <Typography
        sx={{ marginY: 2, p: 1 }}
        startDecorator={<InfoOutlined />}
        variant="soft"
        color="neutral"
        level="body1"
      >
        For each benchmark module, select one compatible dataset that you will
        privatize and upload.
      </Typography>

      <Sheet variant="outlined" sx={{ borderRadius: "sm", overflow: "auto" }}>
        <Table stripe="odd" hoverRow>
          <thead>
            <tr>
              <th style={{ width: "50%" }}>Module</th>
              <th style={{ width: "50%" }}>Dataset</th>
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
                  {module.compatibleDatasets.length === 1 ? (
                    <Typography level="body-sm">
                      {module.compatibleDatasets[0].name}
                    </Typography>
                  ) : (
                    <Select
                      size="sm"
                      placeholder="Select dataset"
                      value={datasetChoices[module.id] || null}
                      onChange={(_, value) =>
                        handleDatasetSelect(module.id, value)
                      }
                    >
                      {module.compatibleDatasets.map((ds) => (
                        <Option key={ds.id} value={ds.id}>
                          {ds.name}
                        </Option>
                      ))}
                    </Select>
                  )}
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
