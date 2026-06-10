export const N=8, CELL=44, ROAD=14, BLOCK=30, SIDE=4, HALF=N*CELL/2;
export const GROUND=N*CELL+ROAD;
export const BEACH=38;                  // largura da faixa de areia ao redor da cidade
export const BOUND=HALF+ROAD/2+BEACH-5; // dá pra andar/dirigir na areia, mas não entrar no mar
export const nodeX=i=>i*CELL-HALF;
export const rand=(a,b)=>a+Math.random()*(b-a);
export const irand=(a,b)=>Math.floor(rand(a,b+1));
export const pick=a=>a[Math.floor(Math.random()*a.length)];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const wrapA=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
