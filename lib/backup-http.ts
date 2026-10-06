export const BACKUP_LENGTH_HEADER='X-Magnussons-Backup-Length';

// Vinext's request-context cleanup wraps API bodies in a plain TransformStream.
// Restore known-length framing only after that handler has finished, using
// trusted response metadata produced by the validated backup endpoint.
export function frameBackupResponse(request:Request,response:Response){
 const url=new URL(request.url),raw=response.headers.get(BACKUP_LENGTH_HEADER);
 const target=request.method==='GET'&&url.pathname==='/api/crm/backup'&&url.searchParams.get('format')==='stream'&&response.status===200&&response.headers.get('Content-Type')?.split(';')[0].trim()==='application/x-ndjson';
 if(raw===null&&!target)return response;
 const length=Number(raw),headers=new Headers(response.headers);headers.delete(BACKUP_LENGTH_HEADER);headers.delete('Content-Length');
 if(!target||!response.body||raw===null||!/^\d+$/.test(raw)||!Number.isSafeInteger(length)||length<=0||!['', 'identity'].includes(response.headers.get('Content-Encoding')||'')){
  void response.body?.cancel().catch(()=>{});
  return Response.json({error:'CRM-kopian kunde inte lämnas komplett. Försök igen.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
 const fixed=new FixedLengthStream(length);
 void response.body.pipeTo(fixed.writable).catch(()=>{/* The HTTP body rejects short/failed exports; pipeTo cancels the source. */});
 return new Response(fixed.readable,{status:response.status,statusText:response.statusText,headers});
}
