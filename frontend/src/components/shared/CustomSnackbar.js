import React, { Fragment } from "react";
import { Snackbar, Alert, Button } from "@mui/joy";
import {Warning, Close, CheckCircle} from "@mui/icons-material";

const CustomSnackbar = ({ open, message, severity = "info", onClose }) => {
    return (
        <Snackbar
            open={open}
            autoHideDuration={5000}
            onClose={onClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            sx={{
                bgcolor: severity === 'success' ? 'success.600' : 'danger.600',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '20%',
                height: '6%'
            }}
        >
            <Alert
                startDecorator={
                    severity === "success" ? <CheckCircle /> : <Warning />
                }
                variant="soft"
                sx={{
                    bgcolor: severity === 'success' ? 'success.600' : 'danger.600',
                    color: 'primary.textPrimary',
                    textAlign: 'center',
                    width: '100%',
                    height: '5%'
                }}
                endDecorator={
                    <Fragment>
                        <Button
                            size="small"
                            color="inherit"
                            onClick={onClose}
                            style={{ background: "none", border: "none", cursor: "pointer" }}
                        >
                            <Close fontSize="small" />
                        </Button>
                    </Fragment>
                }
            >
                {message}
            </Alert>
        </Snackbar>
    );
};

export default CustomSnackbar;
