import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Paper, Stack, TextField, Typography
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { apiRequest } from '../api.js';
import { useRealtime } from '../hooks/useRealtime.js';

const DEFAULT_DEVICE = 'ESP32_Irrigacao_Gabriel';

export default function ThresholdsPage() {
  const [deviceID, setDeviceID] = useState(DEFAULT_DEVICE);
  const [pumpOnAtOrBelow, setPumpOnAtOrBelow] = useState('');
  const [pumpOffAtOrAbove, setPumpOffAtOrAbove] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadConfig = useCallback(async (id) => {
    if (!id.trim()) return;
    setLoading(true);
    setFeedback(null);
    try {
      const config = await apiRequest(`/config/thresholds/${encodeURIComponent(id.trim())}`);
      setPumpOnAtOrBelow(String(config.pumpOnAtOrBelow));
      setPumpOffAtOrAbove(String(config.pumpOffAtOrAbove));
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMessage = useCallback((message) => {
    if (message.type === 'thresholds.updated' && message.payload?.deviceID === deviceID.trim()) {
      setPumpOnAtOrBelow(String(message.payload.pumpOnAtOrBelow));
      setPumpOffAtOrAbove(String(message.payload.pumpOffAtOrAbove));
      setFeedback({ severity: 'info', message: 'A configuração foi atualizada em outra sessão.' });
    }
  }, [deviceID]);
  useRealtime(handleMessage);

  useEffect(() => {
    loadConfig(DEFAULT_DEVICE);
  }, [loadConfig]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback(null);
    const on = Number(pumpOnAtOrBelow);
    const off = Number(pumpOffAtOrAbove);
    if (!deviceID.trim()) return setFeedback({ severity: 'error', message: 'Informe o identificador do dispositivo.' });
    if (!Number.isInteger(on) || !Number.isInteger(off) || on < 0 || off > 409 || on > 409 || off < 0 || on >= off) {
      return setFeedback({ severity: 'error', message: 'Use inteiros entre 0 e 409 e mantenha o limiar de acionamento abaixo do de desligamento.' });
    }

    setSaving(true);
    try {
      const result = await apiRequest(`/config/thresholds/${encodeURIComponent(deviceID.trim())}`, {
        method: 'PUT',
        body: JSON.stringify({ pumpOnAtOrBelow: on, pumpOffAtOrAbove: off })
      });
      setPumpOnAtOrBelow(String(result.pumpOnAtOrBelow));
      setPumpOffAtOrAbove(String(result.pumpOffAtOrAbove));
      setFeedback({ severity: 'success', message: 'Limiares salvos com sucesso.' });
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box className="page-heading">
        <Box>
          <Typography variant="overline" color="primary.main">Automação</Typography>
          <Typography variant="h4">Limiares da bomba</Typography>
          <Typography color="text.secondary">Configure os limites de acionamento por dispositivo.</Typography>
        </Box>
      </Box>
      <Paper component="form" onSubmit={handleSubmit} className="content-panel threshold-panel">
        <Stack spacing={2.5}>
          <Alert severity="info">
            Os valores são leituras brutas do sensor na faixa de 0 a 409. A bomba liga no limite inferior e desliga no superior.
          </Alert>
          {feedback && <Alert severity={feedback.severity}>{feedback.message}</Alert>}
          <TextField
            label="Identificador do dispositivo"
            value={deviceID}
            onChange={(event) => setDeviceID(event.target.value)}
            required
            fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Ligar em ou abaixo de"
              type="number"
              inputProps={{ min: 0, max: 409, step: 1 }}
              value={pumpOnAtOrBelow}
              onChange={(event) => setPumpOnAtOrBelow(event.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Desligar em ou acima de"
              type="number"
              inputProps={{ min: 0, max: 409, step: 1 }}
              value={pumpOffAtOrAbove}
              onChange={(event) => setPumpOffAtOrAbove(event.target.value)}
              required
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button type="submit" variant="contained" startIcon={<SaveOutlinedIcon />} disabled={saving || loading}>
              {saving ? 'Salvando…' : 'Salvar limiares'}
            </Button>
            <Button type="button" variant="outlined" onClick={() => loadConfig(deviceID)} disabled={loading}>
              {loading ? 'Carregando…' : 'Carregar dispositivo'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
