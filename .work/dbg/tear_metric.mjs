// Fully-automated, deterministic animation-quality objective.
// Tearing  = triangle edges that explode vs their bind length when a clip plays.
// No-stride = leg-driven vertices barely displace.
// Loads a rigged+animated GLB, CPU-skins (LBS) every clip frame exactly as the
// renderer would, and prints per-clip max edge-stretch + leg displacement.
// Usage: node tear_metric.mjs <rigged_animated.glb> [framesPerClip]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const [glb, framesArg] = process.argv.slice(2);
if (!glb) { console.error('usage: tear_metric.mjs <glb> [frames]'); process.exit(1); }
const NF = framesArg ? parseInt(framesArg, 10) : 24;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(glb);
const root = doc.getRoot();
const nodes = root.listNodes();
const idOf = new Map(nodes.map((n, i) => [n, i]));
const parent = new Int32Array(nodes.length).fill(-1);
for (const n of nodes) for (const c of n.listChildren()) parent[idOf.get(c)] = idOf.get(n);

function mul(a, b) { const o = new Float64Array(16);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) o[c*4+r] = a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
  return o; }
function compose(t, q, s) {
  const x=q[0],y=q[1],z=q[2],w=q[3], x2=x+x,y2=y+y,z2=z+z;
  const xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;
  return new Float64Array([(1-(yy+zz))*s[0],(xy+wz)*s[0],(xz-wy)*s[0],0,
    (xy-wz)*s[1],(1-(xx+zz))*s[1],(yz+wx)*s[1],0,
    (xz+wy)*s[2],(yz-wx)*s[2],(1-(xx+yy))*s[2],0, t[0],t[1],t[2],1]); }
function slerp(a, b, u) {
  let d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]; const c=b.slice();
  if (d<0){d=-d;for(let i=0;i<4;i++)c[i]=-c[i];}
  if (d>0.9995){const o=[];for(let i=0;i<4;i++)o[i]=a[i]+u*(c[i]-a[i]);let L=Math.hypot(o[0],o[1],o[2],o[3]);if(L===0)L=1;return o.map(v=>v/L);}
  const th=Math.acos(d), s=Math.sin(th); const wa=Math.sin((1-u)*th)/s, wb=Math.sin(u*th)/s;
  return [wa*a[0]+wb*c[0],wa*a[1]+wb*c[1],wa*a[2]+wb*c[2],wa*a[3]+wb*c[3]]; }
function lerp3(a,b,u){return [a[0]+u*(b[0]-a[0]),a[1]+u*(b[1]-a[1]),a[2]+u*(b[2]-a[2])];}

let prim=null, meshNode=null;
for (const n of nodes) { const m=n.getMesh(); if (m && n.getSkin()) { prim=m.listPrimitives()[0]; meshNode=n; break; } }
if (!prim) { console.error('no skinned primitive'); process.exit(2); }
const skin = meshNode.getSkin();
const sJoints = skin.listJoints();
const ibm = skin.getInverseBindMatrices().getArray();
const POS = prim.getAttribute('POSITION').getArray();
const JOI = prim.getAttribute('JOINTS_0').getArray();
const WEI = prim.getAttribute('WEIGHTS_0').getArray();
const idxAcc = prim.getIndices();
if (!idxAcc) { console.error('primitive has no index buffer'); process.exit(2); }
const IDX = idxAcc.getArray();
const nv = POS.length/3;

const legJ = new Set();
sJoints.forEach((j,i)=>{ if(/thigh|shin|calf|knee|ankle|foot|toe|_leg/i.test(j.getName())) legJ.add(i); });
const isLegVert = new Uint8Array(nv);
for (let v=0; v<nv; v++){ let bk=-1,bw=-1; for(let k=0;k<4;k++){const w=WEI[v*4+k]; if(w>bw){bw=w;bk=JOI[v*4+k];}} if(legJ.has(bk)) isLegVert[v]=1; }

function nodeWorld(ovr) {
  const W=new Array(nodes.length);
  const order=[]; const seen=new Uint8Array(nodes.length);
  function vis(i){ if(seen[i])return; const p=parent[i]; if(p>=0)vis(p); seen[i]=1; order.push(i);}
  for(let i=0;i<nodes.length;i++)vis(i);
  for(const i of order){ const n=nodes[i]; const o=ovr.get(i);
    const tt = (o && o.t) ? o.t : n.getTranslation();
    const qq = (o && o.q) ? o.q : n.getRotation();
    const ss = (o && o.s) ? o.s : n.getScale();
    const L=compose(tt,qq,ss);
    W[i]= parent[i]>=0 ? mul(W[parent[i]], L) : L;
  }
  return W;
}
function applyMat(m, p){ return [ m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],
  m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13], m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14] ]; }

