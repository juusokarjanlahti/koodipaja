import ReactMarkdown from "react-markdown";
import { hastText } from "@/lib/markdown/hast-text";
import { BlockSnippet, InlineSnippet } from "./snippet";

/** Assignment text: Markdown where every code span and block can be copied or dragged. */
export function Assignment({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      components={{
        // Fenced blocks: render the whole block as one snippet (text without trailing newline).
        pre: ({ node }) => <BlockSnippet text={hastText(node).replace(/\n$/, "")} />,
        // Inline code (code inside <pre> is handled above and never reaches here).
        code: ({ node }) => <InlineSnippet text={hastText(node)} />,
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
