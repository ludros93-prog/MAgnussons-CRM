'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import type {DraftRecord} from '@/lib/drafts';
import type {State} from '@/lib/crm';
import {ArticleDraftEnvelopeSchema} from '@/lib/article-drafts';

const labels={sku:'Artikelnummer',name:'Benämning',color:'Färg',size:'Storlek',variant:'Övrig variant',variantId:'Variant-ID',unit:'Enhet',url:'Produktlänk',price:'Pris exkl. moms',cost:'Direkt kostnad',active:'Aktiv artikel'} as const;

// Previewing a private record must not normalize it, adopt a new basis or save.
export function ArticleDraftPreview({draft,st}:{draft:DraftRecord;st:State}){
 const [copyStatus,setCopyStatus]=useState('');
 async function copy(){try{await navigator.clipboard.writeText(JSON.stringify(draft.data,null,2));setCopyStatus('Det privata underlaget är kopierat.')}catch{setCopyStatus('Kunde inte kopiera. Visa och markera det sparade underlaget nedan.')}}
 const parsed=ArticleDraftEnvelopeSchema.safeParse(draft.data);
 if(!parsed.success||parsed.data.draftId!==draft.id)return <div className="article-draft-preview"><p>Artikelutkastets uppgifter kan inte läsas. Det sparade underlaget finns kvar.</p><small>Utkastreferens: {draft.id}</small><Button variant="outline" onClick={copy}>Kopiera mitt privata underlag</Button><p role="status">{copyStatus}</p><details><summary>Visa sparat underlag</summary><pre>{JSON.stringify(draft.data,null,2)}</pre></details></div>;
 const {data,base}=parsed.data,source=st.settings.catalogSources.find(s=>s.id===data.sourceId);
 return <div className="article-draft-preview">
  <p><b>{data.name||'Benämning ej ifylld'}</b> · {data.sku||'Artikelnummer ej ifyllt'}</p>
  <p>{source?.name||data.sourceId||'Artikelkälla ej vald'}{data.color?' · '+data.color:''}{data.size?' · '+data.size:''}</p>
  <details><summary>Visa artikelutkastets uppgifter</summary><dl>
   {Object.entries(labels).map(([key,label])=>{const value=data[key as keyof typeof labels];return <div key={key}><dt>{label}</dt><dd>{value===null?'Ej angivet':typeof value==='boolean'?(value?'Ja':'Nej'):String(value)||'Ej ifyllt'}</dd></div>})}
   <div><dt>Artikelkälla</dt><dd>{source?.name||data.sourceId||'Ej vald'}{source?' · '+data.sourceId:''}</dd></div>
   <div><dt>Ursprunglig artikel</dt><dd>{base.id||'Ny artikel'}</dd></div>
   <div><dt>Utkastreferens</dt><dd>{draft.id}</dd></div>
  </dl></details>
  <Button variant="outline" onClick={copy}>Kopiera mitt privata artikelutkast</Button><p role="status">{copyStatus}</p>
 </div>;
}
