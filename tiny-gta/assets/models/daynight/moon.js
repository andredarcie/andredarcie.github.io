import * as THREE from 'three';

function spriteTex(draw,w=128,h=128){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

export function makeMoonSprite(){
  const mat=new THREE.SpriteMaterial({map:spriteTex(x=>{
    const halo=x.createRadialGradient(64,64,20,64,64,64);
    halo.addColorStop(0,'rgba(205,222,255,.4)');halo.addColorStop(1,'rgba(205,222,255,0)');
    x.fillStyle=halo;x.fillRect(0,0,128,128);
    x.fillStyle='#e9eff9';x.beginPath();x.arc(64,64,30,0,7);x.fill();
    x.fillStyle='rgba(165,182,210,.55)';
    for(const [cx,cy,r] of [[54,52,6],[76,68,8],[62,80,4],[80,46,3.5],[48,70,3]]){
      x.beginPath();x.arc(cx,cy,r,0,7);x.fill();
    }
  }),fog:false,depthWrite:false,transparent:true,opacity:0});
  const sprite=new THREE.Sprite(mat);sprite.scale.set(95,95,1);
  return{sprite,material:mat};
}
