import {Box} from "@mui/joy";
import DatasetTable from "./DatasetTable";
import {useEffect, useState} from "react";
import { DatasetService } from "../../services/DatasetService";

const DatasetManagement = () => {
    const [datasets, setDatasets] = useState([]);

    useEffect(() => {
        DatasetService.fetchAllDatasets()
            .then((data) => setDatasets(data))
            .catch((error) => console.error(error));
    }, []);

    return (<Box>
        <DatasetTable datasets={datasets}></DatasetTable>
    </Box>)
}

export default DatasetManagement;