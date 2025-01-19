import React, {useEffect, useState} from "react";
import {
    Box,
    Button,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Modal,
    ModalClose,
    ModalDialog, Typography, LinearProgress
} from "@mui/joy";
import {InfoOutlined} from "@mui/icons-material";
import UploadTable from "../submission/UploadTable";
import {useSnackbar} from "../../contexts/SnackbarProvider";
import { DatasetService } from '../../services/DatasetService';
import { TaskService } from '../../services/TaskService';
import { BenchmarkService } from '../../services/BenchmarkService';

const UpdateSubmissionModal = ({isOpen, onClose, submissionId}) => {
    const [datasets, setDatasets] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState({});
    const [uploadingDatasetId, setUploadingDatasetId] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [moduleScores, setModuleScores] = useState([]);
    const [averageScore, setAverageScore] = useState(null);
    const { showSnackbar } = useSnackbar();
    const [uploadProgress, setUploadProgress] = useState({});

    const isFormValid = () => {
        // Check if all datasets have corresponding uploaded files
        return datasets.every(dataset => uploadedFiles[dataset.id]);
    }

    const updateSubmission = async () => {
        if (!isFormValid()) {
            showSnackbar("Please upload all required datasets", "error");
            return;
        }

        try {
            setLoading(true);
            const data = await BenchmarkService.startBenchmarkUpdate(submissionId);
            
            if (data.message === "No new modules to benchmark") {
                showSnackbar("No new modules to benchmark", "info");
                return;
            }

            setTasks(data.task_ids.map(task => ({
                ...task,
                progress: 0,
                processedRows: 0,
                totalRows: 0,
                status: 'Starting...',
                completed: false,
                score: null,
                error: null
            })));

        } catch (error) {
            console.error('Error starting benchmark update:', error);
            showSnackbar(error.message || "Failed to start benchmark update", "error");
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchDatasets = async () => {
            try {
                const data = await DatasetService.fetchAllDatasetsForUpdate(submissionId);
                setDatasets(data.datasets);
            } catch (error) {
                console.error("Failed to fetch datasets for update:", error);
                showSnackbar("Failed to fetch required datasets", "error");
            }
        };
        
        if (submissionId) {
            fetchDatasets();
        }
    }, [submissionId, showSnackbar]);

    useEffect(() => {
        if (tasks.length > 0 && !loading) {
            setLoading(true);
            const cleanup = TaskService.startPolling(
                tasks,
                (updatedTasks) => setTasks(updatedTasks),
                (result) => {
                    setLoading(false);
                    if (result.scores) {
                        setModuleScores(result.scores);
                        setAverageScore(result.averageScore);
                    }
                    onClose();
                }
            );
            return cleanup;
        }
    }, [tasks]);

    const handleFileSelect = async (event, originalDatasetId) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploadingDatasetId(originalDatasetId);

        try {
            await BenchmarkService.uploadPrivatizedDataset(
                file,
                submissionId,
                originalDatasetId,
                (progress) => {
                    setUploadProgress(prev => ({
                        ...prev,
                        [originalDatasetId]: progress
                    }));
                }
            );

            setUploadedFiles(prev => ({
                ...prev,
                [originalDatasetId]: file.name
            }));

            showSnackbar(`Successfully uploaded ${file.name}`, "success");
        } catch (error) {
            showSnackbar(error.response?.data?.error || "Failed to upload file", "error");
        } finally {
            setUploadingDatasetId(null);
            event.target.value = '';
        }
    };

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            sx={{display: "flex", alignItems: "center", justifyContent: "center"}}
        >
            <ModalDialog>
                <DialogTitle>
                    Update Submission
                </DialogTitle>
                <Divider sx={{marginBottom: "10px"}}/>
                <DialogContent>
                    <Typography level="h2" mb={2}>
                        Upload missing privatized datasets
                    </Typography>
                    <Typography sx={{marginY: 2, p: 1}} startDecorator={<InfoOutlined/>} variant='soft'
                                color='neutral' level="body1">
                        For every dataset listed below there needs to be uploaded the privatized counterpart in .csv format
                    </Typography>

                    <UploadTable
                        datasets={datasets}
                        uploadedFiles={uploadedFiles}
                        uploadingDatasetId={uploadingDatasetId}
                        onFileSelect={handleFileSelect}
                    />

                    {tasks.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="h6" mb={2}>Benchmark Progress</Typography>
                            {tasks.map((task) => (
                                <Box key={task.task_id} sx={{ mb: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2">
                                            {task.module_name}
                                        </Typography>
                                        <Typography variant="body2">
                                            {task.completed ? 
                                                `Score: ${task.score?.toFixed(2)}` : 
                                                task.error ? 
                                                    'Failed' : 
                                                    `${task.progress}%`
                                            }
                                        </Typography>
                                    </Box>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={task.progress} 
                                        color={task.error ? "error" : "primary"}
                                        sx={{ height: 8, borderRadius: 1 }}
                                    />
                                    {task.error && (
                                        <Typography color="error" variant="caption" sx={{ mt: 0.5 }}>
                                            {task.error}
                                        </Typography>
                                    )}
                                </Box>
                            ))}
                            
                            {moduleScores.length > 0 && (
                                <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                                    <Typography variant="h6" mb={1}>Results</Typography>
                                    {moduleScores.map((score, index) => (
                                        <Typography key={index} variant="body2">
                                            {score.module_name}: {score.score.toFixed(2)}
                                        </Typography>
                                    ))}
                                    <Typography variant="subtitle1" mt={1}>
                                        Average Score: {averageScore?.toFixed(2)}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={loading}>
                        {loading ? 'Please wait...' : 'Close'}
                    </Button>
                    <Button 
                        onClick={updateSubmission}
                        disabled={!isFormValid() || loading}
                        variant="contained"
                    >
                        {loading ? 'Updating...' : 'Update Submission'}
                    </Button>
                </DialogActions>
                <ModalClose/>
            </ModalDialog>
        </Modal>
    )
}

export default UpdateSubmissionModal;