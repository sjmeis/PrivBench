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
  Stack
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
  onViewProgress,
  onCancelSubmission
}) => {
  const [open, setOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(row.version);
  const [displayedModules, setDisplayedModules] = useState([]);

  const getModulesForVersion = (versionData) => {
    if (!versionData) return [];
    
    // If the version object already has embedded scores
    if (versionData.modules && versionData.modules.length > 0 && versionData.modules[0].score !== undefined) {
      return versionData.modules;
    }

    // Match module IDs with the submission's overall benchmarkScores
    const moduleList = versionData.modules || [];
    const allScores = row.benchmarkScores || [];
    
    return moduleList.map((mod) => {
      const modId = mod.id || mod.module_id;
      const matchingScore = allScores.find(
        (s) => (s.benchmarkModule?.id || s.module_id) === modId
      );
      return {
        ...mod,
        name: mod.name || mod.title || matchingScore?.benchmarkModule?.name,
        score: matchingScore ? matchingScore.score : null,
      };
    });
  };

  const getAvailableVersions = () => {
    const rawVersions = row.version_scores || row.versionScores || [];
    if (rawVersions.length > 0) {
      return [...rawVersions].sort((a, b) =>
        b.version.localeCompare(a.version, undefined, { numeric: true })
      );
    }
    return [
      {
        version: row.version,
        score: row.overallScore ?? row.score,
        modules: row.benchmarkScores || [],
      },
    ];
  };

  useEffect(() => {
    const versions = getAvailableVersions();
    if (versions.length > 0) {
      const active = versions.find((v) => v.version === row.version) || versions[0];
      setSelectedVersion(active);
      setDisplayedModules(active.modules || row.benchmarkScores || []);
    }
  }, [row]);

  const handleVersionChange = (versionData) => {
    setSelectedVersion(versionData);
    if (versionData.modules && versionData.modules.length > 0) {
      setDisplayedModules(versionData.modules);
    } else {
      setDisplayedModules(row.benchmarkScores || []);
    }
  };

  const availableVersions = getAvailableVersions();

  const canUpdateSubmission =
    row.status === SubmissionStatus.OUTDATED ||
    row.status === SubmissionStatus.IN_PROGRESS;
  const isProcessing = row.status === SubmissionStatus.IN_PROGRESS;
  const isOutdated = row.status === SubmissionStatus.OUTDATED;

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
        <th scope="row" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>
          {row.name}
        </th>
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
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
          <Stack direction="row" spacing={1} justifyContent="center">
            {row.status === SubmissionStatus.COMPLETED && (
               <Switch
                 color="success"
                 variant="soft"
                 checked={row.isPublic}
                 onClick={() => onTogglePublic(row.id, !row.isPublic)}
                 title={row.isPublic ? "Make private" : "Make public"}
               />
            )}
            
            {isProcessing && (
              <>
                <Button
                  color="primary"
                  size="sm"
                  variant="soft"
                  onClick={() => onViewProgress(row)}
                >
                  View Progress
                </Button>
                <IconButton
                  size="sm"
                  variant="plain"
                  color="danger"
                  onClick={() => onCancelSubmission(row.id)}
                  title="Cancel Evaluation"
                >
                  <Update sx={{ transform: 'rotate(45deg)', color: 'red' }} /> 
                </IconButton>
              </>
            )}

            {isOutdated && (
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
          </Stack>
          </Box>
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
