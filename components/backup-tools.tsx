'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { State } from '@/lib/crm';

type Selection = {
  file: File;
  requestId: string;
  format: 'stream' | 'legacy';
  exportedAt: string;
  customers: number;
  orders: number;
  files: number;
  backup?: unknown;
};

// Read only the manifest; browsers upload the selected File without buffering
// the complete backup in JavaScript. The server verifies the entire archive.
async function manifest(file: File): Promise<Record<string, any>> {
  const reader = file.stream().getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) throw Error('Kopian saknar en komplett innehållsförteckning.');
      const end = part.value.indexOf(10);
      const bytes = end >= 0 ? part.value.subarray(0, end) : part.value;
      size += bytes.byteLength;
      if (size > 16000000) throw Error('Kopians innehållsförteckning är för stor.');
      parts.push(bytes);
      if (end >= 0) {
        const buffer = new Uint8Array(size);
        let offset = 0;
        for (const bytes of parts) { buffer.set(bytes, offset); offset += bytes.length; }
        return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer));
      }
    }
  } finally { await reader.cancel(); }
}

export function BackupTools({ st, space, busy, refresh }: {
  st: State; space: string; busy: boolean; refresh: () => Promise<void>;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const empty = [st.customers, st.deals, st.orders, st.tasks, st.meetings,
    st.events, st.articles, st.leads, st.notices, st.companyEvents].every(rows => rows.length === 0);

  async function choose(file: File) {
    setSelection(null); setError(''); setWorking(true);
    try {
      const prefix = await file.slice(0, 4096).text();
      const stream = /"format"\s*:\s*"magnussons-crm-backup-2"/.test(prefix);
      const data = stream ? await manifest(file) :
        file.size <= 16000000 ? JSON.parse(await file.text()) :
          (() => { throw Error('Äldre JSON-kopior får vara högst 16 MB. Välj en ny CRM-kopia.'); })();
      if (data.format !== (stream ? 'magnussons-crm-backup-2' : 'magnussons-crm-backup-1') ||
          (stream && data.type !== 'header') || !Array.isArray(data.files) ||
          !Array.isArray(data.state?.customers) || !Array.isArray(data.state?.orders)) {
        throw Error('Välj en CRM-kopia med kundfiler.');
      }
      setSelection({ file, requestId: crypto.randomUUID(), format: stream ? 'stream' : 'legacy',
        exportedAt: data.exportedAt, customers: data.state.customers.length,
        orders: data.state.orders.length, files: data.files.length,
        ...(stream ? {} : { backup: data }) });
    } catch (e) { setError((e as Error).message); }
    finally { setWorking(false); }
  }

  async function restore() {
    if (!selection || working || busy || !empty) return;
    setWorking(true); setError('');
    try {
      const query = new URLSearchParams({ space, version: String(st.version), requestId: selection.requestId });
      const streaming = selection.format === 'stream';
      const response = await fetch('/api/crm/backup' + (streaming ? '?' + query : ''), {
        method: 'POST',
        headers: { 'Content-Type': streaming ? 'application/x-ndjson' : 'application/json' },
        body: streaming ? selection.file : JSON.stringify({ space, version: st.version,
          requestId: selection.requestId, backup: selection.backup }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw Error(data.error || 'Kopian kunde inte återställas.');
      setSelection(null);
      await refresh();
      toast.success('CRM-data och kundfiler är återställda.');
    } catch (e) { setError((e as Error).message); }
    finally { setWorking(false); }
  }

  return <section className="backup-actions">
    <h3>CRM-kopia med kundfiler</h3>
    <p>Kundregister, affärer, order, anteckningar och kundfiler i samma kopia.
      Större filsamlingar stöds. Outlook, konton och privata utkast ingår inte.</p>
    <Button variant="outline" asChild>
      <a href={'/api/crm/backup?format=stream&space=' + space} download
        aria-disabled={busy || working} onClick={e => { if (busy || working) e.preventDefault(); }}>
        <Download size={16}/>Hämta CRM-kopia med kundfiler
      </a>
    </Button>
    <p className="biz-hint">Webbläsaren visar när nedladdningen är klar.
      Behåll hela filen. Återställningen kontrollerar att kopian är komplett.</p>
    <details className="biz-details">
      <summary>Återställ en CRM-kopia med kundfiler</summary>
      <p>Välj en tom arbetsyta utan kunddata, kundfiler eller privata utkast.
        Både nya kopior och tidigare JSON-kopior kan läsas.</p>
      <Input type="file" accept=".ndjson,.jsonl,.json,application/x-ndjson,application/json"
        disabled={busy || working || !empty} aria-label="Välj CRM-kopia med kundfiler"
        onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void choose(file); }}/>
      {selection && <div className="biz-callout">
        <p>{selection.customers} kunder, {selection.orders} order och {selection.files} filer.
          Kopia från {selection.exportedAt}.</p>
        <p>Innehållsförteckningen är läst. Alla filer och godkännanden kontrolleras vid återställning.</p>
        <Button disabled={busy || working || !empty} onClick={() => void restore()}>
          {working ? 'Återställer…' : 'Återställ till ' + (space === 'demo' ? 'demoytan' : 'teamets arbetsyta')}
        </Button>
      </div>}
    </details>
    {working && <p role="status">{selection ? 'Återställning pågår. Vänta på resultatet.' : 'Läser innehållsförteckningen…'}</p>}
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}
