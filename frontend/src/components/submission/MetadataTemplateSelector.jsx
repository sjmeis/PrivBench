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