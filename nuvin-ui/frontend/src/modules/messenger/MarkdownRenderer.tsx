import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MermaidDiagram } from './MermaidDiagram';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className = '',
}: MarkdownRendererProps) {
  // Pre-process content to handle various nesting scenarios
  const processContent = (rawContent: string): string => {
    let processedContent = rawContent;

    // Case 1: If the entire content is wrapped in ```markdown...```
    // Extract the inner content
    const fullMarkdownMatch = /^```markdown\s*\n([\s\S]*)\n```$/m.exec(
      processedContent.trim(),
    );
    if (fullMarkdownMatch) {
      processedContent = fullMarkdownMatch[1];
    }

    // Case 2: Look for any ```markdown blocks within the content and extract their inner content
    const markdownBlockRegex = /```markdown\s*\n([\s\S]*?)\n```/g;
    processedContent = processedContent.replace(
      markdownBlockRegex,
      (match, innerContent) => {
        return innerContent;
      },
    );

    // Case 3: Handle plain mermaid syntax without code block wrapping
    // Look for lines that start with "mermaid" followed by diagram content
    processedContent = processedContent.replace(
      /^mermaid\s*\n((?:(?!```).)+?)(?=\n\n|\n\*\*|$)/gms,
      (match, diagramContent) => {
        return `\`\`\`mermaid\n${diagramContent.trim()}\n\`\`\``;
      },
    );

    // Case 4: Look for any nested code blocks that might have been escaped
    // Handle cases where backticks might be escaped
    processedContent = processedContent.replace(/\\`\\`\\`/g, '```');

    return processedContent;
  };

  const processedContent = processContent(content);

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom code block component that handles Mermaid
          code: ({ children, className, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            // if (language === 'mermaid') {
            //   return <MermaidDiagram chart={String(children)} />;
            // }

            // Special handling for markdown language code blocks
            // If someone sends a markdown code block, render its content as markdown
            if (language === 'markdown') {
              return (
                <div className="nested-markdown border border-blue-200 bg-blue-50 p-4 rounded-md">
                  <div className="text-blue-800 text-sm font-medium mb-2">
                    Markdown Content:
                  </div>
                  <MarkdownRenderer content={String(children)} />
                </div>
              );
            }

            // For inline code (no className means it's inline)
            if (!className) {
              return (
                <code
                  className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // For code blocks
            return (
              <pre className="bg-gray-100 border border-gray-200 rounded-md p-4 overflow-x-auto">
                <code className={`text-sm ${className || ''}`} {...props}>
                  {children}
                </code>
              </pre>
            );
          },

          // Style headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 border-b border-gray-200 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mb-3 border-b border-gray-200 pb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mb-2">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mb-2">{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm font-semibold mb-2">{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-xs font-semibold mb-2">{children}</h6>
          ),

          // Style paragraphs
          p: ({ children }) => (
            <p className="mb-4 leading-relaxed">{children}</p>
          ),

          // Improved list styling with proper spacing and indentation
          ul: ({ children }) => (
            <ul className="mb-4 space-y-2 pl-4 list-disc list-outside">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 space-y-2 pl-4 list-decimal list-outside">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-sm leading-relaxed pl-1">{children}</li>
          ),

          // Style blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 mb-4 italic text-gray-600">
              {children}
            </blockquote>
          ),

          // Style tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-gray-200 rounded-md">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-200">{children}</tbody>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-sm text-gray-900 border-b border-gray-200">
              {children}
            </td>
          ),

          // Style links
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-600 hover:text-blue-800 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),

          // Style horizontal rules
          hr: () => <hr className="my-8 border-gray-200" />,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
