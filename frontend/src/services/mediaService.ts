// Browser camera/microphone access. Plain functions, no React.

export async function openStream(withVideo: boolean): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}

export function createRecorder(stream: MediaStream): MediaRecorder {
  return new MediaRecorder(stream, { mimeType: "video/webm" });
}
