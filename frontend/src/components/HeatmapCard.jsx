function HeatmapCard({ correlations }) {
  return (
    <div className="chart-card">
      <h3>Heatmap</h3>
      <p>Nutrient correlations.</p>

      <div className="correlation-table">
        <table>
          <thead>
            <tr>
              <th>Nutrients</th>
              <th>Correlation</th>
            </tr>
          </thead>

          <tbody>
            {correlations.map((item, index) => (
              <tr key={index}>
                <td>{item.nutrients}</td>
                <td>{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HeatmapCard;