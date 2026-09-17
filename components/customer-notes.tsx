'use client';
import { useId, useRef, useState } from 'react';
import { FileText, Paperclip, Save, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Pick } from '@/components/business-ui';
import type { Event } from '@/lib/crm';

export type NoteDraft = { title: string; text: string; meetingDate: string; sourceFiles: string[];contact:boolean;nextAction:string;nextDate:string;owner:string };
export const emptyNoteDraft = (): NoteDraft => ({ title: '', text: '', meetingDate: '', sourceFiles: [],contact:false,nextAction:'',nextDate:'',owner:'' });
const MAX_TEXT = 50000;

export function CustomerNotes({ customerId, events, draft, onChange, onSave, busy,owners,defaultOwner }: {
  owners:string[];defaultOwner:string;
  customerId: string;
  events: Event[];
  draft: NoteDraft;
  onChange: (draft: NoteDraft) => void;
  onSave: (draft: NoteDraft & { customerId: string }) => Promise<boolean>;
  busy: boolean;
}) {
  const id = useId(), fileInput = useRef<HTMLInputElement>(null), submitting = useRef(false);
  const [reading, setReading] = useState(false), [error, setError] = useState(''), [search, setSearch] = useState('');
  const locked = busy || reading;
  const notes = events.filter(e => e.customerId === customerId && ['note', 'contact', 'customer_note'].includes(e.kind))
    .filter(e => ((e.note?.title || '') + ' ' + e.text).toLocaleLowerCase('sv').includes(search.toLocaleLowerCase('sv')))
    .sort((a, b) => b.at.localeCompare(a.at));

  async function readFile(file: File) {
    if (locked || submitting.current) return;
    setError('');
    if (!/\.(txt|md)$/i.test(file.name)) { setError('Välj en .txt- eller .md-fil. Från Word och OneNote kan du klistra in texten.'); return; }
    if (file.size > 200000) { setError('Filen är för stor. Välj högst 200 kB och 50 000 tecken.'); return; }
    if (draft.sourceFiles.length >= 10) { setError('Spara anteckningen innan du läser in fler filer.'); return; }
    setReading(true);
    try {
      const text = await file.text();
      if (!text.trim() || text.includes('\0')) throw Error('Filen behöver innehålla läsbar text.');
      const combined = draft.text ? draft.text + '\n\n' + text : text;
      if (combined.length > MAX_TEXT) throw Error('Texten blir längre än 50 000 tecken. Spara den som flera anteckningar.');
      onChange({ ...draft, title: draft.title || file.name.replace(/\.(txt|md)$/i, '').slice(0, 160), text: combined, sourceFiles: [...draft.sourceFiles, file.name.slice(0, 200)] });
    } catch (e) { setError((e as Error).message || 'Filen kunde inte läsas. Din befintliga text finns kvar.'); }
    finally { setReading(false); }
  }
  async function submit() {
    if (locked || submitting.current) return;
    submitting.current = true;
    setError('');
    try {
      if (!draft.text.trim()) { setError('Klistra in eller skriv en anteckning först.'); return; }
      if (draft.text.length > MAX_TEXT) { setError('Anteckningen får innehålla högst 50 000 tecken.'); return; }
      if (await onSave({ ...draft, owner:draft.owner||defaultOwner, customerId })) onChange(emptyNoteDraft());
      else setError('Anteckningen är inte bekräftad som sparad. Texten finns kvar så att du kan försöka igen.');
    } finally { submitting.current = false; }
  }
  return <section className="customer-notes" aria-labelledby={id + '-heading'}>
    <div className="notes-heading"><span><FileText size={22}/></span><div><h3 id={id + '-heading'}>Mötesanteckningar</h3><p>Klistra in direkt från mötet. Texten sparas på den här kunden.</p></div></div>
    <div className="notes-composer" onDragOver={e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); }} onDrop={e => {
      if (!e.dataTransfer.files.length) return;
      e.preventDefault();
      if (e.dataTransfer.files.length !== 1) { setError('Släpp en fil i taget.'); return; }
      void readFile(e.dataTransfer.files[0]);
    }}>
      <div className="notes-fields"><label htmlFor={id + '-title'}>Rubrik<Input id={id + '-title'} value={draft.title} maxLength={160} disabled={locked} placeholder="Till exempel: Behovsmöte inför hösten" onChange={e => onChange({ ...draft, title: e.target.value })}/></label><label htmlFor={id + '-date'}>Mötesdatum, valfritt<Input id={id + '-date'} type="date" value={draft.meetingDate} disabled={locked} onChange={e => onChange({ ...draft, meetingDate: e.target.value })}/></label></div>
      <label className="notes-text-label" htmlFor={id + '-text'}>Anteckningar</label>
      <Textarea id={id + '-text'} rows={9} value={draft.text} disabled={locked} aria-describedby={id + '-hint'} placeholder="Skriv fritt: vad kunden berättade, behov, antal, önskemål, frågor och vad ni kom överens om…" onChange={e => onChange({ ...draft, text: e.target.value })}/>
      <div className="notes-meta" id={id + '-hint'}><span>Klistra in text eller släpp en .txt/.md-fil här.</span><span className={draft.text.length > MAX_TEXT ? 'late' : ''}>{draft.text.length.toLocaleString('sv-SE')} / 50 000</span></div>
      {draft.sourceFiles.length > 0 && <p className="notes-imports">Inläst text: {draft.sourceFiles.join(', ')}. Själva filerna lagras inte.</p>}
      <input ref={fileInput} className="sr-only" type="file" accept=".txt,.md,text/plain,text/markdown" tabIndex={-1} aria-label="Läs in textfil" disabled={locked} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void readFile(file); }}/>
      <label className="check-field"><Checkbox disabled={locked} checked={draft.contact} onCheckedChange={v=>onChange({...draft,contact:v===true})}/>Uppdatera senaste kundkontakt med mötesdatumet (idag om datum saknas)</label>
      <details className="biz-details"><summary>Planera nästa steg från anteckningen</summary><label className="biz-field">Vad lovade vi att göra?<Input disabled={locked} value={draft.nextAction} maxLength={240} placeholder="Skicka förslag på jackor i två prislägen" onChange={e=>onChange({...draft,nextAction:e.target.value})}/></label><div className="notes-fields"><label>Klart senast<Input disabled={locked} type="date" value={draft.nextDate} onChange={e=>onChange({...draft,nextDate:e.target.value})}/></label><label>Ansvarig<Pick label="Ansvarig för nästa steg" value={draft.owner||defaultOwner} onChange={v=>onChange({...draft,owner:v})} items={owners.map(o=>({id:o,label:o}))}/></label></div></details>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="notes-actions"><Button variant="outline" type="button" disabled={locked} onClick={() => fileInput.current?.click()}><Paperclip size={16}/>{reading ? 'Läser fil…' : 'Läs in textfil'}</Button><Button type="button" disabled={locked || !draft.text.trim() || draft.text.length > MAX_TEXT} onClick={submit}><Save size={16}/>{busy ? 'Sparar…' : 'Spara anteckning'+(draft.nextAction?' och nästa steg':'')}</Button></div>
      <p className="notes-footnote">Intern anteckning i den valda arbetsytan. Ingenting skickas till kunden. AI-bearbetning är ännu inte ansluten.</p>
    </div>
    <div className="notes-history-heading"><h4>Sparade anteckningar</h4><div className="notes-search"><Search size={15}/><Input aria-label="Sök i kundens anteckningar" placeholder="Sök i anteckningar…" value={search} onChange={e => setSearch(e.target.value)}/></div></div>
    <div className="notes-history">{notes.map(note => <details key={note.id} className="saved-note"><summary><FileText size={17}/><span><b>{note.note?.title || (note.kind === 'contact' ? 'Kundkontakt' : 'Kundanteckning')}</b><small>{note.note?.meetingDate ? 'Möte ' + new Date(note.note.meetingDate + 'T12:00:00').toLocaleDateString('sv-SE') + ' · ' : ''}Sparad {new Date(note.at).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'short', timeStyle: 'short' })}{note.actor?' · '+note.actor.name:''}</small></span></summary><p className="saved-note-text">{note.text}</p>{!!note.note?.sourceFiles?.length && <small className="notes-imports">Inläst från: {note.note.sourceFiles.join(', ')}</small>}</details>)}</div>
    {!notes.length && <p className="notes-empty">{search ? 'Ingen anteckning matchar sökningen.' : 'Kundens anteckningar samlas här när du sparar.'}</p>}
  </section>;
}
