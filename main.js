const $=(selector,scope=document)=>scope.querySelector(selector);
const $$=(selector,scope=document)=>[...scope.querySelectorAll(selector)];

if(window.KAYI_PHOTO1){document.documentElement.style.setProperty('--kayi-photo-1',`url("data:image/webp;base64,${window.KAYI_PHOTO1}")`)}
if(window.KAYI_PHOTO2){document.documentElement.style.setProperty('--kayi-photo-2',`url("data:image/webp;base64,${window.KAYI_PHOTO2}")`)}
window.KAYI_PHOTO1='';window.KAYI_PHOTO2='';

const header=$('.site-header');
const menuButton=$('.menu-toggle');
const menu=$('#nav-menu');
const syncHeader=()=>header?.classList.toggle('scrolled',window.scrollY>140);
syncHeader();
window.addEventListener('scroll',syncHeader,{passive:true});

menuButton?.addEventListener('click',()=>{
  const open=menuButton.getAttribute('aria-expanded')!=='true';
  menuButton.setAttribute('aria-expanded',String(open));
  menuButton.setAttribute('aria-label',open?'Menü schließen':'Menü öffnen');
  menu?.classList.toggle('open',open);
  document.body.classList.toggle('menu-open',open);
});
$$('#nav-menu a').forEach(link=>link.addEventListener('click',()=>{
  menuButton?.setAttribute('aria-expanded','false');
  menu?.classList.remove('open');
  document.body.classList.remove('menu-open');
}));

const revealObserver=new IntersectionObserver((entries,observer)=>{
  entries.forEach(entry=>{
    if(!entry.isIntersecting)return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  });
},{threshold:.13,rootMargin:'0px 0px -30px'});
$$('.reveal').forEach(element=>{
  element.style.setProperty('--delay',`${element.dataset.delay||0}ms`);
  revealObserver.observe(element);
});
const year=$('#year');if(year)year.textContent=new Date().getFullYear();

const socialUrls={
  Instagram:'https://www.instagram.com/kayi.haustechnik/',
  TikTok:'https://www.tiktok.com/@kayi.haustechnik'
};
$$('.js-social-placeholder').forEach(button=>{
  const network=button.dataset.network;
  const url=socialUrls[network];
  if(!url)return;
  const link=document.createElement('a');
  link.href=url;
  link.target='_blank';
  link.rel='noopener noreferrer';
  link.className=button.className.replace(/\bjs-social-placeholder\b/g,'').trim();
  link.innerHTML=button.innerHTML;
  link.setAttribute('aria-label',`${network} öffnen`);
  button.replaceWith(link);
});

const dialog=$('#assistant-dialog');
const assistantBody=$('#assistant-body');
const progress=$('#assistant-progress');
const backButton=$('#assistant-back');
const closeButton=$('.assistant-close');
const state={step:0,service:'',timing:'',property:'',postcode:'',details:'',name:''};
const steps=[
  {kicker:'Schritt 1 von 5',title:'Worum geht es bei Ihrem Projekt?',description:'Wählen Sie den Bereich, der am besten passt.',key:'service',options:[['Komplette Badsanierung','Bad vollständig erneuern'],['Heizung & Warmwasser','Installation, Austausch oder Reparatur'],['Sanitärinstallation','Leitungen, Armaturen oder Sanitärobjekte'],['Fliesen & Innenausbau','Oberflächen und Ausbauarbeiten'],['Störung / Reparatur','Etwas funktioniert aktuell nicht'],['Sonstiges','Projekt kurz selbst beschreiben']]},
  {kicker:'Schritt 2 von 5',title:'Wann soll es losgehen?',description:'Eine grobe Einordnung reicht völlig aus.',key:'timing',options:[['So schnell wie möglich','Dringend oder kurzfristig'],['In den nächsten 4 Wochen','Zeitnah planbar'],['In 1–3 Monaten','Mit Vorlauf'],['Später / noch offen','Zunächst Beratung gewünscht']]},
  {kicker:'Schritt 3 von 5',title:'Wo findet das Projekt statt?',description:'Damit KAYI die Anfrage räumlich einordnen kann.',key:'location',fields:true},
  {kicker:'Schritt 4 von 5',title:'Was sollten wir vorab wissen?',description:'Ein paar Stichpunkte helfen bei der ersten Einschätzung.',key:'details',textarea:true},
  {kicker:'Projektcheck abgeschlossen',title:'Ihre Anfrage ist vorbereitet.',description:'Prüfen Sie die Angaben und senden Sie sie per WhatsApp Business oder E-Mail an KAYI Haustechnik.',key:'summary',summary:true}
];

function escapeHtml(value=''){
  return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}
