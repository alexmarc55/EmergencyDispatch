import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { get_incidents, health_check } from "../services/api";
import "./StatisticsPage.css";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

export default function StatisticsPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const userId = parseInt(localStorage.getItem("user_id"));
  const [filter, setFilter] = useState("day");
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
  const [health, setHealth] = useState(null);

  const fetchData = async () => {
    try {
      const data = await get_incidents();
      setIncidents(data);
    } catch (error) {
      console.error("Error fetching incidents:", error);
    }
  };

  const fetchHealthStatus = async () => {
    setIsRefreshingHealth(true);
    try {
      const data = await health_check();
      setHealth(data);
    } catch (error) {
      console.error("Error fetching health:", error);
    } finally {
      setTimeout(() => setIsRefreshingHealth(false), 1000);
    }
  };

  useEffect(() => {
    if (!userId) {
      navigate("/login_page");
      return;
    }
    fetchData();
    fetchHealthStatus();

    const interval = setInterval(fetchData, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, [userId, navigate]);

  // --- Data Transformation ---
  const chartData = useMemo(() => {
    const now = new Date();

    const filtered = incidents.filter((inc) => {
      if (!inc.processing_time_seconds || !inc.started_at) return false;

      const incDate = new Date(inc.started_at);
      const diffInMs = now - incDate;

      // Safety check: if diff is negative (future), we still show it in 'day'
      if (filter === "day")
        return diffInMs <= 24 * 60 * 60 * 1000 || diffInMs < 0;
      if (filter === "week") return diffInMs <= 7 * 24 * 60 * 60 * 1000;
      if (filter === "month") return diffInMs <= 30 * 24 * 60 * 60 * 1000;
      return true;
    });

    const sorted = filtered.sort(
      (a, b) => new Date(a.started_at) - new Date(b.started_at),
    );

    const labels = sorted.map((inc) => {
      const d = new Date(inc.started_at);
      const isToday = d.toDateString() === new Date().toDateString();

      return isToday
        ? d.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : d.toLocaleDateString([], { day: "numeric", month: "short" }) +
            " " +
            d.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
    });

    const dataPoints = sorted.map((inc) => Number(inc.processing_time_seconds));

    return {
      labels,
      datasets: [
        {
          label: `Response Time (Seconds)`,
          data: dataPoints,
          borderColor: "#ff4444",
          backgroundColor: "rgba(255, 68, 68, 0.2)",
          tension: 0.3,
          fill: true,
          pointRadius: 4,
        },
      ],
    };
  }, [incidents, filter]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { font: { size: 14 } },
      },
      title: {
        display: true,
        text: "Response Time Trends",
        font: { size: 18 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Seconds", font: { weight: "bold" } },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  return (
    <div className="app-container">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="main-content">
        <Sidebar isOpen={sidebarOpen} />
        <div className={`statistics-page ${sidebarOpen ? "sidebar-open" : ""}`}>
          <div className="stats-header">
            <div>
              <h2>System Analytics</h2>
              <p>Performance status and response metrics</p>
            </div>
          </div>

          {/* Health Section */}
          <div className="section-header">
            <h3>System Health</h3>
            <button
              className={`refresh-health-btn ${isRefreshingHealth ? "spinning" : ""}`}
              onClick={fetchHealthStatus}
              disabled={isRefreshingHealth}
            >
              {isRefreshingHealth ? "Checking..." : "Refresh Health Status"}
            </button>
          </div>

          <div className="health-dashboard">
            {health ? (
              <>
                <div className="health-card">
                  <span className="label">Database</span>
                  <span
                    className={`status-pill ${health.services.database === "Connected" ? "green" : "red"}`}
                  >
                    {health.services.database}
                  </span>
                </div>
                <div className="health-card">
                  <span className="label">Geoapify</span>
                  <span
                    className={`status-pill ${health.services.geoapify?.status === "Healthy" ? "green" : "red"}`}
                  >
                    {health.services.geoapify?.status || "Error"}

                    {health.services.geoapify?.latency_ms && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          marginLeft: "8px",
                          opacity: 0.7,
                        }}
                      >
                        ({Math.round(health.services.geoapify.latency_ms)}ms)
                      </span>
                    )}
                  </span>
                </div>
                <div className="health-card">
                  <span className="label">ORS Routing</span>
                  <span
                    className={`status-pill ${health.services.ors_routing === "Healthy" ? "green" : "red"}`}
                  >
                    {health.services.ors_routing}
                  </span>
                </div>
                <div className="health-card">
                  <span className="label">Queue Engine</span>
                  <span
                    className={`status-pill ${health.engine.queue_processor === "Active" ? "green" : "red"}`}
                  >
                    {health.engine.queue_processor}
                  </span>
                </div>
              </>
            ) : (
              <div className="loading-health">No health data available.</div>
            )}
          </div>

          <div className="chart-controls-wrapper">
            <div className="controls-group">
              <div className="filter-buttons">
                {["day", "week", "month"].map((f) => (
                  <button
                    key={f}
                    className={filter === f ? "active" : ""}
                    onClick={() => setFilter(f)}
                  >
                    {f === "day" ? "24H" : f === "week" ? "7D" : "30D"}
                  </button>
                ))}
              </div>
              <button className="refresh-btn" onClick={fetchData}>
                Refresh Chart
              </button>
            </div>
          </div>

          {/* Chart */}
          <div className="stats-grid">
            <div className="chart-container">
              {incidents.length > 0 ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div className="loading-placeholder">
                  Gathering data points...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
