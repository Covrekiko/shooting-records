export function groupSizeMoa(groupSizeMm, distanceMeters) {
  const size = Number(groupSizeMm);
  const distance = Number(distanceMeters);
  if (!Number.isFinite(size) || !Number.isFinite(distance) || size <= 0 || distance <= 0) return null;
  const inches = size / 25.4;
  const yards = distance * 1.0936133;
  return inches / (yards / 100) / 1.047;
}

export function groupSizeMrad(groupSizeMm, distanceMeters) {
  const size = Number(groupSizeMm);
  const distance = Number(distanceMeters);
  if (!Number.isFinite(size) || !Number.isFinite(distance) || size <= 0 || distance <= 0) return null;
  return size / distance;
}