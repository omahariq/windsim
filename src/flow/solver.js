// Steady inviscid incompressible potential flow, on a Cartesian voxel grid.
// u = U + grad(phi); div(u)=0. Solid faces have u.n=0 (free slip).
// Boundary fluid cells hold phi=0 (uniform far-field potential).
// Matrix-free, diagonal-preconditioned conjugate gradient solves the SPD
// finite-volume Laplacian. SI units throughout; animation scaling is external.
export function solveFlow({nx,ny,nz,dx,dz,solid,wind,x0=0,y0=0,z0=0,maxIterations=500,tolerance=1e-4},progress=()=>{}){
 const n=nx*ny*nz,plane=nx*ny,h=[dx,dx,dz],base=[wind.east,wind.south,0];
 const offsets=[-1,1,-nx,nx,-plane,plane],weights=[1/dx**2,1/dx**2,1/dx**2,1/dx**2,1/dz**2,1/dz**2];
 const phi=new Float64Array(n),diag=new Float64Array(n),b=new Float64Array(n),r=new Float64Array(n),p=new Float64Array(n),ap=new Float64Array(n),active=[];
 for(let z=1;z<nz-1;z++)for(let y=1;y<ny-1;y++)for(let x=1;x<nx-1;x++){
  const i=(z*ny+y)*nx+x;if(solid[i])continue;
  for(let d=0;d<6;d++){
   if(solid[i+offsets[d]])b[i]-=base[d>>1]*(d%2?1:-1)/h[d>>1];
   else diag[i]+=weights[d];
  }
  if(diag[i])active.push(i);
 }
 const apply=(input,output)=>{for(const i of active){let value=diag[i]*input[i];for(let d=0;d<6;d++){const j=i+offsets[d];if(!solid[j])value-=weights[d]*input[j];}output[i]=value;}};
 let normB=0,rz=0;for(const i of active){r[i]=b[i];p[i]=r[i]/diag[i];rz+=r[i]*p[i];normB+=b[i]*b[i];}
 let relativeResidual=normB?1:0,iterations=0;
 for(;iterations<maxIterations&&relativeResidual>tolerance;iterations++){
  apply(p,ap);let pap=0;for(const i of active)pap+=p[i]*ap[i];if(pap<=0||!Number.isFinite(pap))break;
  const alpha=rz/pap;let rr=0,nextRz=0;
  for(const i of active){phi[i]+=alpha*p[i];r[i]-=alpha*ap[i];rr+=r[i]*r[i];nextRz+=r[i]*r[i]/diag[i];}
  relativeResidual=Math.sqrt(rr/normB);const beta=nextRz/rz;
  for(const i of active)p[i]=r[i]/diag[i]+beta*p[i];rz=nextRz;
  if(iterations%25===0)progress({iterations,relativeResidual});
 }
 const fx=new Float32Array((nx+1)*ny*nz),fy=new Float32Array(nx*(ny+1)*nz),fz=new Float32Array(nx*ny*(nz+1));
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<=nx;x++){
  const a=(z*ny+y)*nx+x-1,c=a+1;
  fx[(z*ny+y)*(nx+1)+x]=(x>0&&solid[a])||(x<nx&&solid[c])?0:base[0]+(x>0&&x<nx?(phi[c]-phi[a])/dx:0);
 }
 for(let z=0;z<nz;z++)for(let y=0;y<=ny;y++)for(let x=0;x<nx;x++){
  const a=(z*ny+y-1)*nx+x,c=a+nx;
  fy[(z*(ny+1)+y)*nx+x]=(y>0&&solid[a])||(y<ny&&solid[c])?0:base[1]+(y>0&&y<ny?(phi[c]-phi[a])/dx:0);
 }
 for(let z=0;z<=nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const a=((z-1)*ny+y)*nx+x,c=a+plane;
  fz[(z*ny+y)*nx+x]=(z>0&&solid[a])||(z<nz&&solid[c])?0:(z>0&&z<nz?(phi[c]-phi[a])/dz:0);
 }
 let maxDivergence=0;for(const i of active){const x=i%nx,y=Math.floor(i/nx)%ny,z=Math.floor(i/plane);const div=(fx[(z*ny+y)*(nx+1)+x+1]-fx[(z*ny+y)*(nx+1)+x])/dx+(fy[(z*(ny+1)+y+1)*nx+x]-fy[(z*(ny+1)+y)*nx+x])/dx+(fz[((z+1)*ny+y)*nx+x]-fz[(z*ny+y)*nx+x])/dz;maxDivergence=Math.max(maxDivergence,Math.abs(div));}
 return {nx,ny,nz,dx,dz,x0,y0,z0,solid,fx,fy,fz,iterations,relativeResidual,maxDivergence,converged:relativeResidual<=tolerance};
}
export function isFluid(field,x,y,z){
 const ix=Math.floor((x-field.x0)/field.dx),iy=Math.floor((y-field.y0)/field.dx),iz=Math.floor((z-field.z0)/field.dz);
 return ix>=1&&iy>=1&&iz>=1&&ix<field.nx-1&&iy<field.ny-1&&iz<field.nz-1&&!field.solid[(iz*field.ny+iy)*field.nx+ix];
}
function interpolate(a,nx,ny,nz,x,y,z){
 x=Math.max(0,Math.min(nx-1.00001,x));y=Math.max(0,Math.min(ny-1.00001,y));z=Math.max(0,Math.min(nz-1.00001,z));
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),tx=x-ix,ty=y-iy,tz=z-iz;let value=0;
 for(let k=0;k<2;k++)for(let j=0;j<2;j++)for(let i=0;i<2;i++)value+=a[((iz+k)*ny+iy+j)*nx+ix+i]*(i?tx:1-tx)*(j?ty:1-ty)*(k?tz:1-tz);
 return value;
}
export function sampleVelocity(f,x,y,z,out=[0,0,0]){
 const gx=(x-f.x0)/f.dx,gy=(y-f.y0)/f.dx,gz=(z-f.z0)/f.dz;
 out[0]=interpolate(f.fx,f.nx+1,f.ny,f.nz,gx,gy-.5,gz-.5);
 out[1]=interpolate(f.fy,f.nx,f.ny+1,f.nz,gx-.5,gy,gz-.5);
 out[2]=interpolate(f.fz,f.nx,f.ny,f.nz+1,gx-.5,gy-.5,gz);return out;
}
// Traverse every voxel crossed by a segment, including corner crossings.
// This prevents tracer integration and rendered trail chords entering solids.
export function segmentIsFluid(f,a,b){
 if(!isFluid(f,...a)||!isFluid(f,...b))return false;
 const origin=[f.x0,f.y0,f.z0],size=[f.dx,f.dx,f.dz],dims=[f.nx,f.ny,f.nz];
 const cell=a.map((v,i)=>Math.floor((v-origin[i])/size[i]));
 const direction=b.map((v,i)=>v-a[i]),step=direction.map(Math.sign);
 const delta=direction.map((v,i)=>v?size[i]/Math.abs(v):Infinity);
 const next=direction.map((v,i)=>v?(origin[i]+(cell[i]+(v>0?1:0))*size[i]-a[i])/v:Infinity);
 for(let limit=0;limit<10000;limit++){
  const t=Math.min(...next);if(t>1||!Number.isFinite(t))return true;
  for(let axis=0;axis<3;axis++)if(next[axis]<=t+1e-12){cell[axis]+=step[axis];next[axis]+=delta[axis];}
  if(cell.some((v,i)=>v<1||v>=dims[i]-1)||f.solid[(cell[2]*f.ny+cell[1])*f.nx+cell[0]])return false;
 }
 return false;
}
// Midpoint (RK2) advection, with a cell-scale step bound and collision checks.
export function advect(f,point,seconds){
 const result=[...point],v=[0,0,0],mid=[0,0,0];let remaining=Math.abs(seconds),steps=0;const direction=Math.sign(seconds);
 while(remaining>0&&steps++<128){
  if(!isFluid(f,...result))return null;sampleVelocity(f,...result,v);
  const speed=Math.hypot(...v),dt=Math.min(remaining,.2*Math.min(f.dx,f.dz)/Math.max(speed,.001));
  for(let a=0;a<3;a++)mid[a]=result[a]+v[a]*dt*.5*direction;
  if(!segmentIsFluid(f,result,mid))return null;sampleVelocity(f,...mid,v);
  const next=result.map((value,a)=>value+v[a]*dt*direction);
  if(!segmentIsFluid(f,result,next))return null;
  for(let a=0;a<3;a++)result[a]=next[a];remaining-=dt;
 }
 return remaining>1e-8?null:result;
}
