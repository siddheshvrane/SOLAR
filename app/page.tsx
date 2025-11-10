"use client"
import useSWR from "swr"
import { collection, getDocs, orderBy, query } from "firebase/firestore"
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
  Chip,
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
  Date: string
}

type WindRecord = {
  id: string
  Angle: number
  Current: number
  Voltage: number
  Date: string
}

// Firestore fetchers
async function fetchSolar(): Promise<SolarRecord[]> {
  const q = query(collection(db, "solarWindData"), orderBy("Solar.Date", "asc"))
  const snap = await getDocs(q)

  return snap.docs.map((d) => {
    const data = d.data() as {
      Solar: {
        Angle: number
        Current: number
        Voltage: number
        LDR?: number
        Date: string
      }
    }

    const solar = data.Solar || {}

    return {
      id: d.id,
      Angle: Number(solar.Angle ?? 0),
      Current: Number(solar.Current ?? 0),
      Voltage: Number(solar.Voltage ?? 0),
      LDR: solar.LDR !== undefined ? Number(solar.LDR) : undefined,
      Date: String(solar.Date ?? ""),
    }
  })
}

async function fetchWind(): Promise<WindRecord[]> {
  const q = query(collection(db, "solarWindData"), orderBy("Wind.Date", "asc"))
  const snap = await getDocs(q)

  return snap.docs.map((d) => {
    const data = d.data() as {
      Wind: {
        Angle: number
        Current: number
        Voltage: number
        Date: string
      }
    }

    const wind = data.Wind || {}

    return {
      id: d.id,
      Angle: Number(wind.Angle ?? 0),
      Current: Number(wind.Current ?? 0),
      Voltage: Number(wind.Voltage ?? 0),
      Date: String(wind.Date ?? ""),
    }
  })
}

// Helpers
function latestItem<T extends { Date: string }>(arr?: T[]) {
  if (!arr || arr.length === 0) return undefined
  return arr[arr.length - 1]
}

// Merge two series by time for Recharts
type MergedPoint = {
  time: string
  label: string
  solarCurrent?: number | null
  windCurrent?: number | null
  solarAngle?: number | null
  windAngle?: number | null
}

