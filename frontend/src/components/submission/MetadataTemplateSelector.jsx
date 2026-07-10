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

import React from "react";
import {
  Box,
  Dropdown,
  MenuButton,
  Menu,
  MenuItem,
  Tooltip,
  IconButton,
  Divider,
  ListItemDecorator,
  Typography,
} from "@mui/joy";
import { DeleteForever, Clear } from "@mui/icons-material";

const MetadataTemplateSelector = ({
  templates,
  selectedTemplateId,
  onLoadTemplate,
  onDeleteTemplate,
  onClearTemplate,
  disabled,
}) => {
  const selectorComponent = (
    <Box>
      <Dropdown>
        <MenuButton
          variant={selectedTemplateId ? "solid" : "soft"}
          color="primary"
          sx={{ minWidth: 180 }}
        >
          {selectedTemplateId
            ? templates.find((t) => t.id === selectedTemplateId)?.templateName ||
              "Load from Template"
            : "Load from Template"}
        </MenuButton>
        <Menu sx={{ minWidth: 180 }}>
          {templates.map((template) => (
            <MenuItem key={template.id}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <Typography
                  onClick={() => !disabled && onLoadTemplate(template.id)}
                  sx={{
                    flexGrow: 1,
                    mr: 1,
                    cursor: disabled ? "not-allowed" : "pointer",
                    color: disabled ? "text.disabled" : "text.primary",
                  }}
                >
                  {template.templateName}
                </Typography>
                <IconButton
                  variant="plain"
                  color="danger"
                  size="sm"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTemplate(template.id);
                  }}
                >
                  <DeleteForever />
                </IconButton>
              </Box>
            </MenuItem>
          ))}
          {selectedTemplateId && !disabled && (
            <>
              <Divider />
              <MenuItem onClick={onClearTemplate} color="neutral">
                <ListItemDecorator>
                  <Clear />
                </ListItemDecorator>
                Clear Selection
              </MenuItem>
            </>
          )}
        </Menu>
      </Dropdown>
    </Box>
  );

  return selectedTemplateId ? (
    selectorComponent
  ) : (
    <Tooltip
      title={
        disabled
          ? "Cannot load a template for an active submission."
          : "Load metadata from a saved template"
      }
      variant="outlined"
      arrow
      placement="top"
    >
      {selectorComponent}
    </Tooltip>
  );
};

export default MetadataTemplateSelector;