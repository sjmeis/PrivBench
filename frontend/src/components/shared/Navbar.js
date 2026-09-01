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

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Dropdown,
  Grid,
  ListDivider,
  Menu,
  MenuButton,
  MenuItem,
  Stack,
  Tooltip,
  useColorScheme,
  IconButton,
  Link as JoyLink,
} from "@mui/joy";
import { Box, Button, Typography } from "@mui/joy";
import {
  DarkMode,
  Info,
  Timeline,
  UploadFile,
  Login,
  Close
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { getGravatarUrl } from "../../utils/Gravatar";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import GroupIcon from '@mui/icons-material/Group';
import HistoryIcon from '@mui/icons-material/History';
import PublishIcon from '@mui/icons-material/Publish';
import TerminalIcon from '@mui/icons-material/Terminal';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import { useSnackbar } from "../../contexts/SnackbarProvider";
import { ModuleService } from "../../services/ModuleService";

const BANNER_STORAGE_KEY = "privbench_hide_beta_banner";

const Navbar = () => {
  const navigate = useNavigate();
  const { mode, setMode } = useColorScheme();
  const { user, logout } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [submissionsBlocked, setSubmissionsBlocked] = useState(false);

  const [showBanner, setShowBanner] = useState(() => {
    return localStorage.getItem(BANNER_STORAGE_KEY) !== "true";
  });

  const handleCloseBanner = () => {
    setShowBanner(false);
    localStorage.setItem(BANNER_STORAGE_KEY, "true");
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        if (user && !user.admin) {
          const flag = await ModuleService.hasPendingModuleUpdates();
          if (!ignore) setSubmissionsBlocked(flag);
        } else {
          if (!ignore) setSubmissionsBlocked(false);
        }
      } catch {
        if (!ignore) setSubmissionsBlocked(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [user]);

  const navButtonStyle = {
    textTransform: "none",
    fontWeight: "medium",
    fontSize: "18px",
    paddingTop: 0,
    paddingBottom: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  const getProfileImage = () => {
        if (!user) return ""; 
        return user.profilePicturePath || getGravatarUrl(user.mailAddress);
    };

  const isLightMode = mode === "light";

  const handleChange = () => {
    setMode(mode === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
    showSnackbar("Successfully logged out!", "success");
  };

 const handleSubmissionClick = async () => {
    if (!user) {
        navigate("/login");
    } else {
        navigate("/upload", { state: { reset: true } });
    }
};

  if (!mode) {
    return null;
  }

  return (
    <Box sx={{ width: "100%" }}>
    {/* Beta Banner */}
      {showBanner && (
        <Box
          sx={{
            width: "100%",
            py: 1,
            px: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: isLightMode ? "primary.softBg" : "primary.500",
            color: isLightMode ? "primary.softColor" : "primary.100",
            borderBottom: "1px solid",
            borderColor: isLightMode ? "primary.softBorder" : "primary.400",
          }}
        >
          {/* Invisible spacer to keep text centered */}
          <Box sx={{ width: 32, display: { xs: "none", sm: "block" } }} />

          <Typography
            level="body-sm"
            sx={{
              fontWeight: 500,
              textAlign: "center",
              flex: 1,
              color: "inherit",
            }}
          >
            🚀 <strong>PrivBench is live in Beta!</strong> Check out our paper{" "}
            <JoyLink
              href="http://arxiv.org/abs/2608.29624"
              target="_blank"
              rel="noopener noreferrer"
              underline="always"
              sx={{
                fontWeight: 600,
                color: isLightMode ? "primary.700" : "primary.200",
                "&:hover": {
                  color: isLightMode ? "primary.900" : "primary.50",
                },
              }}
            >
              here
            </JoyLink>
            .
          </Typography>

          <IconButton
            size="sm"
            variant="plain"
            color="neutral"
            onClick={handleCloseBanner}
            aria-label="Close beta banner"
            sx={{
              color: "inherit",
              minHeight: 24,
              minWidth: 24,
              borderRadius: "50%",
              "&:hover": {
                bgcolor: isLightMode ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
      )}

    <Box
      sx={{
        width: "100%",
        padding: 1.5,
        borderBottom: isLightMode
          ? "1.5px solid #f0f4f8"
          : "1.5px solid #161a1b",
      }}
    >
      <Grid container alignItems="center">
        <Grid item xs={1} container justifyContent="flex-start">
          <Typography
            onClick={() => navigate("/")}
            level="h2"
            sx={{ cursor: "pointer" }}
          >
            PrivBench
          </Typography>
        </Grid>
        <Grid item xs={10} container justifyContent="center">
          <Stack direction="row" spacing={2}>
            <Button
              onClick={() => navigate("/rankings")}
              variant="text"
              startDecorator={<Timeline />}
              sx={navButtonStyle}
            >
              Rankings
            </Button>
            {user && user.admin ? (
              <Button
                onClick={() => navigate("/admin")}
                variant="text"
                startDecorator={<ViewModuleIcon />}
                sx={navButtonStyle}
              >
                Admin Panel
              </Button>
            ) : (
              <Tooltip
                title={
                  !!user && submissionsBlocked
                    ? "Submissions are disabled until admin publishes pending module updates."
                    : ""
                }
                variant="outlined"
                arrow
                placement="bottom"
                disableHoverListener={!user || !submissionsBlocked}
              >
                <span>
                  <Button
                    onClick={handleSubmissionClick}
                    variant="text"
                    startDecorator={<UploadFile />}
                    sx={navButtonStyle}
                    disabled={!!user && submissionsBlocked}
                  >
                    Submission
                  </Button>
                </span>
              </Tooltip>
            )}
            <Button
              onClick={() => navigate("/information")}
              variant="text"
              startDecorator={<Info />}
              sx={navButtonStyle}
            >
              How does it work?
            </Button>
          </Stack>
        </Grid>

        <Grid
          item
          xs={1}
          container
          justifyContent="flex-end"
          alignItems="center"
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              onClick={handleChange}
              variant="outlined"
              color="neutral"
              size="sm"
              sx={{
                height: 36,
                width: 36,
                minWidth: "auto",
                padding: 0,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <DarkMode />
            </Button>

            {user ? (
              <Dropdown>
                <MenuButton
                  endDecorator={
                    <Tooltip title={user?.username || "Account"} variant="soft">
                    <Avatar
                      sx={{ maxWidth: 28, maxHeight: 28 }}
                      size="sm"
                      src={getProfileImage()}
                    />
                    </Tooltip>
                  }
                  variant="soft"
                  color="primary"
                >
                  {user.username}
                </MenuButton>
                <Menu
                  placement="bottom-end"
                  size="sm"
                  sx={{
                    zIndex: "99999",
                    p: 1,
                    gap: 1,
                    "--ListItem-radius": "var(--joy-radius-sm)",
                  }}
                >
                  <MenuItem
                    onClick={() => navigate("/profile", { state: "account" })}
                  >
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Tooltip title={user?.username || "Account"} variant="soft">
                          <Avatar
                            src={getProfileImage()}
                            sx={{ borderRadius: "50%" }}
                          />
                      </Tooltip>
                      <Box sx={{ ml: 1.5 }}>
                        <Typography level="title-sm" textColor="text.primary">
                          {user.username}
                        </Typography>
                        <Typography level="body-xs" textColor="text.tertiary">
                          {user.mailAddress}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                  <ListDivider />
                  {user && user.admin ? (
                    <>
                      <MenuItem
                        onClick={() => navigate("/admin", { state: "modules" })}
                      >
                        <ViewModuleIcon />
                        Modules
                      </MenuItem>
                      <MenuItem
                        onClick={() =>
                          navigate("/admin", { state: "datasets" })
                        }
                      >
                        <InsertDriveFileIcon />
                        Datasets
                      </MenuItem>
                      <MenuItem
                        onClick={() =>
                          navigate("/admin", { state: "users" })
                        }
                      >
                        <GroupIcon />
                        Users
                      </MenuItem>
                      <MenuItem
                        onClick={() =>
                          navigate("/admin", { state: "submissions" })
                        }
                      >
                        <PublishIcon />
                        Submissions
                      </MenuItem>
                      <MenuItem
                        onClick={() =>
                          navigate("/admin", { state: "versions" })
                        }
                      >
                        <HistoryIcon />
                        Versions
                      </MenuItem>
                      <MenuItem
                        onClick={() =>
                          navigate("/admin", { state: "orchestration" })
                        }
                      >
                        <TerminalIcon />
                        Module Orchestration
                      </MenuItem>
                      <MenuItem
                        onClick={() =>
                          navigate("/admin", { state: "demo" })
                        }
                      >
                        <SlideshowIcon />
                        Demo Data
                      </MenuItem>
                      <MenuItem
                        onClick={() =>
                          navigate("/admin", { state: "health" })
                        }
                      >
                        <MonitorHeartIcon />
                        System Health
                      </MenuItem>
                    </>
                  ) : (
                    <>
                      <MenuItem
                        onClick={() =>
                          navigate("/profile", { state: "submissions" })
                        }
                      >
                        <EmojiEventsIcon />
                        My Submissions
                      </MenuItem>
                      <MenuItem
                        onClick={() =>
                          navigate("/profile", { state: "account" })
                        }
                      >
                        <SettingsRoundedIcon />
                        Settings
                      </MenuItem>
                    </>
                  )}
                  <ListDivider />
                  <MenuItem onClick={handleLogout}>
                    <LogoutRoundedIcon />
                    Log out
                  </MenuItem>
                </Menu>
              </Dropdown>
            ) : (
              <Button
                variant="soft"
                color="primary"
                startDecorator={<Login />}
                onClick={() => navigate("/login")}
              >
                Login
              </Button>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  </Box>
  );
};

export default Navbar;
