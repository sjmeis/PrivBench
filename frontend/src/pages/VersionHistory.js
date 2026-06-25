import { useState, useEffect } from "react";
import { Box, Typography, Card, CircularProgress, Chip, Sheet, Divider } from "@mui/joy";
import { useTheme } from "@mui/joy";
import axios from "axios";
import Footer from "../components/shared/Footer";
import { API_BASE_URL } from "src/config";

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
      setVersions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching version history:", error);
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

  const getUpdateTypeColor = (type) => {
    const cleanType = (type || "").toLowerCase();
    if (cleanType.includes("new") || cleanType.includes("add")) return "success";
    if (cleanType.includes("modify") || cleanType.includes("update")) return "primary";
    if (cleanType.includes("delete") || cleanType.includes("remove")) return "danger";
    return "neutral";
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress size="md" />
      </Box>
    );
  }

  return (
    <Sheet sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Box sx={{ flex: 1, maxWidth: "1000px", mx: "auto", p: 4, width: "100%" }}>
        <Typography level="h2" sx={{ mb: 1 }}>
          Version History
        </Typography>
        <Typography level="body-md" sx={{ mb: 4, color: "text.secondary" }}>
          Track all global parameter overrides, module insertions, and benchmark system updates.
        </Typography>

        {versions.length === 0 ? (
          <Card variant="outlined" sx={{ p: 4, textAlign: "center" }}>
            <Typography level="body-lg" textColor="text.secondary">
              No deployment logs found on this environment instance.
            </Typography>
          </Card>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {versions.map((version) => {
              const updatesList = version.updates || version.moduleUpdates || [];
              
              return (
                <Card
                  key={version.id}
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderColor: isLightMode ? "divider" : "neutral.700",
                    transition: "all 0.2s",
                    "&:hover": {
                      borderColor: "primary.300",
                      boxShadow: "md",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Typography level="h4" color="primary">v{version.version}</Typography>
                      <Chip size="sm" variant="soft" color="neutral">
                        {updatesList.length} change{updatesList.length !== 1 ? "s" : ""}
                      </Chip>
                    </Box>
                    <Typography level="body-sm" textColor="text.secondary">
                      {version.created_at || version.createdAt ? (
                        new Date(version.created_at || version.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      ) : "Legacy Build"}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  {updatesList.length === 0 ? (
                    <Typography level="body-sm" sx={{ color: "text.tertiary", italic: true }}>
                      No separate component changes documented for this release marker.
                    </Typography>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
                      {updatesList.map((update) => {
                        const rawType = update.update_type || update.updateType || "change";
                        const rawLevel = update.change_level || update.changeLevel || "patch";
                        
                        return (
                          <Box
                            key={update.id}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              p: 1.5,
                              borderRadius: "sm",
                              bgcolor: isLightMode ? "background.level1" : "neutral.800",
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <Chip
                                size="sm"
                                color={getUpdateTypeColor(rawType)}
                                variant="solid"
                              >
                                {rawType.replace("_", " ")}
                              </Chip>
                              <Box>
                                <Typography level="body-sm" fontWeight="bold">
                                  {update.module_name || update.moduleName || "Global Core System"}
                                </Typography>
                                <Typography level="body-xs" textColor="text.secondary">
                                  {update.description || "No modification logs detailed."}
                                </Typography>
                              </Box>
                            </Box>
                            
                            <Chip
                              size="sm"
                              variant="outlined"
                              color={rawLevel === "major" ? "warning" : "neutral"}
                            >
                              {rawLevel}
                            </Chip>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Card>
              );
            })}
          </Box>
        )}
      </Box>
      <Footer />
    </Sheet>
  );
};

export default VersionHistory;