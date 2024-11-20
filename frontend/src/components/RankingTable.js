import React, {useEffect, useState} from "react";
import Box from "@mui/joy/Box";
import Table from "@mui/joy/Table";
import Typography from "@mui/joy/Typography";
import Sheet from "@mui/joy/Sheet";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import IconButton from "@mui/joy/IconButton";
import Link from "@mui/joy/Link";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import {RankingData} from "../mockData/RankingData";
import {Avatar, Button, Chip} from "@mui/joy";
import md5 from "md5";
import {useNavigate} from "react-router-dom";


//fixme: do this properly with user mail
const generateRandomGravatarUrl = () => {
    const randomEmail = Math.random().toString(36).substring(7) + "@example.com";
    const hash = md5(randomEmail.trim().toLowerCase()); // Using md5 to create a hash
    return `https://www.gravatar.com/avatar/${hash}?d=identicon`; // 'd=identicon' specifies a default random image if no gravatar is found
}


//fixme: replace with axios backend call
const rows = RankingData;

const headCells = [
    {id: "rank", numeric: true, label: "Rank"},
    {id: "name", numeric: false, label: "Name"},
    {id: "method", numeric: false, label: "Privatization Method"},
    {id: "submittedBy", numeric: false, label: "Submitted By"},
    {id: "badges", numeric: false, label: "User Badges"},
    {id: "score", numeric: true, label: "Privacy Score"},
];

function descendingComparator(a, b, orderBy) {
    if (b[orderBy] < a[orderBy]) {
        return -1;
    }
    if (b[orderBy] > a[orderBy]) {
        return 1;
    }
    return 0;
}

function getComparator(order, orderBy) {
    return order === "desc"
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

function PrivacyTable() {
    const [order, setOrder] = useState("asc");
    const [orderBy, setOrderBy] = useState("rank");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);

    const navigate = useNavigate();

    useEffect(() => {
        const updateRowsPerPage = () => {
            const viewportHeight = window.innerHeight;
            const topMargin = 74 + 40 + 40;
            const bottomMargin = 50 + 40;
            const rowHeight = 45;
            const availableHeight = viewportHeight - topMargin - bottomMargin;
            const rowsCount = Math.floor(availableHeight / rowHeight);
            setRowsPerPage(rows.length > rowsCount ? rowsCount : rows.length);
        };

        updateRowsPerPage(); // Initial calculation
        window.addEventListener("resize", updateRowsPerPage); // Update on resize

        return () => {
            window.removeEventListener("resize", updateRowsPerPage);
        };
    }, []);

    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const handleChangePage = (newPage) => {
        setPage(newPage);
    };


    //fixme: implement this properly
    const onViewClick = (row) => {
        console.log("clicked on ranking item: ", row)
        navigate(`/rankings/detail/`);
    }

    return (
        <Sheet variant="outlined"
               sx={{width: "100%", margin: "0 auto", maxWidth: '1600px', boxShadow: "sm", borderRadius: "sm"}}>
            <Table aria-labelledby="tableTitle" sx={{minWidth: 750, "--TableCell-paddingX": "10px"}}>
                <thead>
                <tr>
                    {headCells.map((headCell) => (
                        <th key={headCell.id}>
                            <Link
                                underline="none"
                                onClick={(event) => handleRequestSort(event, headCell.id)}
                                sx={{fontWeight: "bold", cursor: "pointer"}}
                            >
                                <Typography
                                    sx={{fontWeight: "bold"}}
                                    color="primary"
                                    level="body-md"
                                    noWrap
                                >{headCell.label}</Typography>
                                {orderBy === headCell.id && (
                                    <ArrowDownwardIcon
                                        sx={{
                                            ml: 1,
                                            transform: order === "desc" ? "rotate(0deg)" : "rotate(180deg)",
                                        }}
                                    />
                                )}
                            </Link>
                        </th>
                    ))}
                    <th
                        aria-label="last"
                        style={{width: '100px'}}
                    />
                </tr>
                </thead>
                <tbody>
                {rows
                    .slice()
                    .sort(getComparator(order, orderBy))
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row) => (
                        <tr
                            key={row.rank}
                        >
                            <td>{row.rank}</td>
                            <td><Typography
                                sx={{fontWeight: "bold"}}
                                color="primary"
                                level="body-sm"
                                noWrap
                            >{row.name}</Typography></td>
                            <td>{row.method || "N/A"}</td>
                            <td><Box sx={{display: 'flex', alignItems: 'center', gap: 1.5}}>
                                <Avatar size="sm" src={generateRandomGravatarUrl()}/>
                                <Box sx={{minWidth: 0}}>
                                    <Typography noWrap>
                                        {row.submittedBy}
                                    </Typography>
                                </Box>
                            </Box></td>
                            <td>
                                {row.badges.map((item, index) => (
                                    <Chip key={index} variant='outlined' color="primary" sx={{marginRight: 1}}>
                                        {item}
                                    </Chip>
                                ))}
                            </td>
                            <td>{row.score}</td>
                            <td>
                                <Box sx={{display: 'center'}}>
                                    <Button size="sm" variant="soft" color="primary" onClick={() => onViewClick(row)}>
                                        View
                                    </Button>
                                </Box>
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                <tr>
                    <td colSpan={7}>
                        <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                            <FormControl orientation="horizontal">
                                <FormLabel>Rows per page: {rowsPerPage}</FormLabel>
                            </FormControl>
                            <Box sx={{display: "flex", alignItems: "center"}}>
                                <IconButton
                                    onClick={() => handleChangePage(page - 1)}
                                    disabled={page === 0}
                                >
                                    <KeyboardArrowLeftIcon/>
                                </IconButton>
                                <Typography>{`${page + 1} of ${Math.ceil(rows.length / rowsPerPage)}`}</Typography>
                                <IconButton
                                    onClick={() => handleChangePage(page + 1)}
                                    disabled={page >= Math.ceil(rows.length / rowsPerPage) - 1}
                                >
                                    <KeyboardArrowRightIcon/>
                                </IconButton>
                            </Box>
                        </Box>
                    </td>
                </tr>
                </tfoot>
            </Table>
        </Sheet>
    );
}

export default PrivacyTable;
