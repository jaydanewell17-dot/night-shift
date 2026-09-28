const svg = document.getElementById('world');
const playerEl = document.getElementById('player');
const marker = document.getElementById('marker');
const clockEl = document.getElementById('clock');
const noticeEl = document.getElementById('notice');
const noticeText = document.getElementById('noticeText');
const promptEl = document.getElementById('prompt');
const messageEl = document.getElementById('message');
const registerPanel = document.getElementById('registerPanel');
const registerItems = document.getElementById('registerItems');
const scanner = document.getElementById('scanner');
const till = document.getElementById('till');
const terminal = document.getElementById('terminal');
const checkoutTotal = document.getElementById('checkoutTotal');
const customerName = document.getElementById('customerName');
const statusLine = document.getElementById('statusLine');
const cashFloat = document.getElementById('cashFloat');
const worldHint = document.getElementById('worldHint');

const player = { x: 620, y: 610, r: 15, speed: 185 };
const keys = new Set();
let last = performance.now();
let shiftMinutes = 1320;
let noticeTimer = 0;
let messageTimer = 0;
let served = 0;
let checkoutCustomer = null;
let scanned = [];
let paymentReady = false;
let dragging = null;
let coffeeStage = 0;
let trashStage = 0;
let shelfLow = true;
let coolerOpen = true;
let registerOpen = false;

const prices = { chips: 2.49, soda: 1.99, candy: 1.79, water: 1.49 };
const names = { chips: 'Potato Chips', soda: 'Cola', candy: 'Candy', water: 'Water' };
const browsePoints = {
  chips: { x: 390, y: 205 },
  candy: { x: 390, y: 355 },
  soda: { x: 740, y: 210 },
  water: { x: 740, y: 250 }
};

const obstacles = [
  { x: 105, y: 86, w: 270, h: 95 }, { x: 105, y: 238, w: 270, h: 95 },
  { x: 430, y: 86, w: 270, h: 95 }, { x: 430, y: 238, w: 270, h: 95 },
  { x: 780, y: 82, w: 330, h: 105 }, { x: 785, y: 345, w: 310, h: 135 },
  { x: 855, y: 500, w: 110, h: 125 }, { x: 80, y: 565, w: 68, h: 82 },
  { x: 1020, y: 575, w: 100, h: 143 }, { x: 530, y: 645, w: 140, h: 73 }
];

const customers = [
  { name: 'CUSTOMER 01', items: ['chips','soda','candy'], x: 620, y: 680, route: [], step: 0, state: 'entering', speed: 48, color: '#4a4a4a' },
  { name: 'CUSTOMER 02', items: ['water','chips'], x: 590, y: 700, route: [], step: 0, state: 'waiting', speed: 45, color: '#5b554d' },
  { name: 'CUSTOMER 03', items: ['soda','water','candy'], x: 650, y: 700, route: [], step: 0, state: 'waiting', speed: 43, color: '#383838' },
  { name: 'CUSTOMER 04', items: ['candy','water','chips','soda'], x: 560, y: 700, route: [], step: 0, state: 'waiting', speed: 42, color: '#68615a' }
];

const customerEls = customers.map((c, i) => {
  const g = document.createElementNS('http://www.w3.org/2000/svg','g');
  g.innerHTML = `<ellipse cx="0" cy="17" rx="15" ry="5" fill="#111" opacity=".5"/><circle cy="-5" r="7" fill="${i % 2 ? '#a98e7e' : '#8d7769'}"/><path d="M-7-5q1-11 7-11t7 11q-4-4-7-3t-7 3" fill="${i % 2 ? '#292929' : '#151515'}"/><path d="M-10 7q10-7 20 0v13h-20z" fill="${c.color}"/>`;
  svg.appendChild(g);
  return g;
});

