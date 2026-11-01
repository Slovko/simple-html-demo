/* AIпотоп. An original real-time WebGL world; no pre-rendered water video.
   Inspiration: scroll camera chapters, spatial labels, fog and moving world in RioTrans.
   Three.js r128 is vendored so the scene does not depend on a third-party CDN. */
(() => {
  'use strict';
  const canvas=document.querySelector('#world');
  const fallback=()=>{document.querySelector('.scene-fallback').hidden=false;document.body.classList.add('scene-ready');};
  if(!window.THREE){fallback();return;}
  const T=THREE, mobile=matchMedia('(max-width: 600px)').matches;
  let renderer;
  try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch(error){fallback();return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.5:1.8));
  renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
  renderer.shadowMap.enabled=!mobile;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const scene=new T.Scene();scene.fog=new T.FogExp2(0x527a86,.0045);
  const camera=new T.PerspectiveCamera(mobile?53:42,1,.1,700);
  const V=(x,y,z)=>new T.Vector3(x,y,z);
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const smooth=(a,b,x)=>{const v=clamp((x-a)/(b-a));return v*v*(3-2*v);};
  let seed=42;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
  const sunDir=V(-.42,.33,-.7).normalize();
  scene.add(new T.HemisphereLight(0xbbe6ed,0x163b4b,.85));
  const sun=new T.DirectionalLight(0xffd7ad,2.3);sun.position.set(-45,68,-65);sun.castShadow=!mobile;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:180});sun.shadow.bias=-.001;sun.shadow.normalBias=.04;scene.add(sun);
  const fill=new T.DirectionalLight(0x62d9e8,.8);fill.position.set(25,12,30);scene.add(fill);
  // A continuous atmospheric sky and sun rather than a photograph behind the scene.
  const skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{sun:{value:sunDir}},vertexShader:`varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
    varying vec3 vPos;uniform vec3 sun;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
    void main(){vec3 d=normalize(vPos);float h=max(d.y,0.);vec3 c=mix(vec3(.57,.72,.75),vec3(.06,.19,.28),pow(h,.5));float s=max(dot(d,sun),0.);c+=vec3(1.,.57,.26)*pow(s,12.)*.45;c+=vec3(1.,.8,.55)*pow(s,950.)*2.;float n=noise(d.xz/(h+.12)*3.)*.6+noise(d.xz/(h+.1)*8.)*.25;c=mix(c,vec3(.74,.81,.82),smoothstep(.47,.72,n)*smoothstep(.01,.23,h)*.5);gl_FragColor=vec4(c,1.);}
  `});
  scene.add(new T.Mesh(new T.SphereGeometry(460,32,20),skyMaterial));
  // Soft environment reflections on metal and glass.
  const ec=document.createElement('canvas');ec.width=512;ec.height=256;const eg=ec.getContext('2d');
  const gradient=eg.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#254856');gradient.addColorStop(.49,'#bed6d8');gradient.addColorStop(.55,'#3e7784');gradient.addColorStop(1,'#102a33');eg.fillStyle=gradient;eg.fillRect(0,0,512,256);eg.fillStyle='#ffddb4';eg.fillRect(54,80,42,40);const envtex=new T.CanvasTexture(ec);envtex.mapping=T.EquirectangularReflectionMapping;envtex.encoding=T.sRGBEncoding;
  const pmrem=new T.PMREMGenerator(renderer);const env=pmrem.fromEquirectangular(envtex).texture;scene.environment=env;pmrem.dispose();envtex.dispose();
  const materials={};
  const material=(color,roughness=.55,metalness=0)=>{const k=color+'|'+roughness+'|'+metalness;return materials[k]||(materials[k]=new T.MeshStandardMaterial({color,roughness,metalness}));};
  const steel=material('#839ba4',.25,.85),dark=material('#132e3a',.4,.55),rubber=material('#14282f',.9),cream=material('#d8e5dd',.28,.2),copper=material('#b97342',.45,.75),teal=material('#3a9d9d',.36,.65);
  function mesh(geometry,mat,parent=scene){const o=new T.Mesh(geometry,mat);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  function box(w,h,d,mat,x,y,z,parent=scene){const o=mesh(new T.BoxGeometry(w,h,d),typeof mat==='string'?material(mat):mat,parent);o.position.set(x,y,z);return o;}
  function sphere(r,mat,x,y,z,parent=scene,sx=1,sy=1,sz=1){const o=mesh(new T.SphereGeometry(r,24,16),mat,parent);o.position.set(x,y,z);o.scale.set(sx,sy,sz);return o;}
  function cylinder(r1,r2,h,mat,x,y,z,parent=scene,segments=32){const o=mesh(new T.CylinderGeometry(r1,r2,h,segments),mat,parent);o.position.set(x,y,z);return o;}
  function torus(r,t,mat,x,y,z,parent=scene){const o=mesh(new T.TorusGeometry(r,t,10,48),mat,parent);o.position.set(x,y,z);return o;}
  function beam(a,b,r,mat,parent=scene){const delta=b.clone().sub(a);const o=cylinder(r,r,delta.length(),mat,0,0,0,parent,12);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());return o;}
  function rounded(w,h,d,r,mat,x,y,z,parent=scene){const s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.06,bevelThickness:.06});g.translate(0,0,-d/2);const o=mesh(g,mat,parent);o.position.set(x,y,z);return o;}
  function texture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
  const metalTexture=texture(512,256,(c,w,h)=>{c.fillStyle='#a48263';c.fillRect(0,0,w,h);for(let i=0;i<16000;i++){c.fillStyle=`rgba(${random()>.65?'191,106,51':'40,63,67'},${random()*.18})`;const r=random()*4;c.fillRect(random()*w,random()*h,r*2,r);}for(let x=0;x<w;x+=128){c.fillStyle='#d8c5a055';c.fillRect(x,0,2,h);}});metalTexture.wrapS=metalTexture.wrapT=T.RepeatWrapping;metalTexture.repeat.set(4,1);
  const pipeMat=new T.MeshStandardMaterial({map:metalTexture,color:0xc5d3ca,metalness:.8,roughness:.37});
  // Quay, plant floor, and industrial pipework.
  const quay=box(44,2.3,20,'#48636a',-6,-.65,1);box(44,.28,20,'#718b8a',-6,.62,1);
  for(let x=-26;x<16;x+=4){box(.06,.025,20,'#4b686d',x,.77,1);box(.16,.16,1,'#ffbc6c',x,.85,10.4);}
  const mainPipe=cylinder(1.22,1.22,29,pipeMat,-11.5,7.6,0,scene,64);mainPipe.rotation.z=-Math.PI/2;
  for(const x of [-23,-16,-8,-1.5,2.1]){
    const flange=cylinder(1.56,1.56,.28,steel,x,7.6,0);flange.rotation.z=Math.PI/2;
    const seal=torus(1.38,.09,dark,x+.18,7.6,0);seal.rotation.y=Math.PI/2;
    for(let j=0;j<10;j++){const a=j/10*Math.PI*2;const bolt=cylinder(.105,.105,.5,copper,x,7.6+Math.sin(a)*1.36,Math.cos(a)*1.36,scene,6);bolt.rotation.z=Math.PI/2;}
  }
  for(const x of [-24,-16,-8,0]){box(.55,5.3,.65,steel,x,3.1,0);box(2.5,.4,2,'#314c55',x,.9,0);}
  const brokenGeo=new T.CylinderGeometry(1.23,1.23,.6,64,1,true);const bp=brokenGeo.attributes.position;for(let i=0;i<bp.count;i++){if(bp.getY(i)>.2)bp.setY(i,bp.getY(i)+Math.sin(i*4.1)*.15);}brokenGeo.computeVertexNormals();const broken=mesh(brokenGeo,steel);broken.rotation.z=-Math.PI/2;broken.position.set(3.12,7.6,0);
  const hole=mesh(new T.CircleGeometry(1.05,48),rubber);hole.rotation.y=Math.PI/2;hole.position.set(3.18,7.6,0);
  const endSegment=cylinder(1.23,1.23,5,pipeMat,12.5,2.15,1.8);endSegment.rotation.z=Math.PI/2;endSegment.rotation.x=.1;
  cylinder(.25,.25,1.5,copper,-6,9.2,0);const valve=new T.Group();scene.add(valve);valve.position.set(-6,10.1,0);torus(1.15,.12,material('#bd563e',.4,.6),0,0,0,valve);sphere(.22,copper,0,0,0,valve);for(let j=0;j<5;j++){const a=j/5*Math.PI*2;beam(V(0,0,0),V(Math.cos(a)*1.1,Math.sin(a)*1.1,0),.065,copper,valve);}
  for(let x=-26;x<12;x+=3.5){cylinder(.04,.04,1.3,steel,x,1.5,-8);beam(V(x,2.1,-8),V(x+3.5,2.1,-8),.04,steel);}
  // Pump tank and pressure gauge.
  cylinder(2,2,5,teal,-22,3.2,-4);sphere(2,teal,-22,5.7,-4,scene,1,.45,1);sphere(2,teal,-22,.8,-4,scene,1,.4,1);
  const gauge=mesh(new T.CircleGeometry(.7,48),new T.MeshBasicMaterial({map:texture(256,256,(c,w,h)=>{c.fillStyle='#e6ede4';c.fillRect(0,0,w,h);c.translate(w/2,h/2);for(let i=0;i<11;i++){c.save();c.rotate(-2.3+i*.46);c.fillStyle=i>7?'#b53c27':'#293e40';c.fillRect(-2,-98,4,15);c.restore();}c.fillStyle='#294a50';c.font='22px sans-serif';c.textAlign='center';c.fillText('bar',0,50);})}));gauge.position.set(-16,8.15,1.3);const gaugeRim=torus(.74,.09,copper,-16,8.15,1.31);const needle=box(.035,.48,.03,'#dc6949',-16,8.29,1.34);needle.geometry.translate(0,.18,0);
  const lampMat=new T.MeshStandardMaterial({color:0xff6a35,emissive:0xff5b22,emissiveIntensity:1});sphere(.25,lampMat,2,9.5,0);const warningLight=new T.PointLight(0xff753e,2,9);warningLight.position.set(2,9.6,0);scene.add(warningLight);
  // Robot with a rounded shell, visor and articulated typing arms.
  const robot=new T.Group();robot.position.set(-12,1.1,7);scene.add(robot);
  cylinder(.95,1.2,.8,dark,0,.3,0,robot);sphere(.85,cream,0,1.1,0,robot,1,1.4,.8);rounded(1.85,1.9,1.25,.5,cream,0,2,0,robot);rounded(1.15,.6,.1,.16,teal,0,2,.69,robot);
  const neck=cylinder(.26,.3,.5,steel,0,3.15,0,robot);const head=new T.Group();head.position.set(0,3.9,0);robot.add(head);rounded(2.35,1.65,1.5,.45,cream,0,0,0,head);rounded(1.97,1.08,.12,.33,material('#061d2c',.18,.3),0,0,.81,head);
  const eyeMat=new T.MeshBasicMaterial({color:0x8cfff1});const eyes=[];for(const x of [-.47,.47]){const eye=sphere(.13,eyeMat,x,.05,.92,head,.75,1.3,.3);eyes.push(eye);}const mouth=mesh(new T.TorusGeometry(.24,.025,6,24,Math.PI),eyeMat,head);mouth.rotation.z=Math.PI;mouth.position.set(0,-.13,.93);
  const arms=[];for(const side of [-1,1]){const arm=new T.Group();arm.position.set(side*1.05,2.6,0);robot.add(arm);sphere(.26,steel,0,0,0,arm);beam(V(0,0,0),V(side*.35,-.7,.45),.17,cream,arm);sphere(.22,steel,side*.35,-.7,.45,arm);beam(V(side*.35,-.7,.45),V(side*.1,-.68,1.25),.14,cream,arm);sphere(.23,dark,side*.1,-.68,1.25,arm,1,.6,1);arms.push(arm);}
  // WebHMI terminal: changing code, actual pressure and the failing deployment.
  const terminalCanvas=document.createElement('canvas');terminalCanvas.width=1024;terminalCanvas.height=640;const terminalContext=terminalCanvas.getContext('2d'),terminalTexture=new T.CanvasTexture(terminalCanvas);terminalTexture.encoding=T.sRGBEncoding;
  const consoleGroup=new T.Group();consoleGroup.position.set(-8,1,7.5);consoleGroup.rotation.y=-.1;scene.add(consoleGroup);box(5,.22,2.4,dark,0,2.5,1,consoleGroup);beam(V(-1.6,0,1),V(-1.6,2.4,1),.09,steel,consoleGroup);beam(V(1.6,0,1),V(1.6,2.4,1),.09,steel,consoleGroup);rounded(4.8,3,.25,.16,dark,0,4,0,consoleGroup);const display=mesh(new T.PlaneGeometry(4.45,2.7),new T.MeshBasicMaterial({map:terminalTexture}),consoleGroup);display.position.set(0,4,.2);for(let k=0;k<8;k++)box(.3,.04,.13,steel,-1.6+k*.45,2.64,1.2,consoleGroup);
  let lastCode=-1;
  function drawTerminal(time,phase){const line=Math.floor(time*2.5);if(line===lastCode)return;lastCode=line;const c=terminalContext;c.fillStyle='#061e29';c.fillRect(0,0,1024,640);c.fillStyle='#88e4d0';c.font='600 35px monospace';c.fillText('WebHMI / WATER CONTROL',38,63);c.fillStyle='#264f59';c.fillRect(35,91,950,2);c.font='26px monospace';const code=['const system = await connect();','await ai.optimise("water");','valves.openAll();','pressure.setTarget(Infinity);','// TODO: ask a human first','deploy({ review: false });'];code.forEach((text,i)=>{c.fillStyle=i===3?'#ffb57f':'#91bac3';c.fillText(text,40,145+i*47);});c.fillStyle=phase>1.4?'#ef7c59':'#8de6d2';c.font='bold 31px monospace';c.fillText(phase>1.4?'! PRESSURE LIMIT EXCEEDED':'> AI is typing'+'.'.repeat(((line%4)+4)%4),40,500);c.font='23px monospace';c.fillStyle='#799ba8';c.fillText('operator: away_for_coffee',40,560);c.fillStyle='#8de6d2';c.fillRect(40+(line%35)*23,590,16,3);terminalTexture.needsUpdate=true;}
  // City blocks with illuminated facades, roof details and a varied skyline.
  const city=new T.Group();city.position.set(17,-.3,-31);scene.add(city);box(48,1.4,48,'#354f58',0,0,0,city);box(49,.12,49,'#839b97',0,.76,0,city);
  const facade=texture(256,512,(c,w,h)=>{c.fillStyle='#234b5b';c.fillRect(0,0,w,h);for(let y=4;y<h;y+=24)for(let x=5;x<w;x+=22){c.fillStyle=random()>.57?'#eed4a3':random()>.5?'#669ba4':'#254954';c.fillRect(x,y,11,15);c.fillStyle='#0b293455';c.fillRect(x+1,y+1,3,13);}c.fillStyle='#a1b4ae88';for(let x=0;x<w;x+=44)c.fillRect(x,0,2,h);});facade.wrapS=facade.wrapT=T.RepeatWrapping;
  const facadeMat=new T.MeshStandardMaterial({map:facade,emissiveMap:facade,emissive:0x92bfc0,emissiveIntensity:.18,color:0xa9c1c3,metalness:.48,roughness:.32});
  const buildingGeo=new T.BoxGeometry(1,1,1);
  for(let row=0;row<5;row++)for(let col=0;col<5;col++){
    const x=(col-2)*8.5,z=(row-2)*8.5,w=3.6+random()*2.4,d=3.8+random()*2.2,h=5+random()*15+(row===2&&col===2?13:0);
    const b=mesh(buildingGeo,facadeMat,city);b.scale.set(w,h,d);b.position.set(x,h/2+.8,z);box(w+.24,.3,d+.24,steel,x,h+1,z,city);box(w*.35,.7,d*.4,dark,x,h+1.5,z,city);
    if(h>18){cylinder(.05,.08,3.2,steel,x,h+2.7,z,city,8);sphere(.09,lampMat,x,h+4.3,z,city);}
  }
  // Low hills frame the fly-through and establish depth.
  const terrain=new T.PlaneGeometry(330,115,150,55);terrain.rotateX(-Math.PI/2);const terrainPosition=terrain.attributes.position;
  for(let j=0;j<terrainPosition.count;j++){const x=terrainPosition.getX(j),z=terrainPosition.getZ(j);let h=0;for(let k=0;k<7;k++){const peak=Math.exp(-Math.pow((x-(-140+k*47))/26,2)-Math.pow((z-(-12+Math.sin(k*4)*14))/27,2));h+=peak*(22+Math.sin(k*2.3)*13);}const rough=1+Math.sin(x*.23+Math.cos(z*.15)*3)*.13+Math.sin(x*.61+z*.42)*.04;terrainPosition.setY(j,h*rough-1);}terrain.computeVertexNormals();const hills=mesh(terrain,material('#335d67',.96));hills.position.z=-135;
  // Water surface: animated geometry, analytic normals, Fresnel, sun reflection, wakes and foam.
  const reflectionTarget=new T.WebGLRenderTarget(mobile?384:768,mobile?256:512,{format:T.RGBFormat});
  const reflectionCamera=new T.PerspectiveCamera();
  const mirrorMatrix=new T.Matrix4();
  const mirrorBias=new T.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
  const clipPlane=new T.Plane(V(0,1,0),0);
  const waterUniforms={uTime:{value:0},uLevel:{value:0},uSun:{value:sunDir},uImpact:{value:V(14,-.7,0)},uForce:{value:.25},uReflection:{value:reflectionTarget.texture},uMirror:{value:mirrorMatrix}};
  const waveFn=`float wave(vec2 p,float t){return sin(p.x*.32+p.y*.16-t*1.15)*.19+sin(p.x*.17-p.y*.29-t*.83)*.17+sin(p.x*.91+p.y*.68-t*1.95)*.05+sin(p.x*1.8-p.y*1.3-t*2.4)*.018;}`;
  const waterMat=new T.ShaderMaterial({uniforms:waterUniforms,side:T.DoubleSide,vertexShader:`uniform float uTime;varying vec3 vWorld;${waveFn}void main(){vec3 p=position;p.y+=wave(p.xz,uTime);vec4 world=modelMatrix*vec4(p,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,fragmentShader:`
    uniform float uTime;uniform vec3 uSun;uniform vec3 uImpact;uniform float uForce;uniform sampler2D uReflection;uniform mat4 uMirror;varying vec3 vWorld;${waveFn}
    void main(){vec2 p=vWorld.xz;float e=.07;float dx=(wave(p+vec2(e,0),uTime)-wave(p-vec2(e,0),uTime))/(2.*e);float dz=(wave(p+vec2(0,e),uTime)-wave(p-vec2(0,e),uTime))/(2.*e);vec3 n=normalize(vec3(-dx,1.,-dz));vec3 view=normalize(cameraPosition-vWorld);float fres=pow(1.-max(dot(n,view),0.),3.);vec3 refl=reflect(-view,n);vec3 sky=mix(vec3(.38,.62,.66),vec3(.07,.22,.31),clamp(refl.y,0.,1.));float glint=pow(max(dot(reflect(-uSun,n),view),0.),180.);vec3 col=mix(vec3(.025,.20,.26),sky,.35+fres*.55);col+=vec3(1.,.72,.42)*glint*1.5;float r=length(p-uImpact.xz);float rings=pow(max(sin(r*4.7-uTime*8.),0.),7.)*exp(-r*.27)*uForce;float crest=smoothstep(.27,.38,wave(p,uTime))* .2;float spark=pow(max(sin(p.x*4.+uTime*2.)*sin(p.y*5.-uTime*1.5),0.),8.);col=mix(col,vec3(.72,.94,.91),clamp(rings+crest+spark*.04,0.,.8));float fog=1.-exp(-length(cameraPosition-vWorld)*.0038);col=mix(col,vec3(.38,.56,.59),fog);gl_FragColor=vec4(col,1.);#include <tonemapping_fragment>\n#include <encodings_fragment>}
  `.replace(';#include',';\n#include')});
  waterMat.fragmentShader=waterMat.fragmentShader.replace('col+=vec3(1.,.72,.42)*glint*1.5;', 'vec4 mirrorUv=uMirror*vec4(vWorld,1.);mirrorUv.xy+=n.xz*.035*mirrorUv.w;vec3 reflected=texture2DProj(uReflection,mirrorUv).rgb;col=mix(col,reflected,clamp(.26+fres*.64,0.,.92));col+=vec3(1.,.72,.42)*glint*1.5;');
  const waterGeo=new T.PlaneGeometry(600,600,mobile?140:220,mobile?140:220);waterGeo.rotateX(-Math.PI/2);const water=mesh(waterGeo,waterMat);water.castShadow=false;water.receiveShadow=false;water.position.y=-.8;
  // Continuous turbulent pressure jet, with moving internal currents and ballistic spray.
  const jetGeometry=new T.BufferGeometry(),jetVertices=[],jetUv=[],jetIndices=[];
  const rows=100,sides=40;for(let i=0;i<=rows;i++)for(let j=0;j<=sides;j++){jetVertices.push(i/rows,j/sides,0);jetUv.push(i/rows,j/sides);if(i<rows&&j<sides){const a=i*(sides+1)+j,b=a+sides+1;jetIndices.push(a,b,a+1,b,b+1,a+1);}}
  jetGeometry.setAttribute('position',new T.Float32BufferAttribute(jetVertices,3));jetGeometry.setAttribute('uv',new T.Float32BufferAttribute(jetUv,2));jetGeometry.setIndex(jetIndices);
  const jetUniforms={uTime:{value:0},uForce:{value:.3},uLevel:{value:-.8}};
  const jetMaterial=new T.ShaderMaterial({uniforms:jetUniforms,transparent:true,depthWrite:false,side:T.DoubleSide,vertexShader:`uniform float uTime;uniform float uForce;uniform float uLevel;varying vec2 vUv;varying vec3 vPos;void main(){vUv=uv;float u=uv.x;float age=u*1.7;float angle=uv.y*6.283185;float radius=(.67+u*.62)*(1.+sin(u*37.-uTime*8.+angle*3.)*.09);float speed=5.8+uForce*3.2;vec3 center=vec3(3.35+speed*age,7.6+2.*age-4.6*age*age,0.);vec3 p=center+vec3(sin(u*23.-uTime*4.)*.07,cos(angle)*radius*.5,sin(angle)*radius);vPos=p;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,fragmentShader:`uniform float uTime;uniform float uForce;uniform float uLevel;varying vec2 vUv;varying vec3 vPos;void main(){float stripe=sin(vUv.x*98.-uTime*21.+sin(vUv.y*28.+vUv.x*21.)*2.);float fine=sin(vUv.x*255.-uTime*44.+vUv.y*37.);float fres=pow(abs(sin(vUv.y*6.283)),3.);float foam=smoothstep(.55,.95,stripe)*(.15+.4*vUv.x)+smoothstep(.89,1.,fine)*.17;vec3 c=mix(vec3(.05,.46,.57),vec3(.7,.96,.94),fres*.6+foam);float alpha=(.68+foam*.3)*smoothstep(uLevel-.3,uLevel+.4,vPos.y);gl_FragColor=vec4(c,alpha);}`});
  const jet=mesh(jetGeometry,jetMaterial);jet.frustumCulled=false;jet.castShadow=false;
  const count=mobile?900:2000,seeds=[],sizes=[];for(let i=0;i<count;i++){seeds.push(random(),random(),random());sizes.push(1+random()*2);}
  const sprayGeometry=new T.BufferGeometry();sprayGeometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(count*3),3));sprayGeometry.setAttribute('aSeed',new T.Float32BufferAttribute(seeds,3));
  const sprayMat=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:jetUniforms,vertexShader:`attribute vec3 aSeed;uniform float uTime;uniform float uForce;uniform float uLevel;varying float vAlpha;void main(){float age=fract(aSeed.x+uTime*.48)*2.1;vec3 vel=vec3(5.+aSeed.y*7.+uForce*2.,2.+aSeed.z*3.,(aSeed.z-.5)*4.5);vec3 p=vec3(3.5,7.6,0.)+vel*age+vec3(0.,-4.9*age*age,0.);vAlpha=smoothstep(0.,.08,age)*(1.-age/2.1)*smoothstep(uLevel-.15,uLevel+.5,p.y);vec4 mv=viewMatrix*vec4(p,1.);gl_PointSize=min(24.,(70.+aSeed.y*85.)/max(1.,-mv.z));gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float a=pow(1.-r,1.8)*vAlpha*.65;gl_FragColor=vec4(.7,.94,1.,a);}`});
  const spray=new T.Points(sprayGeometry,sprayMat);spray.frustumCulled=false;scene.add(spray);
  // Cedar ark with curved hull, planked deck, cabin, lifebuoys and animal boarding.
  const woodTex=texture(512,256,(c,w,h)=>{c.fillStyle='#946041';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=26){c.fillStyle='#4c3429';c.fillRect(0,y,w,2);for(let x=0;x<w;x+=130){c.fillRect(x+(y%52)*2,y,2,26);}}for(let i=0;i<2000;i++){c.fillStyle=`rgba(230,179,112,${random()*.12})`;c.fillRect(random()*w,random()*h,10+random()*50,.5);}});woodTex.wrapS=woodTex.wrapT=T.RepeatWrapping;
  const wood=new T.MeshStandardMaterial({map:woodTex,color:0xcbab85,roughness:.6,metalness:.08});
  const ark=new T.Group();ark.position.set(-26,0,-19);ark.rotation.y=.22;scene.add(ark);
  const hullPos=[],hullUvs=[],hullIdx=[];for(let i=0;i<=64;i++)for(let j=0;j<=24;j++){const u=i/64,v=j/24;const beamWidth=Math.pow(Math.sin(u*Math.PI),.38)*3.4;hullPos.push((u-.5)*20,1.2-Math.sin(v*Math.PI)*3.5,(v*2-1)*beamWidth);hullUvs.push(u*3,v);if(i<64&&j<24){const a=i*25+j,b=a+25;hullIdx.push(a,a+1,b,b,a+1,b+1);}}
  const hullGeo=new T.BufferGeometry();hullGeo.setAttribute('position',new T.Float32BufferAttribute(hullPos,3));hullGeo.setAttribute('uv',new T.Float32BufferAttribute(hullUvs,2));hullGeo.setIndex(hullIdx);hullGeo.computeVertexNormals();const hull=mesh(hullGeo,new T.MeshStandardMaterial({map:woodTex,color:0xc9a17c,roughness:.5,side:T.DoubleSide}),ark);
  box(16.5,.22,5.8,wood,0,1.14,0,ark);box(10.2,2.6,4.6,wood,0,2.55,0,ark);const roof=mesh(new T.CylinderGeometry(2.65,2.65,11.2,32,1,false,0,Math.PI),material('#46655c',.52,.15),ark);roof.rotation.z=Math.PI/2;roof.position.set(0,3.85,0);
  for(const z of [-2.34,2.34])for(let x=-3.8;x<4.5;x+=2.5){const windowMat=material('#f5dba2',.28,.2);windowMat.emissive=new T.Color(0xdba458);windowMat.emissiveIntensity=.35;const glass=mesh(new T.CircleGeometry(.42,32),windowMat,ark);glass.position.set(x,2.7,z);if(z<0)glass.rotation.y=Math.PI;const rim=torus(.45,.06,copper,x,2.7,z,ark);}
  for(const z of [-2.95,2.95])for(let x=-7.5;x<=7.5;x+=1.5){cylinder(.035,.035,.7,cream,x,1.62,z,ark,8);beam(V(x,1.97,z),V(Math.min(x+1.5,7.5),1.97,z),.035,cream,ark);}
  for(const x of [-5.5,5.5]){torus(.42,.11,material('#e7d9bb'),x,1.6,3.15,ark);torus(.44,.035,material('#db7048'),x,1.6,3.17,ark);}
  const ramp=box(1.7,.12,6.5,wood,-6,1.15,5.6,ark);ramp.rotation.x=.08;
  function sheep(){const g=new T.Group();sphere(.48,cream,0,.58,0,g,1.4,1,.75);sphere(.25,dark,.58,.75,0,g,.85,.9,.7);for(const x of [-.35,.35])for(const z of [-.22,.22])cylinder(.055,.055,.5,dark,x,.2,z,g,8);sphere(.03,eyeMat,.75,.81,.15,g);return g;}
  const sheepPairs=[];for(let i=0;i<4;i++){const s=sheep();s.rotation.y=Math.PI/2;ark.add(s);sheepPairs.push(s);}
  function giraffe(x,z){const g=new T.Group();g.position.set(x,1.35,z);ark.add(g);const skin=material('#c89f67',.8);sphere(.47,skin,0,.8,0,g,1.3,1,.65);beam(V(.35,1,0),V(.55,3.1,0),.14,skin,g);sphere(.23,skin,.65,3.2,0,g,1.5,.8,.75);for(const dx of [-.35,.35])for(const dz of [-.22,.22])beam(V(dx,.7,dz),V(dx,.0,dz),.055,skin,g);for(let j=0;j<6;j++)sphere(.06,material('#665037'),.49,1.25+j*.24,.13,g);sphere(.035,dark,.83,3.27,.15,g);return g;}
  const giraffes=[giraffe(5.7,-.7),giraffe(6.6,.8)];
  // Atmospheric cloud sprites cross the camera path, including the transition into the city.
  const mistTex=texture(128,128,(c,w,h)=>{const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(222,238,237,.55)');g.addColorStop(.4,'rgba(217,233,236,.25)');g.addColorStop(1,'rgba(214,233,234,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});
  const clouds=[];for(let i=0;i<16;i++){const sprite=new T.Sprite(new T.SpriteMaterial({map:mistTex,transparent:true,depthWrite:false,opacity:.22}));sprite.position.set(-90+random()*160,10+random()*18,-30-random()*100);sprite.scale.set(35+random()*30,10+random()*10,1);scene.add(sprite);clouds.push(sprite);}
  // Camera keyframes are spatial shots, not CSS zooms of a flat image.
  const shots=[
    {p:V(37,23,51),t:V(-9,5,-7)},
    {p:V(-2,10.5,24),t:V(-9.5,4.7,6)},
    {p:V(21,13,23),t:V(3,6.2,0)},
    {p:V(66,37,18),t:V(18,8,-29)},
    {p:V(-4,13,7),t:V(-26,4,-19)}
  ];
  const cp=V(0,0,0),ct=V(0,0,0),projected=V(0,0,0);
  let pointerX=0,pointerY=0,px=0,py=0,time=0,phase=0,last=performance.now();
  addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){pointerX=(e.clientX/innerWidth-.5)*2;pointerY=(e.clientY/innerHeight-.5)*2;}},{passive:true});
  function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<600?55:42;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
  const label=document.querySelector('#object-label');
  let frameIndex=0,hidden=false;document.addEventListener('visibilitychange',()=>{hidden=document.hidden;last=performance.now();});
  function animate(now){
    requestAnimationFrame(animate);const dt=clamp((now-last)/1000,0,.04);last=now;if(hidden)return;
    const state=window.floodState||{progress:0,paused:false};const moving=!state.paused;
    if(moving)time+=dt;
    phase+=(state.progress*4-phase)*(state.reduced?1:Math.min(1,dt*4.5));
    const i=Math.min(3,Math.floor(phase));const f=smooth(.1,.9,phase-i);cp.lerpVectors(shots[i].p,shots[i+1].p,f);ct.lerpVectors(shots[i].t,shots[i+1].t,f);cp.y+=Math.sin(f*Math.PI)*(i===2?12:3);
    px+=(pointerX-px)*dt*3;py+=(pointerY-py)*dt*3;if(!state.reduced){cp.x+=px*1.1;cp.y-=py*.6;}
    if(innerWidth<600){cp.sub(ct).multiplyScalar(1.18).add(ct);cp.y+=3;ct.y+=1;}
    camera.position.copy(cp);camera.lookAt(ct);
    const force=.35+smooth(.8,2.1,phase)*.65,level=-.8+smooth(1.6,3.4,phase)*6.4;
    water.position.y=level;waterUniforms.uTime.value=time;waterUniforms.uForce.value=force;waterUniforms.uImpact.value.set(3.35+(5.8+force*3.2)*((2+Math.sqrt(4+18.4*(7.6-level)))/9.2),level,0);
    jetUniforms.uTime.value=time;jetUniforms.uForce.value=force;jetUniforms.uLevel.value=level;
    if(moving){head.rotation.y=Math.sin(time*.5)*.1;head.rotation.z=Math.sin(time*.8)*.025;arms.forEach((arm,j)=>{arm.rotation.x=Math.sin(time*7+j*2)*.11;arm.rotation.z=Math.cos(time*6+j)*.06;});eyes.forEach(e=>e.scale.y=(time%5>4.85)?.12:1.3);valve.rotation.z=-time*.14;clouds.forEach((c,j)=>{c.position.x+=dt*(.3+j*.015);if(c.position.x>110)c.position.x=-110;});}
    warningLight.intensity=(.7+Math.sin(time*5)*.6)*force;lampMat.emissiveIntensity=1+Math.sin(time*5)*.4;needle.rotation.z=-.8-force*1.8;
    ark.position.y=level+.75+Math.sin(time*.9)*.14;ark.rotation.z=Math.sin(time*.65)*.012;ark.rotation.x=Math.sin(time*.8)*.015;
    for(let j=0;j<sheepPairs.length;j++){const s=sheepPairs[j],walk=((time*.42+j*1.8)%8)/8;s.position.set(-6+(j%2)*.7,1.25+Math.abs(Math.sin(time*7+j))*.04,8.5-walk*9);s.rotation.y=walk>.82?Math.PI*.85:Math.PI/2;}
    giraffes.forEach((g,j)=>g.rotation.z=Math.sin(time*.8+j)*.035);endSegment.rotation.z=Math.PI/2+Math.sin(time*1.5)*.02;
    drawTerminal(time,phase);
    const c=Math.round(phase);const positions=[V(3.2,10.5,0),V(-8,7,7.5),V(3.2,10.7,0),V(20,32,-31),V(-25,level+8,-19)];const texts=['Автопілот / тиск зростає','WebHMI / AI за пультом','Фланець / перевищення тиску','Місто / нова берегова лінія','Ковчег / посадка парами'];projected.copy(positions[c]).project(camera);const x=(projected.x*.5+.5)*innerWidth,y=(-projected.y*.5+.5)*innerHeight;label.textContent=texts[c];label.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;label.style.opacity=projected.z<1&&x>30&&x<innerWidth-40&&y>100&&y<innerHeight*.7?'1':'0';
    if(scrollY>document.querySelector('.experience').offsetHeight+innerHeight)return;
    if(frameIndex%(mobile?4:2)===0){
      reflectionCamera.copy(camera);reflectionCamera.position.y=2*level-camera.position.y;
      reflectionCamera.up.copy(camera.up).reflect(V(0,1,0));
      const target=ct.clone();target.y=2*level-target.y;reflectionCamera.lookAt(target);reflectionCamera.updateMatrixWorld();
      mirrorMatrix.copy(mirrorBias).multiply(reflectionCamera.projectionMatrix).multiply(reflectionCamera.matrixWorldInverse);
      clipPlane.constant=-level+.1;renderer.clippingPlanes=[clipPlane];
      water.visible=false;renderer.setRenderTarget(reflectionTarget);renderer.render(scene,reflectionCamera);renderer.setRenderTarget(null);water.visible=true;renderer.clippingPlanes=[];
    }
    renderer.render(scene,camera);
    if(frameIndex++===1){document.body.classList.add('scene-ready');window.floodState.ready=true;}
  }
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback();});
  requestAnimationFrame(animate);
})();
