"use client"
import useSWR from "swr"
import { collection, getDocs, orderBy, query, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

// MUI
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Divider,
  Skeleton,
} from "@mui/material"

// Recharts
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

// Types
type SolarRecord = {
  id: string
  Angle: number
  Current: number
  Voltage: number
  LDR?: number
  Date: Date
}

type WindRecord = {
  id: string
  Angle: number
  Current: number
  Voltage: number
  Date: Date
}

// Firestore fetchers
async function fetchSolar(): Promise<SolarRecord[]> {
  const q = query(collection(db, "Solar"), orderBy("Date", "asc"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data() as {
      Angle: number
      Current: number
      Voltage: number
      LDR?: number
      Date: Timestamp | Date
    }
    const dt = data.Date instanceof Timestamp ? data.Date.toDate() : new Date(data.Date)
    return {
      id: d.id,
      Angle: Number(data.Angle ?? 0),
      Current: Number(data.Current ?? 0),
      Voltage: Number(data.Voltage ?? 0),
      LDR: data.LDR !== undefined ? Number(data.LDR) : undefined,
      Date: dt,
    }
  })
}

async function fetchWind(): Promise<WindRecord[]> {
  const q = query(collection(db, "Wind"), orderBy("Date", "asc"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data() as {
      Angle: number
      Current: number
      Voltage: number
      Date: Timestamp | Date
    }
    const dt = data.Date instanceof Timestamp ? data.Date.toDate() : new Date(data.Date)
    return {
      id: d.id,
      Angle: Number(data.Angle ?? 0),
      Current: Number(data.Current ?? 0),
      Voltage: Number(data.Voltage ?? 0),
      Date: dt,
    }
  })
}

// Helpers
function formatDate(d?: Date) {
  if (!d) return "-"
  return d.toLocaleString()
}

function latestItem<T extends { Date: Date }>(arr?: T[]) {
  if (!arr || arr.length === 0) return undefined
  return arr[arr.length - 1]
}

// Merge two series by time for Recharts
type MergedPoint = {
  time: number
  label: string
  solarCurrent?: number | null
  windCurrent?: number | null
  solarAngle?: number | null
  windAngle?: number | null
}

function mergeTimeSeries(solar: SolarRecord[] | undefined, wind: WindRecord[] | undefined): MergedPoint[] {
  const map = new Map<number, MergedPoint>()

  if (solar) {
    for (const s of solar) {
      const t = s.Date.getTime()
      const existing = map.get(t) || {
        time: t,
        label: s.Date.toLocaleTimeString(),
      }
      existing.solarCurrent = s.Current
      existing.solarAngle = s.Angle
      map.set(t, existing)
    }
  }

  if (wind) {
    for (const w of wind) {
      const t = w.Date.getTime()
      const existing = map.get(t) || {
        time: t,
        label: w.Date.toLocaleTimeString(),
      }
      existing.windCurrent = w.Current
      existing.windAngle = w.Angle
      map.set(t, existing)
    }
  }

  return Array.from(map.values()).sort((a, b) => a.time - b.time)
}

