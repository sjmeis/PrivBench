import {IconButton, Sheet, Table, Typography} from "@mui/joy";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import React from "react";

const DatasetTableSmall = ({datasets}) => {


    return (
        <Sheet
            variant="outlined"
            sx={{
                marginTop: '1px',
                borderRadius: 'sm',
                gridColumn: '1/-1',
                display: { xs: 'none', md: 'flex' },
            }}
        >
            <Table
                size="sm"
                borderAxis="none"
                variant="soft"
                sx={{
                    '--TableCell-paddingX': '0.5rem',
                    '--TableCell-paddingY': '0.5rem',
                    '--TableRow-height': '1.5rem',
                }}
            >
                <thead>
                <tr>
                    <th style={{ width: '85%' }}>
                        <Typography level="title-sm">Datasets associated this Module</Typography>
                    </th>
                    <th style={{ width: '15%' }}>
                    </th>
                </tr>
                </thead>
                <tbody>
                {datasets.length > 0 ? (
                    datasets.map((item) => (
                        <tr key={item.id}>
                            <td>
                                <Typography
                                    level="title-sm"
                                    startDecorator={<InsertDriveFileRoundedIcon color="primary" />}
                                    sx={{ alignItems: 'flex-start' }}
                                >
                                    {item.name}
                                </Typography>
                            </td>
                            <td>
                                <IconButton
                                    variant="soft"
                                    color='danger'
                                    // todo: implement delete logic
                                >
                                    <DeleteForeverIcon />
                                </IconButton>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={3} style={{ textAlign: 'center' }}>
                            <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                                No Dataset selected yet
                            </Typography>
                        </td>
                    </tr>
                )}
                </tbody>
            </Table>
        </Sheet>
    )
}

export default DatasetTableSmall;