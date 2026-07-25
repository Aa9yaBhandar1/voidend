import type { SchemaField } from "~/lib/faker-options";

function normalize(s: string): string {
    return s.toLowerCase().replace(/[_\s-]/g, "");
}

/**
 * Finds the user's actual fieldName matching any of the given candidates
 * (case + separator insensitive). Returns null if none found so the
 * template can decide on a fallback.
 */
export function findField(fields: SchemaField[], candidates: string[]): string | null {
    const normalizedCandidates = new Set(candidates.map(normalize));
    const match = fields.find((f) => normalizedCandidates.has(normalize(f.fieldName)));
    return match ? match.fieldName : null;
}

/**
 * Builds a fetch hook that handles both response shapes from the mock
 * endpoint: a single object (count === 1) or an array (count > 1).
 */
export function buildFetchHook(
    hookName: string,
    endpointUrl: string,
    itemTypeName: string,
): string {
    return `function use${hookName}Data() {
  const [data, setData] = useState<${itemTypeName}[] | ${itemTypeName} | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("${endpointUrl}")
      .then((res) => {
        if (!res.ok) throw new Error(\`Request failed: \${res.status}\`);
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => setError(err instanceof Error ? err.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}`;
}

export function buildInterface(name: string, fieldLines: string[]): string {
    return `interface ${name} {
${fieldLines.map((l) => `  ${l}`).join("\n")}
}`;
}
