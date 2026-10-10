import type {State} from '@/lib/crm';

type AccountIdentity={id:string;owner:string;connected?:boolean;role:NonNullable<State['viewer']>['role']};

export function AccountIdentityDetails({account,settings}:{account:AccountIdentity;settings:State['settings']}){
 const profiles=settings.sellerProfilesInitialized?settings.sellerProfiles.filter(profile=>profile.memberId===account.id):[];
 const commercial=account.role==='seller'||account.role==='admin'&&!!account.owner;
 return <dl className="account-identity-details" aria-label="Kontokopplingar">
  <div><dt>Inloggningskonto</dt><dd>{account.connected===undefined?'Inloggningskopplingen framgår inte av kontolistan':account.connected?'Registrerat inloggningskonto kopplat':'Inget registrerat inloggningskonto kopplat'}</dd></div>
  <div><dt>Kundansvar</dt><dd>{account.owner?<>{account.owner}{!settings.owners.includes(account.owner)&&<small>Kundansvaret finns inte i den här arbetsytans lista.</small>}</>:'Inget kundansvar valt'}</dd></div>
  <div><dt>Säljarprofil</dt><dd>{!settings.sellerProfilesInitialized?<><span>Säljarprofilerna är inte granskade i den här arbetsytan.</span><small>Kundansvar används som äldre urval; det bekräftar ingen exakt kontokoppling.</small></>:profiles.length?<>
   {profiles.length>1&&<p className="account-identity-warning">Flera säljarprofiler är kopplade till samma konto-ID. Granska kopplingarna i Mål &amp; inställningar.</p>}
   {profiles.map(profile=><div className="account-linked-profile" key={profile.id}>
    <b>{profile.displayName}</b><small>Profil-ID: {profile.id}</small><small>Kundansvar i profilen: {profile.legacyOwnerName}</small>
    {!profile.active&&<small>Inaktiv profil; kontokopplingen finns kvar.</small>}
    {!settings.owners.includes(profile.legacyOwnerName)&&<small>Profilens kundansvar finns inte i den här arbetsytans lista.</small>}
    {account.owner!==profile.legacyOwnerName&&<p className="account-identity-warning">Kundansvar skiljer sig från säljarprofilen. Granska kundansvaret här och kontokopplingen i Mål &amp; inställningar; kontokopplingen flyttar inget arbete.</p>}
   </div>)}
  </>:<><span>Ingen säljarprofil kopplad till konto-ID:t.</span><small>{commercial?'Granska den exakta kontokopplingen i Mål & inställningar innan personliga säljarvyer används.':'Säljarprofil är inget krav för kontots roll.'}</small></>}</dd></div>
 </dl>;
}