function money(n) { return '$' + n.toFixed(2); }
function total(items) { return items.reduce((sum, item) => sum + prices[item], 0); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function dist(a,b) { return Math.hypot(a.x-b.x, a.y-b.y); }
function hit(x,y,r,o) { const qx=clamp(x,o.x,o.x+o.w), qy=clamp(y,o.y,o.y+o.h); return (x-qx)**2+(y-qy)**2<r*r; }
function collide(x,y,r=player.r) { return obstacles.some(o=>hit(x,y,r,o)) || x<58 || x>1142 || y<58 || y>702; }
function movePlayer(dx,dy) { if(!collide(player.x+dx,player.y)) player.x+=dx; if(!collide(player.x,player.y+dy)) player.y+=dy; }
function showMessage(text) { messageEl.textContent=text; messageEl.style.opacity='1'; messageTimer=3; }
function showNotice(text) { noticeText.textContent=text; noticeEl.classList.add('show'); noticeTimer=5; }
function hideNotice() { noticeEl.classList.remove('show'); }

function customerRoute(c) {
  const route = [];
  c.items.forEach(item => route.push(browsePoints[item]));
  route.push({ x: 748, y: 515 });
  return route;
}
customers.forEach(c => c.route = customerRoute(c));

function customerBlocked(x,y,c) {
  if (obstacles.some(o=>hit(x,y,13,o))) return true;
  return customers.some(other=>other!==c && other.state!=='served' && Math.hypot(x-other.x,y-other.y)<27);
}

function updateCustomers(dt) {
  customers.forEach((c,i)=>{
    if(c.state==='waiting' || c.state==='served' || c.state==='checkout') return;
    const target = c.route[c.step];
    if(!target) { c.state='ready'; return; }
    let dx=target.x-c.x, dy=target.y-c.y, d=Math.hypot(dx,dy);
    if(d<9) {
      if(c.step < c.route.length-1) {
        c.step++;
        if(c.step>0 && c.step<=c.items.length) showNotice(`${c.name.toLowerCase()} is browsing the store.`);
      } else {
        c.state='ready';
        showNotice(`${c.name.toLowerCase()} is waiting at the register.`);
      }
      return;
    }
    const nx=c.x+(dx/d)*c.speed*dt, ny=c.y+(dy/d)*c.speed*dt;
    if(!customerBlocked(nx,ny,c)) { c.x=nx; c.y=ny; }
    else {
      const sx=c.x+(dy/d)*c.speed*dt, sy=c.y-(dx/d)*c.speed*dt;
      if(!customerBlocked(sx,sy,c)){c.x=sx;c.y=sy;}
    }
    customerEls[i].setAttribute('transform',`translate(${c.x},${c.y})`);
  });
}

function startNextCustomer(){
  const next=customers.find(c=>c.state==='waiting');
  if(next){ next.state='entering'; next.route=customerRoute(next); next.step=0; next.x=620; next.y=680; showNotice('The door opens. Someone is coming in.'); }
}

function updateClock(dt){
  shiftMinutes += dt * 0.72;
  if(shiftMinutes>=1800) shiftMinutes=1800;
  let h=Math.floor((shiftMinutes%1440)/60), m=Math.floor(shiftMinutes%60), ap=h>=12?'PM':'AM'; h=h%12||12;
  clockEl.textContent=`${h}:${String(m).padStart(2,'0')} ${ap}`;
}

function near(x,y,r){ return Math.hypot(player.x-x,player.y-y)<r; }

function interactWorld(){
  if(registerOpen) return;

  const customer=customers.find(c=>c.state==='ready' && near(c.x,c.y,90));
  if(customer){ openCheckout(customer); return; }

  if(near(915,555,95)){
    if(coffeeStage===0){ coffeeStage=1; showNotice('The coffee station is grimy. You pull the cleaning cloth from beneath the counter.'); showMessage('Hold E while you move around the machine to wipe it down.'); }
    else if(coffeeStage===1){ coffeeStage=2; showNotice('The counter is clean. The brewer needs fresh cups.'); showMessage('Move close to the cup stack and press E to refill it.'); }
    else { coffeeStage=0; showNotice('Coffee station reset. It is ready for the next customer.'); showMessage('Coffee station finished.'); }
    return;
  }

  if(near(112,610,85)){
    if(trashStage===0){ trashStage=1; showNotice('The trash bag is full. Tie it off and carry it to the dumpster outside.'); showMessage('The bag is in your hands. Walk it to the front door.'); }
    else if(trashStage===1 && near(600,680,150)){ trashStage=2; showNotice('You step outside with the tied bag.'); showMessage('Take the bag to the dumpster.'); }
    else if(trashStage===2 && near(640,675,90)){ trashStage=0; showNotice('The bag drops into the dumpster.'); showMessage('Trash taken out.'); }
    return;
  }

  if(near(240,430,100) && shelfLow){ shelfLow=false; showNotice('You notice an open delivery box and a low snack shelf.'); showMessage('Carry the box to the snack shelf, then put the products away.'); return; }

  if(near(915,205,110) && coolerOpen){ coolerOpen=false; showNotice('The cooler door was left slightly open. You push it shut.'); showMessage('The compressor kicks back on.'); return; }

  showMessage('Nothing here needs attention right now.');
}

function updateWorldPrompt(){
  let text='WASD / ARROWS  MOVE   E  INTERACT';
  let active=false, x=0, y=0;
  const c=customers.find(c=>c.state==='ready' && near(c.x,c.y,90));
  if(c){text='E  WORK THE REGISTER';active=true;x=c.x;y=c.y-32;}
  else if(near(915,555,95) && coffeeStage<3){text=coffeeStage===0?'E  INSPECT COFFEE STATION':coffeeStage===1?'HOLD E + MOVE  WIPE MACHINE':'E  REFILL CUPS';active=true;x=915;y=510;}
  else if(near(112,610,85) || (trashStage>0 && near(600,680,150))){text=trashStage===0?'E  CHECK TRASH':trashStage===1?'CARRY BAG  →  FRONT DOOR':'CARRY BAG  →  DUMPSTER';active=true;x=112;y=555;}
  else if(near(240,430,100) && shelfLow){text='E  CHECK DELIVERY';active=true;x=240;y=390;}
  else if(near(915,205,110) && coolerOpen){text='E  CLOSE COOLER DOOR';active=true;x=915;y=245;}
  promptEl.textContent=text;
  marker.setAttribute('opacity',active?'1':'0');
  if(active) marker.setAttribute('transform',`translate(${x},${y})`);
}

function openCheckout(c){
  registerOpen=true; checkoutCustomer=c; scanned=[]; paymentReady=false; c.state='checkout';
  customerName.textContent=c.name;
  statusLine.textContent='PLACE EACH ITEM ON THE SCANNER';
  checkoutTotal.textContent='$0.00';
  till.classList.remove('ready'); terminal.classList.remove('ready'); cashFloat.classList.remove('show');
  registerItems.innerHTML='';
  c.items.forEach((item,index)=>{
    const card=document.createElement('div');
    card.className='checkout-item'; card.draggable=true; card.dataset.item=item; card.dataset.index=index;
    card.innerHTML=`<div class="mini-product ${item}"><span>${item==='chips'?'CH':item==='soda'?'CO':item==='candy'?'CA':'WA'}</span></div><div><b>${names[item]}</b><small>${money(prices[item])}</small></div><em>DRAG → SCAN</em>`;
    card.addEventListener('dragstart',()=>dragging=card);
    registerItems.appendChild(card);
  });
  registerPanel.classList.add('open');
  showMessage('The customer puts their items on the counter.');
}

function scanCard(card){
  if(!checkoutCustomer || card.classList.contains('scanned')) return;
  card.classList.add('scanned');
  scanned.push(card.dataset.item);
  checkoutTotal.textContent=money(total(scanned));
  card.querySelector('em').textContent='SCANNED';
  statusLine.textContent=scanned.length===checkoutCustomer.items.length?'TAKE PAYMENT':'NEXT ITEM';
  if(scanned.length===checkoutCustomer.items.length){ paymentReady=true; till.classList.add('ready'); terminal.classList.add('ready'); showMessage('All items scanned. Take the customer\'s payment.'); }
}

scanner.addEventListener('dragover',e=>{e.preventDefault();scanner.classList.add('hot')});
scanner.addEventListener('dragleave',()=>scanner.classList.remove('hot'));
scanner.addEventListener('drop',e=>{e.preventDefault();scanner.classList.remove('hot');if(dragging)scanCard(dragging);dragging=null});

till.addEventListener('dragover',e=>{e.preventDefault();till.classList.add('hot')});
till.addEventListener('dragleave',()=>till.classList.remove('hot'));
till.addEventListener('drop',e=>{e.preventDefault();till.classList.remove('hot');if(paymentReady){finishCheckout('CASH');}});
terminal.addEventListener('dragover',e=>{e.preventDefault();terminal.classList.add('hot')});
terminal.addEventListener('dragleave',()=>terminal.classList.remove('hot'));
terminal.addEventListener('drop',e=>{e.preventDefault();terminal.classList.remove('hot');if(paymentReady){finishCheckout('CARD');}});

function finishCheckout(method){
  if(!paymentReady) return;
  checkoutCustomer.state='served'; checkoutCustomer.served=true; served++;
  document.getElementById('customers').textContent=served;
  registerOpen=false; registerPanel.classList.remove('open');
  showNotice(`${checkoutCustomer.name.toLowerCase()} leaves the store.`);
  showMessage(`${method} payment accepted — ${money(total(scanned))}.`);
  checkoutCustomer=null; scanned=[]; paymentReady=false;
  setTimeout(startNextCustomer,1100);
}

function closeCheckout(){registerOpen=false; if(checkoutCustomer) checkoutCustomer.state='ready'; registerPanel.classList.remove('open'); checkoutCustomer=null; showMessage('You step away from the register.');}

document.getElementById('closeRegister').addEventListener('click',closeCheckout);

function loop(now){
  const dt=Math.min((now-last)/1000,.05); last=now;
  if(!registerOpen){
    let dx=0,dy=0;
    if(keys.has('w')||keys.has('arrowup'))dy--; if(keys.has('s')||keys.has('arrowdown'))dy++;
    if(keys.has('a')||keys.has('arrowleft'))dx--; if(keys.has('d')||keys.has('arrowright'))dx++;
    if(dx||dy){const l=Math.hypot(dx,dy);movePlayer(dx/l*player.speed*dt,dy/l*player.speed*dt);}
  }
  updateCustomers(dt); updateClock(dt); updateWorldPrompt();
  playerEl.setAttribute('transform',`translate(${player.x},${player.y})`);
  if(noticeTimer>0){noticeTimer-=dt;if(noticeTimer<=0)hideNotice();}
  if(messageTimer>0){messageTimer-=dt;if(messageTimer<=0)messageEl.style.opacity='0';}
  if(coffeeStage===1 && keys.has('e') && near(915,555,100)){
    coffeeStage=1.5;
    showNotice('You wipe around the brewer, drip tray, and counter edge.');
    setTimeout(()=>{if(coffeeStage===1.5){coffeeStage=2;showNotice('The machine is clean. Fresh cups are stacked beside it.');}},900);
  }
  requestAnimationFrame(loop);
}

addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','e'].includes(k)) e.preventDefault();
  keys.add(k);
  if(k==='e'&&!e.repeat&&!registerOpen) interactWorld();
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));

startNextCustomer();
requestAnimationFrame(loop);
