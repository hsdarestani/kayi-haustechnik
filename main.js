const $=(selector,scope=document)=>scope.querySelector(selector);
const $$=(selector,scope=document)=>[...scope.querySelectorAll(selector)];

const leadCss=document.createElement('link');leadCss.rel='stylesheet';leadCss.href='/lead-enhancements.css?v=20260730-1';document.head.appendChild(leadCss);

if(window.KAYI_PHOTO1){document.documentElement.style.setProperty('--kayi-photo-1',`url("data:image/avif;base64,${window.KAYI_PHOTO1}")`)}
if(window.KAYI_PHOTO2){document.documentElement.style.setProperty('--kayi-photo-2',`url("data:image/avif;base64,${window.KAYI_PHOTO2}")`)}
window.KAYI_PHOTO1='';window.KAYI_PHOTO2='';

function replaceAssistantLabels(){
  const replacements=[
    ['KAYI KI-Assistent','KAYI Projektassistent'],
    ['KI-Projektcheck','Digitaler Projektcheck'],
    ['KI-Assistenten','digitalen Projektassistenten'],
    ['KI-Assistent','Digitaler Projektassistent']
  ];
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
    let text=node.nodeValue;
    replacements.forEach(([from,to])=>{text=text.replaceAll(from,to)});
    node.nodeValue=text;
  }
  $$('[aria-label]').forEach(element=>{
    let label=element.getAttribute('aria-label')||'';
    replacements.forEach(([from,to])=>{label=label.replaceAll(from,to)});
    element.setAttribute('aria-label',label);
  });
}
replaceAssistantLabels();

const header=$('.site-header');
const menuButton=$('.menu-toggle');
const menu=$('#nav-menu');
const syncHeader=()=>header?.classList.toggle('scrolled',window.scrollY>140);
syncHeader();window.addEventListener('scroll',syncHeader,{passive:true});
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
  entries.forEach(entry=>{if(!entry.isIntersecting)return;entry.target.classList.add('is-visible');observer.unobserve(entry.target)});
},{threshold:.13,rootMargin:'0px 0px -30px'});
$$('.reveal').forEach(element=>{element.style.setProperty('--delay',`${element.dataset.delay||0}ms`);revealObserver.observe(element)});
const year=$('#year');if(year)year.textContent=new Date().getFullYear();

const socialUrls={Instagram:'https://www.instagram.com/kayi.haustechnik/',TikTok:'https://www.tiktok.com/@kayi.haustechnik'};
$$('.js-social-placeholder').forEach(button=>{
  const url=socialUrls[button.dataset.network];if(!url)return;
  const link=document.createElement('a');
  link.href=url;link.target='_blank';link.rel='noopener noreferrer';
  link.className=button.className.replace(/\bjs-social-placeholder\b/g,'').trim();
  link.innerHTML=button.innerHTML;link.setAttribute('aria-label',`${button.dataset.network} öffnen`);
  button.replaceWith(link);
});

const dialog=$('#assistant-dialog');
const assistantBody=$('#assistant-body');
const progress=$('#assistant-progress');
const backButton=$('#assistant-back');
const closeButton=$('.assistant-close');
const state={step:0,service:'',timing:'',property:'',postcode:'',details:'',name:'',phone:'',email:'',startedAt:Date.now()};
const steps=[
  {kicker:'Schritt 1 von 5',title:'Worum geht es bei Ihrem Projekt?',description:'Wählen Sie den Bereich, der am besten passt.',key:'service',options:[['Komplette Badsanierung','Bad vollständig erneuern'],['Heizung & Warmwasser','Installation, Austausch oder Reparatur'],['Sanitärinstallation','Leitungen, Armaturen oder Sanitärobjekte'],['Fliesen & Innenausbau','Oberflächen und Ausbauarbeiten'],['Störung / Reparatur','Etwas funktioniert aktuell nicht'],['Sonstiges','Projekt kurz selbst beschreiben']]},
  {kicker:'Schritt 2 von 5',title:'Wann soll es losgehen?',description:'Eine grobe Einordnung reicht völlig aus.',key:'timing',options:[['So schnell wie möglich','Dringend oder kurzfristig'],['In den nächsten 4 Wochen','Zeitnah planbar'],['In 1–3 Monaten','Mit Vorlauf'],['Später / noch offen','Zunächst Beratung gewünscht']]},
  {kicker:'Schritt 3 von 5',title:'Wo findet das Projekt statt?',description:'Damit KAYI die Anfrage räumlich einordnen kann.',key:'location',fields:true},
  {kicker:'Schritt 4 von 5',title:'Wie können wir Sie erreichen?',description:'Beschreiben Sie das Vorhaben kurz und geben Sie mindestens eine Kontaktmöglichkeit an.',key:'details',contact:true},
  {kicker:'Projektcheck abgeschlossen',title:'Ihre Anfrage ist bereit.',description:'Mit einem Klick wird die Anfrage direkt per E-Mail an KAYI gesendet und anschließend für WhatsApp Business vorbereitet.',key:'summary',summary:true}
];

