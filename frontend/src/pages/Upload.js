import {Alert, Box, Button, Card, FormControl, IconButton, Input, Snackbar, styled, Typography} from "@mui/joy";
import {useState, Fragment} from "react";
import {Close, CloudDownload, CloudUpload, Delete, Publish, Warning} from "@mui/icons-material";

const VisuallyHiddenInput = styled('input')`
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  bottom: 0;
  left: 0;
  white-space: nowrap;
  width: 1px;
`;

const Upload = () => {

    const [errorMessage, setErrorMessage] = useState(""); // Error message state for Snackbar
    const [openSnackbar, setOpenSnackbar] = useState(false); // Snackbar open state
    const [storedFiles, setStoredFiles] = useState([]); // State to store valid CSV files

    // Handle file selection
    const handleFileChange = (event) => {
        const files = Array.from(event.target.files); // Convert FileList to array

        // Check for duplicates by file name
        const newFiles = files.filter(
            file => !storedFiles.some(storedFile => storedFile.name === file.name)
        );

        // Set error if duplicate files were found
        if (newFiles.length < files.length) {
            setErrorMessage("The file/s has already been uploaded!");
            setOpenSnackbar(true);
        }

        // Update storedFiles with unique, valid CSV files
        setStoredFiles(prevFiles => [...prevFiles, ...newFiles]);
        // Set the hidden input field value to ''
        event.target.value = '';
    };

   /* TODO const handleSubmit = () => {
    }; */

    // Handle deletion of a specific file by name
    const handleDeleteFile = (fileName) => {
        setStoredFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
    };

    return (
        <Box display="flex" justifyContent="center" gap={4} padding={2}>
            {/* Download Section */}
            <Card variant="outlined" sx={{ width: 400, padding: 4, textAlign: 'center' }}>
                <Typography level="h4" mb={2}>
                    Step 1
                </Typography>
                <Typography level="body1" mb={4}>
                    Download all datasets and privatize them. <br/>For each of the downloaded datasets, upload
                    the corresponding privatized dataset. <br/> You can only upload .csv files.
                </Typography>
                <Button
                    variant="solid"
                    color="primary"
                    size="lg"
                    startDecorator={<CloudDownload />}
                    sx={{ mt: 28 }}
                >
                    Download
                </Button>
            </Card>

            {/* Upload Section */}
            <Card variant="outlined" sx={{ width: 400, padding: 4, textAlign: 'center' }}>
                <Typography level="h4" mb={2}>
                    Step 2
                </Typography>
                <Typography level="body1" mb={4}>
                    Upload the corresponding datasets and get your model evaluated!
                </Typography>

                <FormControl>
                    <Input
                        placeholder="Team name"
                        size="lg"
                        sx={{ marginBottom: 2, bgcolor: 'grey.200' }}
                    />
                    <Input
                        placeholder="Model name"
                        size="lg"
                        sx={{ marginBottom: 2, bgcolor: 'grey.200' }}
                    />
                    <Input
                        placeholder="Model description"
                        size="lg"
                        sx={{ marginBottom: 2, bgcolor: 'grey.200' }}
                    />
                </FormControl>

                {storedFiles.map((file, index) => (
                    <Box key={index} display="flex" alignItems="center" mt={1}>
                        <Typography variant="body2" color="text.primary" sx={{ flexGrow: 1 }}>
                            {file.name}
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={() => handleDeleteFile(file.name)}
                        >
                            <Delete fontSize="md" />
                        </IconButton>
                    </Box>
                ))}

                {/* File selection button */}
                <Button
                    component="label"
                    tabIndex={-1}
                    variant="outlined"
                    color="neutral"
                    startDecorator={<CloudUpload />}
                    sx={{ mt: 2 }}
                >
                    Upload files
                    <VisuallyHiddenInput
                        type="file"
                        multiple
                        accept=".csv"
                        onChange={handleFileChange}
                    />
                </Button>
                <Button
                    variant="solid"
                    color="success"
                    size="lg"
                    startDecorator={<Publish/>}
                    sx={{ mt: 2 }}
                >
                    Submit
                </Button>
            </Card>

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
                            <IconButton size="small" color="inherit" onClick={() => setOpenSnackbar(false)}>
                                <Close fontSize="small" />
                            </IconButton>
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