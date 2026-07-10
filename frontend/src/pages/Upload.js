import { useState, useEffect } from "react";
import { Box, Button, Typography } from "@mui/joy";
import { Bookmark, Done, East, Save, Update, West } from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import { useSnackbar } from "../contexts/SnackbarProvider";
import ModuleDatasetSelectionStep from "../components/submission/ModuleDatasetSelectionStep";
import DownloadStep from "../components/submission/DownloadStep";
import MetadataStep from "../components/submission/MetadataStep";
import UploadStep from "../components/submission/UploadStep";
import FinalStep from "../components/submission/FinalStep";
import { getUserSubmissions } from "../services/RankingsService";
import { SideNaveSubmission } from "../components/submission/SideNaveSubmission";
import MetadataTemplateDialog from "../components/submission/MetadataTemplateDialog";
import { SubmissionStatus } from "src/enums/SubmissionStatus";
import { API_BASE_URL } from "../config";
import MainLayout from "../components/layout/MainLayout";
import { ModuleService } from "../services/ModuleService";
import { ContactFormModal } from "../components/shared/ContactFormModal";
import ContactSupport from '@mui/icons-material/ContactSupport';

const Upload = () => {
  const location = useLocation();
  const { state } = location;

  const [remainingSubmissions, setRemainingSubmissions] = useState(null);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  const [currentStep, setCurrentStep] = useState(state?.currentStep || 0);
  const [submissionId, setSubmissionId] = useState(state?.submissionId || null);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [requiredDatasets, setRequiredDatasets] = useState([]);
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
  const navigate = useNavigate();

  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {    
    const isFreshEntry = !state?.submissionId && !state?.currentStep;
    const isNavbarReset = state?.reset;

    if ((isFreshEntry || isNavbarReset) && !isLocked) {
      setCurrentStep(0);
      setSubmissionId(null);

      localStorage.removeItem("tasks");
      localStorage.removeItem("queueEntries");
      localStorage.removeItem("submission_id");
      
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
    }
  }, [location.pathname, state, isLocked]);

  const fetchUserSubmission = async () => {
    try {
      const data = await getUserSubmissions();

      const remaining = data.remaining ?? 0;
      const limit = data.limit ?? 5;

      // Block only if NO remaining slots AND NO active submission to resume
      setRemainingSubmissions(remaining); 
      setDailyLimit(limit);
      
      const hasActiveSubmission = data.submissions.find(s => 
          s.status === SubmissionStatus.PENDING || s.status === SubmissionStatus.IN_PROGRESS
      );

      if (hasActiveSubmission) {
        setIsLocked(true);
        setCurrentStep(4);
        setSubmissionId(hasActiveSubmission.id);
        setMetadata(hasActiveSubmission.metadata);
      } else {
        setIsLocked(false);
        
        if (data.remaining <= 0) {
          setIsOverLimit(true);
        }

        if (!state?.currentStep) {
          setCurrentStep(0);
        }
      }
    } catch (error) {
      console.error("Error fetching user submission:", error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/metadata/templates`, {
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

    // Always fetch required datasets so they're available regardless of starting step
    const fetchRequiredDatasets = async () => {
      try {
        const data = await ModuleService.fetchModulesWithDatasets();
        const uniqueDatasets = new Map();
        for (const mod of data) {
          for (const ds of mod.compatibleDatasets) {
            uniqueDatasets.set(ds.id, ds);
          }
        }
        setRequiredDatasets(Array.from(uniqueDatasets.values()));
      } catch (error) {
        console.error("Error fetching required datasets:", error);
      }
    };
    fetchRequiredDatasets();
  }, []);

  const handleStepClick = (step) => {
    if (isLocked) {
      showSnackbar("Evaluation is in progress. Please wait until it completes.", "warning");
      return;
    }

    if (step < currentStep) {
      setCurrentStep(step);
      return;
    }

    if (step > 2 && !isMetadataValid) {
      showSnackbar("Please complete all required metadata fields before proceeding to upload or evaluation.", "error");
      return;
    }

    if (step > 3) {
      const allFilesUploaded = requiredDatasets.every((dataset) => uploadedFiles[dataset.id]);
      if (!allFilesUploaded) {
        showSnackbar("You must upload all privatized dataset files before running the evaluation.", "error");
        return;
      }
    }

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
    if (currentStep === 2) {
      setIsMetadataValid(validateMetadata());
    }
    // eslint-disable-next-line
  }, [metadata, currentStep]);

  const handleSaveMetadata = async () => {
    try {
      // Skip metadata save if a submission already exists AND metadata is unchanged.
      if (
        submissionId &&
        JSON.stringify(metadata) === JSON.stringify(initialMetadata)
      ) {
        setCurrentStep((prev) => prev + 1);
        return;
      }
      const isUpdate = Boolean(submissionId);
      const endpoint = `${API_BASE_URL}/metadata`;
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
    if (currentStep === 2) {
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

      const response = await fetch(`${API_BASE_URL}/metadata/templates`, {
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
        `${API_BASE_URL}/metadata/templates/${selectedTemplateId}`,
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
          `${API_BASE_URL}/metadata/templates/${templateId}`,
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
    <MainLayout>
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
          quota={{ 
            remaining: remainingSubmissions, 
            limit: dailyLimit 
          }}
          disabled={isLocked}
        />

        <Box sx={{ flex: 1, p: 3 }}>
          {isOverLimit && currentStep === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10 }}>
              <Typography level="h3" color="danger">Daily Submission Limit Reached</Typography>
              <Typography level="body-md" sx={{ mt: 2 }}>
                You have already made {dailyLimit} submissions in the last 24 hours. 
                Please come back later to start more submissions.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                <Button variant="outlined" sx={{ mt: 4 }} onClick={() => navigate('/rankings')}>
                  View Current Rankings
                </Button>
                <Button 
                    variant="solid" 
                    color="primary" 
                    sx={{ mt: 4 }}
                    startDecorator={<ContactSupport />}
                    onClick={() => setIsSupportOpen(true)}
                >
                    Request Limit Increase
                </Button>
              </Box>
              <ContactFormModal 
                  open={isSupportOpen} 
                  onClose={() => setIsSupportOpen(false)} 
                  initialSubject={`Limit Increase Request`}
              />
            </Box>
          ) : (<>
          {currentStep !== 4 && (
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
                disabled={currentStep === 0 || isLocked}
                size="lg"
              >
                Back
              </Button>

              <Button
                sx={{ width: "133px" }}
                variant="solid"
                color={currentStep === 3 ? "success" : "primary"}
                onClick={handleNext}
                endDecorator={
                  currentStep === 2 &&
                  JSON.stringify(metadata) !==
                    JSON.stringify(initialMetadata) ? (
                    <Save /> // "Save" if metadata has changed at step 2
                  ) : currentStep === 2 &&
                    JSON.stringify(metadata) ===
                      JSON.stringify(initialMetadata) ? (
                    <East /> // Arrow if metadata has not changed at step 2
                  ) : currentStep === 3 ? (
                    <Done />
                  ) : (
                    <East />
                  )
                }
                size="lg"
                disabled={
                  (currentStep === 2 && !isMetadataValid) ||
                  (currentStep === 3 &&
                    !requiredDatasets.every((dataset) => uploadedFiles[dataset.id]))
                }
              >
                {currentStep === 2 &&
                (selectedTemplateId ||
                  JSON.stringify(metadata) !== JSON.stringify(initialMetadata))
                  ? "Save & Continue"
                  : currentStep === 3
                  ? "Submit" // "Submit" if step 3
                  : "Next"}
              </Button>

              {currentStep === 2 && (
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
              overflowY: "auto",
              pb: 10,
            }}
          >
            {currentStep === 0 && (
              <ModuleDatasetSelectionStep
                onRequiredDatasetsResolved={setRequiredDatasets}
              />
            )}

            {currentStep === 1 && <DownloadStep datasets={requiredDatasets} />}

            {currentStep === 2 && (
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

            {currentStep === 3 && (
              <UploadStep
                submissionId={submissionId}
                datasets={requiredDatasets}
                uploadedFiles={uploadedFiles}
                onFileUploaded={(datasetId, fileName) => {
                  setUploadedFiles((prev) => ({
                    ...prev,
                    [datasetId]: fileName,
                  }));
                }}
              />
            )}

            {currentStep === 4 && (
              <FinalStep metadata={metadata} onStart={() => setIsLocked(true)} onComplete={() => setIsLocked(true)} onCancel={() => setIsLocked(false)} />
            )}
          </Box>
          </>
          )}
        </Box>
      </Box>
    </MainLayout>
  );
};

export default Upload;
