function Filters({
  selectedDiet,
  setSelectedDiet,
  dietTypes = [],
  onRefresh,
  loading,
}) {
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <section className="filters-section">
      <h2>Filters and Data Interaction</h2>

      <div className="filter-controls">
        <select
          value={selectedDiet}
          onChange={(event) => setSelectedDiet(event.target.value)}
        >
          <option value="All">All Diet Types</option>
          {dietTypes.map((diet) => (
            <option key={diet} value={diet}>
              {cap(diet)}
            </option>
          ))}
        </select>

        <button type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "Loading..." : "Get Nutritional Insights"}
        </button>
      </div>
    </section>
  );
}

export default Filters;
