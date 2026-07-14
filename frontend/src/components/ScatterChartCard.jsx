import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";

import { Scatter } from "react-chartjs-2";

ChartJS.register(
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title
);

function ScatterChartCard({ chartData }) {
  const data = {
    datasets: [
      {
        label: "Protein vs Carbohydrates",
        data: chartData,
        backgroundColor: "rgba(124, 58, 237, 0.7)",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Protein",
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Carbohydrates",
        },
      },
    },
  };

  return (
    <article className="chart-card">
      <h3>Scatter Plot</h3>
      <p>Relationship between protein and carbohydrate content.</p>

      <div className="chart-container">
        <Scatter data={data} options={options} />
      </div>
    </article>
  );
}

export default ScatterChartCard;