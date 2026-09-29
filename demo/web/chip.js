// PulseTrust chip explorer. Geometry is extracted from the routed DEF, and all
// challenge results come from the server's real Icarus Verilog execution.
const $ = id => document.getElementById(id);
const canvas = $('chip-canvas');
const context = canvas.getContext('2d');
const waveCanvas = $('wave-canvas');
const waveContext = waveCanvas.getContext('2d');
const state = {
  layout: null, blocks: [], sim: null, mode: 'layout', selected: -1,
  hovered: -1, selectedBlock: null, net: null,
  yaw: -.55, pitch: .66, zoom: 1.13, focusX: 0, focusZ: 0,
  hitFaces: [], pointers: new Map(), drag: false, lastPointer: null,
  running: false, rerunRequested: false, renderQueued: false,
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function setStatus(message, error = false) {
  $('engine-status').textContent = message;
  $('engine-status').classList.toggle('error', error);
}
function canvasSize(target, ctx) {
  const box = target.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(box.width * ratio));
  const height = Math.max(1, Math.round(box.height * ratio));
  if (target.width !== width || target.height !== height) {
    target.width = width; target.height = height;
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { w: box.width, h: box.height };
}
function queueRender() {
  if (state.renderQueued) return;
  state.renderQueued = true;
  requestAnimationFrame(() => { state.renderQueued = false; renderChip(); });
}
function projection(x, y, z, width, height) {
  const die = state.layout.die;
  x -= (die[0] + die[2]) / 2 + state.focusX;
  z -= (die[1] + die[3]) / 2 + state.focusZ;
  const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw);
  const cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
  const rx = x * cy - z * sy;
  const rz = x * sy + z * cy;
  const ry = y * cp - rz * sp;
  const depth = y * sp + rz * cp;
  const scale = Math.min(width / 265, height / 205) * state.zoom;
  const perspective = 430 / (430 - depth);
  return {x: width * .5 + rx * scale * perspective,
          y: height * .52 - ry * scale * perspective, depth};
}
function polygon(points, fill, stroke, lineWidth = 1) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) context.lineTo(points[i].x, points[i].y);
  context.closePath();
  context.fillStyle = fill; context.fill();
  if (stroke) { context.strokeStyle = stroke; context.lineWidth = lineWidth; context.stroke(); }
}
function family(cell) {
  const name = cell.type.toLowerCase();
  if (/tiehi|tielo/.test(name)) return 'Tie cell';
  if (/dlygate/.test(name)) return 'Delay cell';
  if (/dfr|dff|sdf|latch/.test(name)) return 'Sequential cell';
  if (/buf|inv/.test(name)) return 'Buffer / inverter';
  return 'Logic cell';
}
function color(cell, index) {
  if (index === state.selected) return ['#ffe18d','#ba8d3d','#8d692a'];
  if (index === state.hovered) return ['#bafcf0','#60bcae','#3b8a85'];
  const type = family(cell);
  if (type === 'Tie cell') return ['#ffd69b','#a87750','#76533d'];
  if (type === 'Delay cell') return ['#b8cced','#627da8','#405879'];
  if (type === 'Sequential cell') return ['#a6edcc','#5fa58d','#37756d'];
  if (type === 'Buffer / inverter') return ['#d1c4f7','#8276ad','#564d7a'];
  return ['#76d9e1','#32858f','#205968'];
}
function renderChip() {
  const {w, h} = canvasSize(canvas, context);
  context.clearRect(0, 0, w, h);
  const gradient = context.createRadialGradient(w*.5,h*.4,12,w*.5,h*.48,Math.max(w,h)*.75);
  gradient.addColorStop(0,'#1b4b5b'); gradient.addColorStop(.52,'#0b2b3a'); gradient.addColorStop(1,'#061723');
  context.fillStyle = gradient; context.fillRect(0,0,w,h);
  if (!state.layout) {
    context.fillStyle = '#bcd6db'; context.font = '14px system-ui';
    context.fillText('Preparing the verified layout…', 25, 40); return;
  }
  const [x0,z0,x1,z1] = state.layout.die;
  const dieTop = [[x0,-2,z0],[x1,-2,z0],[x1,-2,z1],[x0,-2,z1]].map(p=>projection(...p,w,h));
  const dieFront = [[x0,-2,z1],[x1,-2,z1],[x1,-7,z1],[x0,-7,z1]].map(p=>projection(...p,w,h));
  const dieSide = [[x1,-2,z0],[x1,-2,z1],[x1,-7,z1],[x1,-7,z0]].map(p=>projection(...p,w,h));
  polygon(dieFront,'#0b5862','#4cd0cd',1.3);
  polygon(dieSide,'#0d3d50','#5b9fae',1);
  polygon(dieTop,'#102e3c','#7cdbd5',2);
  context.save(); context.globalAlpha=.22;
  for(let n=1;n<8;n++){
    const a=projection(x0,-1.8,z0+(z1-z0)*n/8,w,h);
    const b=projection(x1,-1.8,z0+(z1-z0)*n/8,w,h);
    context.beginPath();context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);
    context.strokeStyle='#75e3db';context.lineWidth=.6;context.stroke();
  }
  context.restore();
  const faces=[];
  state.layout.cells.forEach((cell,index)=>{
    let cw=cell.w,ch=cell.h;
    if (/^(E|W|FE|FW)$/.test(cell.orient)) [cw,ch]=[ch,cw];
    const xa=cell.x,xb=cell.x+cw,za=cell.y,zb=cell.y+ch;
    const top=[[xa,1.9,za],[xb,1.9,za],[xb,1.9,zb],[xa,1.9,zb]].map(p=>projection(...p,w,h));
    const front=[[xa,1.9,zb],[xb,1.9,zb],[xb,-1.9,zb],[xa,-1.9,zb]].map(p=>projection(...p,w,h));
    const side=[[xb,1.9,za],[xb,1.9,zb],[xb,-1.9,zb],[xb,-1.9,za]].map(p=>projection(...p,w,h));
    const c=color(cell,index);
    faces.push({points:front,fill:c[1],stroke:'#073647',depth:front.reduce((sum,p)=>sum+p.depth,0)/4,index,part:'side'});
    faces.push({points:side,fill:c[2],stroke:'#073647',depth:side.reduce((sum,p)=>sum+p.depth,0)/4,index,part:'side'});
    faces.push({points:top,fill:c[0],stroke:index===state.selected?'#fff1c3':'#174b58',depth:top.reduce((sum,p)=>sum+p.depth,0)/4,index,part:'top'});
  });
  faces.sort((a,b)=>a.depth-b.depth);
  state.hitFaces=[];
  for(const face of faces){
    polygon(face.points,face.fill,face.stroke,face.index===state.selected?1.8:.35);
    state.hitFaces.push(face);
  }
  if ($('show-routes').checked) drawRoutes(w,h);
  for(const pin of state.layout.pins){
    if(pin.x==null||pin.y==null||pin.use==='POWER'||pin.use==='GROUND')continue;
    const p=projection(pin.x,4.7,pin.y,w,h);
    context.beginPath();context.arc(p.x,p.y,2.5,0,Math.PI*2);
    context.fillStyle='#ffd487';context.fill();
  }
  context.fillStyle='#d2e6e8';context.font='700 11px system-ui';
  context.fillText(`${(x1-x0).toFixed(2)} × ${(z1-z0).toFixed(2)} µm`,20,27);
  context.fillStyle='#90bbc3';context.font='11px system-ui';
  context.fillText(`${state.layout.counts.standardCells} standard cells · ${state.layout.counts.nets} DEF nets · ${state.layout.counts.routeSegments} route segments`,20,45);
}
function drawRoutes(w,h){
  const palette={Metal1:'#72a4ad',Metal2:'#70d7d8',Metal3:'#a4d6a1',Metal4:'#e4bb8c',Metal5:'#c7a4e0'};
  for(const net of state.layout.nets){
    const selected=state.net===net.name;
    if(state.net && !selected)continue;
    context.lineWidth=selected?2.6:.8;
    context.globalAlpha=selected ? .98 : .42;
    for(const segment of net.segments){
      const [x1,z1,x2,z2,layer]=segment;
      const rank=Number(layer.replace('Metal',''))||1;
      const elevation=2.1+rank*.76;
      const a=projection(x1,elevation,z1,w,h),b=projection(x2,elevation,z2,w,h);
      context.strokeStyle=selected?'#fff2a4':(palette[layer]||'#b5d5da');
      context.beginPath();context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);context.stroke();
    }
  }
  context.globalAlpha=1;
}
function inside(point,poly){
  let hit=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];
    if(((a.y>point.y)!==(b.y>point.y)) &&
       (point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x))hit=!hit;
  }
  return hit;
}
function pick(x,y){
  for(let i=state.hitFaces.length-1;i>=0;i--){
    if(inside({x,y},state.hitFaces[i].points))return state.hitFaces[i].index;
  }
  // Tiny standard cells still get a humane hit target after zooming.
  const {w,h}=canvas.getBoundingClientRect();
  let closest=-1,best=144;
  state.layout.cells.forEach((cell,index)=>{
    const p=projection(cell.x+cell.w/2,1.9,cell.y+cell.h/2,w,h);
    const distance=(p.x-x)**2+(p.y-y)**2;
    if(distance<best){best=distance;closest=index;}
  });
  return closest;
}
function pointerCoords(event){const box=canvas.getBoundingClientRect();return{x:event.clientX-box.left,y:event.clientY-box.top};}
function updateTooltip(index,position){
  const el=$('chip-tooltip');
  if(index<0){el.hidden=true;return;}
  const cell=state.layout.cells[index];
  el.innerHTML=`<strong>${escapeHtml(cell.id)}</strong><br>${escapeHtml(cell.type)}`;
  el.style.left=`${Math.min(position.x+12,canvas.clientWidth-235)}px`;
  el.style.top=`${Math.max(8,position.y-45)}px`;el.hidden=false;
}
function selectCell(index,focus=false){
  state.selected=index;state.selectedBlock=null;state.net=null;
  if(index>=0&&focus){
    const cell=state.layout.cells[index];
    const die=state.layout.die;
    state.focusX=cell.x+cell.w/2-(die[0]+die[2])/2;
    state.focusZ=cell.y+cell.h/2-(die[1]+die[3])/2;
    state.zoom=Math.max(state.zoom,3.2);
    setMode('layout');
  }
  updateInspector();queueRender();
}
function updateInspector(){
  const kind=$('inspector-kind'),content=$('inspector-content');
  if(state.selected>=0&&state.layout){
    const cell=state.layout.cells[state.selected];kind.textContent='PHYSICAL CELL';
    content.innerHTML=`<h2>${escapeHtml(cell.id)}</h2><div class="instance-type">${escapeHtml(cell.type)}</div>
      <dl class="details"><dt>Family</dt><dd>${family(cell)}</dd><dt>Position</dt><dd>${cell.x.toFixed(3)}, ${cell.y.toFixed(3)} µm</dd>
      <dt>Footprint</dt><dd>${cell.w.toFixed(2)} × ${cell.h.toFixed(2)} µm</dd><dt>Orientation</dt><dd>${escapeHtml(cell.orient)}</dd>
      <dt>Connected</dt><dd>${cell.nets.length} signal nets</dd></dl>
      <p>Select a net to highlight its routed DEF segments. A physical cell is not assigned to a logical RTL block without a verified mapping.</p>
      <div class="net-list">${cell.nets.map(net=>`<button type="button" data-net="${escapeHtml(net)}" class="${state.net===net?'active':''}">${escapeHtml(net)}</button>`).join('')}</div>`;
    content.querySelectorAll('[data-net]').forEach(button=>button.addEventListener('click',()=>{
      state.net=state.net===button.dataset.net?null:button.dataset.net;
      const route=state.layout.nets.find(net=>net.name===state.net);
      $('geometry-status').textContent=route
        ? `Tracing ${route.name} · ${route.segments.length} DEF path segments`
        : `DEF verified · ${state.layout.counts.standardCells} cells · ${state.layout.counts.nets} nets · ${state.layout.counts.pins} pins`;
      updateInspector();queueRender();
    }));return;
  }
  if(state.selectedBlock){
    const block=state.blocks.find(item=>item.id===state.selectedBlock);
    if(block){kind.textContent='RTL FUNCTION';
      content.innerHTML=`<h2>${escapeHtml(block.title)}</h2><div class="instance-type">${escapeHtml(block.subtitle)}</div>
        <p>${escapeHtml(block.explanation)}</p><div class="net-list">${block.signals.map(signal=>`<span class="signal">${escapeHtml(signal)}</span>`).join('')}</div>
        <p>${escapeHtml(block.detail)}</p><p><strong>${escapeHtml(blockMetric(block))}</strong></p>`;return;}
  }
  kind.textContent='DESIGN';
  const utilization=state.layout?(state.layout.metrics.utilization*100).toFixed(2):null;
  content.innerHTML=`<h2>Click into the silicon plan.</h2><p>Hover or select a placed cell to read its exact instance, IHP library type, position, orientation and connected nets.</p>${state.layout?`<p>${utilization}% standard-cell utilization. ${state.layout.counts.fillCells.toLocaleString()} physical fill cells are hidden here for clarity; the GDS tab shows the complete render.</p>`:''}`;
}
function blockMetric(block){
  if(!state.sim)return 'Run the RTL to see live measurements.';
  const r=state.sim.result,t=state.sim.trace;
  if(block.id==='sync')return `Input trace captured for ${t.length} clock cycles.`;
  if(block.id==='filter')return `${r.rejected} of ${r.rawEdges} raw rising edges rejected at ${state.sim.options.filter} stable samples.`;
  if(block.id==='counter')return `${r.accepted} accepted rising edges; last window count ${r.lastCount}.`;
  if(block.id==='window')return `Window tick at cycle ${state.sim.boundary}; captured count ${r.lastCount}.`;
  return `Glitch ${r.glitchFlag?'flagged':'clear'} · under minimum ${r.underMinimum?'yes':'no'} · overflow ${r.overflow?'yes':'no'}.`;
}
function setMode(mode){
  state.mode=mode;
  for(const name of ['layout','logic','gds']){
    $(`tab-${name}`).classList.toggle('active',name===mode);
    $(`tab-${name}`).setAttribute('aria-selected',String(name===mode));
    $(`${name}-panel`).classList.toggle('hidden',name!==mode);
  }
  $('reset-view').hidden=mode!=='layout';
  $('show-routes').parentElement.hidden=mode!=='layout';
  if(mode==='layout')queueRender();
}
function resetView(){state.yaw=-.55;state.pitch=.66;state.zoom=1.13;state.focusX=0;state.focusZ=0;state.net=null;queueRender();updateInspector();}
function renderLogic(){
  const root=$('logic-flow');root.innerHTML='';
  state.blocks.forEach((block,index)=>{
    if(index){const arrow=document.createElement('span');arrow.className='logic-arrow';arrow.textContent='→';root.append(arrow);}
    const button=document.createElement('button');button.type='button';button.className=`logic-node${state.selectedBlock===block.id?' active':''}`;
    const metric=blockMetric(block);
    button.innerHTML=`<span class="ordinal">${String(index+1).padStart(2,'0')}</span><strong>${escapeHtml(block.title)}</strong><small>${escapeHtml(block.subtitle)}</small><span class="live">${escapeHtml(metric)}</span>`;
    button.addEventListener('click',()=>{state.selected=-1;state.selectedBlock=block.id;updateInspector();renderLogic();});
    root.append(button);
  });
}
function updateSearch(){
  const root=$('cell-results');root.innerHTML='';
  if(!state.layout)return;
  const query=$('cell-search').value.trim().toLowerCase();
  if(!query)return;
  const found=state.layout.cells.map((cell,index)=>({cell,index}))
    .filter(({cell})=>cell.id.toLowerCase().includes(query)||cell.type.toLowerCase().includes(query)).slice(0,15);
  for(const {cell,index} of found){const button=document.createElement('button');button.type='button';button.setAttribute('role','option');
    button.innerHTML=`${escapeHtml(cell.id)}<em>${escapeHtml(cell.type)}</em>`;
    button.addEventListener('click',()=>{selectCell(index,true);root.innerHTML='';});root.append(button);}
  if(!found.length)root.textContent='No matching placed cell.';
}
function labValues(){return Object.fromEntries(['events','glitches','filter','minimum','seed'].map(id=>[id,Number($(id).value)]));}
function labels(){for(const id of ['events','glitches','filter','minimum'])$(`${id}-output`).value=$(id).value;}
function markStale(){
  labels();if(state.sim){$('run-status').textContent='Settings changed · rerun needed';
    $('result-message').textContent='The numbers below belong to the previous settings. The circuit is being rerun.';}
  clearTimeout(markStale.timer);markStale.timer=setTimeout(runChip,450);
}
async function callSimulator(options){
  const response=await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(options)});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'RTL simulation failed');
  if(data.engine!=='Icarus Verilog executing src/project.v'||!Array.isArray(data.trace))throw new Error('Unverified simulator response');
  return data;
}
async function runChip(){
  clearTimeout(markStale.timer);
  if(state.running){state.rerunRequested=true;return;}
  state.running=true;$('run-chip').disabled=true;$('run-status').textContent='Compiling RTL…';$('run-status').classList.remove('error');
  const requested=labValues();
  try{
    const data=await callSimulator(requested);
    if(JSON.stringify(requested)!==JSON.stringify(labValues())){state.rerunRequested=true;return;}
    state.sim=data;$('accepted-count').textContent=data.result.lastCount;
    $('raw-count').textContent=data.result.rawEdges;$('rejected-count').textContent=data.result.rejected;
    $('run-status').textContent='Verified from Icarus RTL';setStatus('RTL + layout ready');
    const r=data.result;
    $('result-message').textContent=r.underMinimum
      ? `${r.lastCount} edges passed this filter, below the required minimum of ${data.options.minimum}.`
      : r.overflow?'The 8-bit count saturated at 255.'
      : `${r.accepted} rising edges accepted; ${r.rejected} raw edges rejected in this generated test signal.`;
    $('wave-meta').textContent=`${data.trace.length} cycles · seed ${data.options.seed}`;
    renderWave();renderLogic();updateInspector();
  }catch(error){
    state.sim=null;$('run-status').textContent='Simulation failed';$('run-status').classList.add('error');
    setStatus('RTL unavailable',true);$('result-message').textContent=`No substitute result: ${error.message}`;
    for(const id of ['accepted-count','raw-count','rejected-count'])$(id).textContent='—';
    $('wave-meta').textContent='No verified trace';renderWave();renderLogic();updateInspector();
  }finally{
    state.running=false;$('run-chip').disabled=false;
    if(state.rerunRequested){state.rerunRequested=false;runChip();}
  }
}
function renderWave(){
  const {w,h}=canvasSize(waveCanvas,waveContext);
  waveContext.fillStyle='#071b28';waveContext.fillRect(0,0,w,h);
  if(!state.sim){waveContext.fillStyle='#a6c6ce';waveContext.font='12px system-ui';waveContext.fillText('Waiting for a real RTL trace',18,h/2);return;}
  const trace=state.sim.trace, pad=18, inner=w-pad*2;
  const xx=i=>pad+i*inner/Math.max(1,trace.length-1);
  const rows=[37,84,132], names=['RAW','FILTERED','ACCEPTED'];
  waveContext.font='700 10px system-ui';
  rows.forEach((y,index)=>{waveContext.fillStyle='#829faa';waveContext.fillText(names[index],pad,y-20);
    waveContext.strokeStyle='#234251';waveContext.beginPath();waveContext.moveTo(pad,y+11);waveContext.lineTo(w-pad,y+11);waveContext.stroke();});
  for(const [key,row,color] of [['raw',rows[0],'#ffbc7b'],['filtered',rows[1],'#69e6dd']]){
    waveContext.beginPath();waveContext.strokeStyle=color;waveContext.lineWidth=2;
    let previous=trace[0][key];waveContext.moveTo(xx(0),row+(previous?-8:8));
    for(let i=1;i<trace.length;i++){const x=xx(i),now=trace[i][key];waveContext.lineTo(x,row+(previous?-8:8));
      if(now!==previous)waveContext.lineTo(x,row+(now?-8:8));previous=now;}
    waveContext.stroke();
  }
  waveContext.strokeStyle='#bdea84';waveContext.lineWidth=2;
  trace.forEach((row,index)=>{if(row.accepted){const x=xx(index);waveContext.beginPath();waveContext.moveTo(x,rows[2]+9);waveContext.lineTo(x,rows[2]-14);waveContext.stroke();}});
  if(state.sim.boundary<trace.length){const x=xx(state.sim.boundary);waveContext.strokeStyle='#ffdb9c';waveContext.setLineDash([4,4]);
    waveContext.beginPath();waveContext.moveTo(x,12);waveContext.lineTo(x,h-8);waveContext.stroke();waveContext.setLineDash([]);}
}
async function compareFilters(){
  const button=$('compare'),root=$('compare-results');button.disabled=true;root.textContent='Compiling three RTL runs with the same raw signal…';
  try{
    const base=labValues();
    const runs=await Promise.all([1,3,8].map(filter=>callSimulator({...base,filter})));
    const raw=runs[0].trace.map(row=>row.raw).join('');
    if(runs.some(run=>run.trace.map(row=>row.raw).join('')!==raw))throw new Error('The raw waveforms differed; comparison stopped.');
    root.innerHTML=runs.map(run=>`<div class="compare-result">${run.options.filter} stable samples<strong>${run.result.lastCount}</strong>accepted · ${run.result.rejected} rejected${run.result.underMinimum?' · below minimum':''}</div>`).join('');
  }catch(error){root.innerHTML=`<span class="compare-error">Comparison failed: ${escapeHtml(error.message)}</span>`;}
  finally{button.disabled=false;}
}
for(const name of ['layout','logic','gds'])$(`tab-${name}`).addEventListener('click',()=>setMode(name));
$('reset-view').addEventListener('click',resetView);
$('show-routes').addEventListener('change',queueRender);
$('cell-search').addEventListener('input',updateSearch);
canvas.addEventListener('pointerdown',event=>{
  canvas.setPointerCapture(event.pointerId);state.pointers.set(event.pointerId,pointerCoords(event));state.lastPointer=pointerCoords(event);state.drag=false;
});
canvas.addEventListener('pointermove',event=>{
  if(!state.layout)return;
  const point=pointerCoords(event);
  if(state.pointers.has(event.pointerId)){
    if(state.pointers.size>=2){const old=[...state.pointers.values()];state.pointers.set(event.pointerId,point);
      const now=[...state.pointers.values()];const previousDistance=Math.hypot(old[0].x-old[1].x,old[0].y-old[1].y);
      const distance=Math.hypot(now[0].x-now[1].x,now[0].y-now[1].y);
      if(previousDistance>0)state.zoom=Math.max(.55,Math.min(8,state.zoom*distance/previousDistance));state.drag=true;queueRender();return;}
    const dx=point.x-state.lastPointer.x,dy=point.y-state.lastPointer.y;
    if(Math.abs(dx)+Math.abs(dy)>2)state.drag=true;
    if(state.drag){state.yaw+=dx*.008;state.pitch=Math.max(.16,Math.min(1.35,state.pitch+dy*.006));queueRender();}
    state.pointers.set(event.pointerId,point);state.lastPointer=point;updateTooltip(-1,point);return;
  }
  const picked=pick(point.x,point.y);
  if(picked!==state.hovered){state.hovered=picked;queueRender();}
  updateTooltip(picked,point);canvas.style.cursor=picked>=0?'pointer':'grab';
});
canvas.addEventListener('pointerup',event=>{
  const point=pointerCoords(event);
  if(!state.drag&&state.layout)selectCell(pick(point.x,point.y));
  state.pointers.delete(event.pointerId);state.lastPointer=state.pointers.values().next().value||null;
});
canvas.addEventListener('pointercancel',event=>{state.pointers.delete(event.pointerId);state.lastPointer=state.pointers.values().next().value||null;});
canvas.addEventListener('pointerleave',()=>{if(!state.pointers.size){state.hovered=-1;updateTooltip(-1,{x:0,y:0});queueRender();}});
canvas.addEventListener('wheel',event=>{event.preventDefault();state.zoom=Math.max(.55,Math.min(8,state.zoom*(event.deltaY<0?1.12:.89)));queueRender();},{passive:false});
canvas.addEventListener('keydown',event=>{
  if(event.key==='ArrowLeft')state.yaw-=.13;else if(event.key==='ArrowRight')state.yaw+=.13;
  else if(event.key==='ArrowUp')state.pitch=Math.min(1.35,state.pitch+.1);
  else if(event.key==='ArrowDown')state.pitch=Math.max(.16,state.pitch-.1);
  else if(event.key==='+'||event.key==='=')state.zoom=Math.min(8,state.zoom*1.15);
  else if(event.key==='-')state.zoom=Math.max(.55,state.zoom/1.15);
  else if(event.key.toLowerCase()==='r')resetView();else return;
  event.preventDefault();queueRender();
});
for(const id of ['events','glitches','filter','minimum','seed'])$(id).addEventListener('input',markStale);
$('scenario').addEventListener('change',()=>{
  const presets={water:{events:5,glitches:8,filter:3,minimum:4},energy:{events:9,glitches:4,filter:2,minimum:7},air:{events:12,glitches:11,filter:4,minimum:10}};
  Object.entries(presets[$('scenario').value]).forEach(([id,value])=>$(id).value=value);markStale();
});
$('run-chip').addEventListener('click',runChip);
$('shuffle').addEventListener('click',()=>{$('seed').value=1+Math.floor(Math.random()*999999);markStale();});
$('challenge').addEventListener('click',()=>{$('glitches').value=12;labels();$('challenge-lab').scrollIntoView({behavior:'smooth',block:'start'});runChip();});
$('compare').addEventListener('click',compareFilters);
window.addEventListener('resize',()=>{queueRender();renderWave();});
if('ResizeObserver' in window)new ResizeObserver(()=>{queueRender();renderWave();}).observe($('layout-panel'));
window.addEventListener('load',()=>requestAnimationFrame(()=>requestAnimationFrame(queueRender)));

