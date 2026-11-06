// Independent music preference; nature sounds remain separately controllable.
export function createMusic(player,button) {
  let enabled=true,playing=false,fadeTimer;
  try{enabled=localStorage.getItem('meadow-music')!=='off';}catch{}
  player.src=new URL('../assets/audio/first-light-particles-game.mp3',import.meta.url).href;
  player.loop=true;player.preload='none';player.volume=0;
  function label(){button.setAttribute('aria-pressed',String(enabled));button.textContent=enabled?'♫ 音乐 · 开':'♫ 音乐 · 关';}
  label();
  function fade(target,stop=false){
    clearInterval(fadeTimer);
    const from=player.volume,start=performance.now(),duration=stop?350:1600;
    fadeTimer=setInterval(()=>{
      const t=Math.min(1,(performance.now()-start)/duration);player.volume=from+(target-from)*t;
      if(t===1){clearInterval(fadeTimer);if(stop)player.pause();}
    },40);
  }
  async function resume(){
    playing=true;if(!enabled)return;
    try{await player.play();if(playing&&enabled){fade(.2);label();}else player.pause();}
    catch{button.textContent='♫ 点击播放音乐';button.dataset.retry='true';}
  }
  function pause(immediate=false){playing=false;if(immediate){clearInterval(fadeTimer);player.pause();player.volume=0;}else fade(0,true);}
  button.addEventListener('click',()=>{
    if(button.dataset.retry){delete button.dataset.retry;enabled=true;}else enabled=!enabled;
    try{localStorage.setItem('meadow-music',enabled?'on':'off');}catch{}
    label();if(enabled&&playing)void resume();else if(!enabled)fade(0,true);
  });
  return {resume,pause};
}
