import {Chip, IconButton, Sheet, Table, Typography} from "@mui/joy";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import React from "react";

const AddModuleDatasetTable = ({formData, removeDataset, removeUploadedDataset}) => {


    return (<Sheet
        variant="outlined"
        sx={{borderRadius: "sm", overflow: "auto", flex: 1}}
    >
        <Table
            size="sm"
            borderAxis="none"
            variant="soft"
            sx={{
                "--TableCell-paddingX": "0.5rem",
                "--TableCell-paddingY": "0.5rem",
                "--TableRow-height": "1.5rem",
            }}
        >
            <thead>
            <tr>
                <th style={{width: '60%'}}>
                    <Typography level="body-sm" fontWeight="lg">Selected Dataset</Typography>
                </th>
                <th style={{width: '30%'}}>
                </th>
                <th style={{width: '10%'}}>

                </th>
            </tr>
            </thead>
            <tbody>
            {formData.selectedDatasets.length > 0 || formData.uploadedDatasets.length > 0 ? (
                <>
                    {formData.selectedDatasets.map((item) => (
                        <tr key={`selected-${item.id}`}>
                            <td>
                                <Typography
                                    level="body-sm"
                                    startDecorator={<InsertDriveFileRoundedIcon
                                        color="primary"/>}
                                >
                                    {item.name}
                                </Typography>
                            </td>
                            <td>
                                <Chip color='neutral' variant='outlined'>Existing</Chip>
                            </td>
                            <td>
                                <IconButton
                                    variant="soft"
                                    color="danger"
                                    onClick={() => removeDataset(item.id)}
                                >
                                    <DeleteForeverIcon/>
                                </IconButton>
                            </td>
                        </tr>
                    ))}
                    {formData.uploadedDatasets.map((item) => (
                        <tr key={`uploaded-${item.id}`}>
                            <td>
                                <Typography
                                    level="body-sm"
                                    startDecorator={<InsertDriveFileRoundedIcon
                                        color="primary"/>}
                                >
                                    {item.name}
                                </Typography>
                            </td>
                            <td>
                                <Chip color='success' variant='outlined'>New</Chip>
                            </td>
                            <td>
                                <IconButton
                                    variant="soft"
                                    color="danger"
                                    onClick={() => removeUploadedDataset(item.id)}
                                >
                                    <DeleteForeverIcon/>
                                </IconButton>
                            </td>
                        </tr>
                    ))}
                </>
            ) : (
                <tr>
                    <td colSpan={3} style={{textAlign: 'center'}}>
                        <Typography level="body-sm" sx={{color: 'text.secondary'}}>
                            No Dataset selected yet
                        </Typography>
                    </td>
                </tr>
            )}

            </tbody>
        </Table>
    </Sheet>)
}

export default AddModuleDatasetTable;