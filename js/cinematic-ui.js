/* Scroll is the timeline. Every camera chapter also has a keyboard-accessible button. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = window.floodState = { progress:0, paused:reduced, reduced, touring:false, ready:false };
  const experience = document.querySelector('.experience');
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero-overlay');
  const copy = document.querySelector('.chapter-copy');
  const buttons = [...document.querySelectorAll('[data-chapter]')];
  const chapters = [null,
    ['Диспетчерська','«Я тільки підправив тиск».','Робот запустив новий код у WebHMI. Оператор пішов по каву. Ніхто не перевірив, що «відкрити всі клапани» — це не оптимізація.'],
    ['Прорив','Код пройшов. Труба — ні.','Тиск підскочив, фланець не витримав. Вода виривається під напором, розбивається на бризки й біжить до міста. Deploy успішний. Решта — під питанням.'],
    ['Нова географія','Ваш офіс тепер із видом на дно.','Вода підіймається просто в цій сцені. Перші поверхи зникають, вікна відбивають хвилі. Штаб просить не називати це «безкоштовним басейном».'],
    ['План Ной','Є план Б. І дві вівці.','Ковчег приймає пасажирів. Тварини заходять парами, жирафи вже зайняли верхню палубу. Залишилося перевірити тебе — до пульта пустимо лише після тесту.']
  ];
  let chapter=-1, tourStart=0, lastFrame=performance.now();
  const range = () => Math.max(1,experience.offsetHeight-innerHeight);
  function go(index){
    state.touring=false;
    window.scrollTo({top:range()*index/4,behavior:reduced?'instant':'smooth'});
  }
  buttons.forEach(button=>button.addEventListener('click',event=>{event.preventDefault();go(+button.dataset.chapter);closeMenu();}));
  document.querySelector('.next-chapter').addEventListener('click',()=>chapter>=4?document.querySelector('#quiz').scrollIntoView({behavior:reduced?'instant':'smooth'}):go(chapter+1));
  document.querySelector('#restart-story').addEventListener('click',()=>go(0));
  const pause = document.querySelector('#pause-motion');
  function pauseLabel(){pause.setAttribute('aria-pressed',String(state.paused));pause.innerHTML=state.paused?'▶ <span>Продовжити</span>':'Ⅱ <span>Пауза</span>';}
  pauseLabel();
  pause.addEventListener('click',()=>{state.paused=!state.paused;state.touring=false;pauseLabel();});
  document.querySelector('.start-tour').addEventListener('click',()=>{if(reduced){go(1);return;}state.paused=false;pauseLabel();state.touring=true;tourStart=performance.now();});
  addEventListener('wheel',()=>state.touring=false,{passive:true});
  addEventListener('touchstart',()=>state.touring=false,{passive:true});
  addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))state.touring=false;});
  const menu=document.querySelector('.menu-toggle');
  function closeMenu(){header.classList.remove('menu-open');menu.setAttribute('aria-expanded','false');}
  menu.addEventListener('click',()=>{const open=header.classList.toggle('menu-open');menu.setAttribute('aria-expanded',String(open));});
  document.querySelectorAll('.site-header nav a').forEach(a=>a.addEventListener('click',closeMenu));
  addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
  function frame(now){
    const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;
    if(state.touring&&!state.paused){const p=Math.min((now-tourStart)/40000,1);window.scrollTo({top:range()*p,behavior:'instant'});if(p===1)state.touring=false;}
    state.progress=Math.max(0,Math.min(scrollY/range(),1));
    const outside=scrollY>range()+innerHeight*.5;
    document.body.classList.toggle('outside-scene',outside);
    header.classList.toggle('scrolled',scrollY>40);
    const fade=Math.max(0,1-state.progress*12);
    hero.style.opacity=fade;hero.style.visibility=fade>0?'visible':'hidden';hero.style.transform=`translateY(${-state.progress*70}px) scale(${1-state.progress*.07})`;
    document.querySelector('.reading-progress i').style.width=(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)*100)+'%';
    const current=state.progress<.12?0:Math.min(4,Math.max(1,Math.round(state.progress*4)));
    if(current!==chapter){
      chapter=current;copy.hidden=chapter===0;
      if(chapter){document.querySelector('#chapter-count').textContent=String(chapter).padStart(2,'0');document.querySelector('#chapter-name').textContent=chapters[chapter][0];document.querySelector('#chapter-title').textContent=chapters[chapter][1];document.querySelector('#chapter-description').textContent=chapters[chapter][2];document.querySelector('.next-chapter').innerHTML=chapter===4?'Перевірити себе <span>↓</span>':'Далі по воді <span>↓</span>';}
      buttons.forEach(b=>{if(+b.dataset.chapter===chapter)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
    }
    const pressure=6.2+Math.sin(now*.0014)*.16+Math.min(1,state.progress*3)*8.4;
    document.querySelector('#pressure-value').textContent=state.progress>.78?'План Ной':pressure.toFixed(1)+' bar';
    document.querySelector('#system-state').textContent=state.progress<.35?'Автопілот увімкнено':state.progress<.65?'Прорив. Потрібна людина.':state.progress<.85?'Рівень води зростає':'Посадка триває';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
