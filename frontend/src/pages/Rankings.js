import {Box, Input, MenuItem, Select} from "@mui/joy";
import RankingTable from "../components/RankingTable";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import SearchIcon from "@mui/icons-material/Search";
import React from "react";

const Rankings = () => {


    return(
        <Box>
            <Box
                className="SearchAndFilters-tabletUp"
                sx={{
                    margin: "0 auto",
                    borderRadius: 'sm',
                    py: 2,
                    display: { xs: 'none', sm: 'flex' },
                    flexWrap: 'wrap',
                    gap: 1.5,
                    '& > *': {
                        minWidth: { xs: '120px', md: '160px' },
                    },
                    maxWidth: '1600px'
                }}
            >
                <FormControl sx={{ flex: 1 }} size="sm">
                    <FormLabel>Search</FormLabel>
                    <Input size="sm" placeholder="Search" startDecorator={<SearchIcon />} />
                </FormControl>

                {/* Filter 1: Dropdown */}
                <FormControl sx={{ flex: 1,  maxWidth: '300px'  }} size="sm">
                    <FormLabel>Filter 2</FormLabel>
                    <Select placeholder="Filter placeholder" size="sm">
                        <MenuItem value="category1">Category 1</MenuItem>
                        <MenuItem value="category2">Category 2</MenuItem>
                        <MenuItem value="category3">Category 3</MenuItem>
                    </Select>
                </FormControl>

                {/* Filter 2: Dropdown */}
                <FormControl sx={{ flex: 1, maxWidth: '300px' }} size="sm">
                    <FormLabel>Filter 1</FormLabel>
                    <Select placeholder="Filter placeholder" size="sm">
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            <RankingTable></RankingTable>
        </Box>
    );
}

export default Rankings;