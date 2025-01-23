import {CircularProgress} from "@mui/joy";
import React from "react";

export default function LoadingSpinner({visible = true}){
    return(
        <>
            {visible && (
                <CircularProgress
                    sx={{ml: 'calc(50% - 30px)', mt: 'calc(50% - 100px)'}}
                    color="primary"
                    determinate={false}
                    size="lg"
                    variant="plain"
                />
            )}
        </>
    )
}