import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Modal from "./Modal";

// SVG is decoded by an image document, never inserted into the application DOM.
// Image documents disable scripting; reject external resources as an extra boundary.
export function svgImage(source: string): string | null {
  const svg = source.trim();
  if (
    svg.length > 2 * 1024 * 1024 ||
    !/^<svg[\s>]/i.test(svg) ||
    !/<\/svg>\s*$/i.test(svg)
  )
    return null;
  if (
    /<!DOCTYPE|<!ENTITY|<script\b|<foreignObject\b|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?!#)|@import|url\(\s*["']?(?!#)/i.test(
      svg,
    )
  )
    return null;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
export function safeImage(source: string | undefined): string | undefined {
  return source &&
    /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/.test(
      source,
    ) &&
    source.length <= 20 * 1024 * 1024
    ? source
    : undefined;
}
function ImagePreview({
  src,
  alt = "Ảnh do AI tạo",
}: {
  src: string;
  alt?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <button
        type="button"
        className="generated-image"
        onClick={() => setExpanded(true)}
        aria-label="Phóng to ảnh"
      >
        <img src={src} alt={alt} />
        <span>Phóng to ảnh</span>
      </button>
      {expanded && (
        <Modal title={alt} onClose={() => setExpanded(false)}>
          <img className="expanded-generated-image" src={src} alt={alt} />
        </Modal>
      )}
    </>
  );
}
export default function MessageContent({ text }: { text: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      urlTransform={(url) => safeImage(url) ?? (url.startsWith("#") ? url : "")}
      components={{
        a: ({ children }) => <span className="plain-link">{children}</span>,
        img: ({ src, alt }) => {
          const safe = safeImage(src);
          return safe ? (
            <ImagePreview src={safe} alt={alt} />
          ) : (
            <span>Ảnh bên ngoài chưa được tải.</span>
          );
        },
        pre: ({ children }) => (
          <div className="message-code-block">{children}</div>
        ),
        code: ({ className, children, ...props }) => {
          const source = String(children).replace(/\n$/, "");
          const image = svgImage(source);
          return image ? (
            <div className="svg-artifact">
              <ImagePreview src={image} />
              <details>
                <summary>Xem mã SVG</summary>
                <pre>
                  <code className={className}>{source}</code>
                </pre>
              </details>
            </div>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {text}
    </Markdown>
  );
}
