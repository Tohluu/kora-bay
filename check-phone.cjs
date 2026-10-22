'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {createGameServer}=require('./server.cjs');
async function listen(server){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return 'http://127.0.0.1:'+server.address().port;}
async function close(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
function client(base){let cookie='';return async(route,data,extra={})=>{const response=await fetch(base+'/api/'+route,{method:data===undefined?'GET':'POST',headers:{...(cookie?{Cookie:cookie}:{}),...(data===undefined?{}:{'Content-Type':'application/json'}),...extra},body:data===undefined?undefined:JSON.stringify(data)});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return {status:response.status,data:await response.json(),headers:response.headers};};}
(async()=>{
 const server=createGameServer({persist:false,authRateLimit:100}),base=await listen(server);
 try{
  const a=client(base),b=client(base),c=client(base),anonymous=client(base);
  assert.equal((await anonymous('poll')).status,401,'Phone data requires a session');
  assert.equal((await anonymous('register',{username:'a',password:'short'})).status,400,'Account constraints enforced');
  const alice=(await a('register',{username:'alice',name:'Alice',password:'a-long-password-1'})).data.user;
  const bob=(await b('register',{username:'bob',name:'Bob',password:'a-long-password-2'})).data.user;
  const charlie=(await c('register',{username:'charlie',name:'Charlie',password:'a-long-password-3'})).data.user;
  assert.equal((await anonymous('register',{username:'alice',password:'another-password'})).status,409,'Duplicate accounts rejected');
  assert.equal((await anonymous('login',{username:'alice',password:'wrong-password'})).status,401,'Bad passwords rejected');
  assert.equal((await anonymous('login',{username:'doesnotexist',password:'wrong-password'})).status,401,'Unknown users get same login error');
  const profile=(await a('poll?location=cafe')).data;assert.equal(profile.user.location,'cafe');assert.equal(profile.user.online,true);assert.equal(profile.contacts.length,0);assert.equal(profile.user.passwordHash,undefined,'Password hashes stay server-side');
  assert.equal((await a('messages',{to:bob.id,text:'Not yet'})).status,403,'Messages require accepted contacts');
  assert.equal((await a('calls/start',{to:bob.id})).status,403,'Calls require accepted contacts');
  assert.equal((await a('contacts/request',{code:alice.code})).status,400,'Cannot add self');
  assert.equal((await a('contacts/request',{code:'NOPE'})).status,404);
  assert.equal((await a('contacts/request',{code:bob.code})).status,200);
  assert.equal((await a('contacts/request',{code:bob.code})).status,409,'Duplicate requests rejected');
  const request=(await b('poll')).data.incoming[0];assert.equal(request.user.id,alice.id);
  assert.equal((await c('contacts/respond',{requestId:request.id,accept:true})).status,404,'Only recipient can accept');
  assert.equal((await b('contacts/respond',{requestId:request.id,accept:true})).status,200);
  assert.equal((await a('poll')).data.contacts[0].id,bob.id);assert.equal((await b('poll')).data.contacts[0].id,alice.id);
  const content='<img src=x onerror=alert(1)> & hello';assert.equal((await a('messages',{to:bob.id,text:content})).status,200);
  assert.equal((await b('poll')).data.messages[0].text,content,'Text delivered exactly');
  assert.equal((await c('poll')).data.messages.length,0,'Unrelated player cannot read messages');
  assert.equal((await a('messages',{to:bob.id,text:''})).status,400);assert.equal((await a('messages',{to:bob.id,text:'x'.repeat(1001)})).status,400);
  assert.equal((await a('messages',{to:bob.id,text:'Cross-site attempt'},{Origin:'https://unrelated.example'})).status,403,'Cross-origin writes rejected');
  const call=(await a('calls/start',{to:bob.id})).data.call;assert.equal(call.status,'ringing');
  assert.equal((await b('poll')).data.calls[0].id,call.id,'Incoming call delivered');
  assert.equal((await c('calls/respond',{callId:call.id,accept:true})).status,409,'Unrelated player cannot answer');
  assert.equal((await b('calls/start',{to:alice.id})).status,409,'Busy callers cannot create a second call');
  assert.equal((await a('calls/signal',{callId:call.id,signal:{type:'offer',sdp:'v=0'}})).status,403,'No media signalling before acceptance');
  assert.equal((await b('calls/respond',{callId:call.id,accept:true})).status,200);
  assert.equal((await a('calls/signal',{callId:call.id,signal:{type:'offer',sdp:'v=0\r\n',from:charlie.id,id:'spoof'}})).status,200);
  const received=(await b('poll')).data.calls[0].signals[0];assert.equal(received.type,'offer');assert.equal(received.from,alice.id,'Signal sender cannot be forged');assert.notEqual(received.id,'spoof');
  assert.equal((await b('calls/signal',{callId:call.id,signal:{type:'answer',sdp:'v=0\r\n'}})).status,200);
  assert.equal((await a('calls/signal',{callId:call.id,signal:{type:'ice',candidate:{candidate:'candidate:1',sdpMid:'0',sdpMLineIndex:0}}})).status,200);
  assert.equal((await b('calls/signal',{callId:call.id,signal:{type:'offer',sdp:'v=0'}})).status,403,'Call roles enforced');
  assert.equal((await c('calls/signal',{callId:call.id,signal:{type:'ice',candidate:null}})).status,403,'Unrelated players cannot inject call signals');
  const pollA=(await a('poll')).data;assert.equal(pollA.calls[0].signals[0].type,'answer');assert.equal(pollA.calls[0].signals.length,1,'Only remote signals are returned');
  await a('calls/end',{callId:call.id});assert.equal((await b('poll')).data.calls[0].status,'ended','Hang-up reaches other caller');
  const next=(await b('calls/start',{to:alice.id})).data.call;await a('calls/respond',{callId:next.id,accept:false});assert.equal((await b('poll')).data.calls.find(c=>c.id===next.id).status,'declined');
  await b('contacts/block',{to:alice.id});assert.equal((await a('messages',{to:bob.id,text:'Blocked'})).status,403);assert.equal((await a('calls/start',{to:bob.id})).status,403);assert.equal((await a('poll')).data.contacts.length,0);assert.equal((await a('contacts/request',{code:bob.code})).status,404,'Blocking prevents new invitations');
  await a('logout',{});assert.equal((await a('poll')).status,401,'Logout revokes session');
  const page=await fetch(base+'/');assert.equal(page.status,200);assert.ok((await page.text()).includes('phone.js'),'Game serves phone client');assert.equal((await fetch(base+'/.data/phone.json')).status,404,'Server data cannot be served as assets');
 }finally{await close(server);}
 // Prove accounts and messages survive a server restart, with no real user data.
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'kora-phone-test-'));let persistent;
 try{persistent=createGameServer({dataDir:temp});let origin=await listen(persistent),a=client(origin),b=client(origin);const ua=(await a('register',{username:'saved_alice',password:'persistent-password'})).data.user;const ub=(await b('register',{username:'saved_bob',password:'persistent-password'})).data.user;await a('contacts/request',{code:ub.code});const req=(await b('poll')).data.incoming[0];await b('contacts/respond',{requestId:req.id,accept:true});await a('messages',{to:ub.id,text:'Still here after restart'});await close(persistent);persistent=createGameServer({dataDir:temp});origin=await listen(persistent);b=client(origin);assert.equal((await b('login',{username:'saved_bob',password:'persistent-password'})).status,200);const data=(await b('poll')).data;assert.equal(data.contacts[0].id,ua.id);assert.equal(data.messages[0].text,'Still here after restart');const stored=fs.readFileSync(path.join(temp,'phone.json'),'utf8');assert.ok(!stored.includes('persistent-password'),'Passwords are not stored as plaintext');}
 finally{if(persistent?.listening)await close(persistent);for(const filename of ['phone.json','phone.json.tmp']){const file=path.join(temp,filename);if(fs.existsSync(file))fs.unlinkSync(file);}fs.rmdirSync(temp);}
 console.log('Passed: two-player registration/login, accepted contacts, isolated persistent messages, call invite/answer/decline/hang-up and SDP/ICE exchange, busy checks, authorization, sender integrity, blocking, logout, origin protection, static serving, and server restart persistence. Voice audio itself needs browser/device testing.');
})().catch(error=>{console.error(error);process.exitCode=1;});