async function init(){
  try{
    const [layoutResponse,blockResponse]=await Promise.all([fetch('/layout-v1.json'),fetch('/function-blocks.json')]);
    if(!layoutResponse.ok||!blockResponse.ok)throw new Error('Layout data could not be loaded');
    state.layout=await layoutResponse.json();state.blocks=await blockResponse.json();
    if(state.layout.counts.standardCells!==state.layout.cells.length||state.layout.counts.nets!==state.layout.nets.length)
      throw new Error('Layout extraction counts did not validate');
    const die=state.layout.die;
    $('die-size').textContent=`${(die[2]-die[0]).toFixed(2)} × ${(die[3]-die[1]).toFixed(2)} µm`;
    $('cell-count').textContent=state.layout.counts.standardCells;
    $('utilization').textContent=`${(state.layout.metrics.utilization*100).toFixed(2)}%`;
    $('physical-checks').textContent=`${state.layout.metrics.routeDrcErrors} / ${state.layout.metrics.lvsErrors}`;
    $('workflow-link').href=state.layout.source.workflow;
    $('geometry-status').textContent=`DEF verified · ${state.layout.counts.standardCells} cells · ${state.layout.counts.nets} nets · ${state.layout.counts.pins} pins`;
    setStatus('Layout ready');renderLogic();updateInspector();queueRender();
    requestAnimationFrame(()=>requestAnimationFrame(queueRender));
    runChip();
  }catch(error){
    setStatus('Layout unavailable',true);$('geometry-status').textContent=`No substitute model: ${error.message}`;
    queueRender();
  }
}
labels();renderWave();init();
