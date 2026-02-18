import axios from 'axios';
import { API_BASE_URL } from '../config';


const fetchAllDatasets = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/datasets`);
        if (response.status === 200) {
            return response.data;
        } else {
            throw new Error('Failed to fetch datasets. Please try again later.');
        }
    } catch (error) {
        console.error('Error fetching datasets:', error);
        throw error;
    }
};

const fetchAllDatasetsForUpdate = async (submissionId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/update/datasets/list/${submissionId}`);
        if (response.status === 200) {
            return response.data;
        } else {
            throw new Error('Failed to fetch datasets for update. Please try again later.');
        }
    } catch (error) {
        console.error('Error fetching datasets for update:', error);
        throw error;
    }
};

const downloadDatasets = async (datasetNames) => {
    const failedDownloads = [];

    for (const datasetName of datasetNames) {
        try {
            const response = await fetch(
                `${API_BASE_URL}/datasets/${encodeURIComponent(datasetName)}`,
                {
                    credentials: "include",
                    cache: "no-cache",
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Failed to load dataset:", errorData.error);
                failedDownloads.push(datasetName);
                continue;
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = decodeURIComponent(datasetName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(`Error downloading dataset ${datasetName}:`, error);
        }
    }

    return { failedDownloads }; // Return an object with the failed downloads
};

const uploadPrivatizedDataset = async ({
                                                  file,
                                                  submissionId,
                                                  originalDatasetId,
                                                  setUploadingDatasetId,
                                                  setUploadedFiles,
                                                  event,
                                              }) => {
    try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("submission_id", String(submissionId));
        formData.append("original_dataset_id", String(originalDatasetId));

        await axios.post(
            `${API_BASE_URL}/upload-privatized-dataset`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );

        // If successful, return success message
        return { success: true, message: `Successfully uploaded ${file.name}` };
    } catch (error) {
        // Return error message
        return {
            success: false,
            message: error.response?.data?.error || "Failed to upload file",
        };
    } finally {
        setUploadingDatasetId(null);
        if (event) {
            event.target.value = "";
        }
    }

    if (file) {
        setUploadedFiles((prev) => ({ ...prev, [originalDatasetId]: file }));
    }
};



const fetchDatasetsWithDetails = async () => {
    try {
        const listResponse = await axios.get(`${API_BASE_URL}/datasets/list`, {
            withCredentials: true,
            cache: 'no-cache',
        });

        if (listResponse.status !== 200) {
            throw new Error('Failed to fetch datasets list.');
        }

        const data = listResponse.data;
        const datasetsWithDetails = await Promise.all(
            data.datasets.map(async (dataset) => {
                try {
                    const contentResponse = await axios.get(
                        `${API_BASE_URL}/datasets/${encodeURIComponent(dataset.name)}`,
                        {
                            withCredentials: true,
                            cache: 'no-cache',
                        }
                    );

                    if (contentResponse.status !== 200) {
                        console.error(`Failed to fetch content for dataset ${dataset.name}`);
                        return { ...dataset, rows: 0, columns: 0 };
                    }

                    const content = contentResponse.data;
                    const rows = content.trim().split("\n");
                    const columns = rows[0]?.split(",").length || 0;

                    return {
                        ...dataset,
                        rows: rows.length,
                        columns,
                    };
                } catch (error) {
                    console.error(`Error fetching dataset ${dataset.name}:`, error);
                    return { ...dataset, rows: 0, columns: 0 };
                }
            })
        );

        return datasetsWithDetails;
    } catch (error) {
        console.error('Error fetching datasets with details:', error);
        throw error;
    }
};

const uploadDataset = async (file, name, moduleIds = []) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('moduleIds', JSON.stringify(moduleIds));

    try {
        const response = await axios.post(`${API_BASE_URL}/datasets/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            withCredentials: true
        });
        return response.data;
    } catch (error) {
        console.error('Error uploading dataset:', error);
        throw error;
    }
};

const deleteDataset = async (id) => {
    return await axios.delete(`${API_BASE_URL}/datasets/${id}`, { withCredentials: true });
};

export const DatasetService = {
    fetchAllDatasets,
    fetchAllDatasetsForUpdate,
    fetchDatasetsWithDetails,
    downloadDatasets,
    uploadPrivatizedDataset,
    uploadDataset,
    deleteDataset
};
