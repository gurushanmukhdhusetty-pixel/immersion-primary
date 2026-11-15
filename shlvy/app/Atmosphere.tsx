'use client';
import {useEffect,useRef,useState} from 'react';
type Point=[number,number,number];
const colors=['#b9f56b','#a78bfa','#7b72f5'];
export default function Atmosphere(){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [paused,setPaused]=useState(false);
 useEffect(()=>{
  const el=canvas.current;if(!el)return;const ctx=el.getContext('2d');if(!ctx)return;
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');let reduced=motion.matches;
  let width=0,height=0,frame=0,last=0,time=0,visible=!document.hidden;
  let pointerX=0,pointerY=0,smoothX=0,smoothY=0,scroll=window.scrollY;
  const geometry:Point[][]=[];
  // Three intersecting orbital loops and a wireframe octahedron in real 3D space.
  for(let ring=0;ring<3;ring++){
   const path:Point[]=[];
   for(let i=0;i<=96;i++){const a=i/96*Math.PI*2;const u=Math.cos(a)*175,v=Math.sin(a)*175;
    path.push(ring===0?[u,v,0]:ring===1?[u,0,v]:[0,u,v]);}
   geometry.push(path);
  }
  const vertices:Point[]=[[0,95,0],[0,-95,0],[95,0,0],[-95,0,0],[0,0,95],[0,0,-95]];
  const edges=[[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,4],[4,3],[3,5],[5,2]];
  function resize(){width=window.innerWidth;height=window.innerHeight;const dpr=Math.min(window.devicePixelRatio||1,1.5);el!.width=width*dpr;el!.height=height*dpr;ctx!.setTransform(dpr,0,0,dpr,0,0);}
  function move(e:PointerEvent){pointerX=(e.clientX/width-.5)*2;pointerY=(e.clientY/height-.5)*2;}
  function onScroll(){scroll=window.scrollY;}
  function project(p:Point,cx:number,cy:number,scale:number,phase:number):[number,number,number]{
   const ay=phase+smoothX*.28,ax=phase*.45+smoothY*.2;
   const x=p[0]*Math.cos(ay)+p[2]*Math.sin(ay),z=-p[0]*Math.sin(ay)+p[2]*Math.cos(ay);
   const y=p[1]*Math.cos(ax)-z*Math.sin(ax),depth=p[1]*Math.sin(ax)+z*Math.cos(ax);
   const perspective=600/(600+depth);return [cx+x*perspective*scale,cy+y*perspective*scale,depth];
  }
  function draw(now:number){
   if(!visible)return;
   frame=requestAnimationFrame(draw);if(now-last<32)return;const dt=Math.min(now-last,50);last=now;
   const still=reduced||paused;if(!still){time+=dt*.00012;smoothX+=(pointerX-smoothX)*.055;smoothY+=(pointerY-smoothY)*.055;}
   ctx!.clearRect(0,0,width,height);
   const compact=width<650,scale=compact?.56:1;
   const parallax=still?0:Math.min(scroll*.07,200);
   const positions=[[width*.82+(still?0:smoothX*20),height*.33-parallax*.35,scale],[width*.1,height*.83-parallax*.2,scale*.65]];
   positions.forEach(([cx,cy,size],object)=>{
    const phase=(still?.7:time)+object*1.7;
    geometry.forEach((path,index)=>{
     ctx!.beginPath();path.forEach((p,i)=>{const q=project(p,cx,cy,size,phase);if(i===0)ctx!.moveTo(q[0],q[1]);else ctx!.lineTo(q[0],q[1]);});
     ctx!.strokeStyle=colors[(index+object)%3];ctx!.globalAlpha=object?.14:.23;ctx!.lineWidth=index===1?1.5:.8;ctx!.stroke();
    });
    edges.forEach(([a,b])=>{const p=project(vertices[a],cx,cy,size,phase),q=project(vertices[b],cx,cy,size,phase);ctx!.beginPath();ctx!.moveTo(p[0],p[1]);ctx!.lineTo(q[0],q[1]);ctx!.strokeStyle='#b9a0ff';ctx!.globalAlpha=.19;ctx!.lineWidth=1;ctx!.stroke();});
   });
   for(let i=0;i<(compact?22:48);i++){const x=((i*173.37)%width)+(still?0:Math.sin(time+i)*6+smoothX*(i%3+1)*3);const y=((i*97.13+ (still?0:time*8*(i%2?1:-1))-parallax*.15)%height+height)%height;ctx!.globalAlpha=.12+(i%4)*.05;ctx!.fillStyle=colors[i%3];ctx!.beginPath();ctx!.arc(x,y,i%7===0?1.8:.8,0,Math.PI*2);ctx!.fill();}
   ctx!.globalAlpha=1;
   if(still){cancelAnimationFrame(frame);frame=0;}
  }
  function restart(){if(!frame&&visible)frame=requestAnimationFrame(draw);}
  function onResize(){resize();restart();}
  function visibility(){visible=!document.hidden;if(!visible){cancelAnimationFrame(frame);frame=0;}else restart();}
  function preference(){reduced=motion.matches;restart();}
  resize();restart();window.addEventListener('resize',onResize);window.addEventListener('pointermove',move,{passive:true});window.addEventListener('scroll',onScroll,{passive:true});document.addEventListener('visibilitychange',visibility);motion.addEventListener('change',preference);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',onResize);window.removeEventListener('pointermove',move);window.removeEventListener('scroll',onScroll);document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',preference);};
 },[paused]);
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');if(media.matches)return;
  const targets=document.querySelectorAll<HTMLElement>('.sectionhead,.steps article,.gallery .sample,.bottom-cta,.faq>h2,.faq details');
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('revealed');observer.unobserve(entry.target);}}),{threshold:.12});
  targets.forEach((el,i)=>{el.style.setProperty('--reveal-delay',`${el.matches('.sample,.steps article')?(i%3)*90:0}ms`);el.classList.add('scroll-reveal');observer.observe(el);});
  const change=()=>{if(media.matches){targets.forEach(el=>el.classList.add('revealed'));observer.disconnect();}};media.addEventListener('change',change);
  return()=>{observer.disconnect();media.removeEventListener('change',change);targets.forEach(el=>el.classList.remove('scroll-reveal'));};
 },[]);
 return <><div className="atmosphere" aria-hidden="true"><div className="aurora violet"/><div className="aurora lime"/><canvas ref={canvas}/><div className="atmosphere-grid"/></div><button className="motion-toggle" onClick={()=>setPaused(v=>!v)} aria-pressed={paused} aria-label={paused?'Resume background animation':'Pause background animation'}><span aria-hidden="true">{paused?'▷':'Ⅱ'}</span> {paused?'Motion off':'Motion on'}</button></>;
}
