import { messages } from "../../text/messages";

// Block "Objective" in the node area of UI-003 (TechSpec 4.3): only shows the objective it gets. The content comes
// from NodeDetailDto with task #78, which also adds the empty state and Markdown (MAR-1516).

export function ObjectiveSection({ objective }: { objective: string }) {
  return (
    <section className="objective" aria-labelledby="objective-heading">
      <h2 id="objective-heading" className="visually-hidden">
        {messages["UI-003.objective"]}
      </h2>
      <p>{objective}</p>
    </section>
  );
}
