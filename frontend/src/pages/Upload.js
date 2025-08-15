import { useState, useEffect } from "react";
import { Box, Button } from "@mui/joy";
import { Bookmark, Done, East, Save, Update, West } from "@mui/icons-material";
import { useLocation } from "react-router-dom";
import { useSnackbar } from "../contexts/SnackbarProvider";
import DownloadStep from "../components/submission/DownloadStep";
import MetadataStep from "../components/submission/MetadataStep";
import UploadStep from "../components/submission/UploadStep";
import FinalStep from "../components/submission/FinalStep";
import { getUserSubmissions } from "../services/RankingsService";
import { SideNaveSubmission } from "../components/submission/SideNaveSubmission";
import MetadataTemplateDialog from "../components/submission/MetadataTemplateDialog";
import { SubmissionStatus } from "src/enums/SubmissionStatus";

const Upload = () => {
  const location = useLocation();
  const { state } = location;

  const [currentStep, setCurrentStep] = useState(state?.currentStep || 0);
  const [submissionId, setSubmissionId] = useState(state?.submissionId || null);
  const [datasets, setDatasets] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [templates, setTemplates] = useState([]);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateDialogAction, setTemplateDialogAction] = useState("save");
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    state?.templateId || null
  );
  const [metadata, setMetadata] = useState(
    state?.metadata || {
      modelName: "",
      modelDescription: "",
      license: "",
      tags: [],
      authors: "",
      researchPaperUrl: "",
      githubUrl: "",
      bibtexCitation: "",
    }
  );
  const [isMetadataValid, setIsMetadataValid] = useState(false);
  const [initialMetadata, setInitialMetadata] = useState({});
  const { showSnackbar } = useSnackbar();

  const fetchUserSubmission = async () => {
    // If metadata is already loaded from a template, don't overwrite it.
    if (state?.templateId) {
      return;
    }
    try {
      const data = await getUserSubmissions();
      const pendingSubmission = data.submissions.find(
        (sub) => sub.status === SubmissionStatus.PENDING
      );

      const inProgressSubmission = data.submissions.find(
        (sub) => sub.status === SubmissionStatus.IN_PROGRESS
      );

      if (pendingSubmission) {
        setCurrentStep(2);
        setMetadata(pendingSubmission.metadata);
        setInitialMetadata(pendingSubmission.metadata);
        setSubmissionId(pendingSubmission.id);
      } else if (inProgressSubmission) {
        setCurrentStep(3);
        setMetadata(inProgressSubmission.metadata);
        setInitialMetadata(inProgressSubmission.metadata);
        setSubmissionId(inProgressSubmission.id);
      } else if (!state?.metadata) {
        // Only reset if no metadata was passed in state
        setMetadata({
          modelName: "",
          modelDescription: "",
          license: "",
          tags: [],
          authors: "",
          researchPaperUrl: "",
          githubUrl: "",
          bibtexCitation: "",
        });
        setInitialMetadata({});
      }
    } catch (error) {
      console.error("An error occurred while fetching user submission:", error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch("http://localhost:5000/metadata/templates", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      } else {
        console.error("Failed to fetch templates");
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  useEffect(() => {
    fetchUserSubmission();
    fetchTemplates();
  }, []);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const listResponse = await fetch(
          "http://localhost:5000/datasets/list",
          {
            credentials: "include",
            cache: "no-cache",
          }
        );
        if (!listResponse.ok) {
          const errorData = await listResponse.json();
          console.error("Failed to fetch datasets:", errorData.error);
          return;
        }

        const data = await listResponse.json();

        const datasetsWithDetails = await Promise.all(
          data.datasets.map(async (dataset) => {
            try {
              const contentResponse = await fetch(
                `http://localhost:5000/datasets/${encodeURIComponent(
                  dataset.name
                )}`,
                {
                  credentials: "include",
                  cache: "no-cache",
                }
              );

              if (!contentResponse.ok) {
                console.error(
                  `Failed to fetch content for dataset ${dataset.name}`
                );
                return { ...dataset, rows: 0, columns: 0 };
              }

              const content = await contentResponse.text();
              const rows = content.trim().split("\n"); // Split by newline
              const columns = rows[0]?.split(",").length || 0; // Use the first row for column count

              return {
                ...dataset,
                rows: rows.length, // Exclude header row
                columns,
              };
            } catch (error) {
              console.error(`Error fetching dataset ${dataset.name}:`, error);
              return { ...dataset, rows: 0, columns: 0 };
            }
          })
        );

        setDatasets(datasetsWithDetails);
      } catch (error) {
        console.error("An error occurred while fetching datasets:", error);
      }
    };

    fetchDatasets();
  }, []);

  const handleStepClick = (step) => {
    setCurrentStep(step);
  };

  const validateMetadata = () => {
    const requiredFields = [
      "modelName",
      "modelDescription",
      "license",
      "authors",
      "researchPaperUrl",
      "githubUrl",
      "bibtexCitation",
    ];
    return requiredFields.every(
      (field) => metadata[field] && metadata[field].trim().length > 0
    );
  };

  useEffect(() => {
    if (currentStep === 1) {
      setIsMetadataValid(validateMetadata());
    }
    // eslint-disable-next-line
  }, [metadata, currentStep]);

  const handleSaveMetadata = async () => {
    try {
      // Check if metadata has changed
      if (JSON.stringify(metadata) === JSON.stringify(initialMetadata)) {
        setCurrentStep((prev) => prev + 1);
        return; // Skip saving if no changes
      }
      const isUpdate = Boolean(submissionId);
      const endpoint = "http://localhost:5000/metadata";
      const method = isUpdate ? "PUT" : "POST";

      const body = isUpdate
        ? JSON.stringify({
            id: submissionId,
            metadata,
          })
        : JSON.stringify(metadata);

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body,
      });

      if (response.ok) {
        const data = await response.json();
        showSnackbar(
          isUpdate
            ? "Metadata updated successfully!"
            : "Metadata saved successfully!",
          "success"
        );

        if (!isUpdate && data.submission_id) {
          setSubmissionId(data.submission_id);
        }

        // Advance to the next step
        setCurrentStep((prev) => prev + 1);
      } else {
        const errorData = await response.json().catch(() => ({}));
        showSnackbar(
          `Failed to ${isUpdate ? "update" : "save"} metadata: ${
            errorData.message || response.statusText || "Unknown error"
          }`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error saving/updating metadata:", error);
      showSnackbar("Failed to save metadata. Please try again!", "error");
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!isMetadataValid) {
        showSnackbar("Please fill in all metadata fields!", "error");
        return;
      }
      handleSaveMetadata();
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handleSaveAsTemplate = async (templateName) => {
    try {
      // Validate metadata before saving as template
      if (!isMetadataValid) {
        showSnackbar(
          "Please fill in all metadata fields before saving as template!",
          "error"
        );
        return;
      }

      const response = await fetch("http://localhost:5000/metadata/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ ...metadata, templateName }),
      });

      if (response.ok) {
        const data = await response.json();
        showSnackbar("Metadata template saved successfully!", "success");
        console.log("Template saved with ID:", data.template_id);
        fetchTemplates(); // Refresh templates list
      } else {
        const errorData = await response.json().catch(() => ({}));
        showSnackbar(
          `Failed to save template: ${
            errorData.message || response.statusText || "Unknown error"
          }`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error saving template:", error);
      showSnackbar("Failed to save template. Please try again!", "error");
    }
  };

  const handleSaveOrUpdateTemplate = () => {
    if (selectedTemplateId) {
      setTemplateDialogAction("update");
    } else {
      setTemplateDialogAction("save");
    }
    setIsTemplateDialogOpen(true);
  };

  const handleDialogConfirm = (templateName) => {
    if (templateDialogAction === "update") {
      handleUpdateTemplate(templateName);
    } else {
      handleSaveAsTemplate(templateName);
    }
  };

  const handleUpdateTemplate = async (newTemplateName) => {
    if (!selectedTemplateId) return;
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template) return;

    try {
      const response = await fetch(
        `http://localhost:5000/metadata/templates/${selectedTemplateId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            templateName: newTemplateName,
            ...metadata,
          }),
        }
      );

      if (response.ok) {
        showSnackbar(
          `Template "${newTemplateName}" updated successfully!`,
          "success"
        );
        fetchTemplates();
      } else {
        const errorData = await response.json();
        showSnackbar(
          errorData.message || "Failed to update template.",
          "error"
        );
      }
    } catch (error) {
      showSnackbar("An error occurred while updating the template.", "error");
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      try {
        const response = await fetch(
          `http://localhost:5000/metadata/templates/${templateId}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );

        if (response.ok) {
          showSnackbar("Template deleted successfully!", "success");
          if (selectedTemplateId === templateId) {
            setSelectedTemplateId(null);
            setInitialMetadata({}); // Reset initial metadata if the loaded template is deleted
          }
          fetchTemplates();
        } else {
          const errorData = await response.json();
          showSnackbar(
            errorData.message || "Failed to delete template.",
            "error"
          );
        }
      } catch (error) {
        showSnackbar("An error occurred while deleting the template.", "error");
      }
    }
  };

  const handleLoadTemplate = (templateId) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      const { id, templateName, ...templateData } = template;
      setMetadata(templateData);
      setInitialMetadata(templateData);
      setSelectedTemplateId(id);
      showSnackbar(`Template "${templateName}" loaded.`, "success");
    }
  };

  const handleClearTemplate = () => {
    setMetadata({
      modelName: "",
      modelDescription: "",
      license: "",
      tags: [],
      authors: "",
      researchPaperUrl: "",
      githubUrl: "",
      bibtexCitation: "",
    });
    setInitialMetadata({});
    setSelectedTemplateId(null);
    showSnackbar("Template selection cleared.", "success");
  };

  return (
    <>
      <MetadataTemplateDialog
        open={isTemplateDialogOpen}
        onClose={() => setIsTemplateDialogOpen(false)}
        onConfirm={handleDialogConfirm}
        title={
          templateDialogAction === "update"
            ? "Update Template"
            : "Save as Template"
        }
        description={
          templateDialogAction === "update"
            ? "You can update the content and the name of this template."
            : "Please enter a name for your metadata template. You can use this template to quickly fill out the metadata form in future submissions."
        }
        confirmText={templateDialogAction === "update" ? "Update" : "Save"}
        initialValue={
          templateDialogAction === "update"
            ? templates.find((t) => t.id === selectedTemplateId)
                ?.templateName || ""
            : ""
        }
      />
      <Box
        sx={{
          display: "flex",
          minHeight: "calc(100vh - 65.5px)",
          bgcolor: "background.body",
          marginTop: "-10px",
          marginBottom: "-40px",
          marginLeft: "-40px",
          marginRight: "-40px",
        }}
      >
        <SideNaveSubmission
          currentStep={currentStep}
          handleStepClick={handleStepClick}
        />

        <Box sx={{ flex: 1, p: 3 }}>
          {currentStep !== 3 && (
            <Box
              sx={{
                position: "fixed",
                bottom: 0,
                left: 0,
                marginLeft: "260px",
                width: "calc(100vw - 260px )",
                p: 3,
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
              }}
            >
              <Button
                sx={{ width: "133px" }}
                variant="soft"
                color="neutral"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                startDecorator={<West />}
                disabled={currentStep === 0}
                size="lg"
              >
                Back
              </Button>

              <Button
                sx={{ width: "133px" }}
                variant="solid"
                color={currentStep === 2 ? "success" : "primary"}
                onClick={handleNext}
                endDecorator={
                  currentStep === 1 &&
                  JSON.stringify(metadata) !==
                    JSON.stringify(initialMetadata) ? (
                    <Save /> // "Save" if metadata has changed at step 1
                  ) : currentStep === 1 &&
                    JSON.stringify(metadata) ===
                      JSON.stringify(initialMetadata) ? (
                    <East /> // Arrow if metadata has not changed at step 1
                  ) : currentStep === 2 ? (
                    <Done />
                  ) : (
                    <East />
                  )
                }
                size="lg"
                disabled={
                  (currentStep === 1 && !isMetadataValid) ||
                  (currentStep === 2 &&
                    !datasets.every((dataset) => uploadedFiles[dataset.id]))
                }
              >
                {currentStep === 1 &&
                JSON.stringify(metadata) !== JSON.stringify(initialMetadata)
                  ? "Save & Continue"
                  : currentStep === 2
                  ? "Submit" // "Submit" if step 2
                  : "Next"}
              </Button>

              {currentStep === 1 && (
                <Button
                  sx={{ width: "133px" }}
                  variant="solid"
                  onClick={handleSaveOrUpdateTemplate}
                  endDecorator={selectedTemplateId ? <Update /> : <Bookmark />}
                  size="lg"
                  disabled={!isMetadataValid}
                >
                  {selectedTemplateId ? "Update Template" : "Save as Template"}
                </Button>
              )}
            </Box>
          )}

          <Box
            flex={1}
            width="100%"
            padding={2}
            sx={{
              maxHeight: "calc(100vh - 80px)",
            }}
          >
            {currentStep === 0 && <DownloadStep datasets={datasets} />}

            {currentStep === 1 && (
              <MetadataStep
                metadata={metadata}
                setMetadata={setMetadata}
                templates={templates ?? []}
                onLoadTemplate={handleLoadTemplate}
                onDeleteTemplate={handleDeleteTemplate}
                onClearTemplate={handleClearTemplate}
                selectedTemplateId={selectedTemplateId}
                disabled={!!submissionId}
              />
            )}

            {currentStep === 2 && (
              <UploadStep
                submissionId={submissionId}
                datasets={datasets}
                uploadedFiles={uploadedFiles}
                onFileUploaded={(datasetId, fileName) => {
                  setUploadedFiles((prev) => ({
                    ...prev,
                    [datasetId]: fileName,
                  }));
                }}
              />
            )}

            {currentStep === 3 && <FinalStep />}
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default Upload;
