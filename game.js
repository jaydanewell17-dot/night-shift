const svg=document.getElementById('world'),playerEl=document.getElementById('player'),markerEl=document.getElementById('interaction-marker'),clockEl=document.getElementById('clock'),messageEl=document.getElementById('message');
const WORLD={width:1200,height:760};const player={x:600,y:610,radius:14,speed:190};const keys=new Set();
const obstacles=[{x:130,y:100,width:230,height:72},{x:130,y:245,width:230,height:72},{x:470,y:100,width:230,height:72},{x:470,y:245,width:230,height:72},{x:810,y:100,width:250,height:75},{x:800,y:340,width:280,height:115},{x:1015,y:590,width:105,height:128}];
const interactables=[{x:935,y:455,radius:75,text:'The register is ready for the night.'},{x:600,y:690,radius:70,text:'The doors are locked for the night.'},{x:1067,y:575,radius:65,text:'Stockroom. Nothing you need right now.'}];
const SHIFT_START=22*60,SHIFT_END=30*60,REAL_SECONDS_PER_GAME_HOUR=75;let gameMinutes=SHIFT_START,lastTime=performance.now(),messageTimer=0;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function circleRect(cx,cy,r,rect){const x=clamp(cx,rect.x,rect.x+rect.width),y=clamp(cy,rect.y,rect.y+rect.height),dx=cx-x,dy=cy-y;return dx*dx+dy*dy<r*r}
function collides(x,y){const walls=[{x:42,y:0,width:1,height:WORLD.height},{x:1157,y:0,width:1,height:WORLD.height},{x:0,y:42,width:WORLD.width,height:1},{x:0,y:717,width:WORLD.width,height:1}];return [...obstacles,...walls].some(r=>circleRect(x,y,player.radius,r))}
function move(dx,dy){if(!collides(player.x+dx,player.y))player.x+=dx;if(!collides(player.x,player.y+dy))player.y+=dy}
function formatClock(m){let n=m%(24*60),h=Math.floor(n/60),min=Math.floor(n%60),s=h>=12?'PM':'AM';h%=12;if(!h)h=12;return `${h}:${String(min).padStart(2,'0')} ${s}`}
function updateClock(dt){gameMinutes+=dt*(60/REAL_SECONDS_PER_GAME_HOUR);if(gameMinutes>=SHIFT_END){gameMinutes=SHIFT_END;clockEl.textContent='6:00 AM';showMessage('Shift complete. Build 1 is done.');return}clockEl.textContent=formatClock(gameMinutes)}
function nearest(){let c=null,d=Infinity;for(const i of interactables){const x=Math.hypot(player.x-i.x,player.y-i.y);if(x<=i.radius&&x<d){c=i;d=x}}return c}
function updateMarker(){const i=nearest();if(!i){markerEl.setAttribute('opacity','0');return}markerEl.setAttribute('opacity','1');markerEl.setAttribute('transform',`translate(${i.x},${i.y-32})`)}
function interact(){const i=nearest();showMessage(i?i.text:'Nothing to interact with here.')}
function showMessage(t){messageEl.textContent=t;messageEl.style.opacity='1';messageTimer=2.5}function updateMessage(dt){if(messageTimer<=0)return;messageTimer-=dt;if(messageTimer<=0)messageEl.style.opacity='0'}
function render(){playerEl.setAttribute('transform',`translate(${player.x},${player.y})`);updateMarker()}
function loop(now){const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;let dx=0,dy=0;if(keys.has('w')||keys.has('arrowup'))dy--;if(keys.has('s')||keys.has('arrowdown'))dy++;if(keys.has('a')||keys.has('arrowleft'))dx--;if(keys.has('d')||keys.has('arrowright'))dx++;if(dx||dy){const l=Math.hypot(dx,dy);move(dx/l*player.speed*dt,dy/l*player.speed*dt)}updateClock(dt);updateMessage(dt);render();requestAnimationFrame(loop)}
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','e'].includes(k))e.preventDefault();keys.add(k);if(k==='e'&&!e.repeat)interact()});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));render();requestAnimationFrame(loop);
