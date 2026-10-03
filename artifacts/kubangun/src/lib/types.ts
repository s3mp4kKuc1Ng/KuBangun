export type Mode = 'new' | 'renovation';
export type Status = 'draft' | 'review-requested';
export type Role = 'pemilik' | 'profesional';
export type SourceState = 'manual' | 'dokumen' | 'tidak-diketahui';
export type RoomState = 'existing' | 'proposed' | 'unknown';
export interface Room { id: string; name: string; floor: number; length: number; width: number; height: number | null; source: SourceState; documentId?: string; confirmed: boolean; state?: RoomState; existingRoomId?: string }
export interface Component { id: string; type: string; name: string; dimensions: string; material: string; state: 'existing' | 'proposed'; source: SourceState; documentId?: string; confirmed: boolean }
export interface DocMeta { id: string; name: string; mime: string; size: number; sourceState: 'existing' | 'proposed' | 'unknown'; uploadedAt: string }
export interface Observation { id: string; location: string; category: string; description: string; date: string; crackWidth?: number; photoDocumentId?: string }
export interface Change { id: string; type: string; description: string; componentId?: string; dimensions: string }
export interface ReviewNote { id: string; text: string; createdAt: string; revision: number }
export interface Project {
  id: string; name: string; mode: Mode; province: string; city: string; floors: number | null;
  landArea: number | null; footprintArea: number | null; totalArea: number | null;
  structure: string; material: string; description: string; revision: number;
  createdAt: string; updatedAt: string; status: Status; archived: boolean; example?: boolean;
  rooms: Room[]; components: Component[]; documents: DocMeta[]; observations: Observation[]; changes: Change[]; reviewNotes: ReviewNote[];
  reviewRequestedAt?: string; reviewRequestedRevision?: number;
}
export interface Settings { name: string; organization: string; role: Role }
