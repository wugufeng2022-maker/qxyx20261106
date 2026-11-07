import {RABBIT_HOME} from './start-courtyard.js';
import {CAT_HOME} from './village-cat-site.js';
import {WALKER} from './orchard-walk.js';
import {CLEAR_LAKE,FOREST_RIDE} from './route.js';
// Imported only by the development entry branch; no storage or encounter mutations.
export const PREVIEW_DESTINATIONS = [
  {label:'起点小院',at:0}, {label:'小院小兔 · 招呼',at:RABBIT_HOME-45}, {label:'小院小兔 · 照料点',at:RABBIT_HOME-6}, {label:'出村花路',at:76}, {label:'林荫 · 桦树大道',at:170},
  {label:'林荫 · 阔叶小径',at:374}, {label:'开阔草坡',at:480}, {label:'草坡远望',at:548}, {label:'林荫 · 湖前疏林',at:753}, {label:'疏林出口 · 初见湖面',at:780}, {label:'自然湖畔 · 鸭群前',at:917},
  {label:'绘画湖畔 · 预览',at:1123,painting:true}, {label:'湖岸往村口',at:1209}, {label:'绿藤廊 · 入口',at:1274}, {label:'绿藤廊 · 树荫',at:1362},
  {label:'村口小猫 · 跑来招呼',at:CAT_HOME-68}, {label:'村口小猫 · 院门',at:CAT_HOME-18}, {label:'绿藤廊 · 出口',at:1754},
  {label:'葱茏长上坡',at:2160}, {label:'山顶 · 下坡起点',at:2550}, {label:'向阳长下坡',at:2820}, {label:'下坡池塘 · 从路上望见',at:2890}, {label:'坡脚远望',at:3100},
  {label:'坡脚进果园',at:3220}, {label:'果园 · 邻居前',at:WALKER.start-34}, {label:'果园 · 长椅',at:WALKER.end}, {label:'风过果园',at:3650}, {label:'金色麦野',at:4650}, {label:'溪边窄路',at:5650},
  {label:'森林入口',at:FOREST_RIDE.rideStart}, {label:'森林深处',at:6650}, {label:'清湖前的林路',at:CLEAR_LAKE.rideStart}, {label:'层叠草坡',at:7650}, {label:'开阔山脊',at:8650}, {label:'晚霞湖湾',at:9650},
];
export function readPreview(search) {
  const params=new URLSearchParams(search),raw=params.get('previewAt');
  const at=raw===null||raw.trim()===''?0:Number(raw);
  return {at:Number.isFinite(at)?Math.max(0,Math.min(10000,at)):0,
    painting:params.has('previewPainting'),natural:params.has('previewNatural'),rabbit:params.has('previewRabbit'),cat:params.has('previewCat')};
}
export function previewURL(href,{at,painting=false,rabbit=false,cat=false}) {
  const url=new URL(href);
  // Remove older encounter fixtures: scene jumps must not simulate completed encounters.
  for(const key of [...url.searchParams.keys()])if(key.startsWith('preview'))url.searchParams.delete(key);
  url.searchParams.set('previewAt',String(Math.max(0,Math.min(10000,at))));
  url.searchParams.set(painting?'previewPainting':'previewNatural','1');
  if(rabbit)url.searchParams.set('previewRabbit','1');
  if(cat)url.searchParams.set('previewCat','1');
  return url.href;
}
export function mountPreviewPanel({preview,onInteract}) {
  const panel=document.createElement('details');panel.className='dev-preview';panel.id='dev-preview';
  panel.innerHTML='<summary>场景跳转 <small>DEV</small></summary><div class="dev-preview-body"><div class="dev-destinations"></div><form><label for="preview-km">跳到里程（km，0–10.0）</label><div class="dev-km-row"><input id="preview-km" type="number" min="0" max="10.0" step="any" required inputmode="decimal"><button type="submit">跳转</button></div></form><label class="dev-rabbit"><input type="checkbox" id="preview-rabbit"> 带兔子（仅预览）</label><label class="dev-rabbit"><input type="checkbox" id="preview-cat"> 后座小猫（仅预览）</label><span class="dev-preview-status" role="status"></span><small>刷新切换场景 · 不改旅途记录与偏好</small></div>';
  if(preview.painting)panel.querySelector('summary').prepend('绘画湖畔 · 预览 · ');
  document.body.append(panel);
  const rabbit=panel.querySelector('#preview-rabbit'),cat=panel.querySelector('#preview-cat'),input=panel.querySelector('#preview-km');
  rabbit.checked=preview.rabbit;cat.checked=preview.cat;input.value=String(preview.at/1000);
  const jump=(at,painting=false)=>location.assign(previewURL(location.href,{at,painting,rabbit:rabbit.checked,cat:cat.checked}));
  for(const destination of PREVIEW_DESTINATIONS){const button=document.createElement('button');button.type='button';button.textContent=destination.label;button.addEventListener('click',()=>jump(destination.at,destination.painting));panel.querySelector('.dev-destinations').append(button);}
  panel.querySelector('form').addEventListener('submit',event=>{event.preventDefault();if(event.currentTarget.reportValidity())jump(Number(input.value)*1000);});
  panel.querySelector('.dev-preview-status').textContent=preview.painting?'绘画湖畔 · 预览':`起始里程 ${(preview.at/1000).toFixed(3)} km`;
  for(const name of ['pointerenter','focusin'])panel.addEventListener(name,onInteract);
  panel.addEventListener('keydown',event=>event.stopPropagation());
}
