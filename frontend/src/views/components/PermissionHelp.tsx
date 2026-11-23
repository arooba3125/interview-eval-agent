/** How to recover after the browser blocked camera or microphone access. */
export default function PermissionHelp({ device }: { device: "microphone" | "camera" }) {
  return (
    <details className="help">
      <summary>How to allow {device} access</summary>
      <ol>
        <li>Click the lock or {device} icon at the left of the address bar.</li>
        <li>Set {device === "camera" ? "Camera" : "Microphone"} to Allow for this site.</li>
        <li>If your system blocks it, check your OS privacy settings for the browser.</li>
        <li>Come back here and press Try again. You may need to reload the page.</li>
      </ol>
    </details>
  );
}
