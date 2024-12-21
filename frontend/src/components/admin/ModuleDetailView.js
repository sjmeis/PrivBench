import {
    Box,
    Button, Chip,
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
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import React, {useEffect, useState} from "react";

const ModuleDetailView = ({selectedModule, handleCloseDetailView}) => {
    const [formData, setFormData] = useState({})
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };
    const handleSubmit = () => {}

    useEffect(() => {
        setFormData(selectedModule)
    }, [selectedModule]);


    return (<Sheet
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
            boxShadow: 'lg',
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
                <Box>
                    <form onSubmit={handleSubmit} style={{width: '100%'}}>
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
                                <Input disabled
                                    name="path"
                                    type="text"
                                    value={formData.path}
                                    onChange={handleInputChange}
                                    autoComplete="username"
                                />
                            </FormControl>
                            <Button size='sm'>Save Updates</Button>
                        </Stack>
                    </form>
                </Box>
            </TabPanel>
            <TabPanel value={1} sx={{p: 2}}>
                <Box>
                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 0.5}}>
                        {/*//todo: add iteration for multiple datasets here*/}
                        <table>
                            <tbody>
                            <tr>
                                <td>
                                    <Typography
                                        level="title-sm"
                                        startDecorator={<InsertDriveFileRoundedIcon color="primary"/>}
                                        sx={{alignItems: 'flex-start'}}
                                    >
                                        {selectedModule.dataset.name}
                                    </Typography>
                                </td>
                                <td>
                                    {selectedModule.dataset.isActive ?
                                        <Chip variant='soft' color='success'>Active</Chip> :
                                        <Chip size='sm' color='error' variant='soft'>Not Active</Chip>}
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        <Button sx={{marginTop: '10px'}} size='sm'>
                            Add Datasets to this Module
                        </Button>
                    </Box>
                </Box>
            </TabPanel>
        </Tabs>
    </Sheet>)
}

export default ModuleDetailView;