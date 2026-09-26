export function inRing(x,y,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function inPolygon(x,y,rings){return inRing(x,y,rings[0])&&!rings.slice(1).some(r=>inRing(x,y,r));}
function segmentBox(a,b,x0,y0,x1,y1){let low=0,high=1;for(let axis=0;axis<2;axis++){const d=b[axis]-a[axis],min=axis?y0:x0,max=axis?y1:x1;if(Math.abs(d)<1e-10){if(a[axis]<min||a[axis]>max)return false;}else{let t0=(min-a[axis])/d,t1=(max-a[axis])/d;if(t0>t1)[t0,t1]=[t1,t0];low=Math.max(low,t0);high=Math.min(high,t1);if(low>high)return false;}}return true;}
export function intersectsCell(rings,x,y,size){
 for(const [px,py] of [[x,y],[x+size,y],[x,y+size],[x+size,y+size],[x+size/2,y+size/2]])if(inPolygon(px,py,rings))return true;
 for(const ring of rings)for(let i=1;i<ring.length;i++)if(segmentBox(ring[i-1],ring[i],x,y,x+size,y+size))return true;
 return false;
}
// Conservative rasterization: footprint intersections occupy the entire cell.
export function rasterizeBuildings(buildings,ground,{nx,ny,dx,x0,y0}){
 const roof=ground.slice();let count=0;
 for(const {rings,height} of buildings){
  const points=rings[0],xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const a=Math.max(0,Math.floor((Math.min(...xs)-x0)/dx)),b=Math.min(nx-1,Math.floor((Math.max(...xs)-x0)/dx));
  const c=Math.max(0,Math.floor((Math.min(...ys)-y0)/dx)),d=Math.min(ny-1,Math.floor((Math.max(...ys)-y0)/dx));let hit=false;
  for(let y=c;y<=d;y++)for(let x=a;x<=b;x++)if(intersectsCell(rings,x0+x*dx,y0+y*dx,dx)){const i=y*nx+x;roof[i]=Math.max(roof[i],ground[i]+height);hit=true;}
  if(hit)count++;
 }
 return {roof,count};
}
