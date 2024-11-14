import { createTheme } from "@mui/material/styles";
// Just an initial color scheme, will be improved; used in the whole app
const theme = createTheme({
    palette: {
        primary: {
            main: '#ff977b',
            background: '#ffe9e3',
            textPrimary: '#565656',
        },
        secondary: {
            main: '#fff3f0',
        },
    },
})

export default theme;