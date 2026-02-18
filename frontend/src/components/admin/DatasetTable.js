import * as React from 'react';
import Typography from '@mui/joy/Typography';
import Table from '@mui/joy/Table';
import { Chip, IconButton, Sheet, Stack } from "@mui/joy";

import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';
import {Box, Chip, IconButton, Sheet} from "@mui/joy";
import {getDateString} from "../../utils/Date";
import {CloudDownloadRounded} from "@mui/icons-material";
import {DatasetService} from "../../services/DatasetService";
import {useSnackbar} from "../../contexts/SnackbarProvider";


const DatasetTable = ({datasets}) => {
    const {showSnackbar} = useSnackbar()
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

    return (
        <Sheet
            variant="outlined"
            sx={{
                borderRadius: 'sm',
                gridColumn: '1/-1',
                display: { xs: 'none', md: 'flex' },
            }}
        >
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
                        <th style={{ width: '30%' }}><Typography level="title-sm">Mapped Modules</Typography></th>
                        <th style={{width: '15%'}}>
                            <Typography level="title-sm">Status</Typography>
                        </th>
                        <th style={{width: '10%', textAlign: 'right'}}>
                            <Typography level="title-sm">Download</Typography>
                        </th>
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
                            <td style={{textAlign: "right"}}>
                                <IconButton
                                    variant='soft'
                                    color='primary'
                                    onClick={() => downloadDataset(item)}
                                >
                                    <CloudDownloadRounded/>
                                </IconButton>
                            </td>
                        </tr>)
                    )}
                    </tbody>
                </Table>
            </div>
        </Sheet>
    );
}

export default DatasetTable;
