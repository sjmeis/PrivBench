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
