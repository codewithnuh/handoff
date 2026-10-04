const features = [
  {
    title: "Keep every project moving",
    description:
      "Track milestones, deliverables, requests, and deadlines together. Each project has a clear status, so you can spot what needs a decision.",
    note: "Projects · Deliverables · Requests",
  },
  {
    title: "Give clients one place to review",
    description:
      "Share a private project link. Clients can open files, leave comments, approve work, or ask for a change without creating an account.",
    note: "Client portal · File feedback · Approvals",
  },
  {
    title: "Keep the business side in view",
    description:
      "Connect invoices, payment status, and client details to the work they belong to. Less searching when it is time to follow up.",
    note: "Clients · Invoices · Activity",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="landing-section scroll-mt-20">
      <div className="landing-section-inner">
        <header className="landing-section-header">
          <p className="landing-section-label">Made for the whole engagement</p>
          <h2>From first brief to final payment.</h2>
          <p>
            Handoff keeps the details around a project connected, so you and
            your client can see what is happening without another status call.
          </p>
        </header>

        <div className="landing-feature-list">
          {features.map((feature) => (
            <article className="landing-feature-row" key={feature.title}>
              <h3>{feature.title}</h3>
              <div>
                <p>{feature.description}</p>
                <span>{feature.note}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
