import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const renderMermaid = async () => {
      try {
        // Clean up and preprocess the chart content
        let cleanChart = chart.trim();

        // Convert HTML line breaks to Mermaid-compatible line breaks
        cleanChart = cleanChart.replace(/<br\s*\/?>/g, '\n    ');

        // Handle multiline labels by ensuring proper quoting
        cleanChart = cleanChart.replace(/\[([^\]]*)<br[^>]*>([^\]]*)\]/g, (match, before, after) => {
          return `["${before.trim()}\n${after.trim()}"]`;
        });

        // Convert <br/> tags within brackets to newlines with proper indentation
        cleanChart = cleanChart.replace(/\[([^[\]]*)<br\/?>([^[\]]*)\]/g, '["$1\n$2"]');

        // Handle cases where labels might not be properly quoted for multiline
        cleanChart = cleanChart.replace(/\[([^[\]]*\n[^[\]]*)\]/g, '["$1"]');

        // Initialize Mermaid with enhanced configuration
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose',
          fontFamily: 'inherit',
          fontSize: 16,
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'linear',
            padding: 20,
            nodeSpacing: 50,
            rankSpacing: 50,
            defaultRenderer: 'dagre-d3',
          },
          sequence: {
            useMaxWidth: true,
            boxMargin: 10,
            noteMargin: 10,
            messageMargin: 35,
            mirrorActors: false,
          },
          journey: {
            useMaxWidth: true,
          },
          gitGraph: {
            useMaxWidth: true,
          },
          c4: {
            useMaxWidth: true,
            diagramMarginX: 50,
            diagramMarginY: 30,
          },
        });

        // Generate unique ID for the diagram
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(id, cleanChart);
        setSvg(renderedSvg);
        setError('');
      } catch (err) {
        console.error('Mermaid rendering error:', err);

        // Try a fallback approach with even more aggressive cleaning
        try {
          let fallbackChart = chart.trim();

          // Remove all HTML tags and replace with simple line breaks
          fallbackChart = fallbackChart.replace(/<[^>]*>/g, ' ');

          // Clean up multiple spaces
          fallbackChart = fallbackChart.replace(/\s+/g, ' ');

          // Try to render the cleaned version
          const fallbackId = `mermaid-fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const { svg: fallbackSvg } = await mermaid.render(fallbackId, fallbackChart);
          setSvg(fallbackSvg);
          setError('');
        } catch (fallbackErr) {
          console.error('Mermaid fallback also failed:', fallbackErr);
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
          setSvg('');
        }
      }
    };

    if (chart.trim()) {
      renderMermaid();
    }
  }, [chart]);

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 p-4 rounded-md">
        <div className="text-red-800 text-sm font-medium mb-2">Diagram Error</div>
        <div className="text-red-600 text-xs font-mono whitespace-pre-wrap mb-2">{error}</div>
        <details className="text-red-600 text-xs">
          <summary className="cursor-pointer hover:text-red-800">View diagram source</summary>
          <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-x-auto">
            {chart}
          </pre>
        </details>
        <div className="mt-2 text-red-700 text-xs">
          <strong>Tip:</strong> Try using quoted labels for multiline text: <code>["Line 1\nLine 2"]</code>
        </div>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="border border-gray-200 bg-gray-50 p-4 rounded-md flex items-center justify-center">
        <div className="text-gray-500 text-sm">Rendering diagram...</div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="mermaid-diagram overflow-x-auto border border-gray-200 bg-white p-4 rounded-md"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}