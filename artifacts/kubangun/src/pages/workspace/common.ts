import type { Project } from '@/lib/types';
export interface WP { p: Project; up: (fn: (p: Project) => Project, bump?: boolean) => Promise<boolean>; goTab: (t: string) => void }
export const SRC_LABEL = { manual: 'Diisi manual', dokumen: 'Dari dokumen (diketik manual)', 'tidak-diketahui': 'Tidak diketahui' } as const;
