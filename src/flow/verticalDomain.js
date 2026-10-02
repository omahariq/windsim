// Keep the cell count bounded; adapt physical height to the entire scene.
export function verticalDomain(ground,roof,{nz=48,dz:minimumDz=10,releaseHeight=300,pedestrian=false}={}){
 let low=Infinity,high=-Infinity,roofHigh=-Infinity;
 for(const h of ground){if(!Number.isFinite(h))throw new Error('Invalid terrain elevation. Try refreshing the area.');low=Math.min(low,h);high=Math.max(high,h);}
 for(const h of roof){if(!Number.isFinite(h))throw new Error('Invalid building elevation. Try refreshing the area.');roofHigh=Math.max(roofHigh,h);}
 if(!ground.length||!roof.length||nz<8)throw new Error('Invalid airflow domain.');
 // Reserve every height offered by the release slider, plus 100 m above
 // both the highest release point and roof. Leave two top boundary cells.
 if(pedestrian){
  const dz=1,z0=Math.floor(low)-1;
  // Preserve metre-scale detail; increase layer count instead of voxel height.
  const ceiling=Math.max(high+20,roofHigh)+Math.max(40,(roofHigh-low)*.5);
  const nz=Math.max(64,Math.ceil(ceiling-z0)+2);
  if(nz>768)throw new Error('This scene is too tall for pedestrian detail. Move to a lower-relief street or switch off Pedestrian detail for overview mode.');
  return {nz,dz,z0};
 }
 const ceiling=Math.max(high+Math.max(300,releaseHeight),roofHigh)+100;
 let dz=minimumDz,z0;
 do{
  z0=Math.floor(low/dz)*dz-dz;
  if(ceiling<=z0+(nz-2)*dz)break;
  dz+=5;
 }while(true);
 return {nz,dz,z0};
}
