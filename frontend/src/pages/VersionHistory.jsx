import { useState, useEffect } from "react";
import { Box, Typography, Card, CircularProgress, Chip, Sheet } from "@mui/joy";
import { useTheme } from "@mui/joy";
import axios from "axios";
import Footer from "../components/shared/Footer";
import { API_BASE_URL } from "src/config";
import Footer from "../components/shared/Footer";

const VersionHistory = () => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isLightMode = theme.palette.mode === "light";

  useEffect(() => {
    fetchVersionHistory();
  }, []);

  const fetchVersionHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/versions/history`, {
        withCredentials: true,
      });
      setVersions(response.data);
    } catch (error) {
      console.error("Error fetching version history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUpdateTypeColor = (type) => {
    switch (type) {
      case "new_module":
        return "success";
      case "modified":
        return "primary";
      case "deleted":
        return "danger";
      default:
        return "neutral";
    }
  };

  const getChangeLevelColor = (level) => {
    return level === "major" ? "warning" : "neutral";
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Sheet
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{ flex: 1, maxWidth: "1200px", mx: "auto", p: 4, width: "100%" }}
      >
        <Typography level="h2" sx={{ mb: 1 }}>
          Version History
        </Typography>
        <Typography level="body-md" sx={{ mb: 4, color: "text.secondary" }}>
          Track all updates and changes made to PrivBench modules
        </Typography>

        {versions.length === 0 ? (
          <Card variant="outlined" sx={{ p: 4, textAlign: "center" }}>
            <Typography level="body-lg" textColor="text.secondary">
              No version history available
            </Typography>
          </Card>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {versions.map((version) => (
              <Card
                key={version.id}
                variant="outlined"
                sx={{
                  p: 3,
                  borderColor: isLightMode ? "divider" : "neutral.700",
                  "&:hover": {
                    borderColor: "primary.500",
                    boxShadow: "sm",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography level="h4">v{version.version}</Typography>
                    <Chip size="sm" color="primary">
                      {version.updates?.length || 0} update
                      {version.updates?.length !== 1 ? "s" : ""}
                    </Chip>
                  </Box>
                  <Typography level="body-sm" textColor="text.secondary">
                    {new Date(version.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Typography>
                </Box>

                {version.updates && version.updates.length > 0 && (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                  >
                    {version.updates.map((update) => (
                      <Box
                        key={update.id}
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                          p: 2,
                          borderRadius: "sm",
                          bgcolor: isLightMode
                            ? "background.level1"
                            : "neutral.800",
                        }}
                      >
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Chip
                            size="sm"
                            color={getUpdateTypeColor(update.update_type)}
                          >
                            {update.update_type.replace("_", " ")}
                          </Chip>
                          <Chip
                            size="sm"
                            color={getChangeLevelColor(update.change_level)}
                            variant="soft"
                          >
                            {update.change_level}
                          </Chip>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography level="body-sm" fontWeight="md">
                            {update.module_name}
                          </Typography>
                          {update.description && (
                            <Typography
                              level="body-sm"
                              textColor="text.secondary"
                            >
                              {update.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Card>
            ))}
          </Box>
        )}
      </Box>
      <Footer />
      <Footer />
    </Sheet>
  );
};

export default VersionHistory;
