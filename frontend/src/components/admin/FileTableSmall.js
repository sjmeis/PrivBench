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


import { IconButton, Sheet, Table, Typography } from "@mui/joy";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import { CloudDownloadRounded } from "@mui/icons-material";
import { useSnackbar } from "../../contexts/SnackbarProvider";

const FileTableSmall = ({ items, title, onDownload }) => {
  const { showSnackbar } = useSnackbar();

  const handleDownload = (item) => {
    if (onDownload) {
      onDownload(item);
    } else {
      showSnackbar("Download handler not configured", "warning");
    }
  };

  return (
    <Sheet
      variant="outlined"
      sx={{
        marginTop: "1px",
        borderRadius: "sm",
        gridColumn: "1/-1",
        display: { xs: "none", md: "flex" },
      }}
    >
      <Table
        size="sm"
        borderAxis="none"
        variant="soft"
        sx={{
          "--TableCell-paddingX": "0.5rem",
          "--TableCell-paddingY": "0.5rem",
          "--TableRow-height": "1.5rem",
        }}
      >
        <thead>
          <tr>
            <th style={{ width: "85%" }}>
              <Typography level="title-sm">{title}</Typography>
            </th>
            <th style={{ width: "15%" }}></th>
          </tr>
        </thead>
        <tbody>
          {items && items.length > 0 ? (
            items.map((item) => (
              <tr key={item.id || item.name}>
                <td>
                  <Typography
                    level="title-sm"
                    startDecorator={
                      <InsertDriveFileRoundedIcon color="primary" />
                    }
                    sx={{ alignItems: "flex-start" }}
                  >
                    {item.name}
                  </Typography>
                </td>
                <td>
                  <IconButton
                    onClick={() => handleDownload(item)}
                    variant="outlined"
                    color="primary"
                  >
                    <CloudDownloadRounded />
                  </IconButton>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} style={{ textAlign: "center" }}>
                <Typography level="body-sm" sx={{ color: "text.secondary" }}>
                  No Dataset selected yet
                </Typography>
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </Sheet>
  );
};

export default FileTableSmall;
