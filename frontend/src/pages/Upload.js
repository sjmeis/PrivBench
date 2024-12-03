import { Alert, Box, Button, Snackbar } from "@mui/joy";
import { useState, Fragment, useEffect } from "react";
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
  const [errorMessage, setErrorMessage] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [submissionId, setSubmissionId] = useState(null);
  const [downloadedDatasets, setDownloadedDatasets] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState({});

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const response = await fetch("http://localhost:5000/datasets/list");
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Failed to fetch datasets:", errorData.error);
          return;
        }
        const data = await response.json();
        setDatasets(data.datasets);
      } catch (error) {
        console.error("An error occurred:", error);
      }
    };
    fetchDatasets();
  }, []);

  // Function to handle step change when clicking on StepIndicator
  const handleStepClick = (step) => {
    setCurrentStep(step);
  };

  // Handle Next button click
  const handleNext = () => {
    if (currentStep === 0) {
      if (datasets.length > 0 && downloadedDatasets.length < datasets.length) {
        setErrorMessage("Please download all datasets before proceeding.");
        setOpenSnackbar(true);
        return;
      }
    }

    if (currentStep === 1 && !submissionId) {
      setErrorMessage("Please save metadata before proceeding.");
      setOpenSnackbar(true);
      return;
    }

    if (currentStep === 2) {
      if (datasets.length > 0 && Object.keys(uploadedFiles).length < datasets.length) {
        setErrorMessage("Please upload files for all datasets before proceeding.");
        setOpenSnackbar(true);
        return;
      }
    }

    setCurrentStep((prev) => prev + 1);
  };

  // Handle Submit action
  const handleSubmit = () => {
    // Implement submission logic here
    console.log("Submitting files for evaluation");

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
              borderColor: "success.600",
              color: "common.white",
              backgroundColor: "success.600",
            },
            "&::after": {
              bgcolor: "success.600",
            },
          },
          [`& .${stepClasses.active}`]: {
            [`& .${stepIndicatorClasses.root}`]: {
              borderColor: "currentColor",
            },
          },
          [`& .${stepClasses.disabled} *`]: {
            color: "neutral.outlinedDisabledColor",
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
              onClick={() => handleStepClick(0)}
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
              onClick={() => handleStepClick(1)}
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
              onClick={() => handleStepClick(2)}
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
        {currentStep < 3 && (
          <Button
            variant="soft"
            color="primary"
            onClick={handleNext}
            endDecorator={<East />}
          >
            {currentStep === 2 ? "Submit" : "Next"}
          </Button>
        )}
      </Box>

      {/* Conditionally render components with props */}
      {currentStep === 0 && (
        <DownloadStep
          onDatasetDownloaded={(datasetName) => {
            setDownloadedDatasets((prev) => [...prev, datasetName]);
          }}
          onDatasetsFetched={(fetchedDatasets) => {
            setDatasets(fetchedDatasets);
          }}
          downloadedDatasets={downloadedDatasets}
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

      {/* Snackbar for error message */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
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
