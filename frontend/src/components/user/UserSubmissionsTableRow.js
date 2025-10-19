import { useEffect, useState, Fragment } from "react";
import IconButton from "@mui/joy/IconButton";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { getDateTimeString } from "../../utils/Date";
import {
  Box,
  Button,
  Chip,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem,
} from "@mui/joy";
import Switch from "@mui/joy/Switch";
import Sheet from "@mui/joy/Sheet";
import Table from "@mui/joy/Table";
import { SubmissionStatus } from "../../enums/SubmissionStatus";
import { Update } from "@mui/icons-material";

const statusColor = (status) => {
  switch (status) {
    case SubmissionStatus.PENDING:
      return "neutral";
    case SubmissionStatus.COMPLETED:
      return "success";
    case SubmissionStatus.FAILED:
    case SubmissionStatus.OUTDATED:
      return "danger";
    default:
      return "neutral";
  }
};

const UserSubmissionsTableRow = ({
  row,
  onTogglePublic,
  onUpdateSubmission,
}) => {
  const [open, setOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(row.version);
  const [displayedModules, setDisplayedModules] = useState([]);

  // Initialize with the current/latest version
  useEffect(() => {
    if (row.version_scores && row.version_scores.length > 0) {
      // Sort versions and select the latest one by default
      const sortedVersions = row.version_scores.sort((a, b) =>
        b.version.localeCompare(a.version, undefined, { numeric: true })
      );
      setSelectedVersion(sortedVersions[0]);
      setDisplayedModules(sortedVersions[0].modules || []);
    } else {
      // Fallback to current submission data
      setSelectedVersion({
        version: row.version,
        score: row.overallScore,
        modules: row.benchmarkScores || [],
      });
      setDisplayedModules(row.benchmarkScores || []);
    }
  }, [row]);

  const handleVersionChange = (versionData) => {
    setSelectedVersion(versionData);
    setDisplayedModules(versionData.modules || []);
  };

  // Get all available versions for the dropdown
  const getAvailableVersions = () => {
    if (row.version_scores && row.version_scores.length > 0) {
      return row.version_scores.sort((a, b) =>
        b.version.localeCompare(a.version, undefined, { numeric: true })
      );
    } else {
      // If no version_scores, return current version as single option
      return [
        {
          version: row.version,
          score: row.overallScore,
          modules: row.benchmarkScores || [],
        },
      ];
    }
  };

  const availableVersions = getAvailableVersions();

  return (
    <Fragment>
      <tr>
        <td>
          <IconButton
            aria-label="expand row"
            variant="plain"
            color="neutral"
            size="sm"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </td>
        <th scope="row">{row.name}</th>
        <th scope="row">{getDateTimeString(row.submissionDate)}</th>
        <td>
          <Chip color={statusColor(row.status)}>{row.status}</Chip>
        </td>
        <td>
          {selectedVersion?.score !== null &&
          selectedVersion?.score !== undefined
            ? selectedVersion.score.toFixed(2)
            : "N/A"}
        </td>
        <td>
          {availableVersions.length > 1 ? (
            <Dropdown>
              <MenuButton size="sm" variant="outlined">
                {selectedVersion?.version || "N/A"}
              </MenuButton>
              <Menu>
                {availableVersions.map((versionData) => (
                  <MenuItem
                    key={versionData.version}
                    onClick={() => handleVersionChange(versionData)}
                    sx={{
                      backgroundColor:
                        selectedVersion?.version === versionData.version
                          ? "action.selected"
                          : "inherit",
                    }}
                  >
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      <Box sx={{ fontWeight: "bold" }}>
                        {versionData.version}
                      </Box>
                      <Box sx={{ fontSize: "0.8em", color: "text.secondary" }}>
                        {/* 0 is valid */}
                        Score:{" "}
                        {versionData.score !== null &&
                        versionData.score !== undefined
                          ? Number(versionData.score).toFixed(2)
                          : "N/A"}
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Menu>
            </Dropdown>
          ) : (
            selectedVersion?.version || row.version || "N/A"
          )}
        </td>
        <td align="center">
          {row.status === SubmissionStatus.COMPLETED && (
            <Switch
              color="success"
              variant="soft"
              checked={row.isPublic}
              onClick={() => onTogglePublic(row.id, !row.isPublic)}
              title={row.isPublic ? "Make private" : "Make public"}
            />
          )}
          {/* Show the Update button only for outdated submissions */}
          {row.status === SubmissionStatus.OUTDATED && (
            <Button
              color="primary"
              size="sm"
              variant="soft"
              onClick={() => onUpdateSubmission(row)}
              endDecorator={<Update />}
            >
              Update
            </Button>
          )}
        </td>
      </tr>
      <tr>
        <td style={{ height: 0, padding: 0 }} colSpan={6}>
          {open && (
            <Sheet
              variant="soft"
              sx={{
                p: 2,
                pl: 6,
                boxShadow: "inset 0 3px 6px 0 rgba(0 0 0 / 0.08)",
              }}
            >
              <Box sx={{ mb: 2 }}>
                <Chip variant="soft" color="primary" size="sm">
                  Version: {selectedVersion?.version || "N/A"}
                </Chip>
                <Chip variant="soft" color="success" size="sm" sx={{ ml: 1 }}>
                  Overall Score: {selectedVersion?.score?.toFixed(2) || "N/A"}
                </Chip>
              </Box>
              <Table
                borderAxis="bothBetween"
                size="sm"
                aria-label="benchmark scores"
                sx={{
                  "--TableCell-paddingX": "0.5rem",
                }}
              >
                <thead>
                  <tr>
                    <th>Module Name</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedModules.length > 0 ? (
                    displayedModules.map((moduleData, index) => {
                      // Handle different data structures for modules
                      const moduleName =
                        moduleData.benchmarkModule?.name ||
                        moduleData.name ||
                        moduleData.module_name;
                      const moduleScore = moduleData.score;

                      return (
                        <tr key={index}>
                          <th scope="row">{moduleName || "Unknown Module"}</th>
                          <td>
                            {/* 0 is valid */}
                            {moduleScore !== null && moduleScore !== undefined
                              ? Number(moduleScore).toFixed(2)
                              : "N/A"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3} align="center">
                        No benchmarking scores available for this version
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Sheet>
          )}
        </td>
      </tr>
    </Fragment>
  );
};
export default UserSubmissionsTableRow;
