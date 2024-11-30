import { Alert, Box, Button, Snackbar } from "@mui/joy";
import { useState, Fragment } from "react";
import { Close, East, Warning, West, BarChart } from "@mui/icons-material";
import DownloadStep from "../components/upload/DownloadStep";
import UploadStep from "../components/upload/UploadStep";
import MetadataStep from "../components/upload/MetadataStep";
import FinalStep from "../components/upload/FinalStep";
import Stepper from "@mui/joy/Stepper";
import Step, { stepClasses } from "@mui/joy/Step";
import StepIndicator, { stepIndicatorClasses } from "@mui/joy/StepIndicator";
import Typography from "@mui/joy/Typography";
import GetAppRoundedIcon from "@mui/icons-material/GetAppRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";

const Upload = () => {
  const [errorMessage, setErrorMessage] = useState(""); // Error message state for Snackbar
  const [openSnackbar, setOpenSnackbar] = useState(false); // Snackbar open state
  const [storedFiles, setStoredFiles] = useState([]); // State to store valid CSV files
  const [currentStep, setCurrentStep] = useState(0); // Track the current step
  const [submissionId, setSubmissionId] = useState(null);
  const [originalDatasetId, setOriginalDatasetId] = useState(null);

  // Handle file selection
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files); // Convert FileList to array

    // Check for duplicates by file name
    const newFiles = files.filter(
      (file) => !storedFiles.some((storedFile) => storedFile.name === file.name)
    );

    // Set error if duplicate files were found
    if (newFiles.length < files.length) {
      setErrorMessage("The file(s) have already been uploaded!");
      setOpenSnackbar(true);
    }

    // Update storedFiles with unique, valid CSV files
    setStoredFiles((prevFiles) => [...prevFiles, ...newFiles]);
    // Set the hidden input field value to ""
    event.target.value = "";
  };

  // Handle deletion of a specific file by name
  const handleDeleteFile = (fileName) => {
    setStoredFiles((prevFiles) =>
      prevFiles.filter((file) => file.name !== fileName)
    );
  };

  // Function to handle step change when clicking on StepIndicator
  const handleStepClick = (step) => {
    setCurrentStep(step);
  };

  // Handle Next button click
  const handleNext = () => {
    if (currentStep === 0 && !originalDatasetId) {
      setErrorMessage("Please download the dataset before proceeding.");
      setOpenSnackbar(true);
      return;
    }

    if (currentStep === 1 && !submissionId) {
      setErrorMessage("Please save metadata before proceeding.");
      setOpenSnackbar(true);
      return;
    }

    setCurrentStep((prev) => prev + 1);
  };

  // Handle Submit action
  const handleSubmit = () => {
    // POST request to be sent
    console.log("Submitting files for evaluation:", storedFiles);

    // Move to the fourth step
    setCurrentStep(3);
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center" padding={2}>
      {/* Horizontal Stepper */}
      <Stepper
        size="lg"
        sx={{
          width: "60%",
          maxWidth: "1000px",
          marginBottom: "30px",
          "--StepIndicator-size": "3rem",
          "--Step-connectorInset": "0px",
          [`& .${stepIndicatorClasses.root}`]: {
            borderWidth: 4,
          },
          [`& .${stepClasses.completed}`]: {
            [`& .${stepIndicatorClasses.root}`]: {
              borderColor: "success.600", // Border for completed steps
              color: "common.white", // Icon color for visibility
              backgroundColor: "success.600", // Fill background of completed steps
            },
            "&::after": {
              bgcolor: "success.600", // Connector color for completed steps
            },
          },
          [`& .${stepClasses.active}`]: {
            [`& .${stepIndicatorClasses.root}`]: {
              borderColor: "currentColor", // Border for active steps
            },
          },
          [`& .${stepClasses.disabled} *`]: {
            color: "neutral.outlinedDisabledColor", // Style for disabled steps
          },
        }}
      >
        <Step
          completed={currentStep > 0}
          active={currentStep === 0}
          indicator={
            <StepIndicator
              variant="soft"
              color={currentStep === 0 ? "primary" : "neutral"}
              onClick={() => handleStepClick(0)} // Clickable step
            >
              <GetAppRoundedIcon />
            </StepIndicator>
          }
        >
          <Typography>Download</Typography>
        </Step>
        <Step
          completed={currentStep > 1}
          active={currentStep === 1}
          indicator={
            <StepIndicator
              variant="soft"
              color={currentStep === 1 ? "primary" : "neutral"}
              onClick={() => handleStepClick(1)} // Clickable step
            >
              <InfoRoundedIcon />
            </StepIndicator>
          }
        >
          <Typography>Metadata</Typography>
        </Step>
        <Step
          completed={currentStep > 2}
          active={currentStep === 2}
          indicator={
            <StepIndicator
              variant="soft"
              color={currentStep === 2 ? "primary" : "neutral"}
              onClick={() => handleStepClick(2)} // Clickable step
            >
              <CloudUploadRoundedIcon />
            </StepIndicator>
          }
        >
          <Typography>Upload</Typography>
        </Step>
        <Step
          completed={currentStep > 3}
          active={currentStep === 3}
          indicator={
            <StepIndicator
              variant="soft"
              color={currentStep === 3 ? "primary" : "neutral"}
            >
              <BarChart />
            </StepIndicator>
          }
        >
          <Typography>Evaluation</Typography>
        </Step>
      </Stepper>

      {/* Navigation Buttons */}
      <Box mt={2} sx={{ marginBottom: "30px" }} display="flex" gap={2}>
        {currentStep > 0 && currentStep < 3 && (
          <Button
            variant="soft"
            onClick={() => setCurrentStep((prev) => prev - 1)}
            startDecorator={<West />}
          >
            Back
          </Button>
        )}
        {currentStep < 2 && (
          <Button
            variant="soft"
            color="primary"
            onClick={handleNext}
            endDecorator={<East />}
          >
            Next
          </Button>
        )}
        {currentStep === 2 && (
          <Button
            variant="solid"
            color="primary"
            onClick={handleSubmit}
            endDecorator={<East />}
          >
            Submit
          </Button>
        )}
      </Box>

      {/* Conditionally render components with props */}
      {currentStep === 0 && (
        <DownloadStep
          onDatasetDownload={(id) => {
            console.log("Setting originalDatasetId to:", id);
            setOriginalDatasetId(id);
          }}
        />
      )}

      {currentStep === 1 && (
        <MetadataStep
          onMetadataSave={(id) => {
            console.log("Setting submissionId to:", id);
            setSubmissionId(id);
          }}
        />
      )}

      {currentStep === 2 && (
        <>
          {console.log(
            "At UploadStep, submissionId:",
            submissionId,
            "originalDatasetId:",
            originalDatasetId
          )}
          <UploadStep
            storedFiles={storedFiles}
            handleFileChange={handleFileChange}
            handleDeleteFile={handleDeleteFile}
            submissionId={submissionId}
            originalDatasetId={originalDatasetId}
          />
        </>
      )}

      {currentStep === 3 && <FinalStep />}

      {/* Snackbar for error message */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000} // Auto hide after 6000ms
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          startDecorator={<Warning />}
          variant="soft"
          color="danger"
          endDecorator={
            <Fragment>
              <Button
                size="small"
                color="inherit"
                onClick={() => setOpenSnackbar(false)}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <Close fontSize="small" />
              </Button>
            </Fragment>
          }
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Upload;
