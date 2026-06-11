import * as THREE from 'three';

function spriteTex(draw,w=128,h=128){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

export function makeHorizonGlow(){
  const mat=new THREE.SpriteMaterial({map:spriteTex((x,w,h)=>{
    x.save();x.translate(w/2,h/2);x.scale(1,.5);
    const g=x.createRadialGradient(0,0,8,0,0,w/2);
    g.addColorStop(0,'rgba(255,160,80,.9)');g.addColorStop(.5,'rgba(255,120,60,.45)');
    g.addColorStop(1,'rgba(255,100,50,0)');
    x.fillStyle=g;x.fillRect(-w/2,-w/2,w,w);x.restore();
  },256,256),fog:false,depthWrite:false,transparent:true,opacity:0,
    blending:THREE.AdditiveBlending});
  const sprite=new THREE.Sprite(mat);sprite.scale.set(880,440,1);
  return{sprite,material:mat};
}
