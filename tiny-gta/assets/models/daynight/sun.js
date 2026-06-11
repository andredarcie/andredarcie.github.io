import * as THREE from 'three';

function spriteTex(draw,w=128,h=128){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

export function makeSunSprite(){
  const mat=new THREE.SpriteMaterial({map:spriteTex(x=>{
    const g=x.createRadialGradient(64,64,6,64,64,64);
    g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.32,'rgba(255,255,255,.92)');
    g.addColorStop(.55,'rgba(255,244,224,.45)');g.addColorStop(1,'rgba(255,232,200,0)');
    x.fillStyle=g;x.fillRect(0,0,128,128);
  }),fog:false,depthWrite:false,transparent:true});
  return{sprite:new THREE.Sprite(mat),material:mat};
}
