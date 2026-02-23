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
                width: 'auto',
                height: 'auto',
                p: 0
            }}
        >
            <Alert
                startDecorator={
                    severity === "success" ? <CheckCircle /> : <Warning />
                }
                variant="soft"
                sx={{
                    bgcolor: severity === 'success' ? 'success.600' : 'danger.600',
                    color: 'primary.50',
                    minWidth: '300px',
                    maxWidth: '500px',
                    textAlign: 'center',
                    height: 'auto',
                    '& .MuiAlert-content': {
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        textAlign: 'left',
                    },
                    boxShadow: 'md',
                }}
                endDecorator={
                    <Fragment>
                        <Button
                            size="small"
                            color="inherit"
                            onClick={onClose}
                            style={{ background: "none", border: "none", cursor: "pointer" }}
                        >
                            <Close fontSize="small" sx={{color: 'primary.50'}}/>
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
