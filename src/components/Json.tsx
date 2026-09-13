import { useMemo } from 'react';

const JWE_RE = /^[A-Za-z0-9_-]{20,}\.\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/**
 * Pretty-printed JSON that highlights compact JWEs and abbreviates them, so a
 * ciphertext payload stays readable instead of filling the panel.
 */
export function Json({ value, truncate = 64 }: { value: unknown; truncate?: number }) {
  const lines = useMemo(() => {
    const text = JSON.stringify(value, null, 2) ?? 'null';
    return text.split('\n').map((line) => {
      const match = line.match(/^(\s*(?:"[^"]+":\s*)?)"([^"]+)"(,?)$/);
      if (match && JWE_RE.test(match[2])) {
        const jwe = match[2];
        const shown = jwe.length > truncate ? `${jwe.slice(0, truncate)}…` : jwe;
        return { prefix: match[1], cipher: `"${shown}"`, suffix: match[3], full: jwe };
      }
      return { plain: line };
    });
  }, [value, truncate]);

  return (
    <pre className="json">
      {lines.map((line, i) =>
        'plain' in line ? (
          <div key={i}>{line.plain}</div>
        ) : (
          <div key={i} title={line.full}>
            {line.prefix}
            <span className="cipher">{line.cipher}</span>
            {line.suffix}
          </div>
        ),
      )}
    </pre>
  );
}
