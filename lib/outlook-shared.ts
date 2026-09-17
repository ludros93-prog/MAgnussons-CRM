export type OutlookItem={id:string;kind:'mail'|'meeting';subject:string;body:string;at:string;end:string;sender:string;recipients:string[];location:string;webLink:string;conversationId:string;cancelled:boolean;removed:boolean;allDay:boolean;candidateIds:string[];customerId:string;dealId:string;shared:boolean;mine:boolean;mailbox:string;direction:'in'|'out'|'meeting'};
export type OutlookState={configured:boolean;missing:string[];signedIn:boolean;email:string;connection:null|{email:string;lastSync:string;status:string;syncNote:string};items:OutlookItem[];limited:boolean};
export const OUTLOOK_SCOPES=['offline_access','User.Read','Mail.Read','Calendars.Read'];
export const OUTLOOK_REDIRECT='https://magnussons-crm.rosen123.chatgpt.site/api/outlook/callback';
