import type {Customer} from './crm';

function normalize(value:string){
 return value.trim().toLocaleLowerCase('sv-SE');
}

export function customerMatchesQuery(customer:Customer,query:string,extra:string[]=[]){
 const needle=normalize(query);
 if(!needle)return true;
 const addresses=[customer.billingAddress,customer.deliveryAddress,...customer.sites.map(site=>site.address)];
 const values=[
  customer.name,customer.organizationNumber,customer.fortnoxNumber,customer.contact,
  customer.email,customer.phone,customer.segment,customer.source,customer.website,
  customer.billingEmail,customer.need,...extra,
  ...addresses.flatMap(address=>Object.values(address)),
  ...customer.sites.flatMap(site=>[site.name,site.contact]),
  ...customer.plan.contacts.flatMap(contact=>[contact.name,contact.role,contact.email,contact.phone]),
 ];
 return normalize(values.filter(Boolean).join(' ')).includes(needle);
}
