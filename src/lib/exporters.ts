export function download(blob: Blob, name: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function buildHandlingMeta(h: {
  handlingName: string;
  fMass: number;
  fInitialDriveForce: number;
  fBrakeForce: number;
  fSteeringLock: number;
}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<CHandlingDataMgr>
  <HandlingData>
    <Item type="CHandlingData">
      <handlingName>${h.handlingName}</handlingName>
      <fMass value="${h.fMass.toFixed(6)}" />
      <fInitialDriveForce value="${h.fInitialDriveForce.toFixed(6)}" />
      <fBrakeForce value="${h.fBrakeForce.toFixed(6)}" />
      <fSteeringLock value="${h.fSteeringLock.toFixed(6)}" />
    </Item>
  </HandlingData>
</CHandlingDataMgr>
`;
}
