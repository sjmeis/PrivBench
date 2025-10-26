import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  Breadcrumbs,
  Input,
  Table,
  Typography,
  Sheet,
  IconButton,
  Link,
  Avatar,
  Button,
  Chip,
  Stack,
  Select,
  Option,
  FormControl,
  FormLabel,
  Slider,
  Tooltip,
} from "@mui/joy";
import { Edit, FilterAlt, Visibility } from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/Search";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  fetchRankingFilters,
  fetchRankings,
} from "../services/RankingsService";
import { useNavigate } from "react-router-dom";
import { getGravatarUrl } from "../utils/Gravatar";
import { getDateString, isNewDate } from "../utils/Date";
import { formatToTwoDecimals } from "../utils/FormatUtils";
import { useAuth } from "../contexts/AuthContext";
import { SubmissionStatus } from "../enums/SubmissionStatus";

const headCells = [
  { id: "status", numeric: false, label: "", width: "8%" },
  { id: "score", numeric: true, label: "Privacy Score", width: "12%" },
  { id: "name", numeric: false, label: "Privatization Method", width: "20%" },
  {
    id: "submissionDate",
    numeric: false,
    label: "Submission Date",
    width: "15%",
  },
  { id: "username", numeric: false, label: "Submitted By", width: "18%" },
  { id: "badges", numeric: false, label: "Research Institute", width: "15%" },
  { id: "button", numeric: false, label: "", width: "12%" },
];

const getDynamicRowPerPageCount = () => {
  const viewportHeight = window.innerHeight;
  const availableHeight = viewportHeight - 350;
  const rowHeight = 45;
  return Math.floor(availableHeight / rowHeight);
};

