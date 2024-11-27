import {Box, Input, MenuItem, Select} from "@mui/joy";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import SearchIcon from "@mui/icons-material/Search";
import React, {useEffect, useLayoutEffect, useRef, useState} from "react";
import fetchRankings from "../services/fetchRankings";
import Table from "@mui/joy/Table";
import Typography from "@mui/joy/Typography";
import Sheet from "@mui/joy/Sheet";
import IconButton from "@mui/joy/IconButton";
import Link from "@mui/joy/Link";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import {Avatar, Button, Chip} from "@mui/joy";
import {useNavigate} from "react-router-dom";
import {getGravatarUrl} from "../utils/Gravatar";

const headCells = [
    {id: "score", numeric: true, label: "Privacy Score"},
    {id: "name", numeric: false, label: "Name"},
    {id: "method", numeric: false, label: "Privatization Method"},
    {id: "submittedBy", numeric: false, label: "Submitted By"},
    {id: "badges", numeric: false, label: "User Badges"},
];

const Rankings = () => {
    const [rankings, setRankings] = useState();
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [order, setOrder] = useState("asc");
    const [orderBy, setOrderBy] = useState("rank");
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [searchValue, setSearchValue] = useState('');
    const [searchTerm, setSearchTerm] = useState('')
    const timerRef = useRef(null);

    const updateRowsPerPage = () => {
        const viewportHeight = window.innerHeight;
        const availableHeight = viewportHeight - 350;
        const rowHeight = 45;
        const rowsCount = Math.floor(availableHeight / rowHeight);
        setRowsPerPage(rowsCount);
    };


    const handleSearchInputChange = (event) => {
        const newInputValue = event.target.value;
        setSearchValue(newInputValue);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setSearchTerm(newInputValue);
        }, 500);
    };


    const navigate = useNavigate();

    useLayoutEffect(() => {

        updateRowsPerPage();
        window.addEventListener("resize", updateRowsPerPage); // Update on resize

        return () => {
            window.removeEventListener("resize", updateRowsPerPage);
        };
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            updateRowsPerPage(); // Recalculate after layout is fully applied
        }, 0);

        return () => {
            clearTimeout(timeout); // Cleanup the timeout on unmount
        };
    }, []);

    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };


    //fixme: implement this properly
    const onViewClick = (row) => {
        console.log("clicked on ranking item: ", row)
        navigate(`/rankings/detail/`);
    }

    useEffect(() => {
        const loadRankings = async () => {
            try {
                const data = await fetchRankings(searchTerm, currentPage, rowsPerPage); // Adjust parameters as needed
                setRankings(data);
                setTotalPages(data.totalPages);
                setCurrentPage(data.currentPage)
            } catch (error) {
                console.error('Failed to load rankings:', error);
            }
        };

        loadRankings();
    }, [rowsPerPage, currentPage, searchTerm]);

    const onNextPageClick = () => {
        setCurrentPage(prevState => prevState + 1)
    }

    const onPreviousPageClick = () => {
        setCurrentPage(prevState => prevState - 1)
    }


    return (
        <Box>
            <Box
                className="SearchAndFilters-tabletUp"
                sx={{
                    margin: "0 auto",
                    borderRadius: 'sm',
                    py: 2,
                    display: {xs: 'none', sm: 'flex'},
                    flexWrap: 'wrap',
                    gap: 1.5,
                    '& > *': {
                        minWidth: {xs: '120px', md: '160px'},
                    },
                    maxWidth: '1600px'
                }}
            >
                <FormControl sx={{flex: 1}} size="sm">
                    <FormLabel>Search</FormLabel>
                    <Input
                        variant="outlined"
                        placeholder="Search for username, privatization method or badges"
                        name="searchTerm"
                        value={searchValue}
                        onChange={handleSearchInputChange}
                        size="sm"
                        startDecorator={<SearchIcon/>}
                    />
                </FormControl>

                {/* Filter 1: Dropdown */}
                <FormControl sx={{flex: 1, maxWidth: '300px'}} size="sm">
                    <FormLabel>Filter 2</FormLabel>
                    <Select placeholder="Filter placeholder" size="sm">
                        <MenuItem value="category1">Category 1</MenuItem>
                        <MenuItem value="category2">Category 2</MenuItem>
                        <MenuItem value="category3">Category 3</MenuItem>
                    </Select>
                </FormControl>

                {/* Filter 2: Dropdown */}
                <FormControl sx={{flex: 1, maxWidth: '300px'}} size="sm">
                    <FormLabel>Filter 1</FormLabel>
                    <Select placeholder="Filter placeholder" size="sm">
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {rankings && <Sheet variant="outlined"
                                sx={{
                                    width: "100%",
                                    margin: "0 auto",
                                    maxWidth: '1600px',
                                    boxShadow: "sm",
                                    borderRadius: "sm"
                                }}>
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
                    {rankings.results.map((row) => (
                        <tr>
                            <td>{row.score}</td>
                            <td><Typography
                                sx={{fontWeight: "bold"}}
                                color="primary"
                                level="body-sm"
                                noWrap
                            >{row.name}</Typography></td>
                            <td>{row.method || "N/A"}</td>
                            <td><Box sx={{display: 'flex', alignItems: 'center', gap: 1.5}}>
                                <Avatar size="sm" src={getGravatarUrl(row.submittedBy.mailAddress)}/>
                                <Box sx={{minWidth: 0}}>
                                    <Typography noWrap>
                                        {row.submittedBy.username}
                                    </Typography>
                                </Box>
                            </Box></td>
                            <td>
                                {row.submittedBy.badges.map((item, index) => (
                                    <Chip key={index} variant='outlined' color="primary" sx={{marginRight: 1}}>
                                        {item}
                                    </Chip>
                                ))}
                            </td>
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
                        <td colSpan={6}>
                            <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                                <FormControl orientation="horizontal">
                                    <FormLabel>Rows per page: {rowsPerPage}</FormLabel>
                                </FormControl>
                                <Box sx={{display: "flex", alignItems: "center"}}>
                                    <IconButton
                                        onClick={onPreviousPageClick}
                                        disabled={currentPage === 1}
                                    >
                                        <KeyboardArrowLeftIcon/>
                                    </IconButton>
                                    <Typography>{`page ${currentPage} of ${totalPages}`}</Typography>
                                    <IconButton
                                        onClick={onNextPageClick}
                                        disabled={currentPage === totalPages}
                                    >
                                        <KeyboardArrowRightIcon/>
                                    </IconButton>
                                </Box>
                            </Box>
                        </td>
                    </tr>
                    </tfoot>
                </Table>
            </Sheet>}
        </Box>
    );
}

export default Rankings;