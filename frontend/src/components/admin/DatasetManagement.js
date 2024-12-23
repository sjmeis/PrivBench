import {Box} from "@mui/joy";
import DatasetTable from "./DatasetTable";
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
        <DatasetTable datasets={datasets}></DatasetTable>
    </Box>)
}

export default DatasetManagement;