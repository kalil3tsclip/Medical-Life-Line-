const items = [
  "Houston",
  "Missouri City",
  "Pearland",
  "Sugar Land",
  "Stafford",
  "Surrounding Areas",
  "Wheelchair & Ambulatory Rides",
  "Medical Appointments • Dialysis • Hospital Discharges",
];

export function ServiceTicker() {
  return (
    <div className="service-ticker" role="region" aria-label="Service area">
      <p className="sr-only">
        Serving {items.slice(0, 6).join(", ")}. Call or text (346) 909-7822.
      </p>
      <div className="service-ticker-track" aria-hidden="true">
        {[0, 1].map((copy) => (
          <div className="service-ticker-row" key={copy}>
            <span className="service-ticker-label">Now serving</span>
            {items.map((item) => (
              <span key={item} className="service-ticker-item">{item}</span>
            ))}
            <span className="service-ticker-item strong">Call or text (346) 909-7822</span>
          </div>
        ))}
      </div>
    </div>
  );
}
