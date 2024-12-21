import * as React from 'react';
import Typography from '@mui/joy/Typography';
import Table from '@mui/joy/Table';

import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';
import {Chip, Sheet} from "@mui/joy";
import {useEffect} from "react";
import {getDateString} from "../utils/Date";

const TableDatasets = ({datasets}) => {
    useEffect(() => {
        console.log(datasets)
    }, []);

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
                        <th style={{width: '30%'}}>
                            <Typography level="title-sm">Dataset</Typography>
                        </th>
                        <th style={{width: '20%'}}>
                            <Typography
                                level="title-sm"
                                endDecorator={<ArrowDropDownRoundedIcon/>}
                            >
                                Created At
                            </Typography>
                        </th>
                        <th style={{width: '30%'}}>
                            <Typography level="title-sm">File Path</Typography>
                        </th>
                        <th style={{width: '15%'}}>
                            <Typography level="title-sm">Status</Typography>
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
                            <td>
                                <Typography level="body-sm">{item.filePath}</Typography>
                            </td>
                            <td>
                                {item.isActive ? <Chip variant='soft' color='success'>Active</Chip> :
                                    <Chip color='error' variant='soft'>Not Active</Chip>}
                            </td>
                        </tr>)
                    )}
                    </tbody>
                </Table>
            </div>
        </Sheet>
    );
}

export default TableDatasets;
