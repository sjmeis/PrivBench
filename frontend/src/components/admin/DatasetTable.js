/* Copyright (C) 2026 Stephen Meisenbacher

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.*/


import * as React from 'react';
import { useState, useRef } from 'react';
import Typography from '@mui/joy/Typography';
import Table from '@mui/joy/Table';
import { Box, Chip, IconButton, Sheet, Stack } from "@mui/joy";

import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';
import {getDateString} from "../../utils/Date";
import {CloudDownloadRounded} from "@mui/icons-material";
import {DatasetService} from "../../services/DatasetService";
import {useSnackbar} from "../../contexts/SnackbarProvider";
import { Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Button, Divider } from "@mui/joy";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import EditIcon from '@mui/icons-material/Edit';


const DatasetTable = ({datasets , onRefresh}) => {
    const {showSnackbar} = useSnackbar()
    const [deleteId, setDeleteId] = React.useState(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [replacingId, setReplacingId] = useState(null);

    const fileInputRef = useRef(null);
    const [targetId, setTargetId] = React.useState(null);
    
    const downloadDataset = (dataset) => {
        console.log(dataset)
        DatasetService.downloadDatasets([dataset.name])
            .then(() => {
                showSnackbar("Dataset was downloaded", "success");
            })
            .catch((error) => {

                showSnackbar("Error downloading datasets", "error");
            });
    }

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await DatasetService.deleteDataset(deleteId);
            showSnackbar("Dataset deleted successfully", "success");
            setDeleteId(null);
            onRefresh();
        } catch (error) {
            showSnackbar(error.response?.data?.error || "Error deleting dataset", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file || !targetId) return;

        setReplacingId(targetId);
        try {
            await DatasetService.replaceDatasetFile(targetId, file);
            showSnackbar("Dataset file replaced successfully", "success");
            onRefresh();
        } catch (error) {
            showSnackbar("Failed to replace file", "error");
        } finally {
            setReplacingId(null);
            setTargetId(null);
            event.target.value = null;
        }
    };

    const triggerReplace = (id) => {
        setTargetId(id);
        fileInputRef.current.click();
    };

    return (
        <Sheet
            variant="outlined"
            sx={{
                borderRadius: 'sm',
                gridColumn: '1/-1',
                display: { xs: 'none', md: 'flex' },
            }}
        >
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".csv"
                onChange={handleFileChange}
            />
            <div>
                <Table
                    hoverRow
                    size="sm"
                    borderAxis="none"
                    variant="soft"
                    sx={{'--TableCell-paddingX': '1rem', '--TableCell-paddingY': '1rem'}}
                >
                    <thead>
                    <tr>
                        <th style={{width: '20%'}}>
                            <Typography level="title-sm">Dataset</Typography>
                        </th>
                        <th style={{width: '15%'}}>
                            <Typography
                                level="title-sm"
                                endDecorator={<ArrowDropDownRoundedIcon/>}
                            >
                                Created At
                            </Typography>
                        </th>
                        {/* <th style={{width: '30%'}}><Typography level="title-sm">File Path</Typography></th> */}
                        <th style={{ width: '35%' }}><Typography level="title-sm">Mapped Modules</Typography></th>
                        <th style={{width: '15%'}}>
                            <Typography level="title-sm">Status</Typography>
                        </th>
                        <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {datasets.map(
                        (item) => (<tr>
                            <td>
                                <Typography
                                    level="title-sm"
                                    startDecorator={<InsertDriveFileRoundedIcon color="primary"/>}
                                    sx={{alignItems: 'flex-start'}}
                                >
                                    {item.name}
                                </Typography>
                            </td>
                            <td>
                                <Typography level="body-sm">{getDateString(item.createdAt)}</Typography>
                            </td>
                            {/* <td>
                                <Typography level="body-sm">{item.filePath}</Typography>
                            </td> */}
                            <td>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    {item.compatibleModules?.length > 0 ? (
                                        item.compatibleModules.map((mod) => (
                                            <Chip key={mod.id} size="sm" variant="soft" color="primary">
                                                {mod.name}
                                            </Chip>
                                        ))
                                    ) : (
                                        <Typography level="body-xs" sx={{ color: 'text.tertiary', fontStyle: 'italic' }}>
                                            None assigned
                                        </Typography>
                                    )}
                                </Box>
                            </td>
                            <td>
                                {item.isActive ? <Chip variant='soft' color='success'>Active</Chip> :
                                    <Chip color='error' variant='soft'>Not Active</Chip>}
                            </td>
                            <td style={{ textAlign: "right" }}>
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    <IconButton 
                                        variant='soft' 
                                        color='primary' 
                                        loading={replacingId === item.id} 
                                        onClick={() => triggerReplace(item.id)}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton variant='soft' color='primary' onClick={() => downloadDataset(item)}>
                                        <CloudDownloadRounded />
                                    </IconButton>
                                    <IconButton variant='soft' color='danger' onClick={() => setDeleteId(item.id)}>
                                        <DeleteForeverIcon />
                                    </IconButton>
                                </Stack>
                            </td>
                        </tr>)
                    )}
                    </tbody>
                </Table>
            </div>

            <Modal open={!!deleteId} onClose={() => setDeleteId(null)}>
                <ModalDialog variant="outlined" role="alertdialog">
                    <DialogTitle>
                        <WarningRoundedIcon />
                        Confirm Deletion
                    </DialogTitle>
                    <Divider />
                    <DialogContent>
                        Are you sure you want to delete this dataset? This will remove the physical file from the VM and unlink it from all modules. 
                        <b> This cannot be undone.</b>
                    </DialogContent>
                    <DialogActions>
                        <Button variant="solid" color="danger" onClick={handleDelete} loading={isDeleting}>
                            Delete
                        </Button>
                        <Button variant="plain" color="neutral" onClick={() => setDeleteId(null)}>
                            Cancel
                        </Button>
                    </DialogActions>
                </ModalDialog>
            </Modal>
        </Sheet>
    );
}

export default DatasetTable;
