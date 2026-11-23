import type { DeviceStatus } from "../../viewmodels/useDeviceCheck";

const TEXT: Record<DeviceStatus, string> = {
  idle: "Not tested",
  checking: "Checking…",
  ready: "Working",
  blocked: "Permission blocked",
  error: "Not available",
};

export default function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
  return <span className={`badge badge--device-${status}`}>{TEXT[status]}</span>;
}