const Rankings = () => {
  const [rankings, setRankings] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("score");
  const [rowsPerPage, setRowsPerPage] = useState(getDynamicRowPerPageCount);
  const [searchValue, setSearchValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [availableVersions, setAvailableVersions] = useState([]);
  const [availableModules, setAvailableModules] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [filteredModules, setFilteredModules] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [moduleWeights, setModuleWeights] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const timerRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const validWeights = useMemo(() => {
    const total = Object.values(moduleWeights).reduce(
      (sum, weight) => sum + weight,
      0
    );
    const isValid = Math.abs(total - 1.0) < 0.01;

    // Return a stringified version to create stable references
    if (isValid) {
      return JSON.stringify(moduleWeights);
    }
    return "invalid"; // Always return the same string when invalid
  }, [moduleWeights]);

  // Load filter options on component mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const filterData = await fetchRankingFilters();
        setAvailableVersions(filterData.versions);
        setAvailableModules(filterData.modules);
        setFilteredModules(filterData.modules);

        // Set the latest version as default if no version is selected
        if (!selectedVersion && filterData.versions.length > 0) {
          setSelectedVersion(filterData.versions[0]);
        }
      } catch (error) {
        console.error("Failed to load filter options:", error);
      }
    };

    loadFilters();
  }, []);

  // Update selected modules when version changes
  useEffect(() => {
    const loadModulesForVersion = async () => {
      try {
        const filterData = await fetchRankingFilters(selectedVersion);
        setFilteredModules(filterData.modules);

        // Clean up selected modules that don't exist in the new version
        if (selectedModules.length > 0) {
          const availableModuleIds = filterData.modules.map((m) => m.id);
          const validSelectedModules = selectedModules.filter((module) =>
            availableModuleIds.includes(module.id)
          );
          if (validSelectedModules.length !== selectedModules.length) {
            setSelectedModules(validSelectedModules);
          }
        }
      } catch (error) {
        console.error("Failed to load modules for version:", error);
        setFilteredModules(availableModules);
      }
    };

    loadModulesForVersion();
  }, [selectedVersion]);

  // Effect to initialize weights when modules change
  useEffect(() => {
    if (selectedModules.length >= 2) {
      const equalWeight = 1.0 / selectedModules.length; // Equal distribution that sums to 1.0
      const defaultWeights = {};
      selectedModules.forEach((module) => {
        if (!moduleWeights[module.id]) {
          defaultWeights[module.id] = equalWeight;
        }
      });

      if (Object.keys(defaultWeights).length > 0) {
        setModuleWeights((prev) => ({ ...prev, ...defaultWeights }));
      }
    } else if (selectedModules.length < 2) {
      // Clear weights if less than 2 modules
      setModuleWeights({});
    }
  }, [selectedModules]);

  useEffect(() => {
    const loadRankings = async () => {
      try {
        const moduleIds = selectedModules.map((module) => module.id);

        const weightsToSend =
          validWeights === "invalid" ? {} : JSON.parse(validWeights);

        const data = await fetchRankings(
          searchTerm,
          currentPage,
          rowsPerPage,
          order,
          orderBy,
          selectedVersion || null,
          moduleIds,
          weightsToSend
        );
        setRankings(data.results);
        setTotalPages(data.totalPages);
        setCurrentPage(data.currentPage);
      } catch (error) {
        console.error("Failed to load rankings:", error);
      }
    };

    loadRankings();
  }, [
    rowsPerPage,
    currentPage,
    searchTerm,
    order,
    orderBy,
    selectedVersion,
    selectedModules,
    validWeights,
  ]);

  useLayoutEffect(() => {
    setRowsPerPage(getDynamicRowPerPageCount);
    window.addEventListener("resize", getDynamicRowPerPageCount);

    return () => {
      window.removeEventListener("resize", getDynamicRowPerPageCount);
    };
  }, []);

  const handleWeightChange = (moduleId, newWeight) => {
    setModuleWeights((prev) => ({
      ...prev,
      [moduleId]: newWeight,
    }));
    setCurrentPage(1);
  };

  // Allow manual number entry (0–100%) and convert to 0–1 weight
  const handleWeightNumberInputChange = (moduleId, rawValue) => {
    const cleaned = String(rawValue)
      .replace(",", ".")
      .replace(/[^\d.]/g, "");
    let num = parseFloat(cleaned);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 100) num = 100;
    handleWeightChange(moduleId, Number((num / 100).toFixed(2)));
  };

  const isWeightsValid = () => {
    const total = getTotalWeight();
    return Math.abs(total - 1.0) < 0.01; // Allow small rounding differences
  };

  const resetWeights = () => {
    if (selectedModules.length < 2) return;

    const equalWeight = 1.0 / selectedModules.length; // Equal distribution
    const resetWeights = {};
    selectedModules.forEach((module) => {
      resetWeights[module.id] = equalWeight;
    });
    setModuleWeights(resetWeights);
  };

  const getTotalWeight = () => {
    return Object.values(moduleWeights).reduce(
      (sum, weight) => sum + weight,
      0
    );
  };

  const handleSearchInputChange = (event) => {
    const newInputValue = event.target.value;
    setSearchValue(newInputValue);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSearchTerm(newInputValue);
      setCurrentPage(1); // Reset to first page when searching
    }, 500);
  };

  const handleVersionChange = (event, newValue) => {
    setSelectedVersion(newValue || "");
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleModuleChange = (event, newValue) => {
    setSelectedModules(newValue || []);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedVersion("");
    setSelectedModules([]);
    setModuleWeights({});
    setCurrentPage(1);
  };

  // Individual filter removal handlers
  const removeVersionFilter = (event) => {
    event.stopPropagation();
    setSelectedVersion("");
    setCurrentPage(1);
  };

  const removeModuleFilter = (event, moduleToRemove) => {
    event.stopPropagation();
    setSelectedModules((prev) =>
      prev.filter((module) => module.id !== moduleToRemove.id)
    );
    setCurrentPage(1);
  };

  const handleRequestSort = (event, property) => {
    console.log(event, property);
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const onViewClick = (row) => {
    navigate("/rankings/detail", { state: row });
  };

  const onNextPageClick = () => {
    setCurrentPage((prevState) => prevState + 1);
  };

  const onPreviousPageClick = () => {
    setCurrentPage((prevState) => prevState - 1);
  };

  const isCurrentUser = (userId) => {
    if (!user) {
      return false;
    }
    return userId === user.id;
  };

  const isSubmissionOutdated = (status) => {
    return status === SubmissionStatus.OUTDATED;
  };

  const hasActiveFilters = selectedVersion || selectedModules.length > 0;
  const hasCustomWeights =
    selectedModules.length >= 2 &&
    selectedModules.some((module) => {
      const expectedWeight = 1.0 / selectedModules.length;
      const actualWeight = moduleWeights[module.id] || expectedWeight;
      return Math.abs(actualWeight - expectedWeight) > 0.01; // Allow small rounding differences
    });

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Breadcrumbs
          size="sm"
          aria-label="breadcrumbs"
          separator={<ChevronRightRoundedIcon fontSize="sm" />}
          sx={{ pl: 0 }}
        >
          <Link underline="none" color="neutral" href="/" aria-label="Home">
            <HomeRoundedIcon />
          </Link>
          <Link
            underline="hover"
            color="neutral"
            href="/rankings"
            sx={{ fontSize: 12, fontWeight: 500 }}
          >
            Ranking
          </Link>
          <Typography color="primary" sx={{ fontWeight: 500, fontSize: 12 }}>
            Dashboard
          </Typography>
        </Breadcrumbs>
      </Box>

      {/* Search and Filter Controls */}
      <Box
        className="SearchAndFilters-tabletUp"
        sx={{
          margin: "0 auto",
          borderRadius: "sm",
          py: 2,
          display: { xs: "none", sm: "flex" },
          flexWrap: "wrap",
          gap: 1.5,
          maxWidth: "1600px",
          alignItems: "end",
        }}
      >
        <FormControl sx={{ flex: 1, minWidth: "200px" }} size="sm">
          <FormLabel>Search</FormLabel>
          <Input
            variant="outlined"
            placeholder="Search for username or privatization method"
            name="searchTerm"
            value={searchValue}
            onChange={handleSearchInputChange}
            size="sm"
            startDecorator={<SearchIcon />}
          />
        </FormControl>

        {/* Show selected version when filters are collapsed */}
        {!showFilters && selectedVersion && (
          <Chip
            variant="soft"
            color="primary"
            size="sm"
            sx={{
              alignSelf: "end",
              height: "32px",
              display: "flex",
              alignItems: "center",
            }}
          >
            Version: {selectedVersion}
          </Chip>
        )}
        <Button
          variant={showFilters ? "solid" : "outlined"}
          color="neutral"
          size="sm"
          startDecorator={<FilterAlt />}
          onClick={() => setShowFilters(!showFilters)}
          sx={{ minWidth: "120px", height: "32px" }}
        >
          Filters{" "}
          {hasActiveFilters &&
            `(${(selectedVersion ? 1 : 0) + selectedModules.length})`}
        </Button>

        {/* Advanced Filters Toggle*/}
        <Tooltip
          title={
            selectedModules.length < 2
              ? "Select at least 2 modules to adjust weights"
              : "Adjust individual module weights for scoring"
          }
          placement="top"
        >
          <span>
            <Button
              variant="outlined"
              color="primary"
              size="sm"
              startDecorator={<SettingsIcon />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              disabled={selectedModules.length < 2}
              sx={{
                minWidth: "140px",
                height: "32px",
                opacity: selectedModules.length < 2 ? 0.5 : 1,
              }}
            >
              Advanced {hasCustomWeights && "★"}
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* Collapsible Filter Section */}
      {showFilters && (
        <Box
          sx={{
            margin: "0 auto",
            maxWidth: "1600px",
            mb: 2,
            p: 2,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "sm",
            backgroundColor: "background.surface",
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            sx={{ flexWrap: "wrap", gap: 1.5 }}
          >
            <FormControl sx={{ minWidth: "150px" }} size="sm">
              <FormLabel>Version</FormLabel>
              <Select
                placeholder={
                  availableVersions.length > 0
                    ? availableVersions[0]
                    : "Select version"
                }
                value={selectedVersion}
                onChange={handleVersionChange}
              >
                {availableVersions.map((version) => (
                  <Option key={version} value={version}>
                    {version}
                  </Option>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: "200px" }} size="sm">
              <FormLabel>Modules</FormLabel>
              <Select
                multiple
                placeholder="All modules"
                value={selectedModules}
                onChange={handleModuleChange}
                renderValue={(selected) =>
                  selected.length === 0
                    ? "All modules"
                    : `${selected.length} module${
                        selected.length > 1 ? "s" : ""
                      } selected`
                }
              >
                {filteredModules.map((module) => (
                  <Option key={module.id} value={module}>
                    {module.name} (v{module.version})
                  </Option>
                ))}
              </Select>
            </FormControl>

            {hasActiveFilters && (
              <Button
                variant="outlined"
                color="neutral"
                size="sm"
                onClick={clearFilters}
                sx={{ alignSelf: "end" }}
              >
                Clear Filters
              </Button>
            )}
          </Stack>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <Box sx={{ mt: 2 }}>
              <Typography level="body-sm" sx={{ mb: 1 }}>
                Active filters:
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                sx={{ flexWrap: "wrap", gap: 1 }}
              >
                {selectedVersion && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      p: 1,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: "sm",
                      backgroundColor: "background.surface",
                    }}
                  >
                    <Chip variant="soft" color="primary" size="sm">
                      Version: {selectedVersion}
                    </Chip>
                    <IconButton
                      size="sm"
                      variant="plain"
                      onClick={removeVersionFilter}
                      sx={{
                        minHeight: "20px",
                        minWidth: "20px",
                        borderRadius: "50%",
                        fontSize: "12px",
                        fontWeight: "bold",
                        backgroundColor: "background.surface",
                        border: "1px solid",
                        borderColor: "divider",
                        "&:hover": {
                          backgroundColor: "background.level1",
                          borderColor: "neutral.outlinedHoverBorder",
                        },
                        "&:active": {
                          backgroundColor: "background.level2",
                        },
                      }}
                    >
                      ×
                    </IconButton>
                  </Box>
                )}
                {selectedModules.map((module) => (
                  <Box
                    key={module.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      p: 1,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: "sm",
                      backgroundColor: "background.surface",
                    }}
                  >
                    <Chip variant="soft" color="primary" size="sm">
                      {module.name}
                    </Chip>
                    <IconButton
                      size="sm"
                      variant="plain"
                      onClick={(event) => removeModuleFilter(event, module)}
                      sx={{
                        minHeight: "20px",
                        minWidth: "20px",
                        borderRadius: "50%",
                        fontSize: "12px",
                        fontWeight: "bold",
                        backgroundColor: "background.surface",
                        border: "1px solid",
                        borderColor: "divider",
                        "&:hover": {
                          backgroundColor: "background.level1",
                          borderColor: "neutral.outlinedHoverBorder",
                        },
                        "&:active": {
                          backgroundColor: "background.level2",
                        },
                      }}
                    >
                      ×
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      )}

      {/* Advanced Filters Section */}
      {showAdvancedFilters && selectedModules.length >= 2 && (
        <Box
          sx={{
            margin: "0 auto",
            maxWidth: "1600px",
            mb: 2,
            p: 2,
            border: "1px solid",
            borderColor: "primary.outlinedBorder",
            borderRadius: "sm",
            backgroundColor: "primary.softBg",
          }}
        >
          <Box
            sx={{
              mb: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              level="title-sm"
              sx={{ fontWeight: 600, color: "primary.softColor" }}
            >
              Module Weights
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              size="sm"
              onClick={() => {
                const totalWeight = getTotalWeight();
                if (totalWeight > 0) {
                  const normalizedWeights = {};
                  Object.keys(moduleWeights).forEach((moduleId) => {
                    normalizedWeights[moduleId] =
                      moduleWeights[moduleId] / totalWeight;
                  });
                  setModuleWeights(normalizedWeights);
                }
              }}
              disabled={isWeightsValid()}
              sx={{
                color: "primary.softColor",
                fontWeight: 700,
                textTransform: "none",
                // ensure readable text when disabled in light/dark
                "&.Mui-disabled": {
                  opacity: 1,
                  color: "text.secondary",
                },
              }}
            >
              Normalize to 100%
            </Button>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                color="neutral"
                size="sm"
                onClick={resetWeights}
              >
                Reset
              </Button>
            </Stack>
          </Box>

          <Typography level="body-sm" sx={{ mb: 2, color: "text.secondary" }}>
            Adjust the importance of each module in the final score calculation.
            All weights must sum to exactly 100%. Higher weights give more
            influence to that module's score.
          </Typography>

          <Stack spacing={3}>
            {selectedModules.map((module) => {
              const weight = moduleWeights[module.id] || 1.0;
              const percentage = Math.round(weight * 100);

              return (
                <Box key={module.id} sx={{ px: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <Typography level="body-sm" sx={{ fontWeight: 500 }}>
                      {module.name}
                    </Typography>
                    {/* Numeric input for manual percentage entry */}
                    <Input
                      size="sm"
                      type="number"
                      value={percentage}
                      onChange={(e) =>
                        handleWeightNumberInputChange(module.id, e.target.value)
                      }
                      slotProps={{ input: { min: 0, max: 100, step: 1 } }}
                      endDecorator="%"
                      sx={{ width: 90 }}
                    />
                  </Box>
                  <Slider
                    value={weight}
                    onChange={(event, newValue) =>
                      handleWeightChange(module.id, newValue)
                    }
                    min={0}
                    max={1.0}
                    step={0.01}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                    sx={{ color: "primary.solidBg" }}
                  />
                </Box>
              );
            })}
          </Stack>

          <Box
            sx={{
              mt: 3,
              p: 2,
              backgroundColor: "background.level1",
              borderRadius: "sm",
            }}
          >
            <Typography level="body-sm" sx={{ fontWeight: 500, mb: 1 }}>
              Weight Summary:
            </Typography>
            <Stack
              direction="row"
              spacing={2}
              sx={{ flexWrap: "wrap", gap: 1 }}
            >
              {selectedModules.map((module) => {
                const weight =
                  moduleWeights[module.id] || 1.0 / selectedModules.length;
                const percentage = Math.round(weight * 100);
                return (
                  <Chip key={module.id} variant="soft" size="sm">
                    {module.name}: {percentage}%
                  </Chip>
                );
              })}
              <Typography
                level="body-sm"
                sx={{
                  fontWeight: 500,
                  ml: 1,
                  color: isWeightsValid() ? "success.600" : "danger.600",
                }}
              >
                Total: {Math.round(getTotalWeight() * 100)}%
              </Typography>
            </Stack>

            {/* Error message when weights don't sum to 100% */}
            {!isWeightsValid() && (
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  backgroundColor: "danger.softBg",
                  border: "1px solid",
                  borderColor: "danger.outlinedBorder",
                  borderRadius: "sm",
                }}
              >
                <Typography
                  level="body-sm"
                  sx={{ color: "danger.600", fontWeight: 500 }}
                >
                  ⚠️ Warning: Weights must sum to 100%. Current total:{" "}
                  {Math.round(getTotalWeight() * 100)}%
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Rankings Table */}
      <Sheet
        variant="outlined"
        sx={{
          width: "100%",
          margin: "0 auto",
          maxWidth: "1600px",
          boxShadow: "sm",
          borderRadius: "sm",
        }}
      >
        <Table
          aria-labelledby="tableTitle"
          sx={{ minWidth: 750, "--TableCell-paddingX": "10px" }}
        >
          <thead>
            <tr>
              {headCells.map((headCell) => (
                <th style={{ width: headCell.width }} key={headCell.id}>
                  <Link
                    underline="none"
                    onClick={(event) => handleRequestSort(event, headCell.id)}
                    sx={{ fontWeight: "bold", cursor: "pointer" }}
                  >
                    <Typography
                      sx={{ fontWeight: "bold" }}
                      color="primary"
                      level="body-md"
                      noWrap
                    >
                      {headCell.label}
                    </Typography>
                    {orderBy === headCell.id && (
                      <ArrowDownwardIcon
                        sx={{
                          ml: 1,
                          transform:
                            order === "desc"
                              ? "rotate(0deg)"
                              : "rotate(180deg)",
                        }}
                      />
                    )}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rankings.map((row) => (
              <tr
                style={{
                  backgroundColor: isCurrentUser(row.user.id)
                    ? "var(--joy-palette-background-level1)"
                    : "inherit",
                }}
                key={row.id}
              >
                <td>
                  {isNewDate(row.submissionDate) &&
                    !isSubmissionOutdated(row.status) && (
                      <Chip color="success" variant="soft">
                        New
                      </Chip>
                    )}
                  {isSubmissionOutdated(row.status) && (
                    <Chip color="danger" variant="soft">
                      Outdated
                    </Chip>
                  )}
                </td>
                <td>{formatToTwoDecimals(row.overallScore)}</td>
                <td>{row.name}</td>
                <td>{getDateString(row.submissionDate)}</td>
                <td>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      size="sm"
                      src={getGravatarUrl(row.user.mailAddress)}
                    />
                    <Typography noWrap>{row.user.username}</Typography>
                  </Box>
                </td>
                <td>{row.user.researchInstitute}</td>
                <td>
                  <Stack justifyContent="end" direction="row" spacing={1}>
                    {isCurrentUser(row.user.id) && (
                      <Button
                        size="sm"
                        variant="outlined"
                        color="neutral"
                        startDecorator={<Edit />}
                        onClick={() =>
                          navigate("/profile", { state: "submissions" })
                        }
                      >
                        Edit{" "}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="soft"
                      color="primary"
                      startDecorator={<Visibility />}
                      onClick={() => onViewClick(row)}
                    >
                      View
                    </Button>
                  </Stack>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography>{`Rows per page: ${
                    rankings.length > rowsPerPage
                      ? rowsPerPage
                      : rankings.length
                  }`}</Typography>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <IconButton
                      onClick={onPreviousPageClick}
                      disabled={currentPage === 1}
                    >
                      <KeyboardArrowLeftIcon />
                    </IconButton>
                    <Typography>{`Page ${currentPage} of ${totalPages}`}</Typography>
                    <IconButton
                      onClick={onNextPageClick}
                      disabled={currentPage === totalPages}
                    >
                      <KeyboardArrowRightIcon />
                    </IconButton>
                  </Box>
                </Box>
              </td>
            </tr>
          </tfoot>
        </Table>
      </Sheet>
    </Box>
  );
};

export default Rankings;
