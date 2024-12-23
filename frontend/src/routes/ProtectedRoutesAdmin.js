import { useCurrentUser } from "../contexts/AuthContext";
import { Navigate, Outlet } from "react-router-dom";
import LoadingSpinner from "../components/shared/LoadingSpinner";

export default function ProtectedRoutesAdmin() {
    const { user, loading } = useCurrentUser();

    if (loading) {
        return <LoadingSpinner />;
    }

    return user && user.admin ? <Outlet /> : <Navigate to="/" />;
}
