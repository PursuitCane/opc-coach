import ReactMarkdown from 'react-markdown'

export function MarkdownView({ children }: { children: string }) {
  return (
    <div className="opc-md">
      <ReactMarkdown
        components={{
          h1: (p) => <h1 style={{ fontSize: 20, margin: '16px 0 8px' }} {...p} />,
          h2: (p) => <h2 style={{ fontSize: 17, margin: '18px 0 8px' }} {...p} />,
          h3: (p) => (
            <h3 style={{ fontSize: 14.5, margin: '14px 0 6px', color: '#cfd3e5' }} {...p} />
          ),
          p: (p) => (
            <p
              style={{
                fontSize: 13.5,
                lineHeight: 1.9,
                color: '#cfd3e5',
                margin: '0 0 12px',
              }}
              {...p}
            />
          ),
          ul: (p) => (
            <ul
              style={{
                fontSize: 13.5,
                lineHeight: 1.85,
                color: '#cfd3e5',
                paddingLeft: 20,
                margin: '0 0 12px',
              }}
              {...p}
            />
          ),
          ol: (p) => (
            <ol
              style={{
                fontSize: 13.5,
                lineHeight: 1.85,
                color: '#cfd3e5',
                paddingLeft: 20,
                margin: '0 0 12px',
              }}
              {...p}
            />
          ),
          strong: (p) => <strong style={{ color: '#e7e7ee' }} {...p} />,
          em: (p) => (
            <em
              style={{
                background: 'rgba(145,132,217,.16)',
                boxShadow: 'inset 0 -1px 0 rgba(145,132,217,.5)',
                padding: '1px 2px',
                fontStyle: 'normal',
              }}
              {...p}
            />
          ),
          code: (p) => (
            <code
              style={{
                background: '#1c1e2c',
                padding: '1px 6px',
                borderRadius: 4,
                fontSize: 12.5,
              }}
              {...p}
            />
          ),
          blockquote: (p) => (
            <blockquote
              style={{
                borderLeft: '2px solid var(--color-accent)',
                paddingLeft: 14,
                margin: '12px 0',
                color: '#b2b6ca',
                fontSize: 13,
              }}
              {...p}
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
