import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

function BarChartCard({ chartData }) {
  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: "Protein",
        data: chartData.protein,
        backgroundColor: "rgba(37, 99, 235, 0.7)",
      },
      {
        label: "Carbohydrates",
        data: chartData.carbohydrates,
        backgroundColor: "rgba(16, 185, 129, 0.7)",
      },
      {
        label: "Fat",
        data: chartData.fat,
        backgroundColor: "rgba(245, 158, 11, 0.7)",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <article className="chart-card">
      <h3>Bar Chart</h3>
      <p>Average macronutrient content by diet type.</p>

      <div className="chart-container">
        <Bar data={data} options={options} />
      </div>
    </article>
  );
}

export default BarChartCard;