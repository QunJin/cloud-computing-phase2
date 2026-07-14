function Metadata({ metadata }) {
  return (
    <section className="metadata">
      <div className="metadata-card">
        <span>Selected Diet</span>
        <strong>{metadata.selectedDiet}</strong>
      </div>

      <div className="metadata-card">
        <span>Records Analyzed</span>
        <strong>{metadata.recordsAnalyzed}</strong>
      </div>

      <div className="metadata-card">
        <span>Execution Time</span>
        <strong>{metadata.executionTimeMs} ms</strong>
      </div>
    </section>
  );
}

export default Metadata;