function resetState(prefill=''){
  Object.assign(state,{step:prefill?1:0,service:prefill,timing:'',property:'',postcode:'',details:'',name:''});
}
function openAssistant(prefill=''){
  resetState(prefill);
  renderStep();
  if(typeof dialog?.showModal==='function')dialog.showModal();else dialog?.setAttribute('open','');
  document.body.classList.add('dialog-open');
}
function closeAssistant(){
  if(dialog?.open&&typeof dialog.close==='function')dialog.close();else dialog?.removeAttribute('open');
  document.body.classList.remove('dialog-open');
}
function selectOption(key,value){state[key]=value;state.step+=1;renderStep()}
function buildLeadMessage(){
  return [
    'Hallo KAYI Haustechnik,',
    '',
    'ich habe den Projektcheck auf Ihrer Website ausgefüllt:',
    `• Projekt: ${state.service||'Nicht angegeben'}`,
    `• Gewünschter Zeitraum: ${state.timing||'Nicht angegeben'}`,
    `• Objekt: ${state.property||'Nicht angegeben'}`,
    `• PLZ / Ort: ${state.postcode||'Nicht angegeben'}`,
    `• Beschreibung: ${state.details||'Keine weiteren Angaben'}`,
    state.name?`• Name: ${state.name}`:'',
    '',
    'Bitte melden Sie sich für die weitere Abstimmung. Vielen Dank!'
  ].filter(Boolean).join('\n');
}
function sendByWhatsApp(){
  const message=buildLeadMessage();
  window.open(`https://wa.me/4915224040411?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer');
}
function sendByEmail(){
  const message=buildLeadMessage();
  const subject=`Projektanfrage: ${state.service||'Haustechnik'}`;
  window.location.href=`mailto:info@kayi-haustechnik.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}
function renderStep(){
  if(!assistantBody||!progress||!backButton)return;
  const step=steps[state.step];
  progress.style.width=`${((state.step+1)/steps.length)*100}%`;
  backButton.classList.toggle('visible',state.step>0);
  let content=`<span class="assistant-kicker">${step.kicker}</span><h3>${step.title}</h3><p>${step.description}</p>`;
  if(step.options){
    content+=`<div class="assistant-options">${step.options.map(([title,description])=>`<button class="assistant-option" type="button" data-key="${step.key}" data-value="${escapeHtml(title)}"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)}</small></button>`).join('')}</div>`;
  }
  if(step.fields){
    content+=`<div class="assistant-field"><label for="property">Objektart</label><input id="property" value="${escapeHtml(state.property)}" placeholder="z. B. Wohnung, Einfamilienhaus, Gewerbe"></div><div class="assistant-field"><label for="postcode">PLZ / Ort</label><input id="postcode" value="${escapeHtml(state.postcode)}" placeholder="z. B. 61381 Friedrichsdorf"></div><button class="button button-primary assistant-next" type="button">Weiter</button>`;
  }
  if(step.textarea){
    content+=`<div class="assistant-field"><label for="details">Kurze Beschreibung</label><textarea id="details" placeholder="Was ist vorhanden, was soll geändert werden, gibt es Besonderheiten?">${escapeHtml(state.details)}</textarea></div><div class="assistant-field"><label for="name">Ihr Name (optional)</label><input id="name" value="${escapeHtml(state.name)}" placeholder="Vor- und Nachname"></div><button class="button button-primary assistant-next" type="button">Zusammenfassung erstellen</button>`;
  }
  if(step.summary){
    content+=`<div class="assistant-summary"><div><span>Projekt</span><strong>${escapeHtml(state.service||'Nicht angegeben')}</strong></div><div><span>Zeitraum</span><strong>${escapeHtml(state.timing||'Nicht angegeben')}</strong></div><div><span>Objekt</span><strong>${escapeHtml(state.property||'Nicht angegeben')}</strong></div><div><span>Ort</span><strong>${escapeHtml(state.postcode||'Nicht angegeben')}</strong></div></div><div class="lead-actions"><button class="button button-primary assistant-submit-whatsapp" type="button">Per WhatsApp senden <span>↗</span></button><button class="button button-mail assistant-submit-email" type="button">Per E-Mail senden <span>@</span></button></div><p class="assistant-contact-note">WhatsApp wird an +49 152 24040411 gesendet. E-Mail wird an info@kayi-haustechnik.de vorbereitet.</p>`;
  }
  assistantBody.innerHTML=content;
  $$('.assistant-option',assistantBody).forEach(option=>option.addEventListener('click',()=>selectOption(option.dataset.key,option.dataset.value)));
  $('.assistant-next',assistantBody)?.addEventListener('click',()=>{
    if(step.fields){
      state.property=$('#property',assistantBody).value.trim();
      state.postcode=$('#postcode',assistantBody).value.trim();
      if(!state.postcode){$('#postcode',assistantBody).focus();return;}
    }
    if(step.textarea){
      state.details=$('#details',assistantBody).value.trim();
      state.name=$('#name',assistantBody).value.trim();
    }
    state.step+=1;renderStep();
  });
  $('.assistant-submit-whatsapp',assistantBody)?.addEventListener('click',sendByWhatsApp);
  $('.assistant-submit-email',assistantBody)?.addEventListener('click',sendByEmail);
}

$$('.js-open-assistant').forEach(button=>button.addEventListener('click',()=>openAssistant()));
$$('.js-service-assistant').forEach(button=>button.addEventListener('click',()=>openAssistant(button.dataset.service||'')));
closeButton?.addEventListener('click',closeAssistant);
backButton?.addEventListener('click',()=>{if(state.step<=0)return;state.step-=1;renderStep()});
dialog?.addEventListener('click',event=>{if(event.target===dialog)closeAssistant()});
dialog?.addEventListener('close',()=>document.body.classList.remove('dialog-open'));
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.body.classList.remove('dialog-open')});
