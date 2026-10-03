import { Languages } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, storageError } = useLanguage();
  return <div className={compact ? '' : 'space-y-2'}>
    <label className="flex items-center gap-2 text-sm">
      <Languages size={16} aria-hidden="true" className="shrink-0" />
      {!compact && <span>Bahasa</span>}
      <select
        aria-label="Bahasa"
        data-testid={compact ? 'select-language-mobile' : 'select-language'}
        value={language}
        onChange={(event) => setLanguage(event.target.value === 'en' ? 'en' : 'id')}
        className="min-w-0 flex-1 rounded-sm border border-current/25 bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="id" className="bg-card text-foreground" data-i18n="off">Bahasa Indonesia</option>
        <option value="en" className="bg-card text-foreground" data-i18n="off">English</option>
      </select>
    </label>
    {storageError && <p role="status" className="text-xs">Pilihan bahasa hanya berlaku untuk sesi ini karena penyimpanan peramban tidak tersedia.</p>}
  </div>;
}