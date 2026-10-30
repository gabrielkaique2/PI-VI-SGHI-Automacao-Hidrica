import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, IconButton, Paper, Stack, TextField, Tooltip, Typography
} from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useAuth } from '../auth/AuthContext.jsx';
import { useColorMode } from '../theme.jsx';

export default function LoginPage() {
  const { user, loading, sessionError, login } = useAuth();
  const { mode, toggle } = useColorMode();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Box className="full-screen-state"><Typography>Carregando…</Typography></Box>;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, senha);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box className="login-page">
      <Tooltip title={`Ativar tema ${mode === 'light' ? 'escuro' : 'claro'}`}>
        <IconButton className="login-theme-toggle" onClick={toggle} aria-label="Alternar tema">
          {mode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
        </IconButton>
      </Tooltip>
      <Paper component="section" elevation={3} className="login-panel">
        <img
          className="login-brand"
          src={mode === 'dark' ? '/branding/logo-dark.jpg' : '/branding/logo-light.jpg'}
          alt="Sistema de Gestão Hídrica Inteligente"
        />
        <Stack spacing={0.75} sx={{ mb: 1 }}>
          <Typography variant="h5">Acesse sua conta</Typography>
          <Typography color="text.secondary">Entre para acompanhar as leituras e a irrigação.</Typography>
        </Stack>
        {(error || sessionError || location.state?.logoutError) && (
          <Alert severity="error">{error || sessionError || location.state.logoutError}</Alert>
        )}
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              required
              fullWidth
            />
            <Button type="submit" variant="contained" size="large" disabled={submitting}>
              {submitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
