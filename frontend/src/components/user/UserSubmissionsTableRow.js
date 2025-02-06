import * as React from "react";
import IconButton from "@mui/joy/IconButton";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import {getDateTimeString} from "../../utils/Date";
import {Button, Chip} from "@mui/joy";
import Switch from "@mui/joy/Switch";
import Sheet from "@mui/joy/Sheet";
import Table from "@mui/joy/Table";
import {SubmissionStatus} from "../../enums/SubmissionStatus";

const statusColor = (status) => {
    switch (status) {
        case SubmissionStatus.PENDING:
            return 'neutral';
        case SubmissionStatus.COMPLETED:
            return 'success';
        case SubmissionStatus.FAILED:
        case SubmissionStatus.OUTDATED:
            return 'danger';
        default:
            return 'neutral';
    }
}

const UserSubmissionsTableRow = ({row, onTogglePublic, onUpdateSubmission}) => {
    const [open, setOpen] = React.useState(false);

    const onUpdateSubmissionClick = (row) => {
        onUpdateSubmission(row)
    }

    return (
        <React.Fragment>
            <tr>
                <td>
                    <IconButton
                        aria-label="expand row"
                        variant="plain"
                        color="neutral"
                        size="sm"
                        onClick={() => setOpen(!open)}
                    >
                        {open ? <KeyboardArrowUpIcon/> : <KeyboardArrowDownIcon/>}
                    </IconButton>
                </td>
                <th scope="row">{row.name}</th>
                <th scope="row">{getDateTimeString(row.submissionDate)}</th>
                <td><Chip color={statusColor(row.status)}>{row.status}</Chip></td>
                <td>{row.overallScore !== null ? row.overallScore : 'N/A'}</td>
                <td align="center">
                    {row.status === SubmissionStatus.COMPLETED &&
                        <Switch
                            color="success"
                            variant='soft'
                            checked={row.isPublic}
                            onClick={() => onTogglePublic(row.id, !row.isPublic)}
                        />}
                    {row.status === SubmissionStatus.OUTDATED &&
                        <Button
                            color="success"
                            size='md'
                            onClick={() => onUpdateSubmissionClick(row)}
                        >Update</Button>}
                </td>
            </tr>
            <tr>
                <td style={{height: 0, padding: 0}} colSpan={6}>
                    {open && (
                        <Sheet
                            variant="soft"
                            sx={{p: 2, pl: 6, boxShadow: 'inset 0 3px 6px 0 rgba(0 0 0 / 0.08)'}}
                        >
                            <Table
                                borderAxis="bothBetween"
                                size="sm"
                                aria-label="benchmark scores"
                                sx={{
                                    '--TableCell-paddingX': '0.5rem',
                                }}
                            >
                                <thead>
                                <tr>
                                    <th>Module Name</th>
                                    <th>Version</th>
                                    <th>Score</th>
                                </tr>
                                </thead>
                                <tbody>
                                {row.benchmarkScores.length > 0 ? (
                                    row.benchmarkScores.map((score, index) => (
                                        <tr key={index}>
                                            <th scope="row">{score.benchmarkModule.name}</th>
                                            <td>{score.benchmarkModule.version}</td>
                                            <td>{score.score.toFixed(2)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} align="center">
                                            No benchmarking scores available
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </Table>
                        </Sheet>
                    )}
                </td>
            </tr>
        </React.Fragment>
    );
}
export default UserSubmissionsTableRow;