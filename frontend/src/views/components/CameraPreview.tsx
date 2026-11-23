import { useEffect, useRef } from "react";

interface Props {
  stream: MediaStream | null;
  label?: string;
  placeholder?: string;
  recording?: boolean;
}

/** Live, mirrored self-view. Muted so the candidate does not hear themselves. */
export default function CameraPreview({ stream, label = "Your camera preview", placeholder = "Camera is off", recording }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  const hasVideo = !!stream && stream.getVideoTracks().length > 0;
  return (
    <div className={`camera${recording ? " camera--recording" : ""}`}>
      {hasVideo ? (
        <video ref={ref} autoPlay muted playsInline aria-label={label} />
      ) : (
        <div className="camera__placeholder">
          <span aria-hidden="true" className="camera__icon">
            ◎
          </span>
          <span>{placeholder}</span>
        </div>
      )}
      {recording && (
        <span className="camera__rec">
          <span className="rec-dot" aria-hidden="true" /> REC
        </span>
      )}
    </div>
  );
}
