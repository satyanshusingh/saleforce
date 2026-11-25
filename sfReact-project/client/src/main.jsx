import React from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App.jsx';
import './styles.css';

const theme = createTheme({
  palette: {
    primary: { main: '#0f766e' },
    secondary: { main: '#14b8a6' },
    background: { default: '#f3f8f7', paper: '#ffffff' },
    text: { primary: '#16302e', secondary: '#627b78' }
  },
  shape: { borderRadius: 12 },
  typography: { fontFamily: 'Inter, "Segoe UI", Arial, sans-serif', button: { textTransform: 'none', fontWeight: 600 } }
});

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
