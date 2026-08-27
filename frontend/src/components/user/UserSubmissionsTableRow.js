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

import { useEffect, useState, useMemo, Fragment } from "react";
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
  Stack,
  Switch,
  Sheet,
  Table,
} from "@mui/joy";
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
  onCancelSubmission,
}) => {
  const [open, setOpen] = useState(false);

  // Parse all available version snapshots
  const availableVersions = useMemo(() => {
    const rawVersions = row.version_scores || row.versionScores || [];
    if (rawVersions.length > 0) {
      return [...rawVersions].sort((a, b) =>
        b.version.localeCompare(a.version, undefined, { numeric: true })
      );
    }
    return [
      {
        version: row.version || "1.0.0",
        score: row.overallScore ?? row.score,
        modules: row.benchmarkScores || [],
      },
    ];
  }, [row]);

  // Track the selected version string (e.g. "1.1.0" or "1.0.0")
  const [selectedVersionStr, setSelectedVersionStr] = useState(
    row.version || (availableVersions[0]?.version ?? "1.0.0")
  );

  useEffect(() => {
    if (row.version) {
      setSelectedVersionStr(row.version);
    } else if (availableVersions.length > 0) {
      setSelectedVersionStr(availableVersions[0].version);
    }
  }, [row.version, availableVersions]);

  // Active snapshot object corresponding to the selected version
  const currentSnapshot = useMemo(() => {
    return (
      availableVersions.find((v) => v.version === selectedVersionStr) ||
      availableVersions[0]
    );
  }, [availableVersions, selectedVersionStr]);

  // Extract and sort modules for this version snapshot
  const displayedModules = useMemo(() => {
    if (!currentSnapshot) return [];

    let moduleList = [];
    if (currentSnapshot.modules && currentSnapshot.modules.length > 0) {
      const allRawScores = row.benchmarkScores || [];
      moduleList = currentSnapshot.modules.map((mod) => {
        const modId = mod.id || mod.module_id || mod.benchmarkModule?.id;
        const rawEntry = allRawScores.find(
          (s) => (s.benchmarkModule?.id || s.module_id) === modId
        );
        return {
          id: modId,
          name:
            mod.name ||
            mod.title ||
            mod.benchmarkModule?.name ||
            rawEntry?.benchmarkModule?.name ||
            "Module",
          score: mod.score ?? rawEntry?.score ?? null,
        };
      });
    } else {
      moduleList = (row.benchmarkScores || []).map((s) => ({
        id: s.benchmarkModule?.id || s.module_id,
        name: s.benchmarkModule?.name || "Module",
        score: s.score,
      }));
    }

    // Sort alphabetically by module name for consistent display
    return moduleList.sort((a, b) => a.name.localeCompare(b.name));
  }, [currentSnapshot, row.benchmarkScores]);

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
          {currentSnapshot?.score !== null && currentSnapshot?.score !== undefined
            ? Number(currentSnapshot.score).toFixed(2)
            : "N/A"}
        </td>
        <td>
          {availableVersions.length > 1 ? (
            <Dropdown>
              <MenuButton size="sm" variant="outlined">
                {selectedVersionStr}
              </MenuButton>
              <Menu>
                {availableVersions.map((v) => (
                  <MenuItem
                    key={v.version}
                    onClick={() => setSelectedVersionStr(v.version)}
                    selected={selectedVersionStr === v.version}
                  >
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      <Box sx={{ fontWeight: "bold" }}>{v.version}</Box>
                      <Box sx={{ fontSize: "0.8em", color: "text.secondary" }}>
                        Score:{" "}
                        {v.score !== null && v.score !== undefined
                          ? Number(v.score).toFixed(2)
                          : "N/A"}
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Menu>
            </Dropdown>
          ) : (
            selectedVersionStr
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
                    <Update sx={{ transform: "rotate(45deg)", color: "red" }} />
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
        <td style={{ height: 0, padding: 0 }} colSpan={7}>
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
                  Version: {selectedVersionStr}
                </Chip>
                <Chip variant="soft" color="success" size="sm" sx={{ ml: 1 }}>
                  Overall Score:{" "}
                  {currentSnapshot?.score !== null && currentSnapshot?.score !== undefined
                    ? Number(currentSnapshot.score).toFixed(2)
                    : "N/A"}
                </Chip>
              </Box>
              <Table
                borderAxis="bothBetween"
                size="sm"
                aria-label="benchmark scores"
                sx={{ "--TableCell-paddingX": "0.5rem" }}
              >
                <thead>
                  <tr>
                    <th>Module Name</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedModules.length > 0 ? (
                    displayedModules.map((mod, index) => (
                      <tr key={index}>
                        <th scope="row">{mod.name}</th>
                        <td>
                          {mod.score !== null && mod.score !== undefined
                            ? Number(mod.score).toFixed(2)
                            : "N/A"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} align="center">
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