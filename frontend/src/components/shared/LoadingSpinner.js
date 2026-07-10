/* Copyright (C) 2026 Stephen Meisenbacher

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.*/


import {CircularProgress} from "@mui/joy";
import React from "react";

export default function LoadingSpinner({visible = true}){
    return(
        <>
            {visible && (
                <CircularProgress
                    sx={{ml: 'calc(50% - 30px)', mt: 'calc(50vh - 150px)'}}
                    color="primary"
                    determinate={false}
                    size="lg"
                    variant="plain"
                />
            )}
        </>
    )
}