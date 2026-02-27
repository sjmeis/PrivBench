import React, { useEffect, useState } from "react";
import {
  Box,
  Modal,
  Typography,
  Stack,
  Input,
  Button,
  Textarea,
  FormControl,
  FormLabel,
  ModalClose,
  ModalDialog,
  DialogActions,
  DialogTitle,
  DialogContent,
  Divider,
  Select,
  Option,
  Checkbox,
  Sheet,
} from "@mui/joy";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import ModuleConfirmationDialog from "./ModuleConfirmationDialog";
import { ModuleService } from "../../services/ModuleService";
import { DatasetService } from "../../services/DatasetService";
import { Save } from "@mui/icons-material";
import { useSnackbar } from "../../contexts/SnackbarProvider";

// Device specification options
const DEVICE_SPECIFICATIONS = [
  { value: "cpu", label: "CPU Only" },
  { value: "gpu", label: "GPU Required" },
];

const AddModuleModal = ({ isOpen, onClose, onSubmit, onError }) => {
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [allDatasets, setAllDatasets] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    deviceSpecification: "cpu",
    algorithmFile: null,
    requirementsFile: null,
    selectedDatasetIds: [],
  });
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (isOpen) {
      DatasetService.fetchAllDatasets()
        .then(setAllDatasets)
        .catch(() => console.error("Failed to load dataset options."));

      setFormData({
        name: "",
        description: "",
        deviceSpecification: "cpu",
        algorithmFile: null,
        requirementsFile: null,
        selectedDatasetIds: [],
      });
    }
  }, [isOpen]);

  const isFormValid = () => {
    return (
      formData.name.trim() &&
      formData.description.trim() &&
      formData.algorithmFile &&
      formData.selectedDatasetIds.length > 0
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleToggleDataset = (id) => {
    setFormData((prev) => ({
      ...prev,
      selectedDatasetIds: prev.selectedDatasetIds.includes(id)
        ? prev.selectedDatasetIds.filter((i) => i !== id)
        : [...prev.selectedDatasetIds, id],
    }));
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, algorithmFile: e.target.files[0] });
  };

  // const handleSubmit = async () => {
  //   if (isSubmitting) return;
  //   setIsSubmitting(true);
  //   try {
  //     const response = await ModuleService.createBenchmarkingModule(formData);

  //     showSnackbar("Module creation initiated. Building Docker image...", "success");

  //     setIsConfirmationOpen(false);

  //     if (onSubmit) {
  //       const taskId = response.data?.install_task_id || response.install_task_id;
  //       onSubmit(taskId);
  //     }

  //     onClose();

  //   } catch (err) {
  //     console.error("Creation failed:", err);
  //     if (onError) onError(err.message);
  //     else showSnackbar(err.message || "Failed to initiate module creation", "danger");
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await ModuleService.createBenchmarkingModule(formData);
      onSubmit();
      onClose();
    } catch (err) {
      onError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e) => {
    setIsConfirmationOpen(false);
    e.preventDefault();
    handleSubmit();
    console.log(formData);
  };

  return (
    <Modal
      open={isOpen}
      onClose={isSubmitting ? undefined : onClose}
      sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <ModalDialog sx={{ width: "90%", maxWidth: 1200 }}>
        <DialogTitle>Add New Benchmarking Module</DialogTitle>
        <Divider sx={{ marginBottom: "10px" }} />

        <DialogContent>
          <Box sx={{ display: "flex", gap: 2, height: "100%" }}>
            {/* General Information */}
            <Box
              sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}
            >
              <Typography level="h5" fontWeight="bold">
                Step 1: General Module Information
              </Typography>
              <Stack spacing={2}>
                <FormControl required>
                  <FormLabel>Name</FormLabel>
                  <Input
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Device Specification</FormLabel>
                  <Select
                    value={formData.deviceSpecification}
                    onChange={(_, val) =>
                      setFormData({ ...formData, deviceSpecification: val })
                    }
                  >
                    {DEVICE_SPECIFICATIONS.map((device) => (
                      <Option key={device.value} value={device.value}>
                        {device.label}
                      </Option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel required>Description</FormLabel>
                  <Textarea
                    minRows={5}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel required>Upload Algorithm</FormLabel>
                  <Button
                    variant="outlined"
                    startDecorator={<CloudUploadIcon />}
                    component="label"
                  >
                    {formData.algorithmFile
                      ? `Uploaded: ${formData.algorithmFile.name}`
                      : "Upload a python file"}

                    <input
                      type="file"
                      accept=".py"
                      hidden
                      onChange={handleFileChange}
                    />
                  </Button>
                </FormControl>
                <FormControl>
                  <FormLabel>Requirements File</FormLabel>
                  <Button
                    variant="outlined"
                    startDecorator={<CloudUploadIcon />}
                    component="label"
                  >
                    {formData.requirementsFile
                      ? `Uploaded: ${formData.requirementsFile.name}`
                      : "Upload requirements.txt"}
                    <input
                      type="file"
                      accept=".txt"
                      hidden
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          requirementsFile: e.target.files[0],
                        })
                      }
                    />
                  </Button>
                </FormControl>
              </Stack>
            </Box>

            <Divider orientation="vertical" />

            <Box
              sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}
            >
              <Typography level="title-md" fontWeight="bold">
                Select Associated Datasets
              </Typography>
              <Sheet
                variant="outlined"
                sx={{
                  p: 1,
                  borderRadius: "sm",
                  maxHeight: 400,
                  overflow: "auto",
                }}
              >
                <Stack spacing={1}>
                  {allDatasets.length > 0 ? (
                    allDatasets.map((ds) => (
                      <Box
                        key={ds.id}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          p: 0.5,
                        }}
                      >
                        <Typography
                          level="body-sm"
                          startDecorator={
                            <InsertDriveFileRoundedIcon color="primary" />
                          }
                        >
                          {ds.name}
                        </Typography>
                        <Checkbox
                          checked={formData.selectedDatasetIds.includes(ds.id)}
                          onChange={() => handleToggleDataset(ds.id)}
                        />
                      </Box>
                    ))
                  ) : (
                    <Typography
                      level="body-xs"
                      sx={{ p: 2, textAlign: "center", fontStyle: "italic" }}
                    >
                      No datasets found. Upload them first in Dataset
                      Management.
                    </Typography>
                  )}
                </Stack>
              </Sheet>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={!isFormValid() || isSubmitting}
            loading={isSubmitting}
            color="success"
            onClick={() => setIsConfirmationOpen(true)}
            endDecorator={!isSubmitting ? <Save /> : null}
          >
            {isSubmitting ? "Installing..." : "Create Module"}
          </Button>
        </DialogActions>
        <ModuleConfirmationDialog
          handleSaveConfirmation={() => {
            setIsConfirmationOpen(false);
            handleSubmit();
          }}
          handleCloseConfirmation={() => setIsConfirmationOpen(false)}
          isConfirmationOpen={isConfirmationOpen}
          module={formData}
        />
      </ModalDialog>
    </Modal>
  );
};

export default AddModuleModal;
