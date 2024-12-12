import React, {useEffect, useLayoutEffect, useRef, useState} from "react";
import {
    Box,
    Breadcrumbs,
    Input,
    Table,
    Typography,
    Sheet,
    IconButton,
    Link,
    Avatar,
    Button,
    Chip, Stack,
} from "@mui/joy";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import SearchIcon from "@mui/icons-material/Search";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import {fetchRankings} from "../services/RankingsService";
import {useNavigate} from "react-router-dom";
import {getGravatarUrl} from "../utils/Gravatar";
import {getDateString, isNewDate} from "../utils/Date";
import {formatToTwoDecimals} from "../utils/FormatUtils";
import {useAuth} from "../contexts/AuthContext";

const headCells = [
    {id: "status", numeric: false, label: "", width: "5%"},
    {id: "score", numeric: true, label: "Privacy Score", width: "15%"},
    {id: "name", numeric: false, label: "Privatization Method", width: "20%"},
    {id: "submissionDate", numeric: false, label: "Submission Date", width: "20%"},
    {id: "username", numeric: false, label: "Submitted By", width: "18%"},
    {id: "badges", numeric: false, label: "User Badges", width: "10%"},
    {id: "button", numeric: false, label: "", width: "12%"},
];

const Rankings = () => {
    const [rankings, setRankings] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [order, setOrder] = useState("desc");
    const [orderBy, setOrderBy] = useState("rank");
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [searchValue, setSearchValue] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const timerRef = useRef(null);
    const navigate = useNavigate();
    const { user } = useAuth();

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

    useLayoutEffect(() => {
        updateRowsPerPage();
        window.addEventListener("resize", updateRowsPerPage); // Update on resize

        return () => {
            window.removeEventListener("resize", updateRowsPerPage);
        };
    }, []);

    const handleRequestSort = (event, property) => {
        console.log(event, property)
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    useEffect(() => {
        const loadRankings = async () => {
            try {
                const data = await fetchRankings(searchTerm, currentPage, rowsPerPage, order, orderBy);
                setRankings(data.results);
                setTotalPages(data.totalPages);
                setCurrentPage(data.currentPage);
            } catch (error) {
                console.error("Failed to load rankings:", error);
            } finally {
            }
        };

        loadRankings();
    }, [rowsPerPage, currentPage, searchTerm, order, orderBy]);

    const onViewClick = (row) => {
        navigate("/rankings/detail", {state: row});
    };

    const onNextPageClick = () => {
        setCurrentPage((prevState) => prevState + 1);
    };

    const onPreviousPageClick = () => {
        setCurrentPage((prevState) => prevState - 1);
    };

    const isCurrentUser = (userId) => {
       if(!user){
           return false;
       }
       return userId === user.id;
    }
    return (
        <Box>
            <Box sx={{display: "flex", alignItems: "center"}}>
                <Breadcrumbs
                    size="sm"
                    aria-label="breadcrumbs"
                    separator={<ChevronRightRoundedIcon fontSize="sm"/>}
                    sx={{pl: 0}}
                >
                    <Link underline="none" color="neutral" href="/" aria-label="Home">
                        <HomeRoundedIcon/>
                    </Link>
                    <Link underline="hover" color="neutral" href="/rankings" sx={{fontSize: 12, fontWeight: 500}}>
                        Ranking
                    </Link>
                    <Typography color="primary" sx={{fontWeight: 500, fontSize: 12}}>
                        Dashboard
                    </Typography>
                </Breadcrumbs>
            </Box>
            <Box
                className="SearchAndFilters-tabletUp"
                sx={{
                    margin: "0 auto",
                    borderRadius: "sm",
                    py: 2,
                    display: {xs: "none", sm: "flex"},
                    flexWrap: "wrap",
                    gap: 1.5,
                    "& > *": {
                        minWidth: {xs: "120px", md: "160px"},
                    },
                    maxWidth: "1600px",
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
            </Box>
            <Sheet
                variant="outlined"
                sx={{
                    width: "100%",
                    margin: "0 auto",
                    maxWidth: "1600px",
                    boxShadow: "sm",
                    borderRadius: "sm",
                }}
            >
                <Table aria-labelledby="tableTitle" sx={{minWidth: 750, "--TableCell-paddingX": "10px"}} >
                    <thead>
                    <tr>
                        {headCells.map((headCell) => (
                            <th style={{width: headCell.width}} key={headCell.id}>
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
                                    >
                                        {headCell.label}
                                    </Typography>
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
                    </tr>
                    </thead>
                    <tbody>
                    {rankings.map((row) => (
                        <tr style={{ backgroundColor: isCurrentUser(row.user.id) ? 'var(--joy-palette-background-level1)': 'inherit'}}  key={row.id}>
                            <td>
                                {isNewDate(row.submissionDate) && (
                                    <Chip color="success" variant="soft">
                                        New
                                    </Chip>
                                )}
                            </td>
                            <td>{formatToTwoDecimals(row.overallScore)}</td>
                            <td>{row.name}</td>
                            <td>{getDateString(row.submissionDate)}</td>
                            <td>
                                <Box sx={{display: "flex", alignItems: "center", gap: 1.5}}>
                                    <Avatar size="sm" src={getGravatarUrl(row.user.mailAddress)}/>
                                    <Typography noWrap>{row.user.username}</Typography>
                                </Box>
                            </td>
                            <td>
                                {row.user.badges.map((item, index) => (
                                    <Chip key={index} variant="outlined" color="primary" sx={{marginRight: 1}}>
                                        {item}
                                    </Chip>
                                ))}
                            </td>
                            <td>
                                <Stack justifyContent='end' direction='row' spacing={1}>
                                    {isCurrentUser(row.user.id) &&
                                        <Button size="sm" variant="outlined" color="neutral" onClick={() => navigate("/profile", { state: 'submissions' })}>Edit </Button>
                                    }
                                    <Button size="sm" variant="soft" color="primary" onClick={() => onViewClick(row)}>
                                        View
                                    </Button>
                                </Stack>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                    <tfoot>
                    <tr>
                        <td colSpan={7}>
                            <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                                <Typography>{`Rows per page: ${rankings.length > rowsPerPage ? rowsPerPage: rankings.length}`}</Typography>
                                <Box sx={{display: "flex", alignItems: "center"}}>
                                    <IconButton
                                        onClick={onPreviousPageClick}
                                        disabled={currentPage === 1}
                                    >
                                        <KeyboardArrowLeftIcon/>
                                    </IconButton>
                                    <Typography>{`Page ${currentPage} of ${totalPages}`}</Typography>
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
            </Sheet>
        </Box>
    );
};

export default Rankings;
