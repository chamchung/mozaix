/* ============================================================
   MOZAIX — Tesserae Hero Engine
   ============================================================ */
(() => {
  const COLS = 12, ROWS = 9, N = COLS * ROWS;
  const SCENES = ['assets/scene1.png','assets/scene2.png','assets/scene3.png'];

  const COPY = [
    { num:'01', label:'Fragmented',
      head:'Your money lives<br>in pieces.',
      sub:'Dozens of accounts, cards, loans and goals — each a separate panel, none aware of the others.',
      accent:'#6ea3e0', tint:'rgba(20,40,82,0.55)' },
    { num:'02', label:'Connected',
      head:'One intelligent<br>system.',
      sub:'Every piece finds its place. Mozaix links the panels into a single, living lattice of your finances.',
      accent:'#4dc294', tint:'rgba(22,58,38,0.5)' },
    { num:'03', label:'Clarity',
      head:'See the<br><em>full picture.</em>',
      sub:'Direction, momentum and confidence — the whole mosaic resolves into one clear view of what comes next.',
      accent:'#d4715f', tint:'rgba(104,28,34,0.48)' },
  ];

  const hero = document.getElementById('hero');
  const grid = document.getElementById('grid');
  const cursorLight = document.getElementById('cursorLight');
  const root = document.documentElement;

  // live-tunable parameters (driven by the Tweaks panel)
  const TUNE = { gap:1, motion:1, retract:0.62, parallax:1, waveSpeed:1 };
  window.applyMozaixTweaks = (t)=>{
    if(!t) return;
    if(t.motion!=null){ TUNE.motion=t.motion; root.style.setProperty('--motion', t.motion); }
    if(t.hoverDepth!=null) TUNE.retract=t.hoverDepth;
    if(t.parallax!=null) TUNE.parallax=t.parallax;
    if(t.waveSpeed!=null) TUNE.waveSpeed=t.waveSpeed;
    if(t.seams!=null){ TUNE.gap=t.seams; if(typeof layout==='function'){ layout(); recalcCenters && recalcCenters(); } }
  };

  // ambient scene tint — driven by JS lerp (CSS transitions on var-fed colors are unreliable here)
  const tintEl = document.querySelector('.tint');
  function parseRGBA(s){ const m=s.match(/[\d.]+/g).map(Number); return [m[0],m[1],m[2], m[3]==null?1:m[3]]; }
  let curTint = parseRGBA(COPY[0].tint);
  let tgtTint = curTint.slice();

  /* ---------- build the grid ---------- */
  const cells = []; // {col,row,cube,depth, cx,cy, curZ, faces[], ready}
  const frag = document.createDocumentFragment();
  for (let r = 0; r < ROWS; r++){
    for (let c = 0; c < COLS; c++){
      const cell = document.createElement('div');
      cell.className = 'cell';

      const idle = document.createElement('div');
      idle.className = 'idle';
      // randomised idle float per tile
      const ang = Math.random()*Math.PI*2;
      const amp = 2 + Math.random()*3.5;
      idle.style.setProperty('--fx', (Math.cos(ang)*amp).toFixed(2)+'px');
      idle.style.setProperty('--fy', (Math.sin(ang)*amp).toFixed(2)+'px');
      idle.style.setProperty('--fdur', (8 + Math.random()*7).toFixed(1)+'s');
      idle.style.setProperty('--fdelay', (-Math.random()*8).toFixed(1)+'s');

      const depth = document.createElement('div');
      depth.className = 'depth';

      const cube = document.createElement('div');
      cube.className = 'cube';

      const faceDefs = ['f-front','f-right','f-back','f-left','f-top','f-bottom'];
      const faces = [];
      for (const fc of faceDefs){
        const f = document.createElement('div');
        f.className = 'face ' + fc;
        cube.appendChild(f);
        faces.push(f);
      }
      // initial scene assignment: front=0, right=1, back=2, left=0(loop)
      faces[0].style.backgroundImage = `url(${SCENES[0]})`;
      faces[1].style.backgroundImage = `url(${SCENES[1]})`;
      faces[2].style.backgroundImage = `url(${SCENES[2]})`;
      faces[3].style.backgroundImage = `url(${SCENES[0]})`;

      depth.appendChild(cube);
      idle.appendChild(depth);
      cell.appendChild(idle);
      frag.appendChild(cell);

      cells.push({ col:c, row:r, cube, depth, faces,
                   curZ:-900 - Math.random()*500, // start far for intro
                   ready: 200 + (c*42 + (ROWS-1-r)*30) + Math.random()*120 });
    }
  }
  grid.appendChild(frag);

  /* ---------- layout / sizing ---------- */
  let tile, gap, stride, originX, originY, gridW, gridH;
  function layout(){
    const vw = window.innerWidth, vh = window.innerHeight;
    tile = Math.floor(Math.min((vw*0.86)/COLS, (vh*0.70)/ROWS));
    tile = Math.max(38, tile);
    gap  = Math.max(2, Math.round(tile*0.05*TUNE.gap));
    stride = tile + gap;
    gridW = COLS*stride - gap;
    gridH = ROWS*stride - gap;

    root.style.setProperty('--tile', tile+'px');
    root.style.setProperty('--gap', gap+'px');
    root.style.setProperty('--d', (tile/2)+'px');
    root.style.setProperty('--imgW', gridW+'px');
    root.style.setProperty('--imgH', gridH+'px');

    // per-cell background slice
    for (const t of cells){
      const bx = -(t.col*stride), by = -(t.row*stride);
      t.cube.parentElement.parentElement.parentElement.style; // noop
      for (const f of t.faces){
        f.style.setProperty('--bx', bx+'px');
        f.style.setProperty('--by', by+'px');
      }
    }
    // cache cell centres (relative to viewport) for the hover field
    const gr = grid.getBoundingClientRect();
    originX = gr.left; originY = gr.top;
    for (const t of cells){
      t.cx = originX + t.col*stride + tile/2;
      t.cy = originY + t.row*stride + tile/2;
    }
  }
  let heroRect = hero.getBoundingClientRect();
  function recalcCenters(){
    const gr = grid.getBoundingClientRect();
    originX = gr.left; originY = gr.top;
    heroRect = hero.getBoundingClientRect();
    for (const t of cells){
      t.cx = originX + t.col*stride + tile/2;
      t.cy = originY + t.row*stride + tile/2;
    }
  }
  layout();
  recalcCenters();
  window.addEventListener('resize', ()=>{ layout(); recalcCenters(); });
  window.addEventListener('scroll', recalcCenters, { passive:true });

  // helpers used by click / ripple
  const scene = document.querySelector('.scene');
  function cellAt(x, y){
    let best=null, bd=Infinity;
    for (const c of cells){ const dx=x-c.cx, dy=y-c.cy, d=dx*dx+dy*dy; if(d<bd){bd=d;best=c;} }
    return best;
  }
  const ripples = [];
  function spawnRipple(origin){
    ripples.push({ ox:origin.col, oy:origin.row, t0:performance.now() });
    if (ripples.length>6) ripples.shift();
  }

  /* ============================================================
     LIFE LOOP — idle depth shimmer, hover field, click ripples, parallax
     ============================================================ */
  const pointer = { x:-9999, y:-9999, inside:false, tx:0, ty:0, gx:0, gy:0 };
  let nearest = null;

  hero.addEventListener('pointermove', (e)=>{
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.inside = true;
    hero.classList.add('has-pointer');
    cursorLight.style.transform = `translate(${e.clientX-heroRect.left}px,${e.clientY-heroRect.top}px)`;
    // parallax target (-1..1)
    pointer.tx = (e.clientX/window.innerWidth  - 0.5)*2;
    pointer.ty = (e.clientY/window.innerHeight - 0.5)*2;
  });
  hero.addEventListener('pointerleave', ()=>{
    pointer.inside = false; hero.classList.remove('has-pointer');
    pointer.tx = 0; pointer.ty = 0;
  });

  let tiltX = 0, tiltY = 0, driftX = 0, driftY = 0;

  function frame(now){
    const t = now*0.001;

    // expire finished ripples
    if (ripples.length){
      for (let r=ripples.length-1;r>=0;r--){ if((now-ripples[r].t0) > 2600) ripples.splice(r,1); }
    }

    // ambient scene tint fade
    for (let k=0;k<4;k++) curTint[k] += (tgtTint[k]-curTint[k])*0.045;
    tintEl.style.backgroundColor = `rgba(${curTint[0]|0},${curTint[1]|0},${curTint[2]|0},${curTint[3].toFixed(3)})`;

    // smooth parallax (mouse) + slow autonomous drift
    tiltX += ((pointer.ty*-4*TUNE.parallax) - tiltX)*0.05;
    tiltY += ((pointer.tx* 5*TUNE.parallax) - tiltY)*0.05;
    driftX = Math.sin(t*0.18)*1.4*TUNE.motion;
    driftY = Math.cos(t*0.13)*1.0*TUNE.motion;
    grid.style.transform = `rotateX(${(tiltX+driftX).toFixed(3)}deg) rotateY(${(tiltY+driftY).toFixed(3)}deg)`;

    const sigma = stride*1.25;
    const twoSig2 = 2*sigma*sigma;
    const RETRACT = tile*TUNE.retract;
    let bestD = Infinity, best = null;

    for (let i=0;i<cells.length;i++){
      const c = cells[i];

      // ambient breathing depth (subtle, always alive)
      let target = ( Math.sin(t*0.6 + c.col*0.5 + c.row*0.4) * (tile*0.035)
                   + Math.sin(t*0.21 + i)*(tile*0.02) ) * TUNE.motion;

      // occasional pulse
      if (c.pulse){
        c.pulse *= 0.94;
        target += c.pulse;
        if (c.pulse < 0.4) c.pulse = 0;
      }

      // click ripples — an expanding ring of depth radiating from the tap point
      if (ripples.length){
        const RAMP = tile*0.62;
        for (let r=0;r<ripples.length;r++){
          const rp = ripples[r];
          const age = (now - rp.t0)/1000;
          const ring = age*8.2;                 // tiles / second
          const dist = Math.hypot(c.col-rp.ox, c.row-rp.oy);
          const phase = dist - ring;
          const bump = Math.exp(-(phase*phase)/2.0);   // ring half-width ~1 tile
          target += RAMP * bump * Math.exp(-age*1.7);  // ring fades as it travels
        }
      }

      // hover field — retract toward cursor with gaussian falloff
      if (pointer.inside){
        const dx = pointer.x - c.cx, dy = pointer.y - c.cy;
        const d2 = dx*dx + dy*dy;
        const fall = Math.exp(-d2/twoSig2);
        target -= RETRACT * fall;
        if (d2 < bestD){ bestD = d2; best = c; }
      }

      // intro gate
      if (now < c.ready){
        c.curZ += ( (-1100) - c.curZ )*0.02; // stay far
      } else {
        c.curZ += (target - c.curZ)*0.16; // spring follow
      }
      c.depth.style.transform = `translateZ(${c.curZ.toFixed(2)}px)`;
    }

    // lifted shadow on the single nearest tile
    const newNear = (pointer.inside && bestD < (tile*tile*0.6)) ? best : null;
    if (newNear !== nearest){
      if (nearest) nearest.cube.classList.remove('lifted');
      if (newNear) newNear.cube.classList.add('lifted');
      nearest = newNear;
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // occasional ambient depth shifts
  setInterval(()=>{
    if (transitioning) return;
    const k = (Math.random()*cells.length)|0;
    cells[k].pulse = (Math.random()<0.5?-1:1) * tile * (0.18+Math.random()*0.22);
  }, 1400);

  /* ============================================================
     SCENE TRANSITION — rippling 90° cube rotation wave
     ============================================================ */
  let rotIndex = 0;             // cumulative rotation steps (cube.rot = rotIndex*-90)
  let sceneIndex = 0;           // 0..2
  let transitioning = false;

  function faceAt(stepIndex){ return ((stepIndex % 4) + 4) % 4; }
  function sceneOf(stepIndex){ return ((stepIndex % 3) + 3) % 3; }

  function go(dir, origin){
    if (transitioning) return;
    const newRot   = rotIndex + dir;
    const newScene = sceneOf(newRot);
    transitioning = true;
    hero.classList.add('engaged');

    // paint the incoming face of every cube with the target scene
    const inFace = faceAt(newRot);
    for (const c of cells){
      c.faces[inFace].style.backgroundImage = `url(${SCENES[newScene]})`;
    }

    // the rotation wave radiates outward from the touch point (or centre)
    const ox = origin ? origin.col : (COLS-1)/2;
    const oy = origin ? origin.row : (ROWS-1)/2;
    const deg = newRot * -90;
    let maxDelay = 0;
    for (const c of cells){
      const dist = Math.hypot(c.col-ox, c.row-oy);
      const delay = (dist*48) / TUNE.waveSpeed;
      maxDelay = Math.max(maxDelay, delay);
      c.cube.style.transitionDelay = delay.toFixed(0)+'ms';
      c.cube.style.setProperty('--rot', deg+'deg');
    }

    rotIndex = newRot;
    sceneIndex = newScene;
    updateUI();

    const dur = maxDelay + 900;
    setTimeout(()=>{
      for (const c of cells) c.cube.style.transitionDelay = '0ms';
      transitioning = false;
    }, dur + 40);
  }

  function goTo(target){
    if (transitioning || target === sceneIndex) return;
    // choose shortest rotational direction toward target scene
    let diff = (target - sceneIndex + 3) % 3;
    go(diff === 2 ? -1 : 1);
  }

  /* ---------- UI sync ---------- */
  const els = {
    num: document.getElementById('eyeNum'),
    label: document.getElementById('eyeLabel'),
    head: document.getElementById('headline'),
    sub: document.getElementById('sub'),
    cur: document.getElementById('cur'),
  };
  const dotsWrap = document.getElementById('dots');
  const dots = COPY.map((_,i)=>{
    const b = document.createElement('button');
    b.className = 'dot' + (i===0?' active':'');
    b.addEventListener('click', ()=> goTo(i));
    dotsWrap.appendChild(b);
    return b;
  });

  function updateUI(){
    const d = COPY[sceneIndex];
    root.style.setProperty('--accent', d.accent);
    tgtTint = parseRGBA(d.tint);

    // animate text swap
    const swaps = [els.num, els.label, els.head, els.sub];
    swaps.forEach(el=> el.classList.remove('in'));
    setTimeout(()=>{
      els.num.textContent = d.num;
      els.label.textContent = d.label;
      els.head.innerHTML = d.head;
      els.sub.textContent = d.sub;
      els.cur.textContent = d.num;
      swaps.forEach(el=> el.classList.add('in'));
    }, 220);

    dots.forEach((dt,i)=> dt.classList.toggle('active', i===sceneIndex));
  }

  /* ---------- input: CLICK a tile to ripple + reconfigure ---------- */
  // a small drag guard so a click that's really a text-select / scroll fling
  // on the page doesn't fire a reconfigure
  let downX=0, downY=0, downT=0;
  scene.addEventListener('pointerdown', (e)=>{ downX=e.clientX; downY=e.clientY; downT=performance.now(); });

  let lastClick = 0;
  scene.addEventListener('click', (e)=>{
    const moved = Math.hypot(e.clientX-downX, e.clientY-downY);
    if (moved > 14) return;                       // it was a drag, not a tap
    const origin = (nearest && pointer.inside) ? nearest : cellAt(e.clientX, e.clientY);
    if (!origin) return;
    spawnRipple(origin);                          // tactile ripple on every tap
    const now = performance.now();
    if (now - lastClick > 240){                   // advance to the next scene (loops)
      lastClick = now;
      go(1, origin);
    }
  });

  // arrow keys still nudge between scenes (don't hijack page scroll)
  window.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowRight'){ e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft'){  e.preventDefault(); go(-1); }
  });

  // kick the intro to settle the eyebrow accent
  updateUI();
})();
