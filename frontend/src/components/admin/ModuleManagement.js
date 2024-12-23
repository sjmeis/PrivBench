import {
    Box,
    Grid,
    Input,
    Button
} from "@mui/joy";
import FormControl from "@mui/joy/FormControl";
import SearchIcon from "@mui/icons-material/Search";
import React, {useEffect, useState} from "react";
import BenchmarkCardAdmin from "../ranking/BenchmarkCardAdmin";
import axios from "axios";
import AddIcon from "@mui/icons-material/Add";
import ModuleDetailView from "./ModuleDetailView";
import AddModuleModal from "./AddModuleModal";
import {useSnackbar} from "../../contexts/SnackbarProvider";

const ModuleManagement = () => {
    const [modules, setModules] = useState([]);
    const [selectedModule, setSelectedModule] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { showSnackbar } = useSnackbar();

    //TODO: add search functionality
    //TODO: finalize detailview including update

    useEffect(() => {
        const fetchModules = async () => {
            try {
                const response = await axios.get('http://localhost:5000/modules'); // Adjust endpoint as needed
                setModules(response.data);
            } catch (err) {
                //setError('Failed to load modules');
                console.error(err);
            } finally {
                //setLoading(false);
            }
        };

        fetchModules();
    }, []);

    const handleAddModuleClick = () => {
        setIsModalOpen(true);
    };

    const handleAddModuleSubmit = () => {
        showSnackbar("Benchmarking Module Created Successfully", 'success')
        //todo: go to created module
    };

    const handleAddModuleError = (errorMsg) => {
        showSnackbar(`An error occurred: ${errorMsg}`, 'error')
    };

    const handleModuleClick = (module) => {
        setSelectedModule(module);
    };

    const handleCloseDetailView = () => {
        setSelectedModule(null);
    };

    return (
        <Box sx={{width: selectedModule ? 'calc(70vw - 270px)' : '100%'}}>
            <Box>
                <Box
                    className="SearchAndFilters-tabletUp"
                    sx={{
                        margin: "0 auto",
                        borderRadius: "sm",
                        py: 2,
                        display: {xs: "none", sm: "flex"},
                        flexWrap: "wrap",
                        gap: 1.5,
                        "& > *": {
                            minWidth: {xs: "120px", md: "160px"},
                        },
                    }}
                >
                    <FormControl sx={{flex: 1}} size="sm">
                        <Input
                            variant="outlined"
                            placeholder="Search for Benchmarking Modules"
                            name="searchTerm"
                            size="sm"
                            startDecorator={<SearchIcon/>}
                        />
                    </FormControl>
                    <Button onClick={handleAddModuleClick} endDecorator={<AddIcon/>} size='sm'>Add Module</Button>
                </Box>
                <Box>
                    <Grid container spacing={2}>
                        {modules.map((module) => (
                            <Grid key={module.id} item xs={selectedModule ? 12 : 6}>
                                <BenchmarkCardAdmin
                                    item={module}
                                    handleCardClick={() => handleModuleClick(module)}
                                    isSelected={selectedModule && selectedModule.id === module.id}
                                />
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </Box>

            {selectedModule && (
                <ModuleDetailView handleCloseDetailView={handleCloseDetailView} selectedModule={selectedModule}></ModuleDetailView>
            )}
            <AddModuleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleAddModuleSubmit}
                onError={handleAddModuleError}
            />
        </Box>

    );
};

export default ModuleManagement;
