export default function Loading() {
  return (
    <main className="app-frame">
      <div className="screen-shell">
        <header className="topbar">
          <div className="skeleton skeleton-logo" />
          <div className="header-actions">
            <div className="skeleton skeleton-icon" />
            <div className="skeleton skeleton-icon" />
          </div>
        </header>

        <div className="page-content">
          <div className="skeleton skeleton-hero" />
          <div className="skeleton-row">
            <div className="skeleton skeleton-chip" />
            <div className="skeleton skeleton-chip" />
            <div className="skeleton skeleton-chip" />
            <div className="skeleton skeleton-chip" />
          </div>
          <div className="skeleton skeleton-section-title" />
          <div className="skeleton-grid">
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
          </div>
        </div>
      </div>
    </main>
  );
}
