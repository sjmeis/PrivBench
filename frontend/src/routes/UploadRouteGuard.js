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
import { Navigate, Outlet } from "react-router-dom";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { ModuleService } from "../services/ModuleService";
import { useSnackbar } from "../contexts/SnackbarProvider";

const UploadRouteGuard = () => {
  const [status, setStatus] = useState({ checked: false, allowed: false });
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    let ignore = false;
    const checkPendingUpdates = async () => {
      try {
        const hasPending = await ModuleService.hasPendingModuleUpdates();
        if (ignore) return;
        if (hasPending) {
          showSnackbar(
            "Upload is temporarily disabled until pending module updates are published.",
            "warning"
          );
        }
        setStatus({ checked: true, allowed: !hasPending });
      } catch (error) {
        if (!ignore) {
          // If the check fails, allow access but log the error.
          console.error("Failed to verify pending module updates:", error);
          setStatus({ checked: true, allowed: true });
        }
      }
    };

    checkPendingUpdates();
    return () => {
      ignore = true;
    };
  }, [showSnackbar]);

  if (!status.checked) {
    return <LoadingSpinner />;
  }

  return status.allowed ? <Outlet /> : <Navigate to="/" replace />;
};

export default UploadRouteGuard;
