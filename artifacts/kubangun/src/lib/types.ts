export type Mode = 'new' | 'renovation';
export type Status = 'draft' | 'review-requested';
export type Role = 'pemilik' | 'profesional';
export type SourceState = 'manual' | 'dokumen' | 'tidak-diketahui';
export type RoomState = 'existing' | 'proposed' | 'unknown';
export interface Room { id: string; name: string; floor: number; length: number; width: number; height: number | null; source: SourceState; documentId?: string; confirmed: boolean; state?: RoomState; existingRoomId?: string }
export interface Component { id: string; type: string; name: string; dimensions: string; material: string; state: 'existing' | 'proposed'; source: SourceState; documentId?: string; confirmed: boolean }
export interface DocMeta { id: string; name: string; mime: string; size: number; sourceState: 'existing' | 'proposed' | 'unknown'; uploadedAt: string; availability?: 'available' | 'unavailable' }
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
  workPlan?: WorkPlan;
}
export interface Settings { name: string; organization: string; role: Role }

export type QuantityUnit = 'kg' | 'kuintal' | 'm' | 'm²' | 'm³' | 'lembar' | 'buah' | 'dus';
export type WorkStatus = 'not-started' | 'in-progress' | 'blocked' | 'completed';
export interface Material {
  id: string; name: string; specification: string; unit: QuantityUnit;
  mode: 'manual' | 'rate' | 'coverage';
  factor: number | null; basisUnit: QuantityUnit; waste: number; packageSize: number | null;
  manualQuantity: number | null; overrideQuantity: number | null; overrideReason: string;
  boxContents?: number | null; boxContentsUnit?: QuantityUnit;
}
export interface WorkItem {
  id: string; groupId: string; roomId?: string; name: string; specification: string;
  basis: 'room-area' | 'explicit-area' | 'manual'; quantity: number | null; unit: QuantityUnit;
  length: number | null; width: number | null; startDate: string; endDate: string; notes: string;
  materials: Material[]; templateName?: string;
}
export interface WorkGroup { id: string; name: string; kind: 'floor' | 'rooftop'; floor: number | null; roomOrder: string[] }
export interface WorkTemplate { id: string; name: string; specification: string; prompts: string; materials: Material[] }
export interface WorkSnapshot { work: WorkItem; quantity: number; materials: { material: Material; raw: number; procurement: number }[] }
export interface ExecutionBaseline { id: string; createdAt: string; reason: string; fingerprint: string; items: WorkSnapshot[] }
export interface WorkUpdate {
  id: string; workId: string; baselineId: string; createdAt: string; date: string;
  status: WorkStatus; completedQuantity: number; responsible: string; note: string;
  usage: { materialId: string; quantity: number }[];
}
export interface OwnerNotification { id: string; createdAt: string; text: string; workId?: string; readAt?: string }
export interface WorkPlan {
  groups: WorkGroup[]; items: WorkItem[]; templates: WorkTemplate[];
  startedAt?: string; baselines: ExecutionBaseline[]; updates: WorkUpdate[]; notifications: OwnerNotification[];
}
