'use client';
import {useId} from 'react';
import {AlertTriangle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {State} from '@/lib/crm';
import type {YearwheelScope} from '@/lib/yearwheel-scope';

export function YearwheelScopeNotice({st,scope,onView}:{st:State;scope:YearwheelScope;onView?:(view:string)=>void}){
 const diagnosticId=useId(),linkedProfile=scope.profileId?st.settings.sellerProfiles.find(p=>p.id===scope.profileId):undefined;
 if(!scope.diagnostic)return null;
 const accountHelp=scope.diagnostic==='operational-missing';
 return <section className="panel padded day-profile-notice mb-6 min-w-0" role="status" aria-labelledby={diagnosticId} data-profile-diagnostic={scope.diagnostic}>
  <h2 id={diagnosticId}><AlertTriangle size={20} aria-hidden="true"/>{scope.diagnostic==='missing'?'Dina behov behöver en kontokoppling':accountHelp?'Kundansvar saknas':'Kontokopplingen behöver kontrolleras'}</h2>
  <p>{scope.diagnostic==='missing'?(scope.legacyOwner?'Ditt konto har kundansvar, men saknar koppling till en säljarprofil. Behov med profilansvar kan därför saknas här.':'Ditt konto saknar giltigt kundansvar och koppling till en säljarprofil. Dina behov kan därför saknas här.'):accountHelp?'Ditt konto är kopplat till en säljarprofil, men har inget giltigt kundansvar. Dina profilkopplade behov visas. Äldre behov utan profilansvar kan saknas här.':'Ditt kundansvar och den säljarprofil som är kopplad till kontot hör till olika ansvar. Här visas profilkopplade behov för din kopplade profil och äldre behov för ditt aktuella kundansvar.'}</p>
  {accountHelp&&linkedProfile&&<p>Kopplad profil: <b>{linkedProfile.displayName}</b>.</p>}
  {scope.diagnostic==='mismatch'&&linkedProfile&&<p>Kundansvar: <b>{scope.legacyOwner}</b>. Kopplad profil: <b>{linkedProfile.displayName}</b> · ansvar: <b>{linkedProfile.legacyOwnerName}</b>.</p>}
  <p>Synligt urval: listan och antalen gäller det som visas här, inte en bekräftad fullständig behovslista.</p>
  {st.viewer?.role==='admin'&&onView?<Button type="button" variant="outline" onClick={()=>onView(accountHelp?'accounts':'settings')}>{accountHelp?'Öppna Konton & roller':'Öppna Mål & inställningar'}</Button>:<p>{accountHelp?'Be en administratör kontrollera ditt kundansvar i Konton & roller.':'Be en administratör kontrollera din konto- och profilkoppling i Mål & inställningar.'}</p>}
 </section>;
}
