import axios from "axios";

// Reads the URL from .env (VITE_API_URL). Falls back to the live function so the
// dashboard still works even if the env var isn't set on the deploy host.
const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://diet-insights-quanpham.azurewebsites.net/api";

// Dropdown value ("All", "keto", ...) -> query value the function expects ("all", "keto").
function dietParam(diet) {
  return !diet || diet === "All" ? "all" : diet.toLowerCase();
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Fires all three endpoints in parallel, then reshapes the responses into exactly
// the props BarChartCard / ScatterChartCard / PieChartCard / HeatmapCard / Metadata expect.
export async function fetchDashboard(diet = "All") {
  const params = { diet: dietParam(diet) };

  const [insightsRes, recipesRes, clustersRes] = await Promise.all([
    axios.get(`${API_BASE}/insights`, { params }),
    axios.get(`${API_BASE}/recipes`, { params: { ...params, page: 1, page_size: 10 } }),
    axios.get(`${API_BASE}/clusters`, { params: { ...params, k: 4 } }),
  ]);

  const insights = insightsRes.data;
  const recipes = recipesRes.data;
  const clusters = clustersRes.data;

  // Bar chart: average protein / carbs / fat per diet type
  const barChart = {
    labels: insights.avg_macros.map((d) => d.diet_type),
    protein: insights.avg_macros.map((d) => d.protein),
    carbohydrates: insights.avg_macros.map((d) => d.carbs),
    fat: insights.avg_macros.map((d) => d.fat),
  };

  // Scatter plot: protein vs carbs, using the clustered recipe points
  const scatterPlot = clusters.points.map((p) => ({ x: p.protein, y: p.carbs }));

  // Pie chart: number of recipes per diet type
  const pieChart = {
    labels: recipes.distribution.map((d) => d.diet_type),
    values: recipes.distribution.map((d) => d.count),
  };

  // Heatmap table: turn the 3x3 correlation matrix into readable pairs
  const m = insights.correlation.values;
  const correlations = [
    { nutrients: "Protein & Carbs", value: m[0][1].toFixed(2) },
    { nutrients: "Protein & Fat", value: m[0][2].toFixed(2) },
    { nutrients: "Carbs & Fat", value: m[1][2].toFixed(2) },
  ];

  const metadata = {
    selectedDiet: diet === "All" ? "All Diet Types" : cap(diet),
    recordsAnalyzed: insights.recipe_count,
    executionTimeMs: Math.round(insights._meta?.execution_ms ?? 0),
  };

  return {
    metadata,
    barChart,
    scatterPlot,
    pieChart,
    correlations,
    dietTypes: insights.diet_types, // ["dash","keto","mediterranean","paleo","vegan"]
  };
}
