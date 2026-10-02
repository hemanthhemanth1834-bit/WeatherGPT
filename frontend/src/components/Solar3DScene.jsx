import React, { useEffect, useRef } from "react";
import * as THREE from "three";

function SolarScene({ cloud = 40, uv = 5, ratedKw = 5, altitude = 45 }) {
  const ref = useRef(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x071426);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 1.2, 7.5);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x93c5fd, 0.7);
    scene.add(ambient);
    const sunLight = new THREE.PointLight(0xffb300, 16, 35, 2);
    sunLight.position.set(3.8, 2.5, 2.2);
    scene.add(sunLight);

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 64, 64),
      new THREE.MeshStandardMaterial({ color: 0x164e63, roughness: .78, metalness: .08, emissive: 0x06233a, emissiveIntensity: .18 })
    );
    scene.add(earth);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.68, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: .075, side: THREE.BackSide, blending: THREE.AdditiveBlending })
    );
    scene.add(atmosphere);

    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(.52, 40, 40),
      new THREE.MeshBasicMaterial({ color: 0xffb000 })
    );
    sun.position.set(3.8, 2.5, 2.2);
    scene.add(sun);
    const sunGlow = new THREE.Mesh(
      new THREE.SphereGeometry(.78, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xff8a00, transparent: true, opacity: .12, blending: THREE.AdditiveBlending })
    );
    sunGlow.position.copy(sun.position);
    scene.add(sunGlow);

    const orbit = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(Array.from({length: 128}, (_, i) => {
        const a = i / 128 * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * 2.55, Math.sin(a) * .7 + .1, Math.sin(a) * 1.25);
      })),
      new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: .28 })
    );
    scene.add(orbit);

    const particles = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({ color: 0x67e8f9, size: .025, transparent: true, opacity: .5 })
    );
    const positions = new Float32Array(420 * 3);
    for (let i=0;i<420;i++) {
      const r = 3.4 + Math.random()*3.2, a = Math.random()*Math.PI*2, z = (Math.random()-.5)*4;
      positions[i*3]=Math.cos(a)*r; positions[i*3+1]=z; positions[i*3+2]=Math.sin(a)*r;
    }
    particles.geometry.setAttribute("position", new THREE.BufferAttribute(positions,3));
    scene.add(particles);

    const ray = new THREE.Mesh(
      new THREE.CylinderGeometry(.018,.018,4.7,12),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent:true, opacity:.22, blending:THREE.AdditiveBlending })
    );
    ray.rotation.z = -Math.PI/2.9;
    ray.position.set(1.85,1.35,1.05);
    scene.add(ray);

    let raf=0, t=0;
    const animate=()=>{
      t+=.006;
      earth.rotation.y += .0025;
      atmosphere.rotation.y -= .0008;
      orbit.rotation.z = Math.sin(t*.55)*.035;
      sun.rotation.y += .006;
      sunGlow.scale.setScalar(1 + Math.sin(t*2.2)*.045);
      particles.rotation.y += .00025;
      ray.material.opacity = .15 + Math.max(.02, uv/18)*.16 + Math.sin(t*2)*.035;
      renderer.render(scene,camera);
      raf=requestAnimationFrame(animate);
    };
    animate();

    const resize=()=>{
      const w=host.clientWidth,h=Math.max(host.clientHeight,220);
      camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h);
    };
    const ro=new ResizeObserver(resize); ro.observe(host); resize();
    return ()=>{cancelAnimationFrame(raf);ro.disconnect();renderer.dispose();scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});if(host.contains(renderer.domElement))host.removeChild(renderer.domElement);};
  }, [cloud, uv, ratedKw, altitude]);

  return <div ref={ref} className="wg-solar-3d-scene" aria-label="Animated 3D solar intelligence scene" />;
}

export default SolarScene;
