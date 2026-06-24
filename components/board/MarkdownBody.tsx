import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

/**
 * Markdown本文を安全にレンダリングする。
 * HTML直接入力は無効化し、rehype-sanitize でサニタイズする。
 */
export function MarkdownBody({ bodyMd }: { bodyMd: string }) {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
      >
        {bodyMd}
      </ReactMarkdown>
    </div>
  );
}
