import { useState, useEffect, useCallback } from "react";

import Header from "./components/Header.jsx";
import Metadata from "./components/Metadata.jsx";
import BarChartCard from "./components/BarChartCard.jsx";
import ScatterChartCard from "./components/ScatterChartCard.jsx";
import PieChartCard from "./components/PieChartCard.jsx";
import HeatmapCard from "./components/HeatmapCard.jsx";
import Filters from "./components/Filters.jsx";

import { fetchDashboard } from "./services/api.js";

import "./App.css";

// Empty starting state so the charts render (blank) before the first fetch returns.
const EMPTY = {
  metadata: { selectedDiet: "All Diet Types", recordsAnalyzed: 0, executionTimeMs: 0 },
  barChart: { labels: [], protein: [], carbohydrates: [], fat: [] },
  scatterPlot: [],
  pieChart: { labels: [], values: [] },
  correlations: [],
  dietTypes: [],
};

function App() {
  const [selectedDiet, setSelectedDiet] = useState("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dashboardData, setDashboardData] = useState(EMPTY);

  const load = useCallback(async (diet) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchDashboard(diet);
      setDashboardData(data);
    } catch (e) {
      console.error(e);
      setError("Could not reach the Azure Function. Make sure it's running and CORS is enabled.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Pull live data from Azure once, on first render.
  useEffect(() => {
    load("All");
  }, [load]);

  const handleRefresh = () => load(selectedDiet);

  return (
    <>
      <Header />

      <main className="dashboard">
        <h2>Explore Nutritional Insights</h2>

        <Metadata metadata={dashboardData.metadata} />

        {error && (
          <p style={{ color: "#c92a2a", fontWeight: 600 }}>{error}</p>
        )}

        <section className="charts-grid">
          <BarChartCard chartData={dashboardData.barChart} />
          <ScatterChartCard chartData={dashboardData.scatterPlot} />
          <HeatmapCard correlations={dashboardData.correlations} />
          <PieChartCard chartData={dashboardData.pieChart} />
        </section>

        <Filters
          selectedDiet={selectedDiet}
          setSelectedDiet={setSelectedDiet}
          dietTypes={dashboardData.dietTypes}
          onRefresh={handleRefresh}
          loading={loading}
        />
      </main>
    </>
  );
}

export default App;