export default function Page() {
  const { data: solar, isLoading: loadingSolar } = useSWR("solar-all", fetchSolar, {
    refreshInterval: 30000,
  })
  const { data: wind, isLoading: loadingWind } = useSWR("wind-all", fetchWind, {
    refreshInterval: 30000,
  })

  const loading = loadingSolar || loadingWind
  const latestSolar = latestItem(solar)
  const latestWind = latestItem(wind)
  const merged = mergeTimeSeries(solar, wind)

  return (
    <Container maxWidth={false} disableGutters sx={{ py: 4, px: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Renewable Energy Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Live metrics from Firebase Firestore (Solar & Wind)
        </Typography>
      </Box>

      {/* Section 1: Solar Latest */}
      <SectionTitle title="Solar - Latest Metrics" />
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <MetricCard title="Latest Solar Current (A)" value={loading ? undefined : latestSolar?.Current} />
        <MetricCard title="Latest Solar Voltage (V)" value={loading ? undefined : latestSolar?.Voltage} />
        <MetricCard title="Latest Solar Angle (°)" value={loading ? undefined : latestSolar?.Angle} />
        <MetricCard title="Light Intensity (LDR)" value={loading ? undefined : latestSolar?.LDR} />
      </Grid>

      {/* Section 2: Wind Latest */}
      <SectionTitle title="Wind - Latest Metrics" />
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <MetricCard title="Latest Wind Current (A)" value={loading ? undefined : latestWind?.Current} />
        <MetricCard title="Latest Wind Voltage (V)" value={loading ? undefined : latestWind?.Voltage} />
        <MetricCard title="Latest Wind Angle (°)" value={loading ? undefined : latestWind?.Angle} />
      </Grid>

      {/* Section 3: Tables */}
      <SectionTitle title="Data Tables" />
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Solar
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {loading ? (
              <TableSkeleton />
            ) : (
              <TableContainer sx={{ maxHeight: 420 }}>
                <Table stickyHeader size="small" aria-label="solar table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Current (A)</TableCell>
                      <TableCell align="right">Voltage (V)</TableCell>
                      <TableCell align="right">Angle (°)</TableCell>
                      <TableCell align="right">LDR</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {solar?.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{formatDate(row.Date)}</TableCell>
                        <TableCell align="right">{row.Current}</TableCell>
                        <TableCell align="right">{row.Voltage}</TableCell>
                        <TableCell align="right">{row.Angle}</TableCell>
                        <TableCell align="right">{row.LDR !== undefined ? row.LDR : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Wind
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {loading ? (
              <TableSkeleton />
            ) : (
              <TableContainer sx={{ maxHeight: 420 }}>
                <Table stickyHeader size="small" aria-label="wind table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Current (A)</TableCell>
                      <TableCell align="right">Voltage (V)</TableCell>
                      <TableCell align="right">Angle (°)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {wind?.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{formatDate(row.Date)}</TableCell>
                        <TableCell align="right">{row.Current}</TableCell>
                        <TableCell align="right">{row.Voltage}</TableCell>
                        <TableCell align="right">{row.Angle}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Section 4: Charts */}
      <SectionTitle title="Trends" />
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: 360 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Current vs Time (Solar & Wind)
            </Typography>
            {loading ? (
              <Skeleton variant="rounded" width="100%" height={290} />
            ) : (
              <Box sx={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={merged} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="solarCurrent"
                      name="Solar Current"
                      stroke="hsl(var(--chart-1))"
                      dot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="windCurrent"
                      name="Wind Current"
                      stroke="hsl(var(--chart-2))"
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: 360 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Angle vs Time (Solar & Wind)
            </Typography>
            {loading ? (
              <Skeleton variant="rounded" width="100%" height={290} />
            ) : (
              <Box sx={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={merged} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="solarAngle"
                      name="Solar Angle"
                      stroke="hsl(var(--chart-3))"
                      dot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="windAngle"
                      name="Wind Angle"
                      stroke="hsl(var(--chart-5))"
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  )
}

// UI sub-components

function SectionTitle({ title }: { title: string }) {
  return (
    <Typography variant="h6" sx={{ mb: 1.5, mt: 2, fontWeight: 600 }}>
      {title}
    </Typography>
  )
}

function MetricCard({ title, value }: { title: string; value?: number }) {
  return (
    <Grid item xs={12} sm={6} md={3}>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          height: "100%",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        {value === undefined ? (
          <Skeleton width={120} height={32} />
        ) : (
          <Typography variant="h5" fontWeight={700}>
            {value}
          </Typography>
        )}
      </Paper>
    </Grid>
  )
}

function TableSkeleton() {
  return (
    <Box>
      <Skeleton height={32} />
      <Skeleton height={32} />
      <Skeleton height={32} />
      <Skeleton height={32} />
      <Skeleton height={32} />
    </Box>
  )
}
