import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface LatexMarkdownProps {
  content: string;
  isChat: boolean;
  className?: string;
  isUserMessage?: boolean;
}

type CodeComponentProps = HTMLAttributes<HTMLElement> & {
  inline?: boolean;
  children?: React.ReactNode;
};

const MarkdownLatexRender: React.FC<LatexMarkdownProps> = ({
  content,
  isChat,
  className,
  isUserMessage,
}) => {
  const processedContent = React.useMemo(() => {
    const escapedContent = content.replace(/`/g, "\\`");
    return escapedContent.replace(
      /latex\s*([\s\S]*?)\s*/g,
      (_, latex) => `$$${latex.trim()}$$`
    );
  }, [content]);

  const textColorClass = isUserMessage
    ? "text-zinc-50 dark:text-zinc-50"
    : "text-zinc-800 dark:text-zinc-800";

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1
              className={cn(
                isChat ? "my-1 text-lg font-bold" : "my-4 text-2xl font-bold",
                textColorClass
              )}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              className={cn(
                isChat ? "my-0.5 text-base font-semibold" : "my-3 text-xl font-semibold",
                textColorClass
              )}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              className={cn(
                isChat ? "my-0.5 text-sm font-medium" : "my-2 text-lg font-medium",
                textColorClass
              )}
            >
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p
              className={cn(
                "text-base leading-relaxed",
                isChat ? "my-0.5" : "my-2",
                isUserMessage ? "text-zinc-50 dark:text-zinc-50" : "text-gray-700 dark:text-gray-300"
              )}
            >
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className={cn(
              "ml-6 space-y-2 list-disc marker:text-gray-400",
              isChat ? "my-1" : "my-3"
            )}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className={cn(
              "ml-6 space-y-2 list-decimal marker:text-gray-400",
              isChat ? "my-1" : "my-3"
            )}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className={cn("pl-2 ml-2", textColorClass)}>
              {children}
            </li>
          ),
          code: ({ inline, children, ...props }: CodeComponentProps) => {
            const content = String(children).trim();
            return inline ? (
              <code
                className={cn(
                  "px-1 py-0.5 mx-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono text-sm",
                  textColorClass
                )}
                {...props}
              >
                {content}
              </code>
            ) : (
              <pre className={cn(
                "p-2 bg-gray-100 dark:bg-gray-800 rounded-md overflow-x-auto border border-gray-200 dark:border-gray-700",
                isChat ? "my-2" : "my-4"
              )}>
                <code
                  className={cn("font-mono text-sm leading-relaxed", textColorClass)}
                  {...props}
                >
                  {content}
                </code>
              </pre>
            );
          },
          blockquote: ({ children }) => (
            <blockquote
              className={cn(
                "pl-4 border-l-2 border-gray-300 dark:border-gray-600 italic",
                isChat ? "my-2" : "my-4",
                isUserMessage ? "text-zinc-50 dark:text-zinc-50" : "text-gray-700 dark:text-gray-300"
              )}
            >
              {children}
            </blockquote>
          ),
          em: ({ children }) => (
            <em className={cn("italic font-medium", textColorClass)}>
              {children}
            </em>
          ),
          strong: ({ children }) => (
            <strong className={cn("font-bold", textColorClass)}>
              {children}
            </strong>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownLatexRender;