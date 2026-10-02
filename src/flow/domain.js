// Both model modes cover exactly one square kilometre in local metre coordinates.
export const DOMAIN_SIZE=1000;
export function domainGrid(pedestrian){
 const nx=pedestrian?100:50;
 return {nx,ny:nx,dx:DOMAIN_SIZE/nx,dz:pedestrian?1:10,nz:48};
}
