import { Link } from 'wouter';
import { Plus } from 'lucide-react';
import { PageHead } from '@/components/kit';
import { ProjectList } from '@/components/project-list';
export default function Projects() {
  return <div><PageHead kicker="Daftar" title="Semua proyek"><Link href="/projects/new" className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 text-sm font-semibold rounded-sm" data-testid="link-new-from-list"><Plus size={16} />Buat Proyek</Link></PageHead><ProjectList /></div>;
}
