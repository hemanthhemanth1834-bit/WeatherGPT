import React, { useEffect, useRef } from "react";
import * as THREE from "three";

function SolarScene({ cloud = 40, uv = 5, ratedKw = 5, altitude = 45 }) {
  const ref = useRef(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const mobile = window.matchMedia?.("(max-width: 650px)")?.matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 1.2, 8.4);
    const renderer = new THREE.WebGLRenderer({antialias: !mobile, alpha: true, powerPreference: "high-performance"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.7));
    renderer.setSize(Math.max(host.clientWidth,260), Math.max(host.clientHeight,240));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x8ec5ff,.72));
    const light = new THREE.PointLight(0xffb21a,18,40,2);
    light.position.set(4.1,3,2.6);
    scene.add(light);

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1.42,mobile?36:56,mobile?24:40),
      new THREE.MeshStandardMaterial({color:0x0f4c65,roughness:.82,metalness:.04,emissive:0x06283f,emissiveIntensity:.25})
    );
    earth.rotation.z=-.32;
    scene.add(earth);
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.56,40,28),
      new THREE.MeshBasicMaterial({color:0x39c7ff,transparent:true,opacity:.075,side:THREE.BackSide,blending:THREE.AdditiveBlending})
    );
    scene.add(atmosphere);

    const sun = new THREE.Mesh(new THREE.SphereGeometry(.52,36,28),new THREE.MeshBasicMaterial({color:0xffb000}));
    sun.position.set(4.1,3,2.6);
    scene.add(sun);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.8,28,20),new THREE.MeshBasicMaterial({color:0xff8a00,transparent:true,opacity:.13,blending:THREE.AdditiveBlending}));
    glow.position.copy(sun.position);
    scene.add(glow);

    const orbitPts=Array.from({length:160},(_,i)=>{const a=i/160*Math.PI*2;return new THREE.Vector3(Math.cos(a)*2.55,Math.sin(a)*.78+.12,Math.sin(a)*1.15)});
    scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(orbitPts),new THREE.LineBasicMaterial({color:0xf59e0b,transparent:true,opacity:.32})));

    const roof=new THREE.Mesh(new THREE.BoxGeometry(2.7,.14,1.65),new THREE.MeshStandardMaterial({color:0x17243b,roughness:.66,metalness:.25}));
    roof.position.set(.35,-1.72,.1); roof.rotation.x=-.13; scene.add(roof);
    const panels=new THREE.Group(); panels.position.set(.35,-1.55,.1); panels.rotation.x=-.22; scene.add(panels);
    const pm=new THREE.MeshStandardMaterial({color:0x102f4c,roughness:.3,metalness:.5,emissive:0x082c46,emissiveIntensity:.32});
    const fm=new THREE.MeshBasicMaterial({color:0x5ee7ff});
    const cols=ratedKw>=25?6:ratedKw>=10?5:ratedKw>=5?4:3, rows=ratedKw>=25?3:2;
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const p=new THREE.Mesh(new THREE.BoxGeometry(.52,.035,.31),pm.clone());
      p.position.set((c-(cols-1)/2)*.55,0,(r-(rows-1)/2)*.35); panels.add(p);
      const e=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(.538,.045,.328)),fm);
      e.position.copy(p.position); panels.add(e);
    }

    const cloudCount=mobile?55:110;
    const cp=new Float32Array(cloudCount*3);
    for(let i=0;i<cloudCount;i++){cp[i*3]=(Math.random()-.5)*6;cp[i*3+1]=.8+Math.random()*2;cp[i*3+2]=(Math.random()-.5)*3.2}
    const cg=new THREE.BufferGeometry(); cg.setAttribute("position",new THREE.BufferAttribute(cp,3));
    const clouds=new THREE.Points(cg,new THREE.PointsMaterial({color:0xb9d9ed,size:mobile?.07:.085,transparent:true,opacity:Math.min(.72,.14+cloud/125),depthWrite:false}));
    scene.add(clouds);

    const rays=new THREE.Group(); scene.add(rays);
    const rayCount=mobile?7:12;
    for(let i=0;i<rayCount;i++){
      const ray=new THREE.Mesh(new THREE.CylinderGeometry(.012,.022,3.2+(i%3)*.7,8),new THREE.MeshBasicMaterial({color:i%2?0xfbbf24:0x38d9ff,transparent:true,opacity:.13,blending:THREE.AdditiveBlending}));
      ray.position.set(2+(i%4)*.28,1.55-(i%3)*.24,.5-(i%2)*.3); ray.rotation.z=-.8; rays.add(ray);
    }

    const energyCount=mobile?28:52, ep=new Float32Array(energyCount*3);
    for(let i=0;i<energyCount;i++){ep[i*3]=1+Math.random()*2.1;ep[i*3+1]=-.5+Math.random()*1.7;ep[i*3+2]=-.4+Math.random()*.8}
    const eg=new THREE.BufferGeometry(); eg.setAttribute("position",new THREE.BufferAttribute(ep,3));
    const energy=new THREE.Points(eg,new THREE.PointsMaterial({color:0xfbbf24,size:mobile?.045:.055,transparent:true,opacity:.8,blending:THREE.AdditiveBlending}));
    scene.add(energy);

    const fieldCount=mobile?100:190, fp=new Float32Array(fieldCount*3);
    for(let i=0;i<fieldCount;i++){const r=4.2+Math.random()*3.4,a=Math.random()*Math.PI*2;fp[i*3]=Math.cos(a)*r;fp[i*3+1]=(Math.random()-.5)*5;fp[i*3+2]=Math.sin(a)*r}
    const fg=new THREE.BufferGeometry(); fg.setAttribute("position",new THREE.BufferAttribute(fp,3));
    scene.add(new THREE.Points(fg,new THREE.PointsMaterial({color:0x5fe7ff,size:.018,transparent:true,opacity:.38})));

    let raf=0,visible=true;
    const animate=(time)=>{
      if(!visible)return;
      const t=time*.001,speed=reduced?0:1;
      earth.rotation.y=t*.11*speed; atmosphere.rotation.y=-t*.035*speed;
      panels.rotation.z=Math.sin(t*.5)*.018*speed; glow.scale.setScalar(1+Math.sin(t*2.2)*.045*speed);
      clouds.position.x=Math.sin(t*.08)*.18*speed;
      rays.children.forEach((ray,i)=>{ray.material.opacity=(.08+(uv/20)*.18)*Math.max(.12,1-cloud/120)*(.78+.22*Math.sin(t*2+i))});
      const pos=energy.geometry.attributes.position.array;
      for(let i=0;i<energyCount;i++){pos[i*3]-=.008*speed;pos[i*3+1]+=.004*speed;if(pos[i*3]<.85){pos[i*3]=2.9;pos[i*3+1]=-.45+Math.random()*1.5}}
      energy.geometry.attributes.position.needsUpdate=true;
      renderer.render(scene,camera); raf=requestAnimationFrame(animate);
    };
    const onVis=()=>{visible=document.visibilityState==="visible";if(visible&&!raf)raf=requestAnimationFrame(animate)};
    document.addEventListener("visibilitychange",onVis);
    const resize=()=>{const w=Math.max(host.clientWidth,260),h=Math.max(host.clientHeight,240);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};
    const ro=new ResizeObserver(resize);ro.observe(host);resize();raf=requestAnimationFrame(animate);
    return()=>{cancelAnimationFrame(raf);document.removeEventListener("visibilitychange",onVis);ro.disconnect();scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)Array.isArray(o.material)?o.material.forEach(m=>m.dispose()):o.material.dispose()});renderer.dispose();if(host.contains(renderer.domElement))host.removeChild(renderer.domElement)};
  },[cloud,uv,ratedKw,altitude]);
  return <div ref={ref} className="wg-solar-3d-scene" aria-label="Animated 3D solar intelligence visualization"/>;
}
export default SolarScene;
