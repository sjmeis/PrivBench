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
import DemoDataManagement from "../components/admin/DemoDataManagement";
import AdminManagementPanel from "../components/admin/AdminManagementPanel";
import MainLayout from "../components/layout/MainLayout";

const checkSuperAdminStatus = () => {
  try {
    const token = document.cookie.split('; ').find(row => row.startsWith('access_token_cookie='))?.split('=')[1];
    if (!token) return false;
    
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const parsed = JSON.parse(jsonPayload);
    return parsed.is_superadmin || parsed.isSuperAdmin || false;
  } catch (e) {
    return false;
  }
};

const AdminView = () => {
  const { state } = useLocation();
  const [selectedItem, setSelectedItem] = useState("modules");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    setIsSuperAdmin(checkSuperAdminStatus());
    if (state) {
      setSelectedItem(state);
    }
  }, [state]);

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
      case 'demo':
        return <DemoDataManagement />;
      case 'health':
        return <SystemHealth />;
      case 'team':
        return isSuperAdmin ? <AdminManagementPanel /> : <ModuleManagement />;
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
        isSuperAdmin={isSuperAdmin}
        sx={{ width: 260 }}
      />
      <Box sx={{ flex: 1, p: 3 }}>{renderContent()}</Box>
    </Box>
    </MainLayout>
  );
};

export default AdminView;
