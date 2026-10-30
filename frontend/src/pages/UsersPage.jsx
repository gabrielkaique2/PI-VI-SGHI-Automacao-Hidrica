import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { apiRequest } from '../api.js';

const EMPTY_FORM = { nome: '', email: '', senha: '', papel: 'consulta' };
const roles = [
  { value: 'consulta', label: 'Consulta' },
  { value: 'operador', label: 'Operador' },
  { value: 'admin', label: 'Administrador' }
];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [pendingDeactivation, setPendingDeactivation] = useState(null);

  const loadUsers = useCallback(async () => {
    setError('');
    try {
      const result = await apiRequest('/usuarios');
      setUsers(Array.isArray(result) ? result : []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ nome: user.nome, email: user.email, papel: user.papel, senha: '' });
    setDialogOpen(true);
  };

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const saveUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    const payload = {
      nome: form.nome.trim(),
      email: form.email.trim(),
      papel: form.papel
    };
    if (!editingUser || form.senha) payload.senha = form.senha;

    try {
      await apiRequest(editingUser ? `/usuarios/${editingUser.id}` : '/usuarios', {
        method: editingUser ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      setDialogOpen(false);
      setSuccess(editingUser ? 'Usuário atualizado.' : 'Usuário criado.');
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const deactivateUser = async () => {
    if (!pendingDeactivation) return;
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/usuarios/${pendingDeactivation.id}`, { method: 'DELETE' });
      setSuccess('Usuário desativado.');
      setPendingDeactivation(null);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
      setPendingDeactivation(null);
    }
  };

  const activateUser = async (user) => {
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/usuarios/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ativo: true })
      });
      setSuccess('Usuário ativado.');
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <Stack spacing={3}>
      <Box className="page-heading">
        <Box>
          <Typography variant="overline" color="primary.main">Acesso</Typography>
          <Typography variant="h4">Gestão de usuários</Typography>
          <Typography color="text.secondary">Gerencie contas, perfis e acesso ao sistema.</Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAddAltOutlinedIcon />} onClick={openCreate}>
          Novo usuário
        </Button>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>}
      <Paper className="content-panel table-panel">
        {loading ? <Typography color="text.secondary">Carregando usuários…</Typography> : (
          <TableContainer>
            <Table aria-label="Usuários do sistema">
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Perfil</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.nome}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{roles.find((role) => role.value === user.papel)?.label || user.papel}</TableCell>
                    <TableCell>
                      <Chip size="small" label={user.ativo ? 'Ativo' : 'Inativo'} color={user.ativo ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton aria-label={`Editar ${user.nome}`} onClick={() => openEdit(user)}>
                          <EditOutlinedIcon />
                        </IconButton>
                      </Tooltip>
                      {user.ativo && (
                        <Tooltip title="Desativar">
                          <IconButton
                            aria-label={`Desativar ${user.nome}`}
                            color="error"
                            onClick={() => setPendingDeactivation(user)}
                          >
                            <BlockOutlinedIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {!user.ativo && (
                        <Tooltip title="Ativar">
                          <IconButton
                            aria-label={`Ativar ${user.nome}`}
                            color="success"
                            onClick={() => activateUser(user)}
                          >
                            <CheckCircleOutlineIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!users.length && <TableRow><TableCell colSpan={5} align="center">Nenhum usuário cadastrado.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={saveUser}>
          <DialogTitle>{editingUser ? 'Editar usuário' : 'Criar usuário'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField label="Nome" value={form.nome} onChange={updateForm('nome')} inputProps={{ maxLength: 100 }} required fullWidth />
              <TextField label="Email" type="email" value={form.email} onChange={updateForm('email')} inputProps={{ maxLength: 254 }} required fullWidth />
              <TextField
                label={editingUser ? 'Nova senha (opcional)' : 'Senha inicial'}
                type="password"
                value={form.senha}
                onChange={updateForm('senha')}
                inputProps={{ minLength: 12, maxLength: 128 }}
                required={!editingUser}
                fullWidth
                helperText="A senha deve ter entre 12 e 128 caracteres."
              />
              <TextField select label="Perfil" value={form.papel} onChange={updateForm('papel')} fullWidth>
                {roles.map((role) => <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>)}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(pendingDeactivation)} onClose={() => setPendingDeactivation(null)}>
        <DialogTitle>Desativar usuário?</DialogTitle>
        <DialogContent>
          <Typography>
            {pendingDeactivation ? `A conta de ${pendingDeactivation.nome} perderá o acesso ao sistema.` : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDeactivation(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={deactivateUser}>Desativar</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
