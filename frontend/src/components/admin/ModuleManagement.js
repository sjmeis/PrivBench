import { Box, Grid, Input, Button, Typography } from "@mui/joy";
import FormControl from "@mui/joy/FormControl";
import SearchIcon from "@mui/icons-material/Search";
import React, { useEffect, useMemo, useState } from "react";
import BenchmarkCardAdmin from "../ranking/BenchmarkCardAdmin";
import axios from "axios";
import AddIcon from "@mui/icons-material/Add";
import ModuleDetailView from "./ModuleDetailView";
import AddModuleModal from "./AddModuleModal";
import { useSnackbar } from "../../contexts/SnackbarProvider";
import LoadingSpinner from "../shared/LoadingSpinner";
import PublishDialog from "./PublishDialog";
import Tooltip from "@mui/joy/Tooltip";
import { ModuleService } from "../../services/ModuleService";
import { API_BASE_URL } from '../../config';

const ModuleManagement = () => {
  const [modules, setModules] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPublishOpen, setPublishOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasPendingUpdates, setHasPendingUpdates] = useState(false);
  const { showSnackbar } = useSnackbar();

  const filteredModules = useMemo(() => {
    const term = (searchTerm || "").trim().toLowerCase();
    if (!term) return modules;
    return modules.filter((module) => {
      const title = (module.title || "").toLowerCase();
      return title.includes(term);
    });
  }, [modules, searchTerm]);

  const fetchModules = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/modules`); // Adjust endpoint as needed
      setModules(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const refreshPendingUpdates = async () => {
    try {
      const data = await ModuleService.fetchPendingModuleUpdates();
      const pending = Array.isArray(data.pending) ? data.pending : [];
      setHasPendingUpdates(pending.length > 0);
    } catch (e) {
      // If endpoint fails, disable publish by default
      setHasPendingUpdates(false);
      console.error("Failed to load pending updates", e);
    }
  };

  useEffect(() => {
    fetchModules();
    refreshPendingUpdates(); // <-- add
  }, []);

  const handleUpdateOrDelete = () => {
    fetchModules();
    refreshPendingUpdates();
  };

  const handleAddModuleClick = () => {
    setIsModalOpen(true);
  };

  const handleAddModuleSubmit = () => {
    showSnackbar("Benchmarking Module Created Successfully", "success");
    setIsModalOpen(false);
    fetchModules();
    refreshPendingUpdates();
  };

  const handleAddModuleError = (errorMsg) => {
    showSnackbar(`An error occurred: ${errorMsg}`, "error");
  };

  const handleModuleClick = (module) => {
    setSelectedModule(module);
  };

  const handleCloseDetailView = () => {
    setSelectedModule(null);
  };

  const onModalClose = () => {
    fetchModules();
    refreshPendingUpdates();
    setIsModalOpen(false);
  };

  const handlePublished = () => {
    fetchModules();
    refreshPendingUpdates();
  };

  const actionButtonSx = {
    width: 160,
    "--Button-minHeight": "36px",
  };

  return (
    <Box sx={{ width: selectedModule ? "calc(70vw - 270px)" : "100%" }}>
      <Typography level="h2">Module Management</Typography>
      <Box>
        <Box
          className="SearchAndFilters-tabletUp"
          sx={{
            margin: "0 auto",
            borderRadius: "sm",
            py: 2,
            display: { xs: "none", sm: "flex" },
            flexWrap: "wrap",
            gap: 1.5,
            "& > *": {
              minWidth: { xs: "120px", md: "160px" },
            },
          }}
        >
          <FormControl sx={{ flex: 1 }} size="sm">
            <Input
              variant="outlined"
              placeholder="Search for Benchmarking Modules"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              name="searchTerm"
              size="sm"
              startDecorator={<SearchIcon />}
            />
          </FormControl>
          <Button
            onClick={handleAddModuleClick}
            endDecorator={<AddIcon />}
            size="sm"
            sx={actionButtonSx}
          >
            Add Module
          </Button>
          {/* Publish button with tooltip and disabled state */}
          <Tooltip
            title={hasPendingUpdates ? "" : "No pending updates to publish"}
            placement="top"
            disableHoverListener={hasPendingUpdates}
          >
            <span>
              <Button
                variant="soft"
                color="success"
                size="sm"
                disabled={!hasPendingUpdates}
                onClick={() => hasPendingUpdates && setPublishOpen(true)}
                sx={actionButtonSx}
              >
                Publish
              </Button>
            </span>
          </Tooltip>
        </Box>
        {loading ? (
          <LoadingSpinner></LoadingSpinner>
        ) : (
          <Box>
            <Grid container spacing={2}>
              {filteredModules.map((module) => (
                <Grid key={module.id} item xs={selectedModule ? 12 : 6}>
                  <BenchmarkCardAdmin
                    item={module}
                    handleCardClick={() => handleModuleClick(module)}
                    isSelected={
                      selectedModule && selectedModule.id === module.id
                    }
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Box>

      {selectedModule && (
        <ModuleDetailView
          onUpdateOrDelete={handleUpdateOrDelete}
          handleCloseDetailView={handleCloseDetailView}
          selectedModule={selectedModule}
        ></ModuleDetailView>
      )}
      <AddModuleModal
        isOpen={isModalOpen}
        onClose={onModalClose}
        onSubmit={handleAddModuleSubmit}
        onError={handleAddModuleError}
      />
      <PublishDialog
        open={isPublishOpen}
        onClose={() => setPublishOpen(false)}
        onPublished={handlePublished}
      />
    </Box>
  );
};

export default ModuleManagement;
