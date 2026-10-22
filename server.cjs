'use strict';
// Small, single-process multiplayer server. No external npm packages required.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {promisify}=require('node:util');
const scrypt=promisify(crypto.scrypt);
const SESSION_MS=7*24*60*60*1000, ONLINE_MS=30000, RING_MS=45000;
const id=()=>crypto.randomBytes(18).toString('hex');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function fail(status,message){const error=new Error(message);error.status=status;throw error;}
function createGameServer(options={}){
 const dataDir=options.dataDir||process.env.KORA_DATA_DIR||path.join(__dirname,'.data');
 const filename=path.join(dataDir,'phone.json');
 let db={users:[],messages:[],sessions:[],requests:[],blocks:[]};
 if(options.persist!==false&&fs.existsSync(filename)){db=JSON.parse(fs.readFileSync(filename,'utf8'));}
 const calls=new Map(),rates=new Map();let revision=0;
 const iceServers=options.iceServers||JSON.parse(process.env.KORA_ICE_SERVERS||'[{"urls":"stun:stun.l.google.com:19302"}]');
 if(!Array.isArray(iceServers))throw new Error('KORA_ICE_SERVERS must be a JSON array.');
 function persist(){if(options.persist===false)return;fs.mkdirSync(dataDir,{recursive:true});const temp=filename+'.tmp';fs.writeFileSync(temp,JSON.stringify(db),{mode:0o600});fs.renameSync(temp,filename);}
 function publicUser(user){return {id:user.id,name:user.name,code:user.code,online:Date.now()-(user.lastSeen||0)<ONLINE_MS,location:user.location||'home'};}
 function userById(userId){return db.users.find(u=>u.id===userId);}
 function blocked(a,b){return db.blocks.some(r=>(r.from===a&&r.to===b)||(r.from===b&&r.to===a));}
 function contacts(a,b){return !blocked(a,b)&&db.requests.some(r=>r.status==='accepted'&&((r.from===a&&r.to===b)||(r.from===b&&r.to===a)));}
 function rate(key,max=90,period=60000){const now=Date.now();let r=rates.get(key);if(!r||now-r.at>period){r={at:now,count:0};rates.set(key,r);}r.count++;if(r.count>max)fail(429,'A little too fast. Please wait a moment and try again.');}
 function authenticated(req){const match=(req.headers.cookie||'').split(';').map(c=>c.trim()).find(c=>c.startsWith('kora_session='));if(!match)fail(401,'Sign in to your Kora phone.');const tokenHash=hash(match.slice('kora_session='.length));const session=db.sessions.find(s=>s.tokenHash===tokenHash&&s.expires>Date.now());if(!session)fail(401,'Your phone session expired. Please sign in again.');const user=userById(session.userId);if(!user)fail(401,'Please sign in again.');return {user,session};}
 function sessionCookie(req,res,user){const token=crypto.randomBytes(32).toString('hex');db.sessions=db.sessions.filter(s=>s.expires>Date.now());db.sessions.push({tokenHash:hash(token),userId:user.id,expires:Date.now()+SESSION_MS});if(db.sessions.length>10000)db.sessions=db.sessions.slice(-10000);res.setHeader('Set-Cookie',`kora_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MS/1000}${secureRequest(req)?'; Secure':''}`);}
 function secureRequest(req){return !!req.socket.encrypted||process.env.KORA_SECURE_COOKIE==='1';}
 function expireCalls(){const now=Date.now();for(const [callId,call]of calls){if(call.status==='ringing'&&now-call.createdAt>RING_MS){call.status='missed';call.endedAt=now;}if(!['ringing','accepted'].includes(call.status)&&now-(call.endedAt||call.createdAt)>60000)calls.delete(callId);if(call.status==='accepted'&&now-call.createdAt>4*60*60*1000){call.status='ended';call.endedAt=now;}}}
 function activeCall(userId){expireCalls();return [...calls.values()].find(c=>['ringing','accepted'].includes(c.status)&&(c.from===userId||c.to===userId));}
 function viewCall(call,userId){return {id:call.id,from:call.from,to:call.to,status:call.status,createdAt:call.createdAt,signals:call.signals.filter(s=>s.from!==userId),other:publicUser(userById(call.from===userId?call.to:call.from))};}
 async function body(req){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>64000)fail(413,'That request is too large.');chunks.push(chunk);}try{const result=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');if(!result||Array.isArray(result)||typeof result!=='object')fail(400,'Use a JSON object.');return result;}catch(e){if(e.status)throw e;fail(400,'That request could not be read.');}}
 function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');
  if(!url.pathname.startsWith('/api/')){if(req.method!=='GET'&&req.method!=='HEAD')fail(405,'Method not allowed.');let relative;try{relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';}catch(e){fail(400,'Invalid path.');}const root=path.join(__dirname,'dist'),file=path.resolve(root,relative);if(!file.startsWith(root+path.sep))fail(404,'Not found.');const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};if(!types[path.extname(file)]||!fs.existsSync(file)||!fs.statSync(file).isFile())fail(404,'Not found.');res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Permissions-Policy':'microphone=(self), camera=()'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);return;}
  if(req.headers.origin&&req.headers.origin!==`${secureRequest(req)?'https':'http'}://${req.headers.host}`&&req.headers.origin!==process.env.KORA_ORIGIN)fail(403,'Use the game’s own address to connect.');
  if(req.method==='POST'&&!String(req.headers['content-type']).startsWith('application/json'))fail(415,'Expected JSON.');
  const route=url.pathname,ip=req.socket.remoteAddress||'unknown';
  if(route==='/api/health'&&req.method==='GET'){json(res,200,{ok:true,phone:true});return;}
  if(['/api/register','/api/login'].includes(route)&&req.method==='POST'){
   rate('auth:'+ip,options.authRateLimit||20,15*60000);const data=await body(req);const username=String(data.username||'').trim().toLowerCase(),password=data.password;
   if(!/^[a-z0-9_]{3,20}$/.test(username)||typeof password!=='string'||password.length<8||password.length>128)fail(400,'Use a username of 3–20 letters, numbers or underscores, and a password of 8–128 characters.');
   let user=db.users.find(u=>u.username===username);
   if(route==='/api/register'){
    if(db.users.length>=10000)fail(503,'This test server is full.');if(user)fail(409,'That username is already taken.');const name=String(data.name||username).trim().slice(0,24);if(!name)fail(400,'Choose a display name.');const salt=crypto.randomBytes(16).toString('hex'),derived=await scrypt(password,salt,64);
    if(db.users.some(u=>u.username===username))fail(409,'That username is already taken.');let code;do{code=crypto.randomBytes(5).toString('hex').toUpperCase();}while(db.users.some(u=>u.code===code));user={id:id(),username,name,salt,passwordHash:derived.toString('hex'),code,lastSeen:Date.now(),location:'home'};db.users.push(user);
   }else{const derived=await scrypt(password,user?.salt||'unavailable-account',64);if(!user||!crypto.timingSafeEqual(derived,Buffer.from(user.passwordHash,'hex')))fail(401,'The username or password doesn’t match.');user.lastSeen=Date.now();}
   sessionCookie(req,res,user);persist();json(res,200,{user:publicUser(user)});return;
  }
  const {user,session}=authenticated(req);rate('user:'+user.id,600);
  if(route==='/api/logout'&&req.method==='POST'){const current=activeCall(user.id);if(current){current.status='ended';current.endedAt=Date.now();}db.sessions=db.sessions.filter(s=>s!==session);user.lastSeen=0;persist();res.setHeader('Set-Cookie','kora_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');json(res,200,{ok:true});return;}
  if(route==='/api/poll'&&req.method==='GET'){
   const location=url.searchParams.get('location');if(['home','market','cafe','library','waterfront','studio'].includes(location))user.location=location;user.lastSeen=Date.now();expireCalls();
   const accepted=db.requests.filter(r=>r.status==='accepted'&&(r.from===user.id||r.to===user.id));const people=accepted.map(r=>userById(r.from===user.id?r.to:r.from)).filter(p=>p&&!blocked(user.id,p.id));
   const incoming=db.requests.filter(r=>r.status==='pending'&&r.to===user.id&&!blocked(r.from,r.to)).map(r=>({id:r.id,user:publicUser(userById(r.from))}));
   const outgoing=db.requests.filter(r=>r.status==='pending'&&r.from===user.id&&!blocked(r.from,r.to)).map(r=>({id:r.id,user:publicUser(userById(r.to))}));
   const messages=db.messages.filter(m=>(m.from===user.id||m.to===user.id)&&contacts(m.from,m.to));
   const relevant=[...calls.values()].filter(c=>(c.from===user.id||c.to===user.id)&&contacts(c.from,c.to)).map(c=>viewCall(c,user.id));
   json(res,200,{user:publicUser(user),contacts:people.map(publicUser),incoming,outgoing,messages:messages.slice(-500),calls:relevant,iceServers,relayConfigured:iceServers.some(s=>(Array.isArray(s.urls)?s.urls:[s.urls]).some(u=>/^turns?:/.test(u))),revision});return;
  }
  if(req.method!=='POST')fail(404,'Not found.');const data=await body(req);
  if(route==='/api/contacts/request'){
   rate('invites:'+user.id,20);const code=String(data.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');const other=db.users.find(u=>u.code===code);if(!other||blocked(user.id,other.id))fail(404,'That contact code could not be found.');if(other.id===user.id)fail(400,'That is your own contact code.');if(contacts(user.id,other.id))fail(409,'You are already connected.');if(db.requests.some(r=>r.status==='pending'&&((r.from===user.id&&r.to===other.id)||(r.from===other.id&&r.to===user.id))))fail(409,'There is already a pending request between you.');db.requests.push({id:id(),from:user.id,to:other.id,status:'pending'});persist();json(res,200,{ok:true});return;
  }
  if(route==='/api/contacts/respond'){
   const request=db.requests.find(r=>r.id===data.requestId&&r.to===user.id&&r.status==='pending');if(!request||blocked(request.from,request.to))fail(404,'That request is no longer available.');if(typeof data.accept!=='boolean')fail(400,'Choose accept or decline.');request.status=data.accept?'accepted':'declined';persist();json(res,200,{ok:true});return;
  }
  if(route==='/api/contacts/block'){
   const other=userById(data.to);if(!other||other.id===user.id)fail(404,'Contact not found.');if(!db.blocks.some(b=>b.from===user.id&&b.to===other.id))db.blocks.push({from:user.id,to:other.id});db.requests=db.requests.filter(r=>!((r.from===user.id&&r.to===other.id)||(r.from===other.id&&r.to===user.id)));for(const call of calls.values())if((call.from===user.id&&call.to===other.id)||(call.from===other.id&&call.to===user.id)){call.status='ended';call.endedAt=Date.now();}persist();json(res,200,{ok:true});return;
  }
  if(route==='/api/messages'){
   rate('messages:'+user.id,40);if(!contacts(user.id,data.to))fail(403,'Connect with this player before sending a message.');const text=typeof data.text==='string'?data.text.trim():'';if(!text||text.length>1000)fail(400,'Write a message of 1–1,000 characters.');const message={id:id(),from:user.id,to:data.to,text,at:Date.now()};db.messages.push(message);const conversation=db.messages.filter(m=>(m.from===user.id&&m.to===data.to)||(m.from===data.to&&m.to===user.id));if(conversation.length>100){const remove=new Set(conversation.slice(0,-100).map(m=>m.id));db.messages=db.messages.filter(m=>!remove.has(m.id));}revision++;persist();json(res,200,{message});return;
  }
  if(route==='/api/calls/start'){
   rate('calls:'+user.id,10);if(!contacts(user.id,data.to))fail(403,'Only accepted contacts can call each other.');const other=userById(data.to);if(Date.now()-other.lastSeen>ONLINE_MS)fail(409,'This player is offline. Send them a message instead.');if(activeCall(user.id)||activeCall(other.id))fail(409,'One of you is already on a call.');const call={id:id(),from:user.id,to:other.id,status:'ringing',createdAt:Date.now(),signals:[]};calls.set(call.id,call);json(res,200,{call:viewCall(call,user.id)});return;
  }
  if(route==='/api/calls/respond'){
   expireCalls();const call=calls.get(data.callId);if(!call||call.to!==user.id||call.status!=='ringing'||!contacts(call.from,call.to))fail(409,'That call is no longer ringing.');if(typeof data.accept!=='boolean')fail(400,'Choose answer or decline.');call.status=data.accept?'accepted':'declined';if(!data.accept)call.endedAt=Date.now();json(res,200,{call:viewCall(call,user.id)});return;
  }
  if(route==='/api/calls/signal'){
   const call=calls.get(data.callId);if(!call||![call.from,call.to].includes(user.id)||call.status!=='accepted'||!contacts(call.from,call.to))fail(403,'This call is not active.');const signal=data.signal;if(!signal||!['offer','answer','ice'].includes(signal.type))fail(400,'Unsupported call signal.');if((signal.type==='offer'&&call.from!==user.id)||(signal.type==='answer'&&call.to!==user.id))fail(403,'Invalid call role.');if(signal.type==='ice'){if(signal.candidate!==null&&(!signal.candidate||typeof signal.candidate.candidate!=='string'||signal.candidate.candidate.length>3000))fail(400,'Invalid connection candidate.');}else if(typeof signal.sdp!=='string'||signal.sdp.length>30000)fail(400,'Invalid call description.');if(call.signals.length>=1000)fail(429,'Too many connection updates.');call.signals.push({...signal,id:id(),from:user.id});json(res,200,{ok:true});return;
  }
  if(route==='/api/calls/end'){
   const call=calls.get(data.callId);if(call&&[call.from,call.to].includes(user.id)){call.status='ended';call.endedAt=Date.now();}json(res,200,{ok:true});return;
  }
  fail(404,'Not found.');
 }catch(error){if(!res.headersSent)json(res,error.status||500,{error:error.status?error.message:'The phone service had a problem. Please try again.'});else res.end();if(!error.status)console.error('Phone server error:',error.message);}});
 server.on('close',()=>{calls.clear();});return server;
}
if(require.main===module){const host=process.env.KORA_HOST||(process.env.PORT?'0.0.0.0':'127.0.0.1'),port=Number(process.env.PORT||4173);const address=`http://localhost:${port}`;function openGame(){if(!process.argv.includes('--open'))return;const {execFile}=require('node:child_process');if(process.platform==='win32')execFile('rundll32.exe',['url.dll,FileProtocolHandler',address],{windowsHide:true},error=>{if(error)console.error('The browser did not open automatically. Open '+address+' in Chrome or Edge.');});else console.log('Open '+address+' in your browser.');}const server=createGameServer();server.listen(port,host,()=>{console.log(`Kora Bay is ready at ${address}\nKeep this window open while you play. Press Ctrl+C to stop.`);openGame();});server.on('error',async error=>{if(error.code==='EADDRINUSE'){try{const response=await fetch(address+'/api/health');const data=await response.json();if(data.phone){console.log('Kora Bay is already running at '+address);openGame();return;}}catch(e){}}console.error('Could not start Kora Bay: '+error.message);process.exitCode=1;});}
module.exports={createGameServer};
