import Box from "@mui/joy/Box";
import * as React from "react";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { SideNavAdmin } from "../components/admin/SideNavAdmin";
import DatasetManagement from "../components/admin/DatasetManagement";
import ModuleManagement from "../components/admin/ModuleManagement";
import UserManagement from "../components/admin/UserManagement";
import SubmissionManagement from "../components/admin/SubmissionManagement";
import VersionManagement from "../components/admin/VersionManagement";
import ModuleOrchestration from "../components/admin/ModuleOrchestration";
import SystemHealth from "../components/admin/SystemHealth";
import MainLayout from "../components/layout/MainLayout";

const AdminView = () => {
  const { state } = useLocation();
  const [selectedItem, setSelectedItem] = useState("modules");

  useEffect(() => {
    if (state) {
      setSelectedItem(state);
    }
  }, [state]);

  const renderContent = () => {
    switch (selectedItem) {
      case "modules":
        return <ModuleManagement />;
      case "datasets":
        return <DatasetManagement />;
      case "users":
        return <UserManagement />;
      case 'submissions':
        return <SubmissionManagement />;
      case 'versions':
        return <VersionManagement />;
      case 'orchestration':
        return <ModuleOrchestration />;
      case 'health':
        return <SystemHealth />;
      default:
        return <ModuleManagement />;
    }
  };

  return (
    <MainLayout>
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.body",
        // marginTop: "-10px",
        // marginBottom: "-40px",
        // marginLeft: "-40px",
        // marginRight: "-40px",
      }}
    >
      <SideNavAdmin
        selectedItem={selectedItem}
        onSelect={setSelectedItem}
        sx={{ width: 260 }}
      />
      <Box sx={{ flex: 1, p: 3 }}>{renderContent()}</Box>
    </Box>
    </MainLayout>
  );
};

export default AdminView;
