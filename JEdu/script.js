(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const hudScore = document.getElementById('hudScore');
  const overlay = document.getElementById('overlay');
  const overlayCard = document.getElementById('overlayCard');
  const q = (id) => document.getElementById(id) || null;

  // ---------- Estado ----------
  let keys = {}, mouse = {x:0,y:0,down:false};
  let gameState = 'intro';
  let score = 0, lastTime = 0;
  let isPaused = false;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rand=(a,b)=>Math.random()*(b-a)+a;
  let hasTriple=false;

  // ---------- Overlay + pausa ----------
  function showOverlay(html){ overlayCard.innerHTML=html||''; overlay.hidden=false; overlay.style.display='flex'; overlay.style.pointerEvents='auto'; overlay.setAttribute('aria-hidden','false'); isPaused=true; }
  function hideOverlay(){ overlay.hidden=true; overlay.style.display='none'; overlay.style.pointerEvents='none'; overlay.setAttribute('aria-hidden','true'); isPaused=false; }
  hideOverlay();

  // ---------- Medidas reales (header/footer + laterales) ----------
  function rectW(el){ return el ? Math.ceil(el.getBoundingClientRect().width) : 0; }
  function rectH(el){ return el ? Math.ceil(el.getBoundingClientRect().height) : 0; }

  function measureSides(){
    const left = document.getElementById('levelsPanel') ||
                 document.querySelector('#levels,.levels,.sidebar,[data-levels-panel]');
    const right = document.getElementById('leaderboard');
    return {
      lw: rectW(left)  + (left ? 24 : 16),      // margen de respiro
      rw: rectW(right) + (right ? 24 : 16)
    };
  }
  function measureBars(){
    return {
      header: rectH(document.querySelector('header')),
      footer: rectH(document.querySelector('footer'))
    };
  }

  // ---------- Canvas responsive sin deformar ----------
  let W=900, H=600;
  function resizeCanvas(){
    const {lw, rw} = measureSides();
    const {header, footer} = measureBars();

    // Espacio útil del viewport
    const availW = Math.max(480, window.innerWidth  - lw - rw - 8);
    const availH = Math.max(360, window.innerHeight - header - footer - 16);

    // No imponemos relación de aspecto -> sin recortes
    const Wcss = availW;
    const Hcss = availH;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.display='block';
    canvas.style.margin='0 auto';
    canvas.style.width  = Wcss + 'px';
    canvas.style.height = Hcss + 'px';
    canvas.width  = Math.floor(Wcss * dpr);
    canvas.height = Math.floor(Hcss * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);

    W = Wcss; H = Hcss;
  }

  // Creamos Top-10 y luego medimos (importante para resize correcto)
  const lb = document.createElement('div');
  lb.id='leaderboard';
  lb.innerHTML = '<div style="font-size:18px;margin-bottom:6px">🏆 Top 10</div><div style="color:#bff;font-size:16px;margin-bottom:8px">Actual: <span id="lbCurrent">0</span></div>';
  document.body.appendChild(lb);

  function getTop10(){ try{ const raw=localStorage.getItem('neoRetroTop10'); return raw?JSON.parse(raw):[] }catch{ return [] } }
  function saveScoreToTop10(points){ try{ const list=getTop10(); list.push({score:points,when:Date.now()}); list.sort((a,b)=>b.score-a.score); while(list.length>10) list.pop(); localStorage.setItem('neoRetroTop10',JSON.stringify(list)); }catch{} renderLeaderboard(); }
  function renderLeaderboard(){
    const list=getTop10();
    const now = `<div style="color:#bff;font-size:16px;margin-bottom:8px">Actual: <span id="lbCurrent">${score|0}</span></div>`;
    const rows = list.map((e,i)=>`<div style="display:flex;justify-content:space-between;font-size:16px"><span>${i+1}.</span><span>${e.score}</span></div>`).join('');
    lb.innerHTML = `<div style="font-size:18px;margin-bottom:6px">🏆 Top 10</div>${now}${rows}`;
  }
  renderLeaderboard();

  // Hacemos el primer resize cuando ya existe el Top-10
  function doResize(){ resizeCanvas(); }
  window.addEventListener('resize', doResize, {passive:true});
  doResize();

  // ---------- Tema ----------
  const theme={ set(level){ switch(level){
    case 2: this.field='#0b2a7a'; this.brickColors=['#f33','#ff9f1a','#ffd400','#39d353','#00c8ff','#9b59ff','#ff67e6','#00ffd1']; this.paddle='#cfd8dc'; this.ball='#fff'; this.power='#ffeb3b'; break;
    case 3: this.space='#000'; this.vector='#0ff'; this.bullet='#ff0'; this.big='#a86'; this.rock='#ccc'; this.small='#bbb'; break;
    case 4: this.tile='#bdbdbd'; this.revealed='#ddd'; this.grid='#777'; this.border='#444'; break;
  } } };

  // ---------- Input ----------
  addEventListener('keydown', e=>{ const k=e.key.toLowerCase(); keys[k]=true; if([' ','arrowup','enter'].includes(k)) e.preventDefault(); });
  addEventListener('keyup',   e=>{ keys[e.key.toLowerCase()]=false; });
  canvas.addEventListener('mousemove', e=>{ const r=canvas.getBoundingClientRect(); mouse.x=(e.clientX-r.left)*(canvas.width/r.width); mouse.y=(e.clientY-r.top)*(canvas.height/r.height); });
  canvas.addEventListener('mousedown', ()=>mouse.down=true);
  canvas.addEventListener('mouseup',   ()=>mouse.down=false);
  canvas.addEventListener('touchstart', e=>{ mouse.down=true; const t=e.touches[0]; const r=canvas.getBoundingClientRect(); mouse.x=(t.clientX-r.left)*(canvas.width/r.width); mouse.y=(t.clientY-r.top)*(canvas.height/r.height); e.preventDefault();});
  canvas.addEventListener('touchmove',  e=>{ const t=e.touches[0]; const r=canvas.getBoundingClientRect(); mouse.x=(t.clientX-r.left)*(canvas.width/r.width); mouse.y=(t.clientY-r.top)*(canvas.height/r.height); e.preventDefault();});
  canvas.addEventListener('touchend',   ()=>mouse.down=false);

  // ---------- HUD ----------
  function setScore(s){ score=s|0; hudScore.textContent=`Puntaje: ${score}`; const el=document.getElementById('lbCurrent'); if(el) el.textContent=String(score); }

  // ---------- Atajos ----------
  q('btnL1') && (q('btnL1').onclick = ()=>{ hideOverlay(); isPaused=false; setScore(0); hasTriple=false; startLevel1(); });
  q('btnL2') && (q('btnL2').onclick = ()=>{ hideOverlay(); isPaused=false; setScore(0); hasTriple=false; startLevel2(); });
  q('btnL3') && (q('btnL3').onclick = ()=>{ hideOverlay(); isPaused=false; hasTriple=true;  startLevel3(); });
  q('btnL4') && (q('btnL4').onclick = ()=>{ hideOverlay(); isPaused=false; startLevel4(); });

  // ---------- Intro ----------
  function intro(){
    showOverlay(`
      <h1>Edu vs. El Asteroide Titán</h1>
      <p>Runner → Arkanoid → Asteroides → Buscaminas</p>
      <p><b>Nivel 1:</b> llega a <b>2000</b> puntos para abordar.</p>
      <a class="btn" id="btnStart">Comenzar</a>
    `);
    const btn=q('btnStart'); btn&&btn.addEventListener('click',()=>{ hideOverlay(); setScore(0); hasTriple=false; startLevel1(); },{once:true});
  }

  /* ==================== NIVEL 1 (Runner) ==================== */
  const L1_GOAL=2000;
  let p1, obstacles, groundY, speed1, clouds;
  let meteors=[], meteorCooldown=0, spawnTimer=0;

  function startLevel1(){
    doResize(); gameState='level1'; hideOverlay();
    p1={x:80,y:0,vy:0,w:24,h:36,grounded:false,t:0,sx:3.2};
    groundY=H-82; p1.y=groundY-p1.h;
    speed1=2.0; obstacles=[]; spawnTimer=1100;
    clouds=Array.from({length:3},()=>({x:rand(0,W),y:rand(40,120)}));
    meteors=[]; meteorCooldown=0;
  }
  function spawnObstacle1(){ const h=rand(28,60), w=rand(16,22), y=groundY-h; obstacles.push({type:'cactus',x:W+20,y,w,h}); }
  function roundRect(x,y,w,h,r,fill){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); if(fill) ctx.fill(); }
  function line(x1,y1,x2,y2){ ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
  function drawRunnerHuman(x,y,w,h,grounded,t){
    if(grounded){ ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x+w/2,y+h+6,w*.6,5,0,0,Math.PI*2); ctx.fill(); }
    ctx.fillStyle='#222'; roundRect(x,y+6,w,h-6,6,true);
    ctx.fillStyle='#0ff'; roundRect(x+4,y+10,w-8,8,4,true);
    const s=Math.sin(t*0.02); ctx.strokeStyle='#0ff';
    line(x+4,y+h-8,   x+4-6,   y+h-8-6*s);
    line(x+w-4,y+h-8, x+w-4+6, y+h-8+6*s);
    line(x+w-6,y+18,  x+w-12,  y+18+6*s);
  }
  function drawCactus(x,y,w,h){ ctx.save(); ctx.translate(x,y); ctx.fillStyle='#3b6f3b'; ctx.fillRect(0,0,w,h); ctx.fillRect(-w*0.45,h*0.4,w*0.45,6); ctx.fillRect(w,h*0.6,w*0.45,6); ctx.restore(); }
  function gameOverToL1(msg){ saveScoreToTop10(score); showOverlay(`<h1>Game Over</h1><p>${msg}</p><a class="btn" id="btnRetry">Volver al Nivel 1</a>`); q('btnRetry')?.addEventListener('click',()=>{ hideOverlay(); setScore(0); hasTriple=false; startLevel1(); },{once:true}); gameState='lose'; }

  function updateLevel1(dt){
    drawStarfield();
    ctx.fillStyle='#2c241c'; ctx.fillRect(0,groundY,W,H-groundY);
    ctx.fillStyle='#8a826f'; ctx.fillRect(0,groundY,W,2);

    const jump=keys[' ']||keys['arrowup']||keys['w']||mouse.down;
    if(jump&&p1.grounded){ p1.vy=-7.0; p1.grounded=false; }
    const left=(keys['arrowleft']||keys['a'])?-1:0, right=(keys['arrowright']||keys['d'])?1:0;
    p1.x+=(left+right)*p1.sx; p1.x=clamp(p1.x,10,W-40);

    p1.vy+=0.28; p1.y+=p1.vy;
    if(p1.y+p1.h>=groundY){ p1.y=groundY-p1.h; p1.vy=0; p1.grounded=true; }
    p1.t+=dt; drawRunnerHuman(p1.x,p1.y,p1.w,p1.h,p1.grounded,p1.t);

    spawnTimer-=dt; if(spawnTimer<=0){ spawnObstacle1(); spawnTimer=900+rand(0,500); }
    for(const o of obstacles){
      o.x-=speed1; drawCactus(o.x,o.y,o.w,o.h);
      const hit=(p1.x<o.x+o.w && p1.x+p1.w>o.x && p1.y<o.y+o.h && p1.y+p1.h>o.y);
      if(hit) return gameOverToL1('¡Cuidado con el cactus!');
    }
    while(obstacles.length && obstacles[0].x+obstacles[0].w<-20) obstacles.shift();

    if(score>=1500){
      meteorCooldown-=dt;
      if(meteorCooldown<=0){
        let targetX=clamp(p1.x+rand(-140,140),30,W-30);
        if (Math.abs(targetX-(p1.x+p1.w/2))<40) targetX+=(targetX<W/2?-60:60);
        meteors.push({mode:'warn',warnT:520,tx:targetX,x:targetX+rand(-80,80),y:-24,vx:0,vy:0,r:12,trail:rand(16,24)});
        meteorCooldown=700+rand(0,500);
      }
    }
    for(const m of meteors){
      if(m.mode==='warn'){
        m.warnT-=dt; ctx.strokeStyle='rgba(255,120,0,.8)'; ctx.beginPath(); ctx.arc(m.tx,groundY-6,10+Math.max(0,m.warnT/40),0,Math.PI*2); ctx.stroke();
        if(m.warnT<=0){ m.mode='fall'; const ang=Math.atan2(groundY-10-m.y,m.tx-m.x); const spd=rand(3.2,5.2); m.vx=Math.cos(ang)*spd; m.vy=Math.sin(ang)*spd; }
      }else{
        m.x+=m.vx; m.y+=m.vy;
        ctx.strokeStyle='rgba(255,120,0,.55)'; ctx.beginPath(); ctx.moveTo(m.x,m.y-m.trail); ctx.lineTo(m.x,m.y); ctx.stroke();
        ctx.fillStyle='#ff7b00'; ctx.beginPath(); ctx.arc(m.x,m.y,m.r,0,Math.PI*2); ctx.fill();
        const cx=p1.x+p1.w/2, cy=p1.y+p1.h/2, dx=m.x-cx, dy=m.y-cy;
        if(dx*dx+dy*dy < (m.r+Math.max(p1.w,p1.h)/3)**2) return gameOverToL1('¡Te pegó un meteorito!');
      }
    }
    meteors=meteors.filter(m=>m.y<H+30 && !(m.mode==='fall'&&m.y>H+20));

    // nudge de velocidad + puntaje
    setScore(score + Math.max(1,(speed1*0.25)|0));
    if(score>1500) speed1=Math.min(6.0,speed1+0.0016*dt);
    else if(score>1000) speed1=Math.min(5.0,speed1+0.0013*dt);
    else if(score>500)  speed1=Math.min(4.0,speed1+0.0010*dt);
    else                speed1=Math.min(3.0,speed1+0.0008*dt);

    if(score>=L1_GOAL){
      storyBoard('Abordaje','data:image/svg+xml;utf8,'+encodeURIComponent(svgShip()),
        'Has alcanzado 2000 puntos. La compuerta se abre y subes a la nave.',
        ()=>startLevel2());
    }
  }

  /* ==================== NIVEL 2 (Arkanoid) ==================== */
  let paddle, ball, bricks, power, powerAlive, powerBrickIdx;
  let comboCount=0;

  function startLevel2(){
    doResize(); theme.set(2); gameState='level2'; hideOverlay();
    paddle={x:W/2-38,y:H-74,w:Math.max(70,Math.min(120,W*0.14)),h:10,speed:6.2};
    ball={x:W/2,y:H-120,r:5,vx:2.8,vy:-3.2};
    bricks=[]; const rows=5, cols=8, bw=(W-40)/cols, bh=16;
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const color=theme.brickColors[(r*2+c)%theme.brickColors.length];
      bricks.push({x:20+c*bw,y:80+r*(bh+6),w:bw-6,h:bh,alive:true,color});
    }
    powerBrickIdx=(Math.random()*bricks.length)|0;
    powerAlive=false; power={x:0,y:0,w:16,h:10,vy:1.6,active:false};
    comboCount=0;
  }
  function ballSpeedUp(delta=0.22,max=8){ const s=Math.hypot(ball.vx,ball.vy)+delta; const ang=Math.atan2(ball.vy,ball.vx); const ns=Math.min(s,max); ball.vx=Math.cos(ang)*ns; ball.vy=Math.sin(ang)*ns; }
  function rectHit(a,b){ return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; }
  function awardCombo(){ if(comboCount>0){ const pts=100*(comboCount*(comboCount+1)/2)|0; setScore(score+pts); comboCount=0; } }

  function updateLevel2(dt){
    ctx.fillStyle=theme.field; ctx.fillRect(0,0,W,H);
    if(mouse.x) paddle.x=clamp(mouse.x-paddle.w/2,6,W-paddle.w-6);
    if(keys['arrowleft']||keys['a']) paddle.x-=paddle.speed;
    if(keys['arrowright']||keys['d']) paddle.x+=paddle.speed;
    paddle.x=clamp(paddle.x,6,W-paddle.w-6);
    ctx.fillStyle=theme.paddle; ctx.fillRect(paddle.x,paddle.y,paddle.w,paddle.h);

    ball.x+=ball.vx; ball.y+=ball.vy;
    if(ball.x-ball.r<0||ball.x+ball.r>W) ball.vx*=-1;
    if(ball.y-ball.r<0) ball.vy*=-1;

    if(ball.y+ball.r>=paddle.y && ball.x>paddle.x && ball.x<paddle.x+paddle.w && ball.vy>0){
      const hit=(ball.x-(paddle.x+paddle.w/2))/(paddle.w/2);
      ball.vx=hit*3.6; ball.vy=-Math.abs(ball.vy); awardCombo();
    }

    for(let i=0;i<bricks.length;i++){
      const b=bricks[i]; if(!b.alive) continue;
      if(ball.x>b.x && ball.x<b.x+b.w && ball.y>b.y && ball.y<b.y+b.h){
        b.alive=false; ball.vy*=-1; comboCount++; ballSpeedUp();
        if(i===powerBrickIdx){ powerAlive=true; power.x=b.x+b.w/2-8; power.y=b.y+2; }
      }
    }
    for(const b of bricks){ if(!b.alive) continue; ctx.fillStyle=b.color; ctx.fillRect(b.x,b.y,b.w,b.h); ctx.strokeStyle='#001b5e'; ctx.strokeRect(b.x+0.5,b.y+0.5,b.w-1,b.h-1); }

    if(powerAlive && !power.active){
      power.y+=power.vy; ctx.fillStyle=theme.power; ctx.fillRect(power.x,power.y,power.w,power.h);
      ctx.fillStyle='#000'; ctx.fillRect(power.x+3,power.y+3,10,4);
      if(rectHit(power,paddle)){ hasTriple=true; power.active=true; powerAlive=false; }
      if(power.y>H){ powerAlive=false; hasTriple=false; }
    }

    if(ball.y - ball.r > H){ awardCombo(); return gameOverToL1('Se cayó la bola. Vuelves al Nivel 1.'); }
    if(!bricks.some(b=>b.alive)){
      awardCombo();
      storyBoard('Salto a Titán','data:image/svg+xml;utf8,'+encodeURIComponent(svgJump()),
        'Con el módulo de disparo instalado, pones rumbo al asteroide Titán.',
        ()=>startLevel3());
    }

    ctx.fillStyle=theme.ball; ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2); ctx.fill();
  }

  /* ==================== NIVEL 3 (Asteroides) ==================== */
  let ship3, bullets, rocks, bigs, smalls, l3StartT, spawnedCount, destroyedBigs;
  let smallSpawnT=0;

  function startLevel3(){
    doResize(); theme.set(3); gameState='level3'; hideOverlay();
    ship3={x:W/2,y:H/2,r:10,a:-Math.PI/2,vx:0,vy:0};
    bullets=[]; rocks=[]; bigs=[]; smalls=[]; spawnedCount=0; destroyedBigs=0;
    l3StartT=performance.now(); spawnBigIfNeeded(); smallSpawnT=0;
  }
  function spawnBigIfNeeded(){ const elapsed=(performance.now()-l3StartT)/1000; const shouldHave=Math.min(3, Math.floor(elapsed/30)+1); while(spawnedCount<shouldHave && spawnedCount<3){ bigs.push({x:rand(90,W-90),y:rand(90,H*0.55),r:44,hp:18,vx:rand(-0.6,0.6),vy:rand(-0.4,0.4)}); spawnedCount++; } }
  function spawnSmall(){ smalls.push({x: rand(20,W-20), y: rand(60,H-20), r: rand(6,10), vx: rand(-1.2,1.2), vy: rand(-1.2,1.2)}); }
  function shoot(x,y,a,s){ bullets.push({x:x+Math.cos(a)*12,y:y+Math.sin(a)*12,vx:Math.cos(a)*s,vy:Math.sin(a)*s}); }
  function drawHUDVector(txt){ ctx.fillStyle='#0ff'; ctx.font='14px VT323'; ctx.textAlign='center'; ctx.fillText(txt, W/2, 24); }
  function drawStarfieldDark(){ for(let i=0;i<80;i++){ const x=((i*73)%W), y=((i*131+((performance.now()/25)|0))%H); const a=(Math.sin(i+performance.now()*0.002)+1)/2*0.6+0.2; ctx.fillStyle=`rgba(0,255,255,${(a*0.4).toFixed(2)})`; ctx.fillRect(x,y,1,1);} }

  function updateLevel3(dt){
    ctx.fillStyle=theme.space; ctx.fillRect(0,0,W,H); drawStarfieldDark();

    if(keys['arrowleft']||keys['a']) ship3.a-=0.05;
    if(keys['arrowright']||keys['d']) ship3.a+=0.05;
    if(keys['arrowup']||keys['w']){ ship3.vx+=Math.cos(ship3.a)*0.12; ship3.vy+=Math.sin(ship3.a)*0.12; }
    ship3.vx*=0.99; ship3.vy*=0.99; ship3.x+=ship3.vx; ship3.y+=ship3.vy;
    ship3.x=clamp(ship3.x,12,W-12); ship3.y=clamp(ship3.y,50,H-12);

    const fire=keys[' ']||keys['enter'];
    if(fire){
      if(((performance.now()/120)|0)!==(((performance.now()-dt)/120)|0)){
        shoot(ship3.x,ship3.y,ship3.a,7);
        if(hasTriple){ shoot(ship3.x,ship3.y,ship3.a-0.26,7); shoot(ship3.x,ship3.y,ship3.a+0.26,7); }
      }
    }
    ctx.fillStyle=theme.bullet; bullets.forEach(b=>{ b.x+=b.vx; b.y+=b.vy; ctx.fillRect(b.x-2,b.y-2,4,4); });
    bullets=bullets.filter(b=>b.x>-20&&b.x<W+20&&b.y>-20&&b.y<H+20&&!b.dead);

    ctx.save(); ctx.translate(ship3.x,ship3.y); ctx.rotate(ship3.a);
    ctx.strokeStyle=theme.vector; ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(-12,8); ctx.lineTo(-8,0); ctx.lineTo(-12,-8); ctx.closePath(); ctx.stroke();
    ctx.restore();

    ctx.fillStyle=theme.big;
    for(const g of bigs){
      g.x+=g.vx; g.y+=g.vy;
      if(g.x-g.r<0||g.x+g.r>W) g.vx*=-1;
      if(g.y-g.r<50||g.y+g.r>H) g.vy*=-1;
      ctx.beginPath(); ctx.arc(g.x,g.y,g.r,0,Math.PI*2); ctx.fill();
      for(const b of bullets){ const dx=b.x-g.x, dy=b.y-g.y; if(dx*dx+dy*dy<(g.r+6)*(g.r+6)){ g.hp--; b.dead=true; } }
      const dx=ship3.x-g.x, dy=ship3.y-g.y; if(dx*dx+dy*dy<(g.r+ship3.r)*(g.r+ship3.r)) return gameOverToL1('¡Colisión con Titán!');
    }
    for(let i=bigs.length-1;i>=0;i--) if(bigs[i].hp<=0){ setScore(score+1000); explodeBig(bigs[i]); bigs.splice(i,1); destroyedBigs++; }
    spawnBigIfNeeded();

    ctx.fillStyle=theme.rock;
    for(const r of rocks){
      r.x+=r.vx; r.y+=r.vy;
      if(r.x-r.r<0||r.x+r.r>W) r.vx*=-1;
      if(r.y-r.r<0||r.y+r.r>H) r.vy*=-1;
      ctx.beginPath(); ctx.arc(r.x,r.y,r.r,0,Math.PI*2); ctx.fill();
      const dx=r.x-ship3.x, dy=r.y-ship3.y; if(dx*dx+dy*dy<(r.r+ship3.r)*(r.r+ship3.r)) return gameOverToL1('Un fragmento te golpeó.');
      for(const b of bullets){ const dx2=b.x-r.x, dy2=b.y-r.y; if(dx2*dx2+dy2*dy2<(r.r+4)*(r.r+4)){ r.r-=4; b.dead=true; } }
    }
    rocks=rocks.filter(r=>r.r>4);

    smallSpawnT-=dt; if(smallSpawnT<=0){ spawnSmall(); smallSpawnT=1600+rand(0,1200); }
    ctx.fillStyle=theme.small;
    for(const s of smalls){
      s.x+=s.vx; s.y+=s.vy;
      if(s.x<0||s.x>W) s.vx*=-1;
      if(s.y<50||s.y>H) s.vy*=-1;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
      const dx=s.x-ship3.x, dy=s.y-ship3.y; if(dx*dx+dy*dy<(s.r+ship3.r)*(s.r+ship3.r)) return gameOverToL1('Un asteroide pequeño te golpeó.');
      for(const b of bullets){ const dx2=b.x-s.x, dy2=b.y-s.y; if(dx2*dx2+dy2*dy2<(s.r+4)*(s.r+4)){ s.r=0; b.dead=true; setScore(score+100); } }
    }
    smalls=smalls.filter(s=>s.r>0);

    drawHUDVector(`Grandes destruidos: ${destroyedBigs}/3`);
    if(destroyedBigs>=3 && bigs.length===0 && rocks.length===0 && smalls.length===0){
      storyBoard('Núcleo inestable','data:image/svg+xml;utf8,'+encodeURIComponent(svgCore()),
        'Titán queda hecho pedazos, pero su núcleo debe desactivarse.',
        ()=>startLevel4());
    }
  }
  function explodeBig(g){ for(let i=0;i<30;i++){ const a=Math.random()*Math.PI*2, s=1.8+Math.random()*2.6; rocks.push({x:g.x,y:g.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:6+Math.random()*9}); } }

  /* ==================== NIVEL 4 (Buscaminas) ==================== */
  let grid, rows4, cols4, mines, revealed, flagged, safeToReveal, revealedSafeCount;
  let l4MarkMode=false;
  function startLevel4(){
    doResize(); theme.set(4); gameState='level4'; hideOverlay();
    rows4=10; cols4=6; const total=rows4*cols4; mines=3;
    grid=new Array(total).fill(0); revealed=new Array(total).fill(false); flagged=new Array(total).fill(false);
    let placed=0; while(placed<mines){ const i=(Math.random()*total)|0; if(grid[i]===9) continue; grid[i]=9; placed++; }
    const dirs=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1]];
    const idx=(x,y)=>y*cols4+x;
    for(let y=0;y<rows4;y++)for(let x=0;x<cols4;x++){
      if(grid[idx(x,y)]===9) continue; let n=0;
      for(const [dx,dy] of dirs){ const nx=x+dx, ny=y+dy; if(nx>=0&&nx<cols4&&ny>=0&&ny<rows4&&grid[idx(nx,ny)]===9) n++; }
      grid[idx(x,y)]=n;
    }
    safeToReveal=rows4*cols4 - mines; revealedSafeCount=0;

    canvas.oncontextmenu=(e)=>{e.preventDefault();return false;};
    canvas.addEventListener('mousedown', onMineMouseDown);
    canvas.addEventListener('mouseup', onMineMouseUp);
    canvas.addEventListener('touchstart', onMineTouchStart,{passive:false});
    canvas.addEventListener('touchend', onMineTouchEnd);
  }
  let minePressStart=0, minePressPos=null;
  function onMineMouseDown(){ minePressStart=performance.now(); minePressPos={x:mouse.x,y:mouse.y}; }
  function onMineMouseUp(){ const long=performance.now()-minePressStart>300; handleMineClick(minePressPos||{x:mouse.x,y:mouse.y}, long); minePressPos=null; }
  function onMineTouchStart(e){ minePressStart=performance.now(); minePressPos={x:mouse.x,y:mouse.y}; e.preventDefault(); }
  function onMineTouchEnd(){ const long=performance.now()-minePressStart>350; handleMineClick(minePressPos||{x:mouse.x,y:mouse.y}, long); minePressPos=null; }

  function handleMineClick(pos,longPress){
    const bar=getToolbar();
    if(pos.y>=bar.y && pos.y<=bar.y+bar.h){ if(pos.x>=bar.xMode && pos.x<=bar.xMode+bar.wMode){ l4MarkMode=!l4MarkMode; } return; }
    const cell=mineCellAt(pos.x,pos.y); if(!cell) return; const {x,y,i}=cell;
    if(l4MarkMode||longPress||keys['shift']){ if(!revealed[i]) flagged[i]=!flagged[i]; return; }
    if(flagged[i]||revealed[i]) return;
    if(grid[i]===9){ revealAllMines(); return gameOverToL1('¡Boom! Activaste una mina.'); }
    revealFlood(x,y); if(revealedSafeCount===safeToReveal) winMines();
  }
  function revealFlood(x,y){
    const stack=[[x,y]], seen=new Set(); const I=(x,y)=>y*cols4+x;
    while(stack.length){
      const [cx,cy]=stack.pop(), id=I(cx,cy);
      if(seen.has(id)) continue; seen.add(id);
      if(cx<0||cx>=cols4||cy<0||cy>=rows4) continue;
      if(revealed[id]||flagged[id]) continue;
      revealed[id]=true; if(grid[id]!==9) revealedSafeCount++;
      if(grid[id]===0) for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++) if(dx||dy) stack.push([cx+dx,cy+dy]);
    }
  }
  function revealAllMines(){ for(let i=0;i<grid.length;i++) if(grid[i]===9) revealed[i]=true; }
  function winMines(){
    setScore(score+5000);
    saveScoreToTop10(score);
    showOverlay(`<h1>¡La Tierra está a salvo!</h1><p>Puntaje final: <b>${score}</b></p><a class="btn" id="btnAgain">Jugar de nuevo</a>`);
    q('btnAgain')?.addEventListener('click',()=>{ hideOverlay(); setScore(0); hasTriple=false; intro(); },{once:true});
    gameState='win';
  }
  function getToolbar(){ const h=42, wMode=140, xMode=W-wMode-10; return {h,xMode,wMode,y:0}; }
  function mineCellAt(px,py){
    const bar=getToolbar(); if(py<=bar.h) return null;
    const cw=Math.floor((W-40)/cols4), ch=Math.floor((H-160)/rows4);
    const ox=(W-cw*cols4)/2, oy=bar.h+20;
    const x=Math.floor((px-ox)/cw), y=Math.floor((py-oy)/ch);
    if(x<0||x>=cols4||y<0||y>=rows4) return null;
    return {x,y,i:y*cols4+x};
  }
  function updateLevel4(){
    ctx.fillStyle='#eee'; ctx.fillRect(0,0,W,H);
    const bar=getToolbar();
    ctx.fillStyle='#fafafa'; ctx.fillRect(0,0,W,bar.h);
    ctx.strokeStyle=theme.border; ctx.strokeRect(0.5,0.5,W-1,bar.h-1);
    ctx.font='16px VT323'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillStyle='#333'; const marked=flagged.filter(Boolean).length;
    ctx.fillText(`Minas: ${mines}  Marcadas: ${marked}  Restantes: ${Math.max(0,mines-marked)}`,10,bar.h/2);
    ctx.fillStyle=l4MarkMode?'#ffd54f':'#e0e0e0';
    ctx.fillRect(bar.xMode,8,bar.wMode,bar.h-16);
    ctx.strokeStyle='#666'; ctx.strokeRect(bar.xMode+0.5,8.5,bar.wMode-1,bar.h-17);
    ctx.fillStyle='#111'; ctx.textAlign='center';
    ctx.fillText(l4MarkMode?'Marcar minas':'Descubrir',bar.xMode+bar.wMode/2,bar.h/2);

    const cw=Math.floor((W-40)/cols4), ch=Math.floor((H-160)/rows4);
    const ox=(W-cw*cols4)/2, oy=bar.h+20;
    ctx.strokeStyle=theme.border; ctx.lineWidth=2; ctx.strokeRect(ox-6,oy-6,cw*cols4+12,ch*rows4+12);

    for(let y=0;y<rows4;y++) for(let x=0;x<cols4;x++){
      const i=y*cols4+x, X=ox+x*cw, Y=oy+y*ch;
      ctx.strokeStyle=theme.grid; ctx.strokeRect(X+0.5,Y+0.5,cw-1,ch-1);
      if(revealed[i]){
        ctx.fillStyle=theme.revealed; ctx.fillRect(X+1,Y+1,cw-2,ch-2);
        const v=grid[i];
        if(v===9){ ctx.fillStyle='#f33'; ctx.beginPath(); ctx.arc(X+cw/2,Y+ch/2,Math.min(cw,ch)/4,0,Math.PI*2); ctx.fill(); }
        else if(v>0){ ctx.fillStyle=['#00f','#007f00','#f00','#0000aa','#008080','#800000','#000','#7f7f7f'][Math.min(7,v-1)];
          ctx.font='18px VT323'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(v),X+cw/2,Y+ch/2); }
      }else{
        ctx.fillStyle=theme.tile; ctx.fillRect(X+1,Y+1,cw-2,ch-2);
        if(flagged[i]){ ctx.fillStyle='#ff0'; ctx.fillRect(X+cw/2-4,Y+ch/2-6,8,12); }
      }
    }
  }

  // ---------- Visuales compartidos ----------
  function drawStarfield(){
    for(let i=0;i<50;i++){
      const x=((i*73)%W), y=((i*131+((performance.now()/25)|0))%H);
      const a=(Math.sin(i+performance.now()*0.002)+1)/2*0.6+0.2;
      ctx.fillStyle=`rgba(180,255,255,${a.toFixed(2)})`; ctx.fillRect(x,y,1,1);
    }
    ctx.strokeStyle='rgba(0,255,255,0.15)'; const gy=H*0.72; ctx.beginPath();
    for(let x=0;x<=W;x+=20){ ctx.moveTo(x,gy); ctx.lineTo(x+40,H); }
    for(let y=gy;y<=H;y+=14){ ctx.moveTo(0,y); ctx.lineTo(W,y); }
    ctx.stroke();
  }
  function svgShip(){ return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 80'><rect width='120' height='80' fill='#001820'/><ellipse cx='60' cy='40' rx='46' ry='18' fill='#00eaff'/><rect x='30' y='46' width='60' height='8' fill='#077'/></svg>`; }
  function svgJump(){ return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 80'><rect width='120' height='80' fill='#0b2a7a'/><polygon points='10,70 60,20 110,70' fill='#fff'/><circle cx='60' cy='20' r='6' fill='#ff0'/></svg>`; }
  function svgCore(){ return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 80'><rect width='120' height='80' fill='#000'/><circle cx='60' cy='40' r='22' fill='#444'/><circle cx='60' cy='40' r='10' fill='#ff4444'/></svg>`; }

  // ---------- Loop ----------
  function loop(ts){
    const dt=Math.min(50, ts-lastTime); lastTime=ts;
    ctx.clearRect(0,0,W,H);
    if(isPaused){ requestAnimationFrame(loop); return; }
    switch(gameState){
      case 'level1': updateLevel1(dt); break;
      case 'level2': updateLevel2(dt); break;
      case 'level3': updateLevel3(dt); break;
      case 'level4': updateLevel4(dt); break;
    }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
  intro();
})();
