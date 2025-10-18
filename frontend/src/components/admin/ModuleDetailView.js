import {
  Box,
  Button,
  Divider,
  FormLabel,
  IconButton,
  Input,
  Sheet,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Textarea,
  Typography,
} from "@mui/joy";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FormControl from "@mui/joy/FormControl";
import React, { useEffect, useState } from "react";
import FileTableSmall from "./FileTableSmall";
import { getDateString } from "../../utils/Date";
import ModuleDeletionConfirmationDialog from "./ModuleDeletionConfirmationDialog";
import { ModuleService } from "../../services/ModuleService";
import { useSnackbar } from "../../contexts/SnackbarProvider";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import { Save } from "@mui/icons-material";

const ModuleDetailView = ({
  selectedModule,
  onUpdateOrDelete,
  handleCloseDetailView,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    createdAt: null,
    version: "",
    path: "",
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const DATASET_TABLE_TITLE = "Associated Dataset";
  const SCRIPT_TABLE_TITLE = "Python Benchmarking Module Logic";
  const { showSnackbar } = useSnackbar();
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleDeleteModule = async () => {
    try {
      setIsDeleting(true);
      await ModuleService.deleteBenchmarkModule(selectedModule.id);
      handleCloseDialog();
      handleCloseDetailView();
      onUpdateOrDelete();
      showSnackbar("Benchmarking Module was deleted", "success");
    } catch (error) {
      showSnackbar("Error deleting Module", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const disableSaveButton = () => {
    const currentName = (selectedModule.name || "").trim();
    const currentDesc = (selectedModule.description || "").trim();
    const newName = (formData.name || "").trim();
    const newDesc = (formData.description || "").trim();
    return newName === currentName && newDesc === currentDesc;
  };

  const saveChanges = async () => {
    try {
      const payload = {};
      const currentName = (selectedModule.name || "").trim();
      const newName = (formData.name || "").trim();
      const currentDesc = (selectedModule.description || "").trim();
      const newDesc = (formData.description || "").trim();

      if (newName && newName !== currentName) {
        payload.name = newName;
      }
      if ((formData.description ?? "") !== "" && newDesc !== currentDesc) {
        payload.description = newDesc;
      }

      if (Object.keys(payload).length === 0) {
        showSnackbar("No changes to save", "neutral");
        return;
      }

      await ModuleService.updateBenchmarkModule(selectedModule.id, payload);
      onUpdateOrDelete();
      handleCloseDetailView();
      showSnackbar("Benchmarking Module was Updated", "success");
    } catch (error) {
      showSnackbar("Error on updating module", "error");
    }
  };

  useEffect(() => {
    setFormData({
      name: selectedModule?.name ?? "",
      description: selectedModule?.description ?? "",
      createdAt: selectedModule?.createdAt ?? null,
      version: selectedModule?.version ?? "",
      path: selectedModule?.path ?? "",
    });
  }, [selectedModule]);

  return (
    <Sheet
      sx={{
        position: "fixed",
        top: 0,
        right: 0,
        marginTop: "65.36px",
        height: "100%",
        width: "30%",
        bgcolor: "background.body",
        borderLeft: "1px solid",
        borderColor: "divider",
        zIndex: 1200,
        overflowY: "auto",
      }}
    >
      <Box sx={{ p: 2, display: "flex", alignItems: "center" }}>
        <Typography level="title-md" sx={{ flex: 1 }}>
          {selectedModule.name}
        </Typography>
        <IconButton
          component="span"
          variant="plain"
          color="neutral"
          size="sm"
          onClick={handleCloseDetailView}
        >
          <CloseRoundedIcon />
        </IconButton>
      </Box>
      <Divider />
      <Tabs>
        <TabList>
          <Tab sx={{ flexGrow: 1 }}>
            <Typography level="title-sm">Details</Typography>
          </Tab>
          <Tab sx={{ flexGrow: 1 }}>
            <Typography level="title-sm">Files</Typography>
          </Tab>
        </TabList>
        <TabPanel value={0} sx={{ p: 2 }}>
          <Box
            sx={{
              width: "100%",
              height: "calc(100vh - 200px)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}
          >
            <Stack spacing={2} sx={{ width: "100%" }}>
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
                <FormLabel>Description</FormLabel>
                <Textarea
                  maxRows={5}
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Active Since</FormLabel>
                <Input
                  disabled
                  name="createdAt"
                  type="text"
                  value={
                    formData.createdAt
                      ? getDateString(formData.createdAt)
                      : "N/A"
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>Version</FormLabel>
                <Input
                  disabled
                  name="version"
                  type="text"
                  value={formData.version}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Path</FormLabel>
                <Input
                  disabled
                  name="path"
                  type="text"
                  value={formData.path}
                  onChange={handleInputChange}
                  autoComplete="username"
                />
              </FormControl>
            </Stack>

            <Box
              sx={{
                p: 2,
                mt: "auto",
              }}
            >
              <Stack spacing={2}>
                <Button
                  disabled={disableSaveButton()}
                  onClick={saveChanges}
                  fullWidth
                  endDecorator={<Save />}
                >
                  Save Updates
                </Button>
                <Button
                  color="danger"
                  onClick={() => handleOpenDialog()}
                  fullWidth
                  endDecorator={<DeleteForeverIcon />}
                >
                  Delete Module
                </Button>
              </Stack>
            </Box>
          </Box>
        </TabPanel>
        <TabPanel value={1} sx={{ p: 2 }}>
          <Box
            sx={{
              width: "100%",
              height: "calc(100vh - 200px)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}
          >
            <Stack spacing={2}>
              <FileTableSmall
                datasets={[selectedModule]}
                title={SCRIPT_TABLE_TITLE}
              />
              <FileTableSmall
                datasets={[selectedModule.dataset]}
                title={DATASET_TABLE_TITLE}
              />
            </Stack>
          </Box>
        </TabPanel>
      </Tabs>
      <ModuleDeletionConfirmationDialog
        isOpen={isDialogOpen}
        handleClose={handleCloseDialog}
        handleDelete={handleDeleteModule}
        moduleName={selectedModule.name}
        isLoading={isDeleting}
      />
    </Sheet>
  );
};

export default ModuleDetailView;