function escapeHtml(value=''){return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
function resetState(prefill=''){Object.assign(state,{step:prefill?1:0,service:prefill,timing:'',property:'',postcode:'',details:'',name:'',phone:'',email:'',startedAt:Date.now()})}
function openAssistant(prefill=''){resetState(prefill);renderStep();if(typeof dialog?.showModal==='function')dialog.showModal();else dialog?.setAttribute('open','');document.body.classList.add('dialog-open')}
function closeAssistant(){if(dialog?.open&&typeof dialog.close==='function')dialog.close();else dialog?.removeAttribute('open');document.body.classList.remove('dialog-open')}
function selectOption(key,value){state[key]=value;state.step+=1;renderStep()}
function buildLeadMessage(){return ['Hallo KAYI Haustechnik,','','ich habe den digitalen Projektcheck auf Ihrer Website ausgefüllt:',`• Projekt: ${state.service||'Nicht angegeben'}`,`• Gewünschter Zeitraum: ${state.timing||'Nicht angegeben'}`,`• Objekt: ${state.property||'Nicht angegeben'}`,`• PLZ / Ort: ${state.postcode||'Nicht angegeben'}`,`• Beschreibung: ${state.details||'Keine weiteren Angaben'}`,`• Name: ${state.name||'Nicht angegeben'}`,state.phone?`• Telefon: ${state.phone}`:'',state.email?`• E-Mail: ${state.email}`:'','','Bitte melden Sie sich für die weitere Abstimmung. Vielen Dank!'].filter(Boolean).join('\n')}
function whatsappUrl(){return `https://wa.me/4915224040411?text=${encodeURIComponent(buildLeadMessage())}`}
function showFormError(message){let error=$('.assistant-form-error',assistantBody);if(!error){error=document.createElement('p');error.className='assistant-form-error';assistantBody.appendChild(error)}error.textContent=message;error.scrollIntoView({behavior:'smooth',block:'nearest'})}

async function submitLead(button){
  const whatsappWindow=window.open('about:blank','_blank');
  if(whatsappWindow){whatsappWindow.document.write('<title>KAYI WhatsApp</title><p style="font-family:system-ui;padding:24px">Ihre Anfrage wird sicher übermittelt …</p>')}
  button.disabled=true;button.dataset.original=button.innerHTML;button.textContent='Anfrage wird gesendet …';
  try{
    const response=await fetch('/lead.php',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},credentials:'same-origin',body:JSON.stringify({...state,website:'',page:location.href})});
    const result=await response.json().catch(()=>({success:false,message:'Ungültige Serverantwort.'}));
    if(!response.ok||!result.success)throw new Error(result.message||'Die E-Mail konnte nicht versendet werden.');
    assistantBody.innerHTML=`<span class="assistant-kicker">ANFRAGE ÜBERMITTELT</span><h3>Vielen Dank, ${escapeHtml(state.name)}.</h3><p>Ihre Projektdaten wurden erfolgreich an <strong>info@kayi-haustechnik.de</strong> gesendet. WhatsApp Business wird jetzt mit derselben Anfrage geöffnet.</p><div class="assistant-success-box"><strong>E-Mail erfolgreich versendet</strong><small>KAYI kann Ihre Anfrage nun bearbeiten.</small></div><a class="button button-primary" href="${whatsappUrl()}" target="_blank" rel="noopener noreferrer">WhatsApp erneut öffnen <span>↗</span></a>`;
    progress.style.width='100%';backButton.classList.remove('visible');
    if(whatsappWindow)whatsappWindow.location.href=whatsappUrl();else window.location.href=whatsappUrl();
  }catch(error){
    if(whatsappWindow)whatsappWindow.close();
    button.disabled=false;button.innerHTML=button.dataset.original||'Anfrage senden & WhatsApp öffnen';
    showFormError(`${error.message} Bitte versuchen Sie es erneut oder senden Sie die Anfrage direkt per WhatsApp.`);
  }
}

