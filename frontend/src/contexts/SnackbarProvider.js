import React, { createContext, useContext, useState } from "react";
import CustomSnackbar from "../components/shared/CustomSnackbar";

const SnackbarContext = createContext();

export const SnackbarProvider = ({ children }) => {
    const [snackbarState, setSnackbarState] = useState({
        open: false,
        message: "",
        severity: "info", // Default severity
    });

    const showSnackbar = (message, severity = "info") => {
        setSnackbarState({ open: true, message, severity });
    };

    const hideSnackbar = () => {
        setSnackbarState((prevState) => ({ ...prevState, open: false }));
    };

    return (
        <SnackbarContext.Provider value={{ showSnackbar, hideSnackbar }}>
            {children}
            <CustomSnackbar
                open={snackbarState.open}
                message={snackbarState.message}
                severity={snackbarState.severity}
                onClose={hideSnackbar}
            />
        </SnackbarContext.Provider>
    );
};

export const useSnackbar = () => useContext(SnackbarContext);