function mergeTimeSeries(solar: SolarRecord[] | undefined, wind: WindRecord[] | undefined): MergedPoint[] {
  const map = new Map<string, MergedPoint>()

  if (solar) {
    for (const s of solar) {
      const t = s.Date
      const existing = map.get(t) || {
        time: t,
        label: t,
      }
      existing.solarCurrent = s.Current
      existing.solarAngle = s.Angle
      map.set(t, existing)
    }
  }

  if (wind) {
    for (const w of wind) {
      const t = w.Date
      const existing = map.get(t) || {
        time: t,
        label: t,
      }
      existing.windCurrent = w.Current
      existing.windAngle = w.Angle
      map.set(t, existing)
    }
  }

  // Sorting optional since these are now strings
  return Array.from(map.values())
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
    <Box sx={{ minHeight: "100vh", bgcolor: "#fafbfd" }}>
      <Container maxWidth={false} disableGutters sx={{ py: 5, px: { xs: 2, sm: 4, md: 6 } }}>
        {/* Header */}
        <Box sx={{ mb: 5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
            <Box 
              sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: "12px",
                background: "linear-gradient(135deg, #9bf6ff 0%, #caffbf 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(155, 246, 255, 0.3)"
              }}
            >
              <i className="fas fa-solar-panel" style={{ fontSize: 24, color: "#fff" }}></i>
            </Box>
            <Box>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 600, 
                  color: "#2d3748",
                  letterSpacing: "-0.02em"
                }}
              >
                Renewable Energy Dashboard
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                <i className="fas fa-circle" style={{ fontSize: 8, color: "#48bb78" }}></i>
                <Typography variant="body2" sx={{ color: "#718096", fontWeight: 400 }}>
                  Live monitoring • Auto-refresh every 30s
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Solar Section */}
        <Box sx={{ mb: 5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
            <i className="fas fa-sun" style={{ fontSize: 20, color: "#ffd6a5" }}></i>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#2d3748" }}>
              Solar Energy
            </Typography>
            <Chip 
              label="Active" 
              size="small" 
              sx={{ 
                bgcolor: "#e6fffa", 
                color: "#319795",
                fontWeight: 500,
                fontSize: "0.75rem"
              }} 
            />
          </Box>
          <Grid container spacing={2.5}>
            <MetricCard 
              title="Current" 
              value={loading ? undefined : latestSolar?.Current} 
              unit="A"
              icon="fa-bolt"
              color="#ffd6a5"
            />
            <MetricCard 
              title="Voltage" 
              value={loading ? undefined : latestSolar?.Voltage} 
              unit="V"
              icon="fa-plug"
              color="#ffd6a5"
            />
            <MetricCard 
              title="Panel Angle" 
              value={loading ? undefined : latestSolar?.Angle} 
              unit="°"
              icon="fa-angles-up"
              color="#ffd6a5"
            />
            <MetricCard 
              title="Light Intensity" 
              value={loading ? undefined : latestSolar?.LDR} 
              unit="LDR"
              icon="fa-lightbulb"
              color="#ffd6a5"
            />
          </Grid>
        </Box>

        {/* Wind Section */}
        <Box sx={{ mb: 5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
            <i className="fas fa-wind" style={{ fontSize: 20, color: "#caffbf" }}></i>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#2d3748" }}>
              Wind Energy
            </Typography>
            <Chip 
              label="Active" 
              size="small" 
              sx={{ 
                bgcolor: "#e6fffa", 
                color: "#319795",
                fontWeight: 500,
                fontSize: "0.75rem"
              }} 
            />
          </Box>
          <Grid container spacing={2.5}>
            <MetricCard 
              title="Current" 
              value={loading ? undefined : latestWind?.Current} 
              unit="A"
              icon="fa-bolt"
              color="#caffbf"
            />
            <MetricCard 
              title="Voltage" 
              value={loading ? undefined : latestWind?.Voltage} 
              unit="V"
              icon="fa-plug"
              color="#caffbf"
            />
            <MetricCard 
              title="Turbine Angle" 
              value={loading ? undefined : latestWind?.Angle} 
              unit="°"
              icon="fa-angles-up"
              color="#caffbf"
            />
          </Grid>
        </Box>

        {/* Charts Section */}
        <Box sx={{ mb: 5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
            <i className="fas fa-chart-line" style={{ fontSize: 20, color: "#9bf6ff" }}></i>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#2d3748" }}>
              Performance Trends
            </Typography>
          </Box>
          <Grid container spacing={2.5}>
            <Grid item xs={12} lg={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3, 
                  height: 400,
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  bgcolor: "#ffffff"
                }}
              >
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: "#2d3748" }}>
                  Current Output Over Time
                </Typography>
                {loading ? (
                  <Skeleton variant="rounded" width="100%" height={320} sx={{ borderRadius: "12px" }} />
                ) : (
                  <Box sx={{ width: "100%", height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={merged} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="label" 
                          tick={{ fontSize: 11, fill: "#718096" }} 
                          interval="preserveStartEnd"
                          stroke="#cbd5e0"
                        />
                        <YAxis tick={{ fontSize: 11, fill: "#718096" }} stroke="#cbd5e0" />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: "8px", 
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
                          }} 
                        />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Line
                          type="monotone"
                          dataKey="solarCurrent"
                          name="Solar Current"
                          stroke="#ffd6a5"
                          strokeWidth={2.5}
                          dot={false}
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="windCurrent"
                          name="Wind Current"
                          stroke="#caffbf"
                          strokeWidth={2.5}
                          dot={false}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3, 
                  height: 400,
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  bgcolor: "#ffffff"
                }}
              >
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: "#2d3748" }}>
                  Angle Positioning Over Time
                </Typography>
                {loading ? (
                  <Skeleton variant="rounded" width="100%" height={320} sx={{ borderRadius: "12px" }} />
                ) : (
                  <Box sx={{ width: "100%", height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={merged} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="label" 
                          tick={{ fontSize: 11, fill: "#718096" }} 
                          interval="preserveStartEnd"
                          stroke="#cbd5e0"
                        />
                        <YAxis tick={{ fontSize: 11, fill: "#718096" }} stroke="#cbd5e0" />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: "8px", 
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
                          }} 
                        />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Line
                          type="monotone"
                          dataKey="solarAngle"
                          name="Solar Angle"
                          stroke="#9bf6ff"
                          strokeWidth={2.5}
                          dot={false}
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="windAngle"
                          name="Wind Angle"
                          stroke="#bdb2ff"
                          strokeWidth={2.5}
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
        </Box>

        {/* Data Tables */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
            <i className="fas fa-table" style={{ fontSize: 20, color: "#bdb2ff" }}></i>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#2d3748" }}>
              Historical Data
            </Typography>
          </Box>
          <Grid container spacing={2.5}>
            <Grid item xs={12} lg={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3,
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  bgcolor: "#ffffff"
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <i className="fas fa-sun" style={{ fontSize: 16, color: "#ffd6a5" }}></i>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#2d3748" }}>
                    Solar Records
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2, borderColor: "#e2e8f0" }} />
                {loading ? (
                  <TableSkeleton />
                ) : (
                  <TableContainer sx={{ maxHeight: 420 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, bgcolor: "#f7fafc", color: "#2d3748" }}>
                            Date & Time
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, bgcolor: "#f7fafc", color: "#2d3748" }}>
                            Current (A)
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, bgcolor: "#f7fafc", color: "#2d3748" }}>
                            Voltage (V)
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, bgcolor: "#f7fafc", color: "#2d3748" }}>
                            Angle (°)
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, bgcolor: "#f7fafc", color: "#2d3748" }}>
                            LDR
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {solar?.map((row, idx) => (
                          <TableRow 
                            key={row.id} 
                            hover
                            sx={{ 
                              "&:hover": { bgcolor: "#f7fafc" },
                              bgcolor: idx % 2 === 0 ? "#ffffff" : "#fafbfd"
                            }}
                          >
                            <TableCell sx={{ color: "#4a5568", fontSize: "0.875rem" }}>
                              {String(row.Date)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: "#2d3748", fontWeight: 500 }}>
                              {row.Current}
                            </TableCell>
                            <TableCell align="right" sx={{ color: "#2d3748", fontWeight: 500 }}>
                              {row.Voltage}
                            </TableCell>
                            <TableCell align="right" sx={{ color: "#2d3748", fontWeight: 500 }}>
                              {row.Angle}
                            </TableCell>
                            <TableCell align="right" sx={{ color: "#2d3748", fontWeight: 500 }}>
                              {row.LDR !== undefined ? row.LDR : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>
            
            <Grid item xs={12} lg={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3,
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  bgcolor: "#ffffff"
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <i className="fas fa-wind" style={{ fontSize: 16, color: "#caffbf" }}></i>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#2d3748" }}>
                    Wind Records
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2, borderColor: "#e2e8f0" }} />
                {loading ? (
                  <TableSkeleton />
                ) : (
                  <TableContainer sx={{ maxHeight: 420 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, bgcolor: "#f7fafc", color: "#2d3748" }}>
                            Date & Time
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, bgcolor: "#f7fafc", color: "#2d3748" }}>
                            Current (A)
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, bgcolor: "#f7fafc", color: "#2d3748" }}>
                            Voltage (V)
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, bgcolor: "#f7fafc", color: "#2d3748" }}>
                            Angle (°)
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {wind?.map((row, idx) => (
                          <TableRow 
                            key={row.id} 
                            hover
                            sx={{ 
                              "&:hover": { bgcolor: "#f7fafc" },
                              bgcolor: idx % 2 === 0 ? "#ffffff" : "#fafbfd"
                            }}
                          >
                            <TableCell sx={{ color: "#4a5568", fontSize: "0.875rem" }}>
                              {(row.Date)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: "#2d3748", fontWeight: 500 }}>
                              {row.Current}
                            </TableCell>
                            <TableCell align="right" sx={{ color: "#2d3748", fontWeight: 500 }}>
                              {row.Voltage}
                            </TableCell>
                            <TableCell align="right" sx={{ color: "#2d3748", fontWeight: 500 }}>
                              {row.Angle}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  )
}

