import handler from 'vinext/server/fetch-handler';
import {frameBackupResponse} from './lib/backup-http';

export default {
 async fetch(...args:Parameters<typeof handler.fetch>){
  return frameBackupResponse(args[0],await handler.fetch(...args));
 }
};
