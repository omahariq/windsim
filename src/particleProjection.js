// Compose the local-to-Mercator transform on the CPU in double precision.
// Adding meter offsets to a world-scale origin in a float32 shader quantizes
// neighboring trail vertices differently, producing visible zigzags/jitter.
export function localParticleMatrix(matrix, origin, scale, out = new Float32Array(16)) {
 for(let i=0;i<12;i++) out[i]=matrix[i]*scale;
 for(let row=0;row<4;row++) out[12+row]=matrix[row]*origin.x+matrix[4+row]*origin.y+matrix[12+row];
 return out;
}
