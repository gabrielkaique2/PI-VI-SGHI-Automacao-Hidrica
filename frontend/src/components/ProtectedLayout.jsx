import { useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar, Avatar, Box, Divider, Drawer, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Tooltip, Typography, useMediaQuery
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../auth/AuthContext.jsx';
import { useColorMode } from '../theme.jsx';

const drawerWidth = 264;

export function RequireAuth({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Box className="full-screen-state"><Typography>Verificando sessão…</Typography></Box>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.papel)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export default function ProtectedLayout() {
  const { user, logout } = useAuth();
  const { mode, toggle } = useColorMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const links = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardOutlinedIcon /> },
    ...(user.papel !== 'consulta'
      ? [{ label: 'Limiares', path: '/limiares', icon: <TuneOutlinedIcon /> }]
      : []),
    ...(user.papel === 'admin'
      ? [{ label: 'Usuários', path: '/usuarios', icon: <PeopleOutlineIcon /> }]
      : [])
  ];

  const drawer = (
    <Box className="drawer-content">
      <Box className="brand-lockup">
        <img
          src={mode === 'dark' ? '/branding/logo-dark.jpg' : '/branding/logo-light.jpg'}
          alt="Sistema de Gestão Hídrica Inteligente"
        />
      </Box>
      <Typography variant="overline" color="text.secondary" sx={{ px: 2.5, mt: 1 }}>
        Monitoramento
      </Typography>
      <List sx={{ px: 1.5, py: 1 }}>
        {links.map(({ label, path, icon }) => (
          <ListItemButton
            key={path}
            component={NavLink}
            to={path}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => isActive ? 'nav-item nav-item-active' : 'nav-item'}
          >
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText primary={label} />
          </ListItemButton>
        ))}
      </List>
      <Box className="drawer-footer">
        <Divider sx={{ mb: 1.5 }} />
        <Box className="user-summary">
          <Avatar sx={{ bgcolor: 'primary.main', width: 38, height: 38 }}>
            {user.nome?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>{user.nome}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{user.papel}</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      navigate('/login', { replace: true, state: { logoutError: error.message } });
    }
  };

  return (
    <Box className="app-shell">
      <AppBar position="fixed" color="inherit" elevation={0} className="top-bar">
        <Toolbar>
          {isMobile && (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Sistema de Gestão Hídrica
          </Typography>
          <Tooltip title={`Ativar tema ${mode === 'light' ? 'escuro' : 'claro'}`}>
            <IconButton onClick={toggle} aria-label="Alternar tema">
              {mode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Sair">
            <IconButton onClick={handleLogout} aria-label="Sair">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Box component="nav" aria-label="Navegação principal">
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{ '& .MuiDrawer-paper': { width: drawerWidth } }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{ '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' } }}
            open
          >
            {drawer}
          </Drawer>
        )}
      </Box>
      <Box component="main" className="page-main">
        <Toolbar />
        <Box className="page-content"><Outlet /></Box>
      </Box>
    </Box>
  );
}
