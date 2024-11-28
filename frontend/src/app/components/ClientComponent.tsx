"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import React from "react";

const theme = createTheme({
  palette: {
    primary: {
      main: "#F7EBEC",
      dark: "#DDBDD5",
    },
    secondary: {
      main: "#AC9FBB",
    },
  },
});

const ClientComponent = ({ children }: { children: React.ReactNode }) => {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

export default ClientComponent;
