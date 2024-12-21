import {Box} from "@mui/joy";
import TableDatasets from "../TableDatasets";
import {useEffect, useState} from "react";
import {fetchAllDatasets} from "../../services/DatasetService";

const DatasetManagement = () => {
    const [datasets, setDatasets] = useState([]);

    useEffect(() => {
        fetchAllDatasets()
            .then((datasets) => setDatasets(datasets))
            .catch((error) => console.error(error));
    }, []);

    return (<Box>
        <TableDatasets datasets={datasets}></TableDatasets>
    </Box>)
}

export default DatasetManagement;