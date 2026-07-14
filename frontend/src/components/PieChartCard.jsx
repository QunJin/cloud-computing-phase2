import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";

import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

function PieChartCard({ chartData }) {
  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: "Number of Recipes",
        data: chartData.values,
        backgroundColor: [
          "rgba(37, 99, 235, 0.75)",
          "rgba(16, 185, 129, 0.75)",
          "rgba(245, 158, 11, 0.75)",
          "rgba(124, 58, 237, 0.75)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: "Recipe Distribution by Diet Type",
      },
    },
  };

  return (
    <article className="chart-card">
      <h3>Pie Chart</h3>
      <p>Distribution of recipes by diet type.</p>

      <div className="chart-container">
        <Pie data={data} options={options} />
      </div>
    </article>
  );
}

export default PieChartCard;