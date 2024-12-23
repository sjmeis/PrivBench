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
import DatasetTableSmall from "./DatasetTableSmall";

const ModuleDetailView = ({selectedModule, handleCloseDetailView}) => {
    const [formData, setFormData] = useState({})
    const handleInputChange = (e) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

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
                        <Typography level="title-sm">Datasets</Typography>
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
                                <FormLabel>Version</FormLabel>
                                <Input
                                    disabled
                                    name="version"
                                    type="text"
                                    value={formData.version}
                                    onChange={handleInputChange}
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
                            <Button type="submit" fullWidth>Save Updates</Button>
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
                        {/*//todo: pass array here when multiple datasets per module are possible*/}
                        <DatasetTableSmall datasets={[selectedModule.dataset]} />
                        <Box
                            sx={{
                                p: 2,
                                mt: 'auto',
                            }}
                        >
                            <Button type="submit" fullWidth>Add Datasets to this Module</Button>
                        </Box>
                        </Box>
                </TabPanel>
            </Tabs>
        </Sheet>)
}

export default ModuleDetailView;