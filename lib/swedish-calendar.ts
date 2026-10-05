import {RuleError} from './crm-errors';

const dayFormat=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'});

// Instants and date-only customer approvals use different representations.
// An absent legacy instant remains unknown; malformed recorded data is an error.
export function swedishCalendarDay(at:string,errorMessage:string){
 if(!at)return '';
 const timestamp=new Date(at);
 if(Number.isNaN(timestamp.getTime()))throw new RuleError(errorMessage);
 return dayFormat.format(timestamp);
}
