import { USE_MOCK_API } from "../../services/config";

/** Marks results that come from the mock API rather than real model output. */
export default function SampleBadge({ force }: { force?: boolean }) {
  if (!USE_MOCK_API && !force) return null;
  return (
    <span className="badge badge--sample" title="Generated sample data, not real analysis">
      Sample result
    </span>
  );
}
