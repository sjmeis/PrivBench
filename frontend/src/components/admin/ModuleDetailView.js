import {
    Box,
    Button,
    Divider,
    FormLabel,
    IconButton,
    Input, Sheet, Stack,
    Tab,
    TabList,
    TabPanel,
    Tabs,
    Textarea,
    Typography
} from "@mui/joy";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FormControl from "@mui/joy/FormControl";
import React, {useEffect, useState} from "react";
import FileTableSmall from "./FileTableSmall";
import {getDateString} from "../../utils/Date";

const ModuleDetailView = ({selectedModule, handleCloseDetailView}) => {
    const [formData, setFormData] = useState({})
    const DATASET_TABLE_TITLE = 'Associated Dataset';
    const SCRIPT_TABLE_TITLE = 'Python Benchmarking Module Logic'
    const handleInputChange = (e) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const disableSaveButton = () => {
        return formData.name === selectedModule.name && formData.description === selectedModule.description
    }

    const saveChanges = () => {
        //todo: implemenbt
    }


    useEffect(() => {
        setFormData(selectedModule)
    }, [selectedModule]);


    return (
        <Sheet
            sx={{
                position: 'fixed',
                top: 0,
                right: 0,
                marginTop: '65.36px',
                height: '100%',
                width: '30%',
                bgcolor: 'background.body',
                borderLeft: '1px solid',
                borderColor: 'divider',
                zIndex: 1200,
            }}
        >
            <Box sx={{p: 2, display: 'flex', alignItems: 'center'}}>
                <Typography level="title-md" sx={{flex: 1}}>
                    {selectedModule.name}
                </Typography>
                <IconButton component="span" variant="plain" color="neutral" size="sm"
                            onClick={handleCloseDetailView}>
                    <CloseRoundedIcon/>
                </IconButton>
            </Box>
            <Divider/>
            <Tabs>
                <TabList>
                    <Tab sx={{flexGrow: 1}}>
                        <Typography level="title-sm">Details</Typography>
                    </Tab>
                    <Tab sx={{flexGrow: 1}}>
                        <Typography level="title-sm">Files</Typography>
                    </Tab>
                </TabList>
                <TabPanel value={0} sx={{p: 2}}>
                    <Box
                        sx={{
                            width: '100%',
                            height: 'calc(100vh - 200px)',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <Stack spacing={2} sx={{width: '100%'}}>
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
                                    value={formData.createdAt ? getDateString(formData.createdAt) : 'N/A'}
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
                                mt: 'auto',
                            }}
                        >
                            <Button disabled={disableSaveButton()} onClick={saveChanges} fullWidth>Save Updates</Button>
                        </Box>
                    </Box>
                </TabPanel>
                <TabPanel value={1} sx={{p: 2}}>
                    <Box
                        sx={{
                            width: '100%',
                            height: 'calc(100vh - 200px)',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <Stack spacing={2}>
                            <FileTableSmall datasets={[selectedModule]} title={SCRIPT_TABLE_TITLE}/>
                            <FileTableSmall datasets={[selectedModule.dataset]} title={DATASET_TABLE_TITLE} />
                        </Stack>

                        </Box>
                </TabPanel>
            </Tabs>
        </Sheet>)
}

export default ModuleDetailView;