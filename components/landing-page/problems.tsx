const friction = [
  {
    title: "The latest file is hard to find",
    description: "Versions get buried in email threads and shared folders.",
  },
  {
    title: "Feedback loses its context",
    description: "A message arrives without a clear link to the work it refers to.",
  },
  {
    title: "The next step stays unclear",
    description: "An approval or a change request gets lost in the inbox.",
  },
];

export function ProblemSection() {
  return (
    <section className="landing-section">
      <div className="landing-section-inner landing-reasons">
        <div>
          <p className="landing-section-label">The work between the work</p>
          <h2>Good projects slow down when the details scatter.</h2>
          <p className="landing-copy">
            Freelance work already has enough moving parts. The brief, files,
            client notes, and final approval should stay attached to the same
            project.
          </p>
        </div>
        <div className="landing-reason-list">
          {friction.map((item) => (
            <article className="landing-reason" key={item.title}>
              <span className="landing-reason-mark" aria-hidden="true" />
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
