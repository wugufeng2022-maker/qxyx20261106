// Relative gravity only: no compass, location, networking or saved sensor data.
const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
export function screenTilt(beta, gamma, screenAngle = 0) {
  if (![beta, gamma, screenAngle].every(v => typeof v === 'number' && Number.isFinite(v))) return null;
  const b=beta*Math.PI/180,g=gamma*Math.PI/180,a=screenAngle*Math.PI/180;
  // Project the gravity vector onto screen-right. This stays continuous when
  // Euler beta/gamma representations flip near a vertical phone.
  const lateral=Math.cos(b)*Math.sin(g)*Math.cos(a)-Math.sin(b)*Math.sin(a);
  return Math.asin(clamp(lateral,-1,1))*180/Math.PI;
}
export function createTiltSteering({target=window, orientation=target.DeviceOrientationEvent, secure=target.isSecureContext, angle=()=>target.screen?.orientation?.angle ?? target.orientation ?? 0, now=()=>performance.now(), onChange=()=>{}}={}) {
  let enabled=false,status='off',value=0,baseline=null,sampleAt=0,filtered=0,blocked=false,token=0,requestAt=0,lastAt=0,sensitivity=1;
  const snapshot=()=>({enabled,status,value,sensitivity});
  const emit=()=>onChange(snapshot());
  function reset(next){value=0;filtered=0;baseline=null;lastAt=0;status=next;emit();}
  function disable(){token++;enabled=false;target.removeEventListener('deviceorientation',sample);reset('off');}
  function sample(event){
    if(!enabled)return;
    const tilt=screenTilt(event.beta,event.gamma,Number(angle()));
    if(tilt===null)return;
    const time=now();sampleAt=time;
    if(baseline===null){baseline=tilt;filtered=0;lastAt=time;status=blocked?'suspended':'ready';value=0;emit();return;}
    const dt=clamp((time-lastAt)/1000,0,.1);lastAt=time;
    const delta=tilt-baseline, dead=2.5;
    const desired=Math.abs(delta)<=dead?0:Math.sign(delta)*clamp((Math.abs(delta)-dead)/(18/sensitivity),0,1);
    filtered+=(desired-filtered)*(1-Math.exp(-dt/0.15));
    value=blocked?0:Math.abs(filtered)<.008?0:filtered;status=blocked?'suspended':'ready';emit();
  }
  // Called directly in a click handler: requestPermission is invoked before any await.
  async function enable(){
    disable();const request=++token;
    if(!secure){status='insecure';emit();return;}
    if(!orientation){status='unsupported';emit();return;}
    status='permission';requestAt=now();emit();
    try{
      const result=typeof orientation.requestPermission==='function'?orientation.requestPermission(): 'granted';
      const permission=await result;
      if(request!==token)return;
      if(permission!=='granted'){status='denied';emit();return;}
      enabled=true;sampleAt=now();reset('waiting');
      target.addEventListener('deviceorientation',sample);
    }catch{if(request===token){status='denied';emit();}}
  }
  function tick(){
    if(status==='permission'&&now()-requestAt>10000){token++;reset('timeout');}
    if(enabled&&status!=='stale'&&now()-sampleAt>(status==='waiting'?6000:1600)){
      reset('stale');
    }
  }
  return {enable,disable,tick,snapshot,
    setBlocked(next){if(next!==blocked){blocked=next;if(enabled){reset(next?'suspended':'recalibrate');}}},
    rotate(){if(enabled){reset('recalibrate');sampleAt=now();}},
    calibrate(){if(!enabled)return;baseline=null;value=0;filtered=0;lastAt=0;status='recalibrate';emit();},
    setSensitivity(v){if([.65,1,1.5].includes(v)){sensitivity=v;value=0;filtered=0;emit();}},
  };
}
const messages={off:'倾斜转向已关闭，仍可使用左右键。',permission:'请在浏览器提示中允许方向感应…',waiting:'等待有效感应数据；保持舒适握姿，首个读数会设为中间。',ready:'感应就绪 · 手机向左轻倾左转，向右轻倾右转。',suspended:'暂时停止转向；继续时请保持舒适握姿，重新校准。',recalibrate:'保持舒适握姿，等待新读数校准中间位置…',insecure:'需要 HTTPS 安全连接。请打开云端安全网址。',unsupported:'此浏览器没有可用的方向感应接口，请继续使用左右键。',denied:'方向感应未获允许。可在浏览器设置中允许后重试。',timeout:'浏览器未回应权限请求，请重试或继续使用左右键。',stale:'未收到有效感应数据，转向已归零。保持握姿等待恢复，或关闭后重试。'};
export function mountTiltSteering({getBlocked=()=>false,onOpen=()=>{},onClose=()=>{},target=window}={}){
  const button=document.createElement('button');button.className='tilt-toggle';button.id='tilt-settings';button.textContent='转向设置';button.setAttribute('aria-haspopup','dialog');
  document.getElementById('ride-tools').append(button);
  const panel=document.createElement('dialog');panel.className='tilt-panel';panel.setAttribute('aria-labelledby','tilt-title');
  panel.innerHTML='<div class="tilt-head"><h2 id="tilt-title">手机倾斜转向</h2><button id="tilt-close" aria-label="关闭转向设置">关闭</button></div><p>舒适握住手机，轻轻左右倾斜。横屏与竖屏都可使用；转屏后会重新校准。左右触控键始终优先。</p><p id="tilt-status" role="status"></p><div class="tilt-feedback" aria-label="实时转向"><span>左</span><meter id="tilt-meter" min="-1" max="1" value="0" aria-label="倾斜方向"></meter><span>右</span><output id="tilt-direction">居中</output></div><div class="tilt-actions"><button id="tilt-enable">开启倾斜转向</button><button id="tilt-calibrate" disabled>重新校准</button></div><label for="tilt-sensitivity">灵敏度</label><select id="tilt-sensitivity"><option value="0.65">轻柔</option><option value="1" selected>适中</option><option value="1.5">灵敏</option></select><small>默认关闭。感应仅在本机使用，不上传、不保存方向数据；仅记住灵敏度偏好。</small>';
  document.body.append(panel);const $=id=>panel.querySelector('#'+id);
  let previousStatus='';
  const controller=createTiltSteering({target,onChange(s){
    if(s.status!==previousStatus){$('tilt-status').textContent=messages[s.status];previousStatus=s.status;}
    $('tilt-enable').textContent=s.enabled?'关闭倾斜转向':s.status==='permission'?'等待授权…':'开启倾斜转向';$('tilt-enable').disabled=s.status==='permission';
    $('tilt-calibrate').disabled=!s.enabled;$('tilt-meter').value=s.value;$('tilt-direction').textContent=s.value<-.05?'← 左转':s.value>.05?'右转 →':'居中';
    button.textContent=s.status==='ready'?(s.value<-.05?'倾斜 · ← 左转':s.value>.05?'倾斜 · 右转 →':'倾斜 · 居中'):s.enabled?'转向 · 待就绪':'转向设置';
  }});
  controller.disable();try{const v=Number(localStorage.getItem('meadow-tilt-sensitivity'));if([.65,1,1.5].includes(v)){controller.setSensitivity(v);$('tilt-sensitivity').value=String(v);}}catch{}
  $('tilt-enable').addEventListener('click',()=>{if(controller.snapshot().enabled)controller.disable();else void controller.enable();});
  $('tilt-calibrate').addEventListener('click',()=>controller.calibrate());
  $('tilt-sensitivity').addEventListener('change',()=>{const v=Number($('tilt-sensitivity').value);controller.setSensitivity(v);try{localStorage.setItem('meadow-tilt-sensitivity',String(v));}catch{}});
  button.addEventListener('click',()=>{onOpen();panel.showModal();});
  $('tilt-close').addEventListener('click',()=>panel.close());panel.addEventListener('close',()=>{onClose();button.focus();});
  const rotate=()=>controller.rotate();target.screen?.orientation?.addEventListener('change',rotate);target.addEventListener('orientationchange',rotate);
  return {update(){controller.setBlocked(getBlocked());controller.tick();return controller.snapshot();},interrupt(){controller.setBlocked(true);},isOpen:()=>panel.open};
}
