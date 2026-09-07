// Run from this repository: node --env-file=.env.local scripts/backfill-animal-thumbnails.mjs
// Uses the production queue; never deploys a server or overwrites original photos.
import {createServer} from 'vite';
const server=await createServer({configFile:false,envFile:false,server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'});
try {
  const {processAnimalThumbnails}=await server.ssrLoadModule('/lib/animal-thumbnails.ts');
  for(let batch=1;batch<=100;batch++) {
    const result=await processAnimalThumbnails({maxJobs:1000,durationMs:200000,concurrency:8});
    console.log(JSON.stringify({batch,...result}));
    if(!result.completed&&!result.failed)break;
  }
} finally {await server.close();}