function renderStep(){
  if(!assistantBody||!progress||!backButton)return;
  const step=steps[state.step];progress.style.width=`${((state.step+1)/steps.length)*100}%`;backButton.classList.toggle('visible',state.step>0);
  let content=`<span class="assistant-kicker">${step.kicker}</span><h3>${step.title}</h3><p>${step.description}</p>`;
  if(step.options)content+=`<div class="assistant-options">${step.options.map(([title,description])=>`<button class="assistant-option" type="button" data-key="${step.key}" data-value="${escapeHtml(title)}"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)}</small></button>`).join('')}</div>`;
  if(step.fields)content+=`<div class="assistant-field"><label for="property">Objektart</label><input id="property" value="${escapeHtml(state.property)}" placeholder="z. B. Wohnung, Einfamilienhaus, Gewerbe" maxlength="120"></div><div class="assistant-field"><label for="postcode">PLZ / Ort</label><input id="postcode" value="${escapeHtml(state.postcode)}" placeholder="z. B. 61381 Friedrichsdorf" maxlength="120"></div><button class="button button-primary assistant-next" type="button">Weiter</button>`;
  if(step.contact)content+=`<div class="assistant-field"><label for="details">Kurze Projektbeschreibung</label><textarea id="details" placeholder="Was ist vorhanden, was soll geändert werden, gibt es Besonderheiten?" maxlength="2000">${escapeHtml(state.details)}</textarea></div><div class="assistant-contact-grid"><div class="assistant-field"><label for="name">Name *</label><input id="name" value="${escapeHtml(state.name)}" autocomplete="name" maxlength="120"></div><div class="assistant-field"><label for="phone">Telefon / Mobil</label><input id="phone" value="${escapeHtml(state.phone)}" autocomplete="tel" inputmode="tel" maxlength="60" placeholder="z. B. +49 170 …"></div></div><div class="assistant-field"><label for="email">E-Mail</label><input id="email" type="email" value="${escapeHtml(state.email)}" autocomplete="email" maxlength="180" placeholder="name@beispiel.de"></div><label class="assistant-consent"><input id="privacy" type="checkbox"> <span>Ich habe die <a href="/datenschutz.html" target="_blank">Datenschutzerklärung</a> gelesen und bin mit der Verarbeitung meiner Anfrage einverstanden.</span></label><button class="button button-primary assistant-next" type="button">Zusammenfassung erstellen</button>`;
  if(step.summary)content+=`<div class="assistant-summary"><div><span>Projekt</span><strong>${escapeHtml(state.service||'Nicht angegeben')}</strong></div><div><span>Zeitraum</span><strong>${escapeHtml(state.timing||'Nicht angegeben')}</strong></div><div><span>Objekt</span><strong>${escapeHtml(state.property||'Nicht angegeben')}</strong></div><div><span>Ort</span><strong>${escapeHtml(state.postcode||'Nicht angegeben')}</strong></div><div><span>Kontakt</span><strong>${escapeHtml([state.phone,state.email].filter(Boolean).join(' · '))}</strong></div></div><button class="button button-primary assistant-submit" type="button">Anfrage senden & WhatsApp öffnen <span>↗</span></button><p class="assistant-contact-note">Die Anfrage wird automatisch an info@kayi-haustechnik.de gesendet. Anschließend öffnet sich WhatsApp Business für Ihre Bestätigung.</p>`;
  assistantBody.innerHTML=content;
  $$('.assistant-option',assistantBody).forEach(option=>option.addEventListener('click',()=>selectOption(option.dataset.key,option.dataset.value)));
  $('.assistant-next',assistantBody)?.addEventListener('click',()=>{
    if(step.fields){state.property=$('#property',assistantBody).value.trim();state.postcode=$('#postcode',assistantBody).value.trim();if(!state.property||!state.postcode){showFormError('Bitte geben Sie Objektart sowie PLZ / Ort an.');return}}
    if(step.contact){state.details=$('#details',assistantBody).value.trim();state.name=$('#name',assistantBody).value.trim();state.phone=$('#phone',assistantBody).value.trim();state.email=$('#email',assistantBody).value.trim();const consent=$('#privacy',assistantBody).checked;if(!state.details||!state.name){showFormError('Bitte geben Sie Ihren Namen und eine kurze Projektbeschreibung an.');return}if(!state.phone&&!state.email){showFormError('Bitte geben Sie mindestens eine Telefonnummer oder E-Mail-Adresse an.');return}if(state.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)){showFormError('Bitte prüfen Sie die E-Mail-Adresse.');return}if(!consent){showFormError('Bitte bestätigen Sie die Datenschutzerklärung.');return}}
    state.step+=1;renderStep();
  });
  $('.assistant-submit',assistantBody)?.addEventListener('click',event=>submitLead(event.currentTarget));
}

$$('.js-open-assistant').forEach(button=>button.addEventListener('click',()=>openAssistant()));
$$('.js-service-assistant').forEach(button=>button.addEventListener('click',()=>openAssistant(button.dataset.service||'')));
closeButton?.addEventListener('click',closeAssistant);
backButton?.addEventListener('click',()=>{if(state.step<=0)return;state.step-=1;renderStep()});
dialog?.addEventListener('click',event=>{if(event.target===dialog)closeAssistant()});
dialog?.addEventListener('close',()=>document.body.classList.remove('dialog-open'));
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.body.classList.remove('dialog-open')});
