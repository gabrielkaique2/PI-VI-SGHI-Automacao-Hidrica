import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Paper, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Typography
} from '@mui/material';
import SensorsOutlinedIcon from '@mui/icons-material/SensorsOutlined';
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined';
import { Line } from 'react-chartjs-2';
import {
  CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement,
  PointElement, Tooltip
} from 'chart.js';
import { apiRequest } from '../api.js';
import { useRealtime } from '../hooks/useRealtime.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR');
}

export default function DashboardPage() {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReadings = useCallback(async () => {
    setError('');
    try {
      const data = await apiRequest('/leituras');
      setReadings(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMessage = useCallback((message) => {
    if (message.type === 'reading.created' && message.payload) {
      setReadings((current) => [message.payload, ...current.filter(
        (item) => item.timestamp !== message.payload.timestamp || item.deviceID !== message.payload.deviceID
      )].slice(0, 100));
    }
  }, []);
  const connected = useRealtime(handleMessage);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  const latest = readings[0];
  const devices = useMemo(
    () => new Set(readings.map((item) => item.deviceID).filter(Boolean)).size,
    [readings]
  );
  const chartReadings = [...readings].slice(0, 24).reverse();
  const chartData = {
    labels: chartReadings.map((item) => {
      const date = new Date(item.timestamp);
      return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }),
    datasets: [{
      label: 'Leitura bruta (0–409)',
      data: chartReadings.map((item) => Number(item.valor)),
      borderColor: '#1686b8',
      backgroundColor: 'rgba(22, 134, 184, 0.12)',
      fill: true,
      tension: 0.35,
      pointRadius: 3
    }]
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { min: 0, max: 409, title: { display: true, text: 'Valor bruto' } } },
    plugins: { legend: { display: false } }
  };

  return (
    <Stack spacing={3}>
      <Box className="page-heading">
        <Box>
          <Typography variant="overline" color="primary.main">Visão geral</Typography>
          <Typography variant="h4">Monitoramento</Typography>
          <Typography color="text.secondary">Leituras dos sensores e estado do sistema de irrigação.</Typography>
        </Box>
        <Chip
          color={connected ? 'success' : 'default'}
          variant="outlined"
          label={connected ? 'Tempo real conectado' : 'Reconectando…'}
          aria-live="polite"
        />
      </Box>

      {error && <Alert severity="error" action={<Button onClick={loadReadings}>Tentar novamente</Button>}>{error}</Alert>}

      <Box className="metric-grid">
        <Card>
          <CardContent className="metric-card">
            <Box className="metric-icon"><SensorsOutlinedIcon color="primary" /></Box>
            <Box>
              <Typography color="text.secondary" variant="body2">Dispositivos com leituras</Typography>
              <Typography variant="h5">{loading ? '—' : devices}</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="metric-card">
            <Box className="metric-icon"><WaterDropOutlinedIcon color="secondary" /></Box>
            <Box>
              <Typography color="text.secondary" variant="body2">Última leitura</Typography>
              <Typography variant="h5">
                {loading ? '—' : latest?.valor != null ? `${latest.valor} / 409` : 'Sem dados'}
              </Typography>
              <Typography variant="caption" color="text.secondary">{formatDate(latest?.timestamp)}</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="metric-card">
            <Box className="metric-icon"><WaterDropOutlinedIcon color={latest?.statusBomba === 'ligado' ? 'success' : 'action'} /></Box>
            <Box>
              <Typography color="text.secondary" variant="body2">Estado da bomba</Typography>
              <Typography variant="h5">{loading ? '—' : latest?.statusBomba || 'Sem dados'}</Typography>
              <Typography variant="caption" color="text.secondary">{latest?.deviceID || 'Aguardando dispositivo'}</Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Paper className="content-panel">
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6">Tendência das leituras</Typography>
            <Typography variant="body2" color="text.secondary">Valores brutos recebidos do sensor (0 a 409).</Typography>
          </Box>
          <Chip label="Últimas 24 leituras" size="small" variant="outlined" />
        </Stack>
        <Box className="chart-area">
          {loading ? <CircularProgress /> : chartReadings.length
            ? <Line data={chartData} options={chartOptions} />
            : <Typography color="text.secondary">Ainda não há leituras para exibir.</Typography>}
        </Box>
      </Paper>

      <Paper className="content-panel">
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">Leituras recentes</Typography>
          <Typography variant="body2" color="text.secondary">Atualizadas pela API e pelo canal em tempo real.</Typography>
        </Box>
        {loading ? <CircularProgress /> : (
          <TableContainer>
            <Table size="small" aria-label="Leituras recentes dos sensores">
              <TableHead>
                <TableRow>
                  <TableCell>Dispositivo</TableCell>
                  <TableCell>Métrica</TableCell>
                  <TableCell>Valor bruto</TableCell>
                  <TableCell>Bomba</TableCell>
                  <TableCell>Data e hora</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {readings.slice(0, 8).map((reading, index) => (
                  <TableRow key={`${reading.deviceID}-${reading.timestamp}-${index}`}>
                    <TableCell>{reading.deviceID || '—'}</TableCell>
                    <TableCell>{reading.propriedade || 'Umidade'}</TableCell>
                    <TableCell>{reading.valor ?? '—'} / 409</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={reading.statusBomba || 'desconhecido'}
                        color={reading.statusBomba === 'ligado' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{formatDate(reading.timestamp)}</TableCell>
                  </TableRow>
                ))}
                {!readings.length && (
                  <TableRow><TableCell colSpan={5} align="center">Aguardando leituras do dispositivo.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Stack>
  );
}