// UI sub-components
function MetricCard({ 
  title, 
  value, 
  unit, 
  icon, 
  color 
}: { 
  title: string
  value?: number
  unit: string
  icon: string
  color: string
}) {
  return (
    <Grid item xs={12} sm={6} md={3}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
          height: "100%",
          transition: "all 0.3s ease",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)"
          }
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: "#718096", 
              fontWeight: 500,
              fontSize: "0.875rem"
            }}
          >
            {title}
          </Typography>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "10px",
              bgcolor: `${color}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <i className={`fas ${icon}`} style={{ fontSize: 18, color: color }}></i>
          </Box>
        </Box>
        {value === undefined ? (
          <Skeleton width="60%" height={40} sx={{ borderRadius: "8px" }} />
        ) : (
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                color: "#2d3748",
                letterSpacing: "-0.02em"
              }}
            >
              {value.toFixed(2)}
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: "#718096", 
                fontWeight: 500,
                fontSize: "1rem"
              }}
            >
              {unit}
            </Typography>
          </Box>
        )}
      </Paper>
    </Grid>
  )
}

function TableSkeleton() {
  return (
    <Box>
      {[...Array(5)].map((_, i) => (
        <Skeleton 
          key={i} 
          height={48} 
          sx={{ 
            mb: 1, 
            borderRadius: "8px" 
          }} 
        />
      ))}
    </Box>
  )
}