export default function DashboardLoading() {
  return (
    <div className="dashboard-page" aria-label="Carregando painel" aria-busy="true">
      <div className="skeleton skeleton--heading" />
      <div className="metric-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="skeleton skeleton--metric" key={index} />
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="skeleton skeleton--panel" />
        <div className="skeleton skeleton--panel" />
      </div>
    </div>
  );
}
