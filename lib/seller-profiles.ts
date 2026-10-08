import {z} from 'zod';
import {RuleError} from './crm-errors';
import type {State,Settings,Actor} from './crm';
import {validateCompanyActivityResponsibilityReferences} from './company-activity-responsibility';

const name=z.string().trim().min(1).max(150),text=z.string().trim().max(4000),memberId=z.string().trim().max(150);
export const SellerProfileRetirementHistorySchema=z.object({
 id:z.string().uuid(),profileId:z.string().uuid(),owner:name,displayName:name,reason:text.min(1),at:z.string().datetime(),
 byId:text.min(1),byMemberId:text.min(1),byName:text.min(1)
}).strict();
export const SellerProfileSchema=z.object({
 id:z.string().uuid(),displayName:name,legacyOwnerName:name,active:z.boolean(),memberId:memberId.default(''),
 linkHistory:z.array(z.object({previousMemberId:memberId,nextMemberId:memberId,reason:text.min(1),at:z.string().min(1),byId:z.string().min(1),byName:z.string().min(1)})).max(1000).default([]),
 retirementHistory:z.array(SellerProfileRetirementHistorySchema).max(1000).default([])
});
export type SellerProfile=z.infer<typeof SellerProfileSchema>;
export const SellerProfilesInitSchema=z.object({
 expectedContext:z.string().min(1).max(3000000),
 profiles:z.array(z.object({legacyOwnerName:name,displayName:name,memberId:memberId.default('')})).min(1).max(1000)
});
export const SellerProfileInputSchema=z.object({
 expectedContext:z.string().min(1).max(3000000),id:z.union([z.literal(''),z.string().uuid()]).default(''),
 legacyOwnerName:name.optional(),displayName:name,memberId:memberId.optional(),active:z.boolean().optional(),
 confirmRelink:z.boolean().default(false),reason:text.default('')
});
const need=(v:unknown,message:string)=>{if(!v)throw new RuleError(message)};
export const sellerProfileById=(settings:Settings,id:string)=>settings.sellerProfiles.find(p=>p.id===id);
export const sellerProfileForOwner=(settings:Settings,ownerName:string)=>settings.sellerProfiles.find(p=>p.legacyOwnerName===ownerName);
export function personalSellerId(st:State){
 if(!st.settings.sellerProfilesInitialized)return st.viewer?.owner&&st.settings.owners.includes(st.viewer.owner)?st.viewer.owner:'';
 return st.viewer?.memberId?st.settings.sellerProfiles.find(p=>p.memberId===st.viewer!.memberId)?.id||'':'';
}
// These are existing CRM portfolio labels, not inferred people or accounts.
// Include historical labels removed from the current operational roster.
export function legacySellerNames(st:State){
 const values=new Set(st.settings.owners);
 const add=(value:string)=>{if(value)values.add(value)};
 for(const row of [...st.customers,...st.deals,...st.orders,...st.tasks,...st.meetings])add(row.owner);
 for(const c of st.customers){add(c.onboarding.owner);add(c.plan.issueOwner);for(const n of c.yearNeeds)add(n.owner);if(c.prospecting.qualifiedAt)add(c.prospecting.qualifiedOwner);}
 for(const o of st.orders)if(o.invoiceOwnerSource!=='legacy_fallback')add(o.invoiceOwner);
 for(const event of st.companyEvents){add(event.owner);for(const task of event.checklist)add(task.owner);}
 for(const key of [...Object.keys(st.settings.sellerGoals),...Object.keys(st.settings.sellerAnnualGoals)])add(key);
 return [...values].sort((a,b)=>a.localeCompare(b,'sv'));
}
export function initializeSellerProfiles(st:State,profiles:z.infer<typeof SellerProfilesInitSchema>['profiles'],actor:Actor){
 need(actor.role==='admin','Säljarprofiler skapas av administratören.');
 need(!st.settings.sellerProfilesInitialized&&!st.settings.sellerProfiles.length,'Säljarprofilerna har redan skapats.');
 const labels=legacySellerNames(st),supplied=profiles.map(p=>p.legacyOwnerName);
 need(supplied.length===labels.length&&new Set(supplied).size===labels.length&&labels.every(label=>supplied.includes(label)),'Bekräfta exakt alla befintliga ansvariga, historiska resultat och mål i underlaget.');
 st.settings.sellerProfiles=profiles.map(p=>SellerProfileSchema.parse({...p,id:crypto.randomUUID(),active:st.settings.owners.includes(p.legacyOwnerName),linkHistory:p.memberId?[{previousMemberId:'',nextMemberId:p.memberId,reason:'Uttrycklig kontokoppling vid initialisering',at:new Date().toISOString(),byId:actor.id,byName:actor.name}]:[]}));
 st.settings.sellerProfilesInitialized=true;
 for(const p of st.settings.sellerProfiles){
  if(st.settings.sellerGoals[p.legacyOwnerName])st.settings.sellerGoalsById[p.id]=structuredClone(st.settings.sellerGoals[p.legacyOwnerName]);
  if(st.settings.sellerAnnualGoals[p.legacyOwnerName])st.settings.sellerAnnualGoalsById[p.id]=structuredClone(st.settings.sellerAnnualGoals[p.legacyOwnerName]);
 }
 // A fallback to today's operational owner is not historical evidence.
 for(const o of st.orders)if(!o.invoiceOwnerId&&o.invoiceOwner&&o.invoiceOwnerSource!=='legacy_fallback')o.invoiceOwnerId=sellerProfileForOwner(st.settings,o.invoiceOwner)?.id||'';
 for(const c of st.customers)if(c.prospecting.qualifiedAt&&c.prospecting.qualifiedOwner&&!c.prospecting.qualifiedOwnerId)c.prospecting.qualifiedOwnerId=sellerProfileForOwner(st.settings,c.prospecting.qualifiedOwner)?.id||'';
 validateSellerProfileReferences(st);
}
export function saveSellerProfile(st:State,input:z.infer<typeof SellerProfileInputSchema>,actor:Actor){
 need(actor.role==='admin','Säljarprofiler hanteras av administratören.');
 need(st.settings.sellerProfilesInitialized,'Skapa de stabila säljarprofilerna först.');
 const old=input.id?sellerProfileById(st.settings,input.id):undefined;
 need(!input.id||old,'Säljarprofilen finns inte.');
 if(old){
  need(!input.legacyOwnerName||input.legacyOwnerName===old.legacyOwnerName,'Profilens ursprungliga ansvarskoppling får inte ändras.');
  need(input.active!==false||!old.active,'Avveckla en aktuell profil i den granskade profilavvecklingen. Visning och kontolänk flyttar inte öppet arbete.');
  const nextMember=input.memberId??old.memberId;
  if(nextMember!==old.memberId){
   need(!old.memberId||input.confirmRelink&&input.reason,'Bekräfta den ändrade kontokopplingen och ange en orsak.');
   need(old.linkHistory.length<1000,'Profilen har nått gränsen för kopplingshistorik.');
   old.linkHistory.push({previousMemberId:old.memberId,nextMemberId:nextMember,reason:input.reason||'Första uttryckliga kontokopplingen',at:new Date().toISOString(),byId:actor.id,byName:actor.name});
   old.memberId=nextMember;
  }
  if(input.active===false)need(!st.settings.owners.includes(old.legacyOwnerName),'Ta först bort den operativa ansvarskopplingen efter att arbetet har omfördelats.');
  need(input.active!==true||old.active,'Återaktivering av en historisk profil kräver den kommande kontrollerade överföringen.');
  old.displayName=input.displayName;old.active=input.active??old.active;
 }else{
  need(input.legacyOwnerName&&st.settings.owners.includes(input.legacyOwnerName),'Välj en nytillagd operativ ansvarig i inställningarna.');
  need(!sellerProfileForOwner(st.settings,input.legacyOwnerName!),'Ansvarskopplingen har redan en stabil säljarprofil.');
  need(input.active!==false,'En ny operativ säljarprofil ska vara aktiv.');
  need(st.settings.sellerProfiles.length<1000,'Arbetsytan har nått gränsen för säljarprofiler.');
  st.settings.sellerProfiles.push(SellerProfileSchema.parse({id:crypto.randomUUID(),legacyOwnerName:input.legacyOwnerName,displayName:input.displayName,active:true,memberId:input.memberId||'',linkHistory:input.memberId?[{previousMemberId:'',nextMemberId:input.memberId,reason:input.reason||'Uttrycklig kontokoppling när säljarprofilen skapades',at:new Date().toISOString(),byId:actor.id,byName:actor.name}]:[]}));
  // New profiles never adopt previously unmapped history or targets.
 }
 validateSellerProfileReferences(st);
}
export function validateSellerProfileReferences(st:State){
 const profiles=st.settings.sellerProfiles,ids=new Set(profiles.map(p=>p.id)),aliases=new Set(profiles.map(p=>p.legacyOwnerName)),members=profiles.map(p=>p.memberId).filter(Boolean);
 need(ids.size===profiles.length&&aliases.size===profiles.length&&new Set(members).size===members.length,'Säljarprofiler har dubbla ID:n, ansvarskopplingar eller personliga konton.');
 need(st.settings.sellerProfilesInitialized||!profiles.length,'Säljarregistret saknar bekräftad initialisering.');
 need(!st.settings.sellerProfilesInitialized||profiles.length,'Det initialiserade säljarregistret får inte vara tomt.');
 const retirementIds=new Set<string>();
 for(const profile of profiles){
  const history=profile.retirementHistory||[];
  need(history.length<=1,'En profil får bara avvecklas en gång. Återaktivering har inget godkänt arbetsflöde.');
  for(const raw of history){
   const row=SellerProfileRetirementHistorySchema.parse(raw);
   need(!retirementIds.has(row.id),'Profilavvecklingen innehåller dubbla historik-ID:n.');retirementIds.add(row.id);
   need(row.profileId===profile.id&&row.owner===profile.legacyOwnerName,'Profilavvecklingens historik motsäger den stabila profilidentiteten.');
   need(!profile.active&&!st.settings.owners.includes(profile.legacyOwnerName),'En avvecklad profil får inte användas som operativ ansvarig.');
  }
 }
 for(const o of st.orders){
  need(!o.invoiceOwnerId||ids.has(o.invoiceOwnerId),'En faktura hänvisar till en saknad säljarprofil.');
  need(!o.invoiceOwnerId||o.invoiceOwnerSource!=='legacy_fallback'&&sellerProfileById(st.settings,o.invoiceOwnerId)?.legacyOwnerName===o.invoiceOwner,'Fakturans säljarkoppling motsäger det historiska underlaget.');
 }
 for(const c of st.customers){
  const prospect=c.prospecting;
  need(!prospect.qualifiedOwnerId||ids.has(prospect.qualifiedOwnerId),'Ett kvalificerat prospekt hänvisar till en saknad säljarprofil.');
  need(!prospect.qualifiedOwnerId||!!prospect.qualifiedAt&&sellerProfileById(st.settings,prospect.qualifiedOwnerId)?.legacyOwnerName===prospect.qualifiedOwner,'Prospektets säljarkoppling motsäger det historiska underlaget.');
 }
 for(const id of [...Object.keys(st.settings.sellerGoalsById),...Object.keys(st.settings.sellerAnnualGoalsById)])need(ids.has(id),'Ett säljarmål hänvisar till en saknad säljarprofil.');
 validateCompanyActivityResponsibilityReferences(st);
}
export function protectSellerSettings(previous:Settings,next:Settings,rawData:unknown){
 const raw=rawData as Record<string,unknown>;
 for(const key of ['sellerProfiles','sellerProfilesInitialized'] as const){
  if(Object.prototype.hasOwnProperty.call(raw,key))need(JSON.stringify(next[key])===JSON.stringify(previous[key]),'Säljarprofiler och deras kontokopplingar ändras i det särskilda profilflödet.');
 }
 next.sellerProfiles=structuredClone(previous.sellerProfiles);next.sellerProfilesInitialized=previous.sellerProfilesInitialized;
 if(!Object.prototype.hasOwnProperty.call(raw,'sellerGoalsById'))next.sellerGoalsById=structuredClone(previous.sellerGoalsById);
 if(!Object.prototype.hasOwnProperty.call(raw,'sellerAnnualGoalsById'))next.sellerAnnualGoalsById=structuredClone(previous.sellerAnnualGoalsById);
 if(previous.sellerProfilesInitialized){
  for(const alias of next.owners)need(previous.owners.includes(alias)||!sellerProfileForOwner(previous,alias),'En tidigare säljarprofil får inte återanvändas som en ny ansvarig. Lägg till en separat ansvarskoppling.');
  for(const key of ['sellerGoals','sellerAnnualGoals'] as const)need(JSON.stringify(next[key])===JSON.stringify(previous[key]),'Säljarmål sparas per stabilt profil-ID. Läs in de aktuella målen.');
 }
}