function sampleChannels(anim, t) {
  const ov=new Map();
  for (const ch of anim.listChannels()) {
    const n=ch.getTargetNode(); if(!n) continue; const i=idOf.get(n);
    const s=ch.getSampler(); const inA=s.getInput().getArray(); const outA=s.getOutput().getArray();
    const path=ch.getTargetPath();
    let k=0; while(k<inA.length-1 && inA[k+1]<t) k++;
    const t0=inA[k], t1=inA[Math.min(k+1,inA.length-1)];
    const u=(t1>t0)?Math.min(1,Math.max(0,(t-t0)/(t1-t0))):0;
    const e=ov.has(i)?ov.get(i):{};
    if(path==='rotation'){e.q=slerp(outA.slice(k*4,k*4+4),outA.slice((k+1)*4,(k+1)*4+4),u);}
    else if(path==='translation'){e.t=lerp3(outA.slice(k*3,k*3+3),outA.slice((k+1)*3,(k+1)*3+3),u);}
    else if(path==='scale'){e.s=lerp3(outA.slice(k*3,k*3+3),outA.slice((k+1)*3,(k+1)*3+3),u);}
    ov.set(i,e);
  }
  return ov;
}
function skinAt(ov){
  const W=nodeWorld(ov); const SK=[];
  for(let ji=0;ji<sJoints.length;ji++){ SK.push(mul(W[idOf.get(sJoints[ji])], ibm.slice(ji*16,ji*16+16))); }
  const out=new Float64Array(nv*3);
  for(let v=0; v<nv; v++){ const p=[POS[v*3],POS[v*3+1],POS[v*3+2]]; let ox=0,oy=0,oz=0;
    for(let k=0;k<4;k++){ const w=WEI[v*4+k]; if(w<=0)continue; const m=SK[JOI[v*4+k]]; const q=applyMat(m,p); ox+=w*q[0];oy+=w*q[1];oz+=w*q[2]; }
    out[v*3]=ox;out[v*3+1]=oy;out[v*3+2]=oz; }
  return out;
}
function elen(a,i,j){const dx=a[i*3]-a[j*3],dy=a[i*3+1]-a[j*3+1],dz=a[i*3+2]-a[j*3+2];return Math.hypot(dx,dy,dz);}

// POSITION is authored in bind/rest space — it IS the bind mesh. Bind edge
// lengths come straight from raw POS (renderer-consistent); deformation = the
// skinned edge length / this. bindPos for leg-displacement = raw POS too.
const bindPos=new Float64Array(POS.length);
for(let i=0;i<POS.length;i++) bindPos[i]=POS[i];
const bindE=new Float64Array(IDX.length);
for(let f=0;f<IDX.length;f+=3){const a=IDX[f],b=IDX[f+1],c=IDX[f+2];
  bindE[f]=Math.max(elen(bindPos,a,b),1e-6);
  bindE[f+1]=Math.max(elen(bindPos,b,c),1e-6);
  bindE[f+2]=Math.max(elen(bindPos,c,a),1e-6);}

for (const anim of root.listAnimations()) {
  let tmin=Infinity,tmax=-Infinity;
  for(const s of anim.listSamplers()){const ia=s.getInput().getArray();tmin=Math.min(tmin,ia[0]);tmax=Math.max(tmax,ia[ia.length-1]);}
  let worstStretch=0; const stretches=[]; let legDisp=0;
  for(let fi=0;fi<NF;fi++){ const t=tmin+(tmax-tmin)*fi/(NF-1);
    const sp=skinAt(sampleChannels(anim,t));
    let frameMax=0;
    for(let e=0;e<IDX.length;e+=3){ const a=IDX[e],b=IDX[e+1],c=IDX[e+2];
      const r1=elen(sp,a,b)/bindE[e], r2=elen(sp,b,c)/bindE[e+1], r3=elen(sp,c,a)/bindE[e+2];
      const m=Math.max(r1,r2,r3); if(m>frameMax)frameMax=m; }
    stretches.push(frameMax); if(frameMax>worstStretch)worstStretch=frameMax;
    let d=0,nleg=0; for(let v=0;v<nv;v++){ if(!isLegVert[v])continue; nleg++;
      d+=Math.hypot(sp[v*3]-bindPos[v*3],sp[v*3+1]-bindPos[v*3+1],sp[v*3+2]-bindPos[v*3+2]); }
    if(nleg>0){const md=d/nleg; if(md>legDisp)legDisp=md;}
  }
  stretches.sort((a,b)=>a-b);
  const p50=stretches[Math.floor(NF*0.5)], p90=stretches[Math.floor(NF*0.9)];
  const verdict = worstStretch>1.8 ? 'TORN' : (legDisp<0.02 ? 'NO-STRIDE' : 'OK');
  console.log(`${anim.getName().padEnd(8)} maxStretch=${worstStretch.toFixed(2)} p90=${p90.toFixed(2)} p50=${p50.toFixed(2)} legDisp=${legDisp.toFixed(3)} -> ${verdict}`);
}
