export type CustomerFile={id:string;name:string;version:string;kind:'logo'|'proof'|'document';size:number;at:string;uploadedBy:string;purpose?:'production';orderId?:string;workId?:string};
export function fileOnWork(f:CustomerFile,o:{id:string;production?:{workId:string;status:string;sketchFileId:string};productionHistory?:{workId:string;sketchFileId:string}[]}):boolean{
 const works=[...(o.production&&o.production.status!=='draft'?[o.production]:[]),...(o.productionHistory||[])];
 return works.some(p=>p.sketchFileId===f.id||(f.purpose==='production'&&f.orderId===o.id&&f.workId===p.workId));
}
