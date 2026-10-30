import { createContext, useContext, useMemo, useState } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const ColorModeContext = createContext(null);

function getInitialMode() {
  return localStorage.getItem('sghi-theme') === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getInitialMode);
  const colorMode = useMemo(() => ({
    mode,
    toggle: () => setMode((current) => {
      const next = current === 'light' ? 'dark' : 'light';
      localStorage.setItem('sghi-theme', next);
      return next;
    })
  }), [mode]);

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: '#28794c' },
      secondary: { main: '#1686b8' },
      background: mode === 'light'
        ? { default: '#f5f8f4', paper: '#ffffff' }
        : { default: '#151b18', paper: '#202923' },
      success: { main: '#28794c' },
      warning: { main: '#c27818' },
      error: { main: '#c3443d' }
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: '"Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.03em' },
      h5: { fontWeight: 700, letterSpacing: '-0.02em' },
      h6: { fontWeight: 700 }
    },
    components: {
      MuiButton: { styleOverrides: { root: { borderRadius: 10, textTransform: 'none', fontWeight: 700 } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiTableCell: { styleOverrides: { head: { fontWeight: 700 } } }
    }
  }), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ColorModeContext.Provider>
  );
}

export function useColorMode() {
  const context = useContext(ColorModeContext);
  if (!context) throw new Error('useColorMode deve ser usado dentro de ThemeProvider.');
  return context;
}
