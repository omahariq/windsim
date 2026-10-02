// Neutral log-law reference profile, normalized to the supplied 10 m wind.
// Roughness is an explicit assumption, not inferred from the weather API.
export function windProfileFactor(height,roughness=.1){
 return Math.log1p(Math.max(0,height)/roughness)/Math.log1p(10/roughness);
}
export function referenceFaces({nx,ny,nz,dx,dz,z0,ground,wind,roughness=.1}){
 const fx=new Float32Array((nx+1)*ny*nz),fy=new Float32Array(nx*(ny+1)*nz);
 for(let z=0;z<nz;z++){
  const altitude=z0+(z+.5)*dz;
  for(let y=0;y<ny;y++)for(let x=0;x<=nx;x++){
   const h=(ground[y*nx+Math.max(0,x-1)]+ground[y*nx+Math.min(nx-1,x)])/2;
   fx[(z*ny+y)*(nx+1)+x]=wind.east*windProfileFactor(altitude-h,roughness);
  }
  for(let y=0;y<=ny;y++)for(let x=0;x<nx;x++){
   const h=(ground[Math.max(0,y-1)*nx+x]+ground[Math.min(ny-1,y)*nx+x])/2;
   fy[(z*(ny+1)+y)*nx+x]=wind.south*windProfileFactor(altitude-h,roughness);
  }
 }
 return {fx,fy};
}
