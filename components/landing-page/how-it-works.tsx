const steps = [
  {
    title: "Set up the project",
    description:
      "Add the client, scope, and dates. Keep the work and the people around it together.",
  },
  {
    title: "Share the project link",
    description:
      "Invite the client to a private portal with the files and updates they need.",
  },
  {
    title: "Move forward with a decision",
    description:
      "Clients approve, request a change, or leave a comment right beside the deliverable.",
  },
];

export function HowItWorks() {
  return (
    <section id="workflow" className="landing-section scroll-mt-20">
      <div className="landing-section-inner">
        <header className="landing-section-header">
          <p className="landing-section-label">A straightforward workflow</p>
          <h2>Share the work. Get a clear answer.</h2>
          <p>
            Start with a project, bring the client in when the work is ready,
            and keep their decision with the deliverable.
          </p>
        </header>

        <div className="landing-flow">
          {steps.map((step, index) => (
            <article className="landing-flow-step" key={step.title}>
              <span className="landing-flow-count">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
