export function PlaceholderPage({ title, copy, items = [] }) {
  return (
    <section className="placeholder-page">
      <div className="placeholder-hero">
        <p className="placeholder-kicker">Kanxi Collection</p>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      <div className="placeholder-grid">
        {items.map((item) => (
          <article className="placeholder-card" key={item.title}>
            <div className="placeholder-icon" aria-hidden="true">
              {item.icon}
            </div>
            <h2>{item.title}</h2>
            <p>{item.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
