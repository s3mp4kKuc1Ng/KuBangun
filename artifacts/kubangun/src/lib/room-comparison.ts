import { areaPreviewGeometry } from './area-preview';
import type { Room, RoomState } from './types';

export const ROOM_STATE_LABEL: Record<RoomState, string> = {
  existing: 'Eksisting', proposed: 'Usulan', unknown: 'Belum ditentukan',
};
// Missing state is intentionally NOT inferred from project mode, name, or source.
export const roomState = (room: Room): RoomState =>
  room.state === 'existing' || room.state === 'proposed' ? room.state : 'unknown';

export function fixRoomLinks(rooms: Room[]): Room[] {
  const seen = new Set<string>();
  return rooms.map((r) => {
    if (!r.existingRoomId) return r;
    const valid = roomState(r) === 'proposed'
      && rooms.some((e) => e.id === r.existingRoomId && roomState(e) === 'existing')
      && !seen.has(r.existingRoomId);
    if (valid) { seen.add(r.existingRoomId); return r; }
    const { existingRoomId: _drop, ...rest } = r;
    return { ...rest, confirmed: false };
  });
}

export function geometricArea(room?: Pick<Room, 'length' | 'width'>): number | null {
  if (!room || !areaPreviewGeometry(room.length, room.width).valid) return null;
  return room.length * room.width;
}

export function roomDifference(existing?: Room, proposed?: Room) {
  const before = geometricArea(existing), after = geometricArea(proposed);
  if (before === null || after === null) return null;
  const delta = after - before;
  const percent = delta / before * 100;
  if (!Number.isFinite(delta) || !Number.isFinite(percent)) return null;
  return { before, after, delta, percent };
}

export interface RoomPair { key: string; existing?: Room; proposed?: Room; missingLink?: boolean }
export function roomPairs(rooms: Room[]): RoomPair[] {
  const pairs: RoomPair[] = [];
  const matched = new Set<string>();
  for (const proposed of rooms.filter((r) => roomState(r) === 'proposed')) {
    const existing = rooms.find((r) => r.id === proposed.existingRoomId && roomState(r) === 'existing');
    if (existing) matched.add(existing.id);
    pairs.push({ key: proposed.id, existing, proposed, missingLink: !!proposed.existingRoomId && !existing });
  }
  for (const existing of rooms.filter((r) => roomState(r) === 'existing' && !matched.has(r.id))) {
    pairs.push({ key: existing.id, existing });
  }
  return pairs;
}

export function roomStateSummary(rooms: Room[]) {
  return (['existing', 'proposed', 'unknown'] as const).map((state) => {
    const group = rooms.filter((r) => roomState(r) === state);
    const areas = group.map(geometricArea);
    const sum = areas.reduce<number>((s, a) => s + (a ?? 0), 0);
    return { state, count: group.length, area: group.length && areas.every((a) => a !== null) && Number.isFinite(sum) ? sum : null };
  });
}