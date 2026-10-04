const questions = [
  {
    question: "What is freelance project management software?",
    answer:
      "It helps independent professionals plan client work, track projects and deadlines, share deliverables, and get approvals. Handoff keeps those project details beside client records, feedback, and invoices.",
  },
  {
    question: "Is Handoff free to use?",
    answer:
      "Handoff is free to self-host during beta under the MIT license. A hosted paid plan is planned, but subscriptions and online checkout are not available yet.",
  },
  {
    question: "Do clients need an account to use the client portal?",
    answer:
      "No. Share a private project link so clients can review files, comment, approve a deliverable, or request a change without creating an account.",
  },
  {
    question: "Can Handoff manage freelance clients and projects?",
    answer:
      "Yes. Handoff is client management software for freelancers that connects client details with projects, deliverables, requests, invoices, and activity, so you can find the context for a piece of work without searching across separate tools.",
  },
  {
    question: "Who is Handoff for?",
    answer:
      "Handoff is built for freelancers, independent consultants, designers, developers, and small studios that need straightforward project tracking and a clear way to share work with clients.",
  },
];

export function FrequentlyAskedQuestions() {
  return (
    <section id="faq" className="landing-section scroll-mt-20">
      <div className="landing-section-inner landing-faq">
        <header className="landing-section-header">
          <p className="landing-section-label">Questions</p>
          <h2>Freelance project management FAQs</h2>
          <p>What to know about Handoff, its client portal, and the beta.</p>
        </header>

        <div className="landing-faq-list">
          {questions.map(({ question, answer }) => (
            <details className="landing-faq-item" key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
