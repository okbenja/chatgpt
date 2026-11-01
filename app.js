/* Vínculos · interfaz local, sin dependencias ni servicios externos. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons = {
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    moon:'<path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z"/>',
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/>',
    map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16"/>',
    users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3"/>',
    heart:'<path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 6l-1-1.2a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/>',
    sparkles:'<path d="m12 3 2.8 6.2L21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8Zm8-2v4m-2-2h4"/>',
    book:'<path d="M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Zm0 0v16"/>',
    leaf:'<path d="M20 3C5 1 1 10 7 17S23 15 20 3ZM4 21 16 9"/>',
    wand:'<path d="m4 20 12-12 4 4L8 24M14 10l4 4M5 2v4M3 4h4m13-3v4m-2-2h4M3 12v4m-2-2h4"/>',
    settings:'<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
    chevron:'<path d="m9 5 7 7-7 7"/>', arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    wallet:'<path d="M20 8H5a2 2 0 0 1 0-4h13v4m2 0v12H5a2 2 0 0 1-2-2V6m13 6h6v5h-6Z"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01"/>',
    flag:'<path d="M4 22V3m0 0c5-4 10 4 16 0v11c-6 4-11-4-16 0"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>', check:'<path d="m5 12 4 4L19 6"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    coffee:'<path d="M4 8h13v7a6.5 6.5 0 0 1-13 0Zm13 1h2a3 3 0 0 1 0 6h-2M7 2v3m5-3v3M2 22h19"/>',
    briefcase:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12c6 4 12 4 18 0m-9 0v5"/>',
    graduation:'<path d="m2 8 10-5 10 5-10 5Zm4 3v6c4 3 8 3 12 0v-6m4-3v9"/>',
    chat:'<path d="M21 11a9 9 0 0 1-9 9 10 10 0 0 1-4-.8L3 21l1.8-5A9 9 0 1 1 21 11Z"/><path d="M8 11h8m-8 4h5"/>',
    energy:'<path d="m13 2-9 12h7l-1 8 10-12h-7Z"/>',
    smile:'<circle cx="12" cy="12" r="9"/><path d="M8 14c2 3 6 3 8 0M8 8h.01M16 8h.01"/>',
    shield:'<path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6Z"/><path d="m8 12 3 3 5-6"/>',
    gift:'<path d="M3 10h18v4H3Zm2 4v8h14v-8M12 10v12m0-12C1 11 5-1 12 10Zm0 0C23 11 19-1 12 10Z"/>',
    edit:'<path d="m16 3 5 5-12 12-6 1 1-6Zm-2 2 5 5"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M3 16v5h18v-5"/>',
    upload:'<path d="M12 16V4m-5 5 5-5 5 5M3 16v5h18v-5"/>',
    search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    tree:'<path d="m12 2-7 9h4l-6 7h18l-6-7h4Zm0 16v4"/>',
    star:'<path d="m12 2 3 6.5 7 1-5 5 1 7-6-3.5L6 22l1-7-5-5 7-1Z"/>',
    music:'<path d="M9 18V5l12-2v13M9 8l12-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="18" cy="16" rx="3" ry="2"/>',
    palette:'<path d="M12 3a9 9 0 1 0 0 18c4 0 1-5 4-5h2c5 0 4-13-6-13Z"/><path d="M7 9h.01M11 6h.01M16 8h.01M6 14h.01"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-11h.01"/>'
  };
  const icon = (name, className = '') => `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.sparkles}</svg>`;
  const hydrateIcons = () => $$('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  const money = amount => new Intl.NumberFormat('es-ES', {style:'currency', currency:'EUR', maximumFractionDigits:0}).format(amount);
  const pathNames = {school:'Último curso de colegio',university:'Vida universitaria',work:'Vida laboral',free:'A mi propio ritmo'};
  const pathDescriptions = {school:'Termina el bachillerato, estudia y descubre lo que viene después.',university:'Aprende, conoce a tus compañeros y construye tu futuro.',work:'Gana experiencia, cuida a tu equipo y consigue tus propios ingresos.',free:'Explora la ciudad y decide más adelante tu próximo paso.'};
  const statsMeta = {energy:{name:'Energía',icon:'energy',color:'#d3a258'},mood:{name:'Ánimo',icon:'smile',color:'#84a582'},health:{name:'Salud',icon:'heart',color:'#ca8d87'},social:{name:'Vida social',icon:'users',color:'#a29ac4'},knowledge:{name:'Conocimiento',icon:'book',color:'#7298a7'},charm:{name:'Carisma',icon:'sparkles',color:'#c79b71'},responsibility:{name:'Responsabilidad',icon:'shield',color:'#83a896'},stress:{name:'Estrés',icon:'leaf',color:'#b4a3c4'}};
  const defaultProfile = {name:'Alex',lastName:'Rivera',age:19,pronouns:'elle',gender:'nonbinary',skin:'#dba57b',hair:'#3d302b',hairStyle:'curly',outfit:'#678d7a',traitIds:['empatico','creativo'],path:'university'};
  const game = new window.LifeGame();
  const hadSave = game.load();
  if (!hadSave) game.create({...defaultProfile, traitIds:window.VINCULOS_DATA.traits.slice(0,2).map(t=>t.id)});
  const data = window.VINCULOS_DATA;
  const routes = {today:'hoy',map:'explorar',people:'relaciones',family:'familia',character:'personaje',journal:'diario'};
  const viewFromHash = () => Object.keys(routes).find(key => '#/' + routes[key] === location.hash) || 'today';
  let view = viewFromHash();
  let returnFocus = null;
  let returnFocusSelector = null;
  let peopleFilter = 'all';
  let exploreFilter = 'all';
  let pendingNightIntent = null;
  let pendingWaitPlace = null;
  let searchTerm = '';
  let activeNPC = null;
  let lastDialogue = null;
  let creatorDraft = null;
  let pendingImport = null;
  let pendingInfidelity = null;
  let journalPerson = '';
  let journalTag = '';
  let journalYear = null;
  let eventResult = null;
  let audioContext=null,ambienceGain=null,ambienceNodes=[];
  const dialog = $('#game-dialog');
  const main = $('#main-content');

  function portrait(person, size = 100) {
    const skin = escape(person.skin || '#dba57b'), hair = escape(person.hair || '#3d302b'), outfit = escape(person.outfit || person.color || '#779287');
    const bg = escape(person.color || '#e2e9de');
    const style = person.hairStyle || 'short';
    const long = style === 'long' || style === 'bob';
    const back = long ? `<path d="M24 44Q19 10 50 10q33 0 27 40l3 31H20Z" fill="${hair}"/>` : '';
    const fringe = style === 'curly' ? `<path d="M27 43c-12-7-8-20 2-20-3-12 13-17 20-10 10-10 24-3 22 6 12-1 17 15 4 23l-7-13q-16 10-32 0Z" fill="${hair}"/>` : long ? `<path d="M26 46Q19 9 51 12q31 0 24 37l-9-22c-5 8-17 12-33 12l-4 15Z" fill="${hair}"/>` : `<path d="M27 45Q16 17 42 14q30-11 35 18l-5 16-7-16q-16 6-30 0Z" fill="${hair}"/>`;
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Retrato de ${escape(person.name)}"><defs><clipPath id="portrait-clip-${escape(person.id || 'player')}"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#portrait-clip-${escape(person.id || 'player')})"><rect width="100" height="100" fill="${bg}"/><circle cx="76" cy="20" r="29" fill="white" opacity=".12"/>${back}<path d="M10 105c0-27 14-37 40-37s40 10 40 37" fill="${outfit}"/><path d="m40 66 10 16 11-16" fill="white" opacity=".65"/><path d="M42 57h16v15c0 10-16 10-16 0Z" fill="${skin}"/><path d="M42 60q8 7 16 0v7q-8 7-16-1" fill="#000" opacity=".08"/><ellipse cx="50" cy="43" rx="23" ry="27" fill="${skin}"/><ellipse cx="27" cy="47" rx="4" ry="6" fill="${skin}"/><ellipse cx="73" cy="47" rx="4" ry="6" fill="${skin}"/>${fringe}<path d="m36 43 7-1m14 0 7 1" stroke="${hair}" stroke-width="2.3" stroke-linecap="round"/><circle cx="40" cy="47" r="1.5" fill="#37312d"/><circle cx="60" cy="47" r="1.5" fill="#37312d"/><path d="m50 48-2 6h4" stroke="#8a5946" stroke-width="1.1" fill="none"/><path d="M44 60q6 5 12 0" stroke="#875043" stroke-width="1.7" stroke-linecap="round" fill="none"/><ellipse cx="35" cy="55" rx="4" ry="2" fill="#d98378" opacity=".3"/><ellipse cx="65" cy="55" rx="4" ry="2" fill="#d98378" opacity=".3"/></g></svg>`;
  }

  function cityScene(loc) {
    const dark=loc.category==='noche' || game.state.hour>=19;
    const sky=dark?'#292b47':'#d5e3e5',ground=dark?'#3f4058':'#b6c6b3';
    const windows=[42,84,120,249,289,330].map((x,i)=>`<path d="M${x} ${105+i%3*14}h30v132h-30Z" fill="${dark?'#33364d':'#91aaa2'}"/>${[0,1,2,3].map(j=>`<rect x="${x+8}" y="${118+i%3*14+j*21}" width="7" height="9" fill="${dark?'#b9a4c0':'#d7e4cb'}" opacity=".65"/>`).join('')}`).join('');
    const sign=(text,fill='#d6b1bd')=>`<rect x="111" y="115" width="158" height="28" rx="4" fill="#454257"/><text x="190" y="134" text-anchor="middle" font-size="15" font-family="Georgia,serif" letter-spacing="3" fill="${fill}">${text}</text>`;
    let place='';
    if(loc.id==='discoteca')place=`<path d="M92 108h196v148H92Z" fill="#52516c"/><path d="M85 105h210v10H85Z" fill="#9d819e"/>${sign('ECLIPSE')}<path d="M123 161h134v95H123Z" fill="#303046"/><path d="m153 163 30 93m42-93-30 93" stroke="#b088a9" stroke-width="3" opacity=".5"/><circle cx="190" cy="178" r="16" fill="#a5a6c5"/><path d="M175 178h30m-15-15v30m-12-23 24 16m-24 0 24-16" stroke="#e6dfeb" stroke-width="1"/><path d="M190 143v18" stroke="#b2afc8"/><path d="M91 255h196" stroke="#ca9b97" stroke-width="5"/>`;
    if(loc.id==='bar')place=`<rect x="88" y="112" width="204" height="146" rx="5" fill="#8c6d6d"/>${sign('ÁMBAR','#ead1a2')}<rect x="106" y="160" width="86" height="70" rx="3" fill="#e6bf84"/><path d="M149 160v70m-43-35h86" stroke="#876b68" stroke-width="5"/><rect x="215" y="159" width="56" height="99" fill="#353d4d"/><path d="M225 175h36v40h-36Z" fill="#ad8c7a"/><path d="M87 243h120m-106 0v26m86-26v26" stroke="#b6a18d" stroke-width="5"/>`;
    if(loc.id==='azotea')place=`<path d="M35 248h310v42H35Z" fill="#77768b"/><path d="M44 237h292m-280 0v-37m56 37v-37m56 37v-37m56 37v-37m56 37v-37m48 37v-37M44 200h292" stroke="#b5a6b4" stroke-width="3"/><path d="M65 146q122 31 249 0" fill="none" stroke="#a495a6" stroke-width="2"/>${[77,115,153,191,229,267,305].map((x,i)=>`<circle cx="${x}" cy="${150+Math.sin(i/6*Math.PI)*19}" r="4" fill="#f0d5a5"/>`).join('')}<ellipse cx="190" cy="224" rx="37" ry="8" fill="#bea2a6"/><path d="M190 232v26m-48-16v20m96-20v20" stroke="#bdabb8" stroke-width="4"/>`;
    if(loc.id==='playa')place=`<path d="M0 163q84-13 190 0t190 0v127H0Z" fill="${dark?'#536b7b':'#8fbdc0'}"/><path d="M0 244q115-38 245-9t135 5v50H0Z" fill="#decba6"/><path d="M40 198h90m80-10h100m-166 31h67" stroke="#c9e0d7" opacity=".65" stroke-width="2"/><path d="M290 141v112" stroke="#7a8066" stroke-width="7"/><path d="M290 145q-30-42-60-12 33-5 60 16m0-6q20-43 49-17-34 3-47 26" fill="#738c77"/><path d="M99 229v36m-38-32 38-32 42 32Z" fill="#ae8780"/><path d="M61 233h80" stroke="#f2dfc0" stroke-width="3"/>`;
    if(loc.id==='centrocultural')place=`<rect x="74" y="107" width="233" height="150" rx="4" fill="#b29589"/><path d="M67 105h247v13H67Z" fill="#856f71"/><text x="190" y="141" text-anchor="middle" fill="#f6e7cd" font-family="Georgia,serif" font-size="14" letter-spacing="2">LA FÁBRICA</text><path d="M96 257v-71a25 25 0 0 1 50 0v71m20 0v-71a25 25 0 0 1 50 0v71m20 0v-71a25 25 0 0 1 50 0v71" fill="#718f8b"/><rect x="110" y="182" width="23" height="42" fill="#dec495"/><path d="m113 218 10-26 7 26" fill="#b48997"/><path d="M185 186h15v71h-15" fill="#3b655f"/>`;
    if(loc.id==='restaurante')place=`<rect x="86" y="117" width="214" height="140" rx="3" fill="#d5b3a0"/>${sign('LA MESA','#ead4b3')}<path d="M81 151h224l-12-16H93Z" fill="#796e7d"/><rect x="104" y="168" width="82" height="68" fill="#f0d6a5"/><rect x="211" y="168" width="71" height="89" fill="#8f8b8d"/><path d="M245 168v89" stroke="#cbb8a7" stroke-width="3"/><ellipse cx="147" cy="215" rx="26" ry="6" fill="#bd8f8a"/><path d="M147 220v26m-33-24v24m65-24v24" stroke="#877c80" stroke-width="3"/><path d="M128 211v-12m33 12v-12" stroke="#f9e8c9" stroke-width="2"/>`;
    return `<svg viewBox="0 0 380 290" role="img" aria-label="Ilustración de ${escape(loc.name)}"><rect width="380" height="290" fill="${sky}"/><circle cx="298" cy="54" r="23" fill="${dark?'#e6dac4':'#eee1b6'}"/>${dark?'<circle cx="308" cy="46" r="21" fill="'+sky+'"/>':''}${dark?[42,90,156,221,353].map((x,i)=>`<circle cx="${x}" cy="${35+i%3*17}" r="1.6" fill="#e5dfda"/>`).join(''):''}${windows}<path d="M0 247h380v43H0Z" fill="${ground}"/>${place}<path d="M0 276h380" stroke="${dark?'#8b7d98':'#9eafa2'}" stroke-width="2"/><path d="M32 197v74m-8-73h16l-2-16H26Z" stroke="${dark?'#9c8ba8':'#6d8a7a'}" stroke-width="3" fill="#ebd3a1"/></svg>`;
  }

  function scene(location) {
    if(['discoteca','bar','azotea','playa','centrocultural','restaurante'].includes(location.id))return cityScene(location);
    const night = game.state.hour >= 19;
    const sky = night ? '#b9bdcf' : '#dce6d7';
    const variant = location.scene || location.id;
    const house = `<path d="M98 139h178v115H98Z" fill="#e7d9bf"/><path d="M87 143 185 72l104 71Z" fill="#bd7e63"/><path d="m111 130 74-54 81 54" fill="none" stroke="#a36c56" stroke-width="5"/><path d="M168 194h34v60h-34Z" fill="#537267"/><circle cx="195" cy="224" r="2" fill="#e9ce8e"/><path d="M117 167h34v38h-34Zm100 0h34v38h-34Z" fill="#f8edce"/><path d="M134 167v38m100-38v38m-117-20h34m66 0h34" stroke="#bca888" stroke-width="3"/><path d="M252 105V76h15v40" fill="#ae715c"/><rect x="109" y="213" width="39" height="9" rx="3" fill="#c08d77"/><path d="M114 213v-11m9 11v-14m10 14v-10m9 10v-12" stroke="#6d8c66" stroke-width="5"/>`;
    const cafe = `<rect x="77" y="122" width="217" height="133" rx="3" fill="#e9d6bf"/><rect x="96" y="161" width="75" height="66" fill="#647e75"/><path d="M133 161v66" stroke="#d9c4a9" stroke-width="4"/><rect x="194" y="160" width="70" height="95" fill="#759083"/><rect x="202" y="169" width="54" height="43" fill="#cddac8"/><path d="M68 145h235l-16-32H84Z" fill="#b87964"/><path d="m92 113-9 32m43-32-5 32m43-32v32m34-32 5 32m34-32 9 32m25-32 12 32" stroke="#f1dbc2" stroke-width="16"/><rect x="128" y="81" width="120" height="25" rx="3" fill="#527060"/><text x="188" y="98" text-anchor="middle" fill="#f5ecd6" font-family="Georgia" font-size="13" letter-spacing="2">CAFÉ AURORA</text><path d="M104 244h56m-47 0-7 22m44-22 7 22m-29-22v22m79-35h49m-7 0v35m-35-35v35" stroke="#7c6d53" stroke-width="4"/>`;
    const campus = `<rect x="66" y="136" width="240" height="116" fill="#d8d5bf"/><rect x="143" y="101" width="87" height="151" fill="#e9dfcb"/><path d="m131 105 56-37 56 37Z" fill="#668675"/><path d="M173 195h28v57h-28Z" fill="#627b71"/><circle cx="187" cy="134" r="16" fill="#f5edd7"/><path d="M187 123v12l7 4" stroke="#73846f" stroke-width="2"/><g fill="#8da99b">${[83,110,249,277].map(x=>`<rect x="${x}" y="155" width="15" height="27"/><rect x="${x}" y="201" width="15" height="27"/>`).join('')}</g><path d="M148 253h78m-83 6h88" stroke="#bbc2a8" stroke-width="6"/>`;
    const office = `<rect x="94" y="78" width="172" height="178" rx="4" fill="#d3d6c8"/><path d="M90 78h180v18H90Z" fill="#5e8073"/><g fill="#7e9e93">${[109,148,187,226].map(x=>[111,153,195].map(y=>`<rect x="${x}" y="${y}" width="24" height="28" rx="1"/>`).join('')).join('')}</g><rect x="166" y="223" width="31" height="33" fill="#4c7164"/><rect x="107" y="59" width="146" height="17" rx="3" fill="#e8e3cd"/><text x="180" y="71" text-anchor="middle" fill="#4d6e5c" font-size="9" font-family="sans-serif" letter-spacing="2">ESTUDIO NEXO</text>`;
    const park = `<path d="M215 263q-110-37-22-96" stroke="#dfcdb0" stroke-width="24" fill="none"/><ellipse cx="194" cy="218" rx="42" ry="14" fill="#a3bdac"/><path d="M194 211v-34m-20 8h40" stroke="#a8b6a1" stroke-width="8"/><ellipse cx="194" cy="173" rx="27" ry="8" fill="#d4dfd0"/><path d="M100 226h67m-61 0v25m54-25v25m-61-37h69m-69 5h69" stroke="#936d4e" stroke-width="5"/><path d="M275 153v100m-8-99h16l-3-19h-10Z" stroke="#5c7666" stroke-width="3" fill="#f3e5b5"/>`;
    const building = variant === 'casa' ? house : variant === 'cafeteria' ? cafe : variant === 'plaza' ? park : variant === 'trabajo' ? office : campus;
    return `<svg viewBox="0 0 380 290" role="img" aria-label="Ilustración de ${escape(location.name)}"><rect width="380" height="290" fill="${sky}"/><circle cx="296" cy="61" r="29" fill="${night ? '#f5eedc' : '#eee3b7'}"/><path d="M0 167Q89 89 187 151T380 134v156H0" fill="#a8bca0"/><path d="M0 209q93-66 186-3t194-19v103H0" fill="#8ea68b"/><path d="M0 255q166-24 380-4v39H0" fill="#c1cda9"/>${building}<path d="M40 148v116m-13-60 13 15 15-28" stroke="#6b7e5c" stroke-width="5"/><path d="M7 185c-15-35 8-69 29-74 21-6 42 21 42 49 0 36-49 50-71 25Z" fill="#779674"/><path d="M332 171v94" stroke="#718460" stroke-width="5"/><path d="M303 200c-16-33 3-63 25-72 19-8 48 19 47 46-1 34-46 51-72 26Z" fill="#6f8c6a"/><path d="M0 277q90-18 180-9t200-3v25H0Z" fill="#b0c09a"/><g fill="#e9dfb1"><circle cx="52" cy="264" r="3"/><circle cx="61" cy="270" r="2"/><circle cx="309" cy="267" r="3"/><circle cx="321" cy="272" r="2"/></g><path d="m258 39 6-4 6 4m-29 11 5-3 5 3" stroke="#80917b" stroke-width="1.5" fill="none"/></svg>`;
  }

  function toast(message, error = false) {
    const el = document.createElement('div');
    el.className = `toast ${error ? 'error' : 'success'}`;
    el.innerHTML = `<span class="toast-icon">${icon(error ? 'info' : 'check')}</span><span class="toast-text">${escape(message)}</span>`;
    // Native dialogs are in the top layer; keep feedback visible inside them.
    const host = dialog.open ? $('#dialog-content') : $('#toast-container');
    if (dialog.open) el.classList.add('dialog-toast');
    host.append(el);
    setTimeout(() => el.remove(), 5200);
  }

  function run(result, options = {}) {
    if (!result) return;
    if (result.message && !options.silent) toast(result.message, !result.ok);
    render();
    if(result.ok && game.shouldEndDay?.())showDaySummary(true);
    else if(game.getPendingEvent?.()?.mandatory)showEvent();
    return result;
  }

  function hydrateMeters(root = document) {
    $$('.stat-track,.mini-progress',root).forEach(track=>{
      const fill=track.firstElementChild;
      const value=Math.max(0,Math.min(100,parseFloat(fill?.style.width)||0));
      const label=track.previousElementSibling?.textContent.replace(/\d+(?:\/100|%)?/g,'').trim() || 'Progreso';
      track.setAttribute('role','meter');track.setAttribute('aria-label',label);
      track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.setAttribute('aria-valuenow',String(value));
    });
  }
  function confirmCheats() {
    openDialog(`<div class="dialog-body"><div class="dialog-eyebrow">MODO LIBRE</div><h2 class="dialog-title">¿Activar los trucos?</h2><p class="confirm-copy">Esta partida quedará marcada de forma permanente y dejará de desbloquear logros, incluso si desactivas los trucos después. Puedes exportar una copia antes de continuar.</p><div class="dialog-footer"><button class="button secondary" data-open="cheats">Seguir sin trucos</button><button class="button primary" id="confirm-cheats">Activar y marcar esta partida</button></div></div>`);
  }

  const tagNames={legacy:'Legado',world:'Noticias',estabilidad:'Estabilidad',creatividad:'Creatividad',comunidad:'Comunidad',familia:'Familia',aventura:'Aventura',conocimiento:'Conocimiento',juventud:'Juventud',adultez:'Vida adulta',madurez:'Madurez',vejez:'Vejez',nightlife:'Vida nocturna',casual:'Encuentros casuales',offerDrink:'Invitar a una bebida',danceTogether:'Baile compartido',talkExpectations:'Expectativas',casualFlirt:'Ligue',oneNight:'Ligue de una noche',sayGoodbye:'Despedidas',exchangeContact:'Intercambio de contacto',declineCasual:'Límites claros',shareMemory:'Recuerdos compartidos',askAdvice:'Consejos',cookTogether:'Cocinar juntos',walkTogether:'Paseos',playTogether:'Juegos',shareHobby:'Aficiones',support:'Apoyo',debate:'Debates',studyTogether:'Estudiar en compañía',collaborate:'Colaboración',resolveConflict:'Reparar conflictos',planFuture:'Planes de futuro',chat:'Conversaciones',listen:'Escucha',joke:'Humor',help:'Ayuda',gift:'Detalles',disagree:'Desacuerdos',flirt:'Coqueteo',askDate:'Invitaciones',date:'Citas',relationship:'Pareja',boundary:'Límites',apologize:'Disculpas',breakup:'Ruptura',work:'Trabajo',study:'Estudios',money:'Dinero',health:'Salud',leisure:'Ocio',friendship:'Amistad',romance:'Pareja',family:'Familia',community:'Comunidad',social:'Conversaciones',day:'Resumen del día',milestone:'Recuerdos',life:'Vida cotidiana',event:'Eventos',travel:'Viajes',achievement:'Logros',summary:'Resumen del día'};
  function updateSaveStatus() {
    const age=Date.now()-(game.state.savedAt || Date.now());
    $('#save-status').textContent=game.corruptSave?'Guardado incompatible · abre Ajustes':!game.lastSaveSucceeded?'No se pudo guardar · exporta tu partida':age<60000?'Guardado hace un momento':`Guardado hace ${Math.max(1,Math.floor(age/60000))} min`;
  }
  function storageNotice() {
    if(game.state.flags.storageNoticeSeen)return '';
    return `<div class="notice storage-notice" id="first-save-notice">${icon('info')}<div><strong>Tu historia vive en este navegador.</strong><p>El progreso se guarda en este dispositivo. Exporta una copia en Ajustes para conservarlo o cambiar de navegador.</p></div><button class="icon-button" id="dismiss-first-save" aria-label="Entendido, cerrar aviso de guardado">${icon('close')}</button></div>`;
  }
  function calendarStrip() {
    const c=game.getCalendar?.();if(!c)return '';
    return `<div class="calendar-strip">${icon(c.season==='invierno'?'moon':'leaf')}<span><strong>${escape(c.dateLabel)}</strong> · ${escape(c.season)} · Año ${c.year}</span>${(c.special || []).map(d=>`<span class="special-date">${icon('gift')}${escape(d.title)}</span>`).join('')}</div>`;
  }
  function renderEvent() {
    const e=game.getPendingEvent?.();
    if(!e)return `<section class="event-card quiet-event"><div>${icon('book')}<strong>Un día por descubrir</strong><p>Las actividades y los encuentros pueden abrir nuevas historias. Tus decisiones dejarán huella.</p></div></section>`;
    return `<section class="event-card ${e.mandatory?'mandatory-event':''}"><div class="event-tags">${(e.tags || []).map(t=>`<span class="trait-chip">${escape(tagNames[t]||t)}</span>`).join('')}<span class="soft-badge">${e.mandatory?'IMPREVISTO':'PUEDES ELEGIR'}</span></div><h2>${escape(e.title)}</h2><p>${escape(e.text)}</p><button class="button primary" data-event-open="true">Decidir qué hacer ${icon('arrow')}</button>${!e.mandatory?'<button class="text-button" data-event-dismiss="true">Dejar pasar esta ocasión · 30 min</button>':''}</section>`;
  }
  function showEvent() {
    const e=game.getPendingEvent?.();if(!e)return;
    openDialog(`<div class="dialog-body"><div class="dialog-eyebrow">${e.mandatory?'UN IMPREVISTO DE LA VIDA':'UN MOMENTO QUE CUENTA'}</div><h2 class="dialog-title">${escape(e.title)}</h2><div class="event-tags">${(e.tags||[]).map(t=>`<span class="trait-chip">${escape(tagNames[t]||t)}</span>`).join('')}</div><p class="dialog-description">${escape(e.text)}</p><div class="event-options">${e.options.map(o=>`<button class="event-option" data-event-option="${escape(o.id)}" ${o.available===false?'disabled':''}><strong>${escape(o.text)}</strong><small>${o.available===false?escape(o.reason||'No cumples los requisitos'): `${o.duration||0.5} h${o.cost?' · '+money(o.cost):''}`}</small>${icon('arrow')}</button>`).join('')}</div>${!e.mandatory?'<div class="dialog-footer"><button class="button secondary" data-event-dismiss="true">Dejar pasar · 30 min</button></div>':!e.options.some(o=>o.available)?'<div class="notice">Ahora no tienes los recursos o el tiempo necesarios. Descansa: este imprevisto seguirá pendiente mañana.</div><button class="button primary" id="sleep-unavailable-event">Descansar y retomar mañana</button>':''}</div>`, 'event-dialog');
  }
  function chooseEventOption(id) {
    const event=game.getPendingEvent?.();if(!event)return;
    const result=game.chooseEvent(event.id,id);
    if(!result.ok)return toast(result.message,true);
    eventResult=result;render();
    if(game.shouldEndDay?.())return showDaySummary(true);
    openDialog(`<div class="dialog-body" id="event-outcome"><div class="dialog-eyebrow">TU DECISIÓN DEJA HUELLA</div><h2 class="dialog-title">${escape(result.title || event.title)}</h2><div class="event-result"><p>${escape(result.dialogue || result.text || result.message)}</p></div><p class="dialog-description">El momento queda guardado en el Diario. Algunas decisiones abren historias que continuarán en los próximos días.</p><div class="dialog-footer"><button class="button primary" data-close>Continuar mi día ${icon('arrow')}</button></div></div>`);
  }
  function showDaySummary(automatic=false, completed=null) {
    if(automatic && !completed){const result=game.sleep();if(!result.ok)return toast(result.message,true);render();completed=result.summary;}
    const summary=completed || game.getDaySummary?.();
    if(!summary)return;
    const delta=(n)=>`${n>0?'↑ +':n<0?'↓ −':'· '}${Math.abs(n)}`;
    const changes=summary.statChanges || summary.stats || {};
    openDialog(`<div class="dialog-body day-summary" id="day-summary"><div class="dialog-eyebrow">${automatic?'EL DÍA HA TERMINADO':'ANTES DE DESCANSAR'} · DÍA ${summary.day}</div><h2 class="dialog-title">Lo que te llevas de hoy.</h2><p class="dialog-description">${automatic?'El día ha quedado guardado con sus gastos y cambios finales. Ya has descansado y puedes continuar.':'Repasa tu día. Al descansar se guardará este resumen en el Diario.'}</p><div class="summary-grid">${Object.entries(changes).filter(([key])=>statsMeta[key]).map(([key,value])=>`<div class="summary-stat"><span>${statsMeta[key].name}</span><strong class="delta ${value>0?'positive':value<0?'negative':''}">${delta(value)}</strong></div>`).join('')}</div><div class="summary-economy"><span>Ingresos <strong>+${money(summary.earned || 0)}</strong></span><span>Gastos <strong>−${money(summary.spent || 0)}</strong></span></div>${summary.sustainability?`<div class="notice sustainability-notice">${escape(summary.sustainability)}</div>`:''}<h3>En qué has puesto tu tiempo</h3><ul class="summary-actions">${(summary.actions || []).length?summary.actions.map(a=>`<li>${escape(typeof a==='string'?a:a.title || a.text || a.label || 'Una actividad compartida')}</li>`).join(''):'<li>Un día de calma y espacio para ti.</li>'}</ul>${summary.relationshipChanges?.length?`<h3>Vínculos que se han movido</h3><ul class="summary-relations">${summary.relationshipChanges.map(r=>`<li>${escape(r.name || game.getNPC(r.npcId)?.name)} · afecto ${delta(r.friendship||0)} · confianza ${delta(r.trust||0)}</li>`).join('')}</ul>`:''}<div class="notice"><strong>El momento destacado</strong><p>${escape(summary.highlight || 'Las pequeñas decisiones también forman una historia.')}</p></div><div class="dialog-footer">${automatic?'<button class="button primary" data-close>Comenzar el nuevo día</button>':'<button class="button secondary" data-close>Seguir un rato</button><button class="button primary" id="confirm-sleep">Descansar y guardar el día</button>'}</div></div>`, 'summary-dialog');
  }
  function renderMessages() {
    const pending=(game.state.messages || []).filter(m=>!m.answered);
    if(!pending.length)return '';
    return `<section class="messages-panel"><div class="section-heading"><h2>Alguien ha pensado en ti</h2><span class="soft-badge">${pending.length} RESPUESTAS PENDIENTES</span></div>${pending.map(m=>`<article class="message-card"><span class="avatar">${portrait(game.getNPC(m.npcId))}</span><div><strong>${escape(game.getNPC(m.npcId)?.name)}</strong><p>${escape(m.text)}</p><div class="message-actions"><button class="button secondary small" data-message-reply="${escape(m.id)}" data-reply="warm">Responder con cariño</button><button class="text-button" data-message-reply="${escape(m.id)}" data-reply="honest">Explicar cómo estás</button><button class="text-button" data-message-reply="${escape(m.id)}" data-reply="later">Pedir un poco de tiempo</button></div></div></article>`).join('')}</section>`;
  }
  function renderFamilyState() {
    const f=game.state.family;if(!f)return '';
    return `<section class="family-status panel"><div class="section-heading"><h2>Cómo está la familia</h2></div><div class="summary-grid">${[['support','Apoyo'],['tension','Tensión']].map(([key,label])=>`<div class="stat-row"><div class="stat-label"><span>${label}</span><strong>${f[key]}/100</strong></div><div class="stat-track"><div class="stat-fill" style="width:${f[key]}%"></div></div></div>`).join('')}<div><span>Aportación al hogar</span><strong>${money(f.expenses || 0)} / día</strong></div></div>${f.children?.length?`<h3>La siguiente generación</h3>${f.children.map(c=>`<p>${escape(c.name)} · ${Math.max(0,Math.floor((game.state.day-c.bornOn)/360))} años · ${(c.traits || []).map(t=>escape(t)).join(' y ')} <button class="text-button" data-npc="${c.id}">Compartir un momento</button></p>`).join('')}`:''}<button class="text-button" id="add-child">Conversar sobre ampliar la familia ${icon('arrow')}</button></section>`;
  }
  function showChildDecision() {
    openDialog(`<div class="dialog-body"><div class="dialog-eyebrow">UN PROYECTO DE VIDA COMPARTIDO</div><h2 class="dialog-title">Ampliar la familia.</h2><p class="confirm-copy">Esta decisión representa una adopción acordada con tu pareja. Requiere una relación estable, confianza, tiempo y un colchón de 150 €. La criatura heredará rasgos del entorno familiar, crecerá con el calendario y supondrá gastos de cuidados. Podéis decidir que no es vuestro momento.</p><label class="form-field">Nombre<input id="child-name" maxlength="24" placeholder="Elige un nombre"></label><div class="dialog-footer"><button class="button secondary" data-close>No es nuestro momento</button><button class="button primary" id="confirm-child">Proponer el proyecto familiar</button></div></div>`);
  }
  function renderCareer() {
    if(game.state.direction){const j=game.getEmployment();return `<section class="career-panel panel content-section"><div class="section-heading"><h2>Desarrollo en ${escape(j.title)}</h2><span class="soft-badge">Nivel ${j.level+1} · ${money(j.salary)} / turno</span></div><p>La siguiente revisión necesita rendimiento 70, habilidad ${10+j.level*8} y experiencia ${24*(j.level+1)}. Tu rendimiento actual es ${Math.round(j.performance)}/100 y tu experiencia ${game.state.career.experience}.</p><button class="button secondary" id="request-promotion" ${j.jobId==='none'||j.status==='unemployed'||j.level>=4?'disabled':''}>Solicitar un ascenso</button></section>`;}
    const c=game.getCareer();
    return `<section class="career-panel panel content-section"><div class="section-heading"><div><div class="eyebrow">TU DESARROLLO PROFESIONAL</div><h2>${escape(c.title)}</h2></div><span class="soft-badge">${money(c.salary)} / turno</span></div><p>${c.nextTitle?'Próximo puesto: '+escape(c.nextTitle):'Has llegado a la dirección de proyectos.'}</p><p>Experiencia: ${c.experience}${c.nextTitle?' / '+c.requiredExperience:''}. Los turnos y las colaboraciones en el estudio te ayudan a crecer.</p>${c.nextTitle?`<ul><li>Conocimiento: ${game.state.stats.knowledge}/${c.requiredKnowledge}</li><li>Responsabilidad: ${game.state.stats.responsibility}/${c.requiredResponsibility}</li><li>Confianza con Alicia o Gabriel: ${Math.max(game.getRelationship('gabriel').trust,game.getRelationship('jefa').trust)}/${c.requiredTrust}</li></ul><button class="button secondary" id="request-promotion">${icon('briefcase')} Solicitar un ascenso</button>`:'<p>Tu historial de ascensos permanece en el Diario.</p>'}<p class="form-hint">La revisión se hace en Estudio Nexo con el itinerario laboral. Un ascenso mejora el salario de tus turnos.</p></section>`;
  }
  function confirmInfidelity(partnerId) {
    openDialog(`<div class="dialog-body"><div class="dialog-eyebrow">UNA DECISIÓN CON CONSECUENCIAS</div><h2 class="dialog-title">Hay un acuerdo que cuidar.</h2><p class="confirm-copy">Tienes una relación exclusiva con ${escape(game.getNPC(partnerId)?.name)}. Este acercamiento rompería vuestro acuerdo. Puedes cancelar, hablar primero con tu pareja o continuar en secreto y afrontar las consecuencias.</p><div class="dialog-footer"><button class="button secondary" data-npc="${pendingInfidelity.npcId}">Respetar el acuerdo</button><button class="button danger" id="confirm-infidelity">Continuar en secreto</button></div></div>`);
  }

  function renderAchievements() {
    const all=(game.getAchievements?.() || []).filter(a=>a.unlocked);
    return `<section class="content-section achievement-list"><div class="section-heading"><h2>Hitos de tu historia</h2></div>${game.state.flags.cheatsUsed?'<p class="notice">Esta partida está marcada con trucos. Los logros nuevos están desactivados.</p>':''}${!all.length?'<p>Los hitos irán apareciendo mientras vives tu historia.</p>':''}${all.map(a=>`<div class="achievement-item ${a.unlocked?'unlocked':''}">${icon(a.unlocked?'check':'star')}<div><strong>${escape(a.title)}</strong><p>${escape(a.description)}</p></div><span>${a.unlocked?'Conseguido':'Por descubrir'}</span></div>`).join('')}</section>`;
  }
  function renderAnnualSummary() {
    const c=game.getCalendar?.();if(!c)return '';
    const year=journalYear || c.year;
    const s=game.getAnnualSummary?.(year);
    if(!s)return '';
    return `<section class="annual-summary panel"><label class="form-field">Resumen anual<select id="journal-year">${Array.from({length:Math.min(20,c.year)},(_,i)=>c.year-i).map(y=>`<option value="${y}" ${Number(year)===y?'selected':''}>Año ${y}</option>`).join('')}</select></label><h2>Un año de pequeños cambios</h2><p>${escape(s.text || s.summary || 'Los resúmenes de tus días irán formando este recuerdo anual.')}</p></section>`;
  }
  function renderDebugger() {
    return `<section class="debug-panel settings-section"><h3>Taller de historias</h3><p>Solo en partidas con trucos. Inspecciona el selector o simula días sin cambiar tu historia.</p><label class="form-field">Evento<select id="debug-event">${(data.events||[]).map(e=>`<option value="${escape(e.id)}">${escape(e.title)}</option>`).join('')}</select></label><button class="button secondary" id="debug-force">Forzar este evento</button><label class="form-field">Días a simular<input id="debug-days" type="number" min="1" max="365" value="30"></label><button class="button secondary" id="debug-simulate">Simular y ver distribución</button><div class="debug-report" id="debug-report" role="status"></div><details><summary>Pesos actuales y elegibilidad</summary><div class="debug-table">${(Array.isArray(game.getEventWeights?.())?game.getEventWeights():[]).map(e=>`<div><span>${escape(e.title || e.id)}</span><strong>${Number(e.weight||0).toFixed(2)}</strong><small>${escape(e.reason || '')}</small></div>`).join('')}</div></details></section>`;
  }
  function runDebugForce() {
    const result=game.forceEvent?.($('#debug-event').value);if(!result)return;
    render();if(result.ok)showEvent();else toast(result.message,true);
  }
  async function runDebugSimulation() {
    const days=Math.max(1,Math.min(365,Number($('#debug-days').value)||30));
    const output=$('#debug-report');output.textContent='Simulando decisiones y días…';
    await new Promise(resolve=>setTimeout(resolve,30));
    try{const report=game.simulateDays(days,2026);output.dataset.report=JSON.stringify(report);if(report.ok===false){output.textContent=report.message;return;}output.innerHTML=`<h4>Informe de ${report.completedDays || report.days} días</h4><p>Semilla: ${report.seed}. Repeticiones dentro de una semana: ${report.repetitions?.repeatedWithinWeek || 0}. Máximo del mismo evento en una semana: ${report.repetitions?.maxPerWeek || 0}.</p><p>Ingresos: ${money(report.economy?.earned || 0)} · Gastos: ${money(report.economy?.spent || 0)} · Saldo final: ${money(report.economy?.end || 0)}.</p><h4>Distribución de historias</h4><ul>${Object.entries(report.distribution || {}).map(([id,count])=>`<li>${escape(data.events.find(e=>e.id===id)?.title || id)}: ${count}</li>`).join('')}</ul><h4>Historias no observadas en este ensayo</h4><p>${(report.neverTriggered || []).map(id=>escape(data.events.find(e=>e.id===id)?.title || id)).join(', ') || 'Todas aparecieron.'}</p><p>El ensayo usa decisiones automáticas. Las condiciones y las ramas elegidas pueden dejar historias sin observar.</p>`;}catch{output.textContent='No se pudo completar la simulación.';}
  }

  function renderAspirationChoices(selected) {
    return `<div class="aspiration-grid" role="group" aria-label="Elige una o dos aspiraciones">${data.aspirations.map(a=>`<button type="button" class="aspiration-card ${selected.includes(a.id)?'selected':''}" data-aspiration="${a.id}" aria-pressed="${selected.includes(a.id)}">${icon(a.icon)}<strong>${escape(a.label)}</strong><span>${escape(a.description)}</span></button>`).join('')}</div>`;
  }
  function renderDirection() {
    if(!game.state.direction)return '';
    const stage=data.lifeStages.find(s=>s.id===game.getLifeStage());
    return `<section class="direction-panel panel content-section"><div class="section-heading"><h2>Un rumbo que es tuyo</h2><span class="life-stage-chip">${escape(stage.label)} · ${game.getAge()} años</span></div><div class="aspiration-grid">${game.state.aspirations.map(id=>{const a=data.aspirations.find(a=>a.id===id),p=game.state.direction.progress[id];return `<div class="aspiration-card selected">${icon(a.icon)}<strong>${escape(a.label)}</strong><span>${escape(a.description)}</span><small>${p.stage}/3 tramos completados</small></div>`;}).join('')}</div><p class="form-hint">Tus Pequeños pasos y algunas oportunidades siguen estas aspiraciones. Puedes revisar el rumbo al editar tu personaje. En esta etapa el descanso nocturno recupera hasta ${100-Math.round((stage.energyFactor-1)*50)} de energía; los planes conservan los costes que se muestran.</p></section>`;
  }
  function renderTutorial() {
    const t=game.getTutorial();if(!t.enabled||t.completed)return '';
    const current=t.steps[t.step];if(!current)return '';
    const button=t.step===0?'<button class="button primary" data-open="creator">Personalizar mi personaje</button>':t.step===4?'<button class="button primary" id="tutorial-rest">Terminar el día</button>':`<button class="button primary" data-view="${current.targetView}">Dar este paso ${icon('arrow')}</button>`;
    return `<section class="tutorial-panel"><div class="eyebrow">PRIMER DÍA · ${t.step+1} DE ${t.steps.length}</div><h2>${escape(current.title)}</h2><p>${escape(current.text)}</p><div class="system-actions">${button}<button class="text-button" id="tutorial-skip">Prefiero descubrirlo a mi ritmo</button></div></section>`;
  }
  function renderWorld() {
    const w=game.getWorld();if(!w)return '';
    return `<section class="world-strip"><div class="weather-chip">${icon(w.weather.id==='despejado'?'sun':'leaf')}<strong>${escape(w.weather.label)}</strong><span>${w.weather.energyExtra?'Los desplazamientos piden '+w.weather.energyExtra+' de energía adicional.':'Un día sin cambios de ritmo por el clima.'}</span></div>${w.news.map(n=>`<article class="world-news"><strong>${escape(n.title)}</strong><p>${escape(n.text)}</p><small>Hasta el día ${n.endDay}</small></article>`).join('')}</section>`;
  }
  function renderLifeSystems() {
    const e=game.getEconomy(),job=game.getEmployment(),h=game.getHome(),pet=game.getPet();
    const wb=game.state.life.wellbeing;
    return `<section class="finance-panel panel content-section"><div class="section-heading"><h2>Un poco de margen</h2><span class="soft-badge">BALANCE SEMANAL</span></div><div class="finance-grid"><div><span>Disponible</span><strong>${money(game.state.money)}</strong></div><div><span>Ahorro</span><strong>${money(e.savings)}</strong></div><div><span>Deuda</span><strong>${money(e.debt)}</strong></div><div><span>Gastos previstos / semana</span><strong>${money(e.upcomingExpenses)}</strong></div></div><p>Última semana: ingresos ${money(e.weekly.income)}, gastos ${money(e.weekly.expenses)}, intereses ${money(e.weekly.interest)}. Crédito máximo: ${money(e.creditLimit)}, interés del 1 % semanal.</p><label class="form-field">Cantidad<input id="finance-amount" type="number" min="1" step="1" value="20"></label><div class="system-actions">${[['depositSavings','Apartar ahorro'],['withdrawSavings','Usar ahorro'],['borrowMoney','Pedir un préstamo'],['repayDebt','Devolver deuda'],['requestSupport','Solicitar apoyo'],['assistedMeal','Comida del barrio']].map(([a,t])=>`<button class="button secondary" data-life-action="${a}">${t}</button>`).join('')}</div><p class="form-hint">El apoyo y la comida comunitaria ofrecen una salida sin deuda. No hay cargos que te bloqueen permanentemente.</p></section>
    <section class="panel content-section"><div class="section-heading"><h2>Tu oficio, tu ritmo</h2></div><p>${escape(job.title)} · ${escape(job.status==='unemployed'?'Sin contrato activo':job.status==='self_employed'?'Por cuenta propia':'Contrato activo')} · Rendimiento ${Math.round(job.performance)}/100</p><p>${escape(job.schedule)} · ${money(job.salary)} por turno</p><p>Equipo: ${(job.colleagueIds||[]).map(id=>escape(game.getNPC(id)?.name||'')).join(', ')}${job.bossId?' · Responsable: '+escape(game.getNPC(job.bossId)?.name):''}</p><label class="form-field">Cambiar de oficio<select id="job-select">${data.jobs.map(j=>`<option value="${j.id}" ${job.jobId===j.id?'selected':''}>${escape(j.label)}</option>`).join('')}</select></label><div class="system-actions"><button class="button secondary" data-life-action="changeJob">Acordar el cambio · 1 h</button><button class="button primary" data-life-action="workShift">Realizar un turno</button></div></section>
    <section class="content-section"><div class="section-heading"><h2>Habilidades que se hacen practicando</h2></div><div class="skill-grid">${game.getSkills().map(k=>`<div class="skill-card"><h3>${escape(k.label)}</h3><p>${escape(k.description)}</p><div class="stat-label"><span>Práctica</span><strong>${Math.round(k.value)}/100</strong></div><div class="stat-track"><div class="stat-fill" style="width:${k.value}%"></div></div><button class="button secondary" data-life-action="practiceSkill" data-id="${k.id}">Practicar · 1 h</button>${k.value>=k.advancedAt?`<button class="text-button" data-life-action="createWork" data-id="${k.id}">${escape(k.advancedLabel)} · 2 h</button>`:''}</div>`).join('')}</div></section>
    <section class="home-panel panel content-section"><div class="section-heading"><h2>El lugar al que vuelves</h2></div><p>${escape(h.label)} · ${money(h.weeklyRent)} de alquiler semanal${h.roommateId?' · Convives con '+escape(game.getNPC(h.roommateId)?.name):''}.</p><label class="form-field">Vivienda<select id="housing-select">${data.housing.map(x=>`<option value="${x.id}" ${h.type===x.id?'selected':''}>${escape(x.label)} · traslado ${money(x.moveCost)} · ${money(x.weeklyRent)}/semana</option>`).join('')}</select></label><button class="button secondary" data-life-action="moveHome">Preparar la mudanza · 2 h</button><div class="system-grid">${data.homeUpgrades.map(u=>`<div class="system-card"><h3>${escape(u.label)}</h3><p>${money(u.cost)} · Mejora el bienestar en los próximos días.</p><button class="button secondary" data-life-action="improveHome" data-id="${u.id}" ${h.upgrades.includes(u.id)?'disabled':''}>${h.upgrades.includes(u.id)?'Forma parte de tu hogar':'Preparar mejora · 1 h'}</button></div>`).join('')}</div></section>
    <section class="pet-panel panel content-section"><h2>Compañía que también necesita cuidados</h2>${pet?`<p>${escape(pet.name)} · cuidados ${Math.round(pet.care)}/100 · vínculo ${Math.round(pet.bond)}/100</p><div class="system-actions"><button class="button secondary" data-life-action="carePet" data-id="feed">Preparar su comida · 2 €</button><button class="button secondary" data-life-action="carePet" data-id="play">Compartir un rato</button></div>`:`<p>Adoptar es opcional. Incluye tiempo, gastos semanales y compañía, también en los días que no salen como esperabas.</p><div class="form-grid"><label class="form-field">Mascota<select id="pet-kind">${data.pets.map(p=>`<option value="${p.id}">${escape(p.label)} · ${money(p.cost)} al llegar · ${money(p.weeklyCost)}/semana</option>`).join('')}</select></label><label class="form-field">Nombre<input id="pet-name" maxlength="32" placeholder="Un nombre para su historia"></label></div><button class="button secondary" data-life-action="adoptPet">Organizar la adopción · 1 h</button>`}</section>
    <section class="panel content-section"><h2>Cómo se sostiene tu bienestar</h2><p>Alimentación: ${Math.round(wb.nutrition)}/100 · Movimiento: ${Math.round(wb.movement)}/100 · Descanso: ${Math.round(wb.rest)}/100.</p><p class="form-hint">Comer, pasear y dejar tiempo para dormir ayudan de forma gradual. Si una racha pesa, puedes ajustar el ritmo y aceptar apoyo.</p></section>`;
  }
  function runLifeAction(button) {
    const type=button.dataset.lifeAction,payload={id:button.dataset.id};
    if(['depositSavings','withdrawSavings','borrowMoney','repayDebt'].includes(type))payload.amount=Number($('#finance-amount').value);
    if(type==='changeJob')payload.id=$('#job-select').value;
    if(type==='moveHome')payload.id=$('#housing-select').value;
    if(type==='adoptPet'){payload.id=$('#pet-kind').value;payload.name=$('#pet-name').value;}
    run(game.lifeAction(type,payload));
  }
  function renderLegacyPanel() {
    const l=game.getLegacy();
    return `<section class="legacy-panel panel content-section"><div class="eyebrow">UN CIERRE POSIBLE</div><h2>${escape(l.title)}</h2><p>${l.reached?escape(l.text):'Al vivir 90 días, o completar tres tramos de aspiración y 30 días, podrás reunir tu historia en un hito de legado. Después podrás seguir jugando.'}</p><button class="button secondary" id="legacy-review" ${!l.available?'disabled':''}>${l.reached?'Revisar mi legado':'Reunir mi historia'}</button></section>`;
  }
  function showLegacy() {const l=game.getLegacy();openDialog(`<div class="dialog-body legacy-panel"><div class="dialog-eyebrow">LO QUE HAS CONSTRUIDO · DÍA ${l.day}</div><h2 class="dialog-title">${escape(l.title)}</h2><p class="confirm-copy">${escape(l.text)}</p><div class="dialog-footer"><button class="button primary" data-close>Seguir jugando</button></div></div>`);}
  function renderMemories() {return `<section class="memory-timeline content-section"><div class="section-heading"><h2>Tu línea de tiempo</h2></div>${game.getMemories().length?game.getMemories().map(m=>`<article class="memory-card"><small>Día ${m.day} · ${formatHour(m.hour)}</small><h3>${escape(m.title)}</h3><p>${escape(m.text)}</p></article>`).join(''):'<p>Marca una estrella en el Diario para conservar un momento. Algunas historias también propondrán recuerdos por sí mismas.</p>'}</section>`;}
  function renderTrends() {
    let series=game.getTrends();if(!series.length){const links=Object.values(game.state.relationships);series=[{day:game.state.day,money:game.state.money,mood:game.state.stats.mood,relationships:links.length?links.reduce((sum,r)=>sum+r.friendship,0)/links.length:0}];}
    const stride=Math.max(1,Math.ceil(series.length/35));const points=series.filter((_,i)=>i%stride===0||i===series.length-1);
    return `<section class="trend-grid content-section">${[['mood','Ánimo','#849c72'],['money','Dinero disponible','#b29361'],['relationships','Vínculos','#9d8eaf']].map(([key,label,color])=>{const values=points.map(p=>p[key]),min=Math.min(...values),max=Math.max(...values),span=max-min||1;const coords=points.map((p,i)=>`${20+i/Math.max(1,points.length-1)*260},${86-(p[key]-min)/span*60}`).join(' ');return `<figure class="trend-card"><figcaption>${label}</figcaption><svg class="trend-svg" viewBox="0 0 300 110" role="img" aria-label="${label}: de ${Math.round(values[0])} a ${Math.round(values.at(-1))}, entre los días ${points[0].day} y ${points.at(-1).day}"><path d="M20 16v72h264" fill="none" stroke="#d5ddcd"/><polyline points="${coords}" fill="none" stroke="${color}" stroke-width="2.5"/>${points.length===1?`<circle cx="20" cy="86" r="3" fill="${color}"/>`:''}<text x="20" y="105" font-size="10" fill="#52634b">Día ${points[0].day}</text><text x="230" y="105" font-size="10" fill="#52634b">${points.at(-1).day}</text></svg><p class="chart-caption">${Math.round(values[0])} → ${Math.round(values.at(-1))}${points.length===1?' · Los próximos días ampliarán el gráfico.':''}</p></figure>`;}).join('')}</section>`;
  }
  function renderV3Settings() {
    const settings=game.state.direction.settings;
    return `<section class="settings-section"><h3>El ritmo de tu historia</h3><label class="form-field">Dificultad<select id="settings-difficulty">${data.difficulties.map(d=>`<option value="${d.id}" ${settings.difficulty===d.id?'selected':''}>${escape(d.label)} · ${escape(d.description)}</option>`).join('')}</select></label><button class="text-button" id="tutorial-restart">Repetir la introducción interactiva</button></section><section class="settings-section sound-controls"><h3>Ambiente sonoro</h3><p>Sonido sintetizado en este dispositivo, sin archivos ni conexión. Apagado por defecto; nunca se inicia al recargar sin que lo pidas.</p><label class="toggle-row"><span>Activar ambiente</span><input id="sound-toggle" type="checkbox" ${settings.audioEnabled?'checked':''}></label><label class="form-field">Volumen<input id="sound-volume" type="range" min="0" max="1" step="0.01" value="${settings.volume}"></label><button class="button secondary" id="sound-play">Reanudar sonido</button><p class="sound-status" role="status"></p></section>`;
  }
  async function syncAudio(gesture) {
    const settings=game.state.direction.settings;
    if(!settings.audioEnabled){if(audioContext)await audioContext.suspend();return;}
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){game.setPreferences({audioEnabled:false});const toggle=$('#sound-toggle');if(toggle)toggle.checked=false;const text=$('.sound-status');if(text)text.textContent='El ambiente queda apagado con la preferencia de movimiento reducido.';return;}
    try{const AudioAPI=window.AudioContext||window.webkitAudioContext;if(!AudioAPI)throw Error('Audio no disponible');if(!audioContext&&gesture){audioContext=new AudioAPI();ambienceGain=audioContext.createGain();ambienceGain.gain.value=settings.volume*.06;ambienceGain.connect(audioContext.destination);for(const f of [174,261]){const o=audioContext.createOscillator();o.type='sine';o.frequency.value=f;o.connect(ambienceGain);o.start();ambienceNodes.push(o);}}if(audioContext)await audioContext.resume();const text=$('.sound-status');if(text)text.textContent='Ambiente activo. Puedes bajarlo o apagarlo cuando quieras.';}catch{game.setPreferences({audioEnabled:false});toast('Este navegador no permite iniciar el sonido. Puedes seguir jugando sin él.',true);}
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&audioContext)audioContext.suspend().catch(()=>{});});

  function statBar(key, value) {
    const meta = statsMeta[key];
    return `<div class="stat-row"><div class="stat-label"><span>${icon(meta.icon)}${meta.name}</span><strong>${Math.round(value)}<small>/100</small></strong></div><div class="stat-track"><div class="stat-fill" style="width:${Math.max(0,Math.min(100,value))}%;--stat-color:${meta.color}"></div></div></div>`;
  }

  function render() {
    const s = game.state;
    $('#sidebar-avatar').innerHTML = portrait({...s.profile,id:'sidebar'});
    $('#sidebar-name').textContent = `${s.profile.name} ${s.profile.lastName || ''}`;
    $('#sidebar-path').textContent = pathNames[s.profile.path];
    $('#money-amount').textContent = money(s.money);
    const calendar=game.getCalendar?.();
    $('#day-pill').innerHTML = `${icon(s.hour >= 19 ? 'moon' : 'sun')}<span>${escape(calendar?.dateLabel || game.getWeekday()+', día '+s.day)}<span class="time-divider">·</span><strong>${game.getClock()}</strong><span class="day-period"> · ${s.hour<12?'Mañana':s.hour<19?'Tarde':'Noche'} · Energía ${s.stats.energy}/100</span></span>`;
    $('#stat-bars').innerHTML = ['energy','mood','social','stress'].map(key => statBar(key,s.stats[key])).join('');
    const unanswered=new Set((s.messages || []).filter(m=>!m.answered).map(m=>m.npcId)).size;
    $('#relations-count').textContent = unanswered;
    $('#relations-count').setAttribute('aria-label',`${unanswered} respuestas pendientes`);
    $('#cheat-indicator').hidden = !s.flags.cheats;
    updateSaveStatus();
    const goals = game.getGoals();
    $('#goals-list').innerHTML = goals.map(g => `<div class="goal-item ${g.claimed ? 'claimed' : ''}"><span class="goal-icon ${g.complete ? 'complete' : ''}">${icon(g.complete ? 'check' : g.type === 'date' ? 'heart' : g.type === 'study' ? 'book' : g.type === 'work' ? 'briefcase' : 'chat')}</span><div class="goal-info"><strong>${escape(g.title)}</strong><span>${g.claimed ? '¡Objetivo conseguido!' : `${Math.min(g.progress,g.target)} de ${g.target} · +${money(g.reward)}`}</span>${g.complete && !g.claimed ? `<button class="text-button" data-claim="${g.id}">Recoger recompensa ${icon('arrow')}</button>` : `<div class="goal-progress"><span style="width:${Math.min(100,g.progress / g.target * 100)}%"></span></div>`}</div></div>`).join('');
    const title = {today:'Mi día',map:'Explorar',people:'Relaciones',family:'Mi familia',character:'Mi personaje',journal:'Diario'}[view];
    $('#breadcrumb-current').textContent = title;
    $$('.nav-item[data-view]').forEach(el => {const active=el.dataset.view===view;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
    main.innerHTML = ({today:renderToday,map:renderMap,people:renderPeople,family:renderFamily,character:renderCharacter,journal:renderJournal}[view])();
    hydrateIcons();
    hydrateMeters();
  }

  function heading(eyebrow,title,subtitle,action = '') {
    return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="page-intro">${subtitle}</p></div>${action ? `<div class="heading-actions">${action}</div>` : ''}</div>`;
  }

  function locationCard(loc, large = false) {
    const current=game.state.location===loc.id;
    const availability=game.getLocationAvailability?.(loc.id,game.state.hour+(current?0:0.5)) || {open:true};
    const hours=loc.opensAt!==undefined?`${formatHour(loc.opensAt)}–${formatHour(loc.closesAt)}`:'09:00–23:00';
    const wait=!availability.open && game.state.hour<loc.opensAt-0.5;
    return `<article class="location-card ${large?'large-location-card':''} ${current?'is-current':''} ${loc.category==='noche'?'nightlife-location':''} ${!availability.open?'is-closed':''}" data-category="${escape(loc.category || 'ciudad')}" style="--location-color:${escape(loc.color || '#e4eadf')}"><button class="location-destination" data-travel="${loc.id}" aria-label="Ir a ${escape(loc.name)}${!availability.open?', '+escape(availability.reason):''}">${large?`<div class="map-scene">${scene(loc)}</div>`:''}<div class="location-card-top"><span class="location-icon">${icon(locationIcon(loc.id))}</span>${current?'<span class="location-status">ESTÁS AQUÍ</span>':!availability.open?'<span class="location-status closed">CERRADO</span>':icon('arrow')}</div><h3>${escape(loc.name)}</h3><p>${escape(large?loc.description:locationSummary(loc.id))}</p><span class="hours-badge">${icon('clock')} ${hours}</span><div class="location-footer"><span>${availability.open?current?'Tu entorno actual':`${game.getPresentNPCs(loc.id).length} personas por aquí`:escape(availability.reason)}</span><span>${current?icon('pin'):'30 min'}</span></div></button>${wait?`<button class="text-button wait-opening" data-wait-place="${loc.id}">Esperar a la apertura ${icon('arrow')}</button>`:''}</article>`;
  }
  const locationIcon=id=>data.locations.find(l=>l.id===id)?.icon || 'pin';
  const locationSummary=id=>({casa:'Tu lugar para volver.',plaza:'Un respiro y nuevos encuentros.',cafeteria:'Buenas charlas, mejor café.',colegio:'El inicio de lo que viene.',universidad:'Ideas que abren caminos.',trabajo:'Un futuro hecho por ti.',discoteca:'La noche, a tu propio ritmo.',bar:'Una conversación sin promesas.',azotea:'Luces, aire y planes abiertos.',playa:'Sal y espacio para ti.',centrocultural:'Ideas fuera de la rutina.',restaurante:'Una mesa para elegir compañía.'}[id] || data.locations.find(l=>l.id===id)?.description);

  function renderToday() {
    const s = game.state, loc = data.locations.find(l=>l.id===s.location);
    const greeting = s.hour < 12 ? 'Buenos días' : s.hour < 19 ? 'Buenas tardes' : 'Buenas noches';
    const people = game.getPresentNPCs();
    const suggested = data.locations.filter(l=>l.id!==s.location).sort((a,b)=>Number(game.getLocationAvailability?.(b.id,s.hour+0.5)?.open ?? true)-Number(game.getLocationAvailability?.(a.id,s.hour+0.5)?.open ?? true) || (s.hour>=16?Number(b.category==='noche')-Number(a.category==='noche'):0)).slice(0,3);
    return heading(`CAPÍTULO ${String(Math.floor((s.day-1)/7)+1).padStart(2,'0')} · ${s.day<=7 ? 'TODO ESTÁ POR ESCRIBIR' : 'TU HISTORIA CONTINÚA'}`,`${greeting}, ${escape(s.profile.name)}<span class="heading-flower" aria-hidden="true">✻</span>`, 'Gestiona tu tiempo, tus relaciones y tus próximos pasos.', `<button class="button secondary small" data-open="creator">${icon('edit')} Personalizar</button>`)
      + storageNotice() + renderTutorial() + renderWorld() + renderDirection() + calendarStrip() + renderEvent()
      + (game.loadError || !game.lastSaveSucceeded ? `<div class="notice notice-warning">${icon('info')}${escape(game.loadError || 'El navegador no permite guardar esta sesión. Exporta tu partida antes de cerrar para conservar el progreso.')} <button class="text-button" data-open="settings">Abrir ajustes ${icon('arrow')}</button></div>` : '')
      + `<section class="hero-card ${loc.category==='noche'?'nightlife-hero':''}"><div class="hero-copy"><span class="location-tag">${icon('pin')} AHORA EN ${escape(loc.name.toUpperCase())}</span><h2>${s.location === 'casa' ? 'Las mejores historias<br>empiezan en casa.' : escape(loc.name) + ',<br>un mundo de posibilidades.'}</h2><p>${escape(loc.description)}</p><button class="button primary" data-scroll="actions">¿Qué te apetece hacer? ${icon('arrow')}</button><div class="hero-meta">${icon('clock')} Tu tiempo, tus decisiones <span>·</span> ${icon('users')} ${people.length} personas cerca</div></div><div class="hero-scene">${scene(loc)}</div></section>`
      + `<section class="content-section"><div class="section-heading"><h2>¿A dónde vamos?</h2><button class="section-link" data-view="map">Explorar la ciudad ${icon('arrow')}</button></div><div class="location-grid">${suggested.map(l=>locationCard(l)).join('')}</div></section>`
      + `<section class="content-section"><div class="section-heading"><div><h2>Personas en este lugar<span class="count-label">${people.length}</span></h2><p class="section-subtitle">Abre una ficha para conversar o ver vuestro vínculo.</p></div><button class="section-link" data-view="people">Ver relaciones ${icon('arrow')}</button></div><div class="people-grid">${people.length ? people.slice(0,6).map(personCard).join('') : '<div class="empty-state">Un momento para ti. Explora otro lugar para conocer gente.</div>'}</div></section>`
      + (loc.id==='trabajo'?renderCareer():'') + renderActions(loc);
  }

  function renderActions(loc) {
    return `<section class="content-section" id="location-actions"><div class="section-heading"><div><h2>Actividades disponibles</h2><p class="section-subtitle">Consulta la duración y el coste de cada actividad.</p></div><span class="soft-badge">${escape(loc.name)}</span></div><div class="action-grid">${loc.actions.map(a=>`<button class="action-card" data-action="${a.id}"><span class="action-icon">${icon(a.icon)}</span><span class="action-info"><h3>${escape(a.label)}</h3><p>${escape(a.description)}</p><span class="action-meta">${icon('clock')} ${a.duration < 1 ? a.duration * 60 + ' min' : a.duration + ' h'}${a.cost ? ` <span>·</span> ${money(a.cost)}` : ''}${a.path && a.path !== game.state.profile.path ? ' · Requiere otro itinerario' : ''}</span></span>${icon('chevron')}</button>`).join('')}</div></section>`;
  }

  function personCard(npc) {
    const rel = game.getRelationship(npc.id);
    const present = game.getPresentNPCs().some(n=>n.id===npc.id);
    const status = rel.status === 'partner' ? 'Pareja' : rel.status === 'dating' ? (rel.dates ? 'Conociéndoos' : 'Cita pendiente') : npc.family ? npc.relation : rel.status==='rival'?'Rivalidad':rel.status==='coworker'?'Compañeros':rel.friendship >= 40 ? 'Amistad' : rel.casual?.encounters>0 ? 'Encuentro casual' : 'Por conocer';
    return `<button class="person-card" data-npc="${npc.id}"><div class="person-top"><span class="avatar">${portrait(npc)}</span><span class="person-status ${present ? 'is-online' : ''}" title="${present ? 'Está en este lugar' : 'Está en otro lugar'}"></span>${npc.family ? `<span class="family-label">${icon('home')}</span>` : rel.romance > 0 ? `<span class="romance-label">${icon('heart')}</span>` : ''}</div><h3 class="person-name">${escape(npc.name)}</h3><p class="person-role">${escape(status || npc.occupation)}</p><div class="person-traits">${npc.traits.slice(0,2).map(t=>`<span class="trait-chip">${escape(t)}</span>`).join('')}</div><div class="relationship-line"><span>${npc.family ? 'Vínculo familiar' : 'Afinidad'}</span><strong>${Math.round(rel.friendship)}%</strong></div><div class="mini-progress"><span style="width:${rel.friendship}%"></span></div></button>`;
  }

  function renderMap() {
    const places=data.locations.filter(l=>exploreFilter==='all' || l.category===exploreFilter);
    return heading('TU CIUDAD, OTROS RITMOS','Más allá de la rutina','Elige ambiente, compañía y cuánto quieres que dure el encuentro.')
      + `<section class="nightlife-strip">${icon('moon')}<div><strong>Hay noches que no necesitan una historia de amor.</strong><p>Un baile, un ligue o una noche compartida. Hablar de lo que buscáis permite disfrutar sin prometer una relación.</p></div></section><div class="explore-filters" role="group" aria-label="Filtrar lugares">${[['all','Todos','map'],['noche','Vida nocturna','moon'],['ciudad','Ciudad','home'],['naturaleza','Al aire libre','leaf']].map(([id,label,ic])=>`<button class="explore-filter ${exploreFilter===id?'active':''}" data-explore-filter="${id}" aria-pressed="${exploreFilter===id}">${icon(ic)}${label}</button>`).join('')}</div><div class="map-grid">${places.map(l=>locationCard(l,true)).join('')}</div><div class="notice">${icon('clock')} Los horarios son del juego. La discoteca abre a las 19:00; el bar y la azotea, a las 17:00. Puedes esperar antes de desplazarte. Tu jornada termina a las 23:00.</div>`;
  }

  function renderPeople() {
    const filtered = data.npcs.filter(n => {
      const r=game.getRelationship(n.id);
      return (peopleFilter==='all' || peopleFilter==='friends' && !n.family && r.friendship>=40 || peopleFilter==='romance' && !n.family && r.romance>0 || peopleFilter==='casual' && !n.family && (r.casual?.encounters>0 || r.casual?.expectations==='casual') || peopleFilter==='nearby' && game.getPresentNPCs().some(p=>p.id===n.id) || peopleFilter==='colleagues' && !n.family && n.home==='trabajo' || peopleFilter==='classmates' && !n.family && ['colegio','universidad'].includes(n.home)) && `${n.name} ${n.lastName} ${n.occupation}`.toLocaleLowerCase('es').includes(searchTerm.toLocaleLowerCase('es'));
    });
    return heading('LAS PERSONAS QUE DAN SENTIDO','Cada persona, una historia','Conoce, escucha y construye vínculos que merezcan la pena.')
      + renderMessages() + `<div class="people-toolbar"><div class="filter-tabs" role="group" aria-label="Filtrar relaciones">${[['all','Todos'],['friends','Amistades'],['romance','Romance'],['casual','Conexiones casuales'],['nearby','Cerca de ti'],['colleagues','Colegas'],['classmates','Compañeros de estudios']].map(([id,label])=>`<button class="filter-tab ${peopleFilter===id?'active':''}" data-filter="${id}" aria-pressed="${peopleFilter===id}">${label}</button>`).join('')}</div><label class="search-field">${icon('search')}<input class="search-input" id="people-search" type="search" placeholder="Buscar a alguien…" value="${escape(searchTerm)}" aria-label="Buscar personas"></label></div><div class="people-grid">${filtered.length ? filtered.map(personCard).join('') : `<div class="empty-state">${icon('users')}<h3>Todavía no hay nadie aquí</h3><p>${searchTerm ? 'Prueba con otro nombre.' : 'Acércate a alguien y deja que el vínculo crezca.'}</p></div>`}</div>`;
  }

  function renderFamily() {
    const groups = [['Tus raíces','padre','madre'],['Creciendo a tu lado','hermana','hermano'],['La familia también se extiende','tia','tio','prima','primo','prima_segunda'],['Otra generación, otras historias','abuela_materna','abuelo_materno','abuela_paterna','abuelo_paterno']];
    return heading('UN LUGAR AL QUE PERTENECER','Tu familia, tu historia','No siempre estaréis de acuerdo. Siempre podéis intentar entenderos.')
      + `<div class="family-intro">${icon('home')}<div><strong>Tu familia</strong><p>Padres, hermanos, abuelos, tíos y primos. Vínculos de cariño, confianza y límites sanos.</p></div><span class="soft-badge">${data.npcs.filter(n=>n.family).length} FAMILIARES</span></div>`
      + renderFamilyState()
      + groups.map(([title,...ids])=>`<section class="content-section"><div class="section-heading"><h2>${title}</h2></div><div class="people-grid family-grid">${ids.map(id=>data.npcs.find(n=>n.id===id)).filter(Boolean).map(personCard).join('')}</div></section>`).join('');
  }

  function renderCharacter() {
    const p=game.state.profile;
    return heading('NO HAY OTRA PERSONA COMO TÚ','A tu manera','Quién eres hoy no limita quién puedes llegar a ser.',`<button class="button secondary" data-open="creator">${icon('edit')} Editar personaje</button>`)
      + `<section class="profile-hero panel"><div class="large-avatar">${portrait({...p,id:'profile'},160)}</div><div class="profile-details"><div class="eyebrow">TU PROTAGONISTA</div><h2>${escape(p.name)} ${escape(p.lastName)}</h2><p>${game.getAge?.() || p.age} años <span>·</span> ${escape(p.pronouns)} <span>·</span> ${escape(pathNames[p.path])}</p><div class="person-traits">${data.traits.filter(t=>p.traitIds?.includes(t.id)).map(t=>`<span class="trait-chip">${escape(t.label)}</span>`).join('')}</div></div></section>`
      + `<section class="content-section"><div class="section-heading"><h2>Así estás hoy</h2><span class="tiny-label">CAMBIA CON TUS DECISIONES</span></div><div class="stats-grid">${Object.entries(statsMeta).map(([key,m])=>`<div class="stat-card">${statBar(key,game.state.stats[key])}<p>${statDescription(key)}</p></div>`).join('')}</div></section>`
      + `<section class="content-section"><div class="section-heading"><div><h2>También creces por dentro</h2><p class="section-subtitle">Escuchar, aprender y atreverte dejan huella en tu personalidad.</p></div></div><div class="personality-evolution panel">${[['empathy','Empatía','heart'],['confidence','Confianza personal','sparkles'],['discipline','Disciplina','shield'],['creativity','Creatividad','palette'],['sociability','Sociabilidad','users']].map(([key,label,ic])=>`<div class="stat-row"><div class="stat-label"><span>${icon(ic)}${label}</span><strong>${game.state.personality[key]}<small>/100</small></strong></div><div class="stat-track"><div class="stat-fill" style="width:${game.state.personality[key]}%;--stat-color:#99ae85"></div></div></div>`).join('')}</div></section>`
      + `<section class="content-section"><div class="section-heading"><div><h2>Tu siguiente capítulo</h2><p class="section-subtitle">Puedes cambiar de rumbo. Tu progreso se queda contigo.</p></div></div><div class="path-grid">${Object.entries(pathNames).map(([id,name])=>`<button class="path-card ${id===p.path?'selected':''}" data-path="${id}"><span class="location-icon">${icon(id==='school'?'book':id==='university'?'graduation':id==='work'?'briefcase':'leaf')}</span><h3>${name}</h3><p>${pathDescriptions[id]}</p><span class="text-button">${id===p.path ? 'Tu itinerario actual '+icon('check') : 'Elegir este camino '+icon('arrow')}</span></button>`).join('')}</div></section>`
      + renderDirection() + renderLifeSystems() + renderTrends() + renderCareer() + renderAchievements()
      + `<section class="content-section"><div class="section-heading"><h2>Lo que te hace ser tú</h2></div><div class="personality-grid">${data.traits.map(t=>`<div class="personality-card ${p.traitIds?.includes(t.id)?'selected':''}">${icon(t.icon)}<h3>${escape(t.label)}</h3><p>${escape(t.description)}</p>${p.traitIds?.includes(t.id)?'<span class="soft-badge">PARTE DE TI</span>':''}</div>`).join('')}</div></section>`;
  }
  function statDescription(key) {
    return {energy:'Descansa antes de quedarte sin fuerzas.',mood:'Las buenas conversaciones y tus aficiones ayudan.',health:'Comer y descansar también forman parte de avanzar.',social:'Dedica tiempo a las personas que te importan.',knowledge:'Aprende en clase o por tu cuenta.',charm:'Se construye con práctica y autenticidad.',responsibility:'Los pequeños compromisos cuentan.',stress:'Cuanto más bajo, mejor. Date un respiro.'}[key];
  }

  function renderJournal() {
    const entries=game.state.journal.filter(e=>(!journalPerson || e.npcId===journalPerson || e.people?.includes(journalPerson) || e.text.includes(game.getNPC(journalPerson)?.name)) && (!journalTag || e.kind===journalTag || e.tags?.includes(journalTag)));
    const tags=[...new Set(game.state.journal.flatMap(e=>[e.kind,...(e.tags||[])]))];
    return heading('LOS MOMENTOS QUE SE QUEDAN','Tu diario','Una vida no se mide solo en días, sino en lo que pasa dentro de ellos.')
      + renderLegacyPanel() + renderMemories() + renderTrends() + `<div class="journal-filters"><label class="form-field">Persona<select id="journal-person"><option value="">Todas las personas</option>${data.npcs.map(n=>`<option value="${n.id}" ${journalPerson===n.id?'selected':''}>${escape(n.name)}</option>`).join('')}</select></label><label class="form-field">Tema<select id="journal-tag"><option value="">Todos los temas</option>${tags.map(tag=>`<option value="${escape(tag)}" ${journalTag===tag?'selected':''}>${escape(tagNames[tag]||tag)}</option>`).join('')}</select></label></div>` + renderAnnualSummary()
      + `<div class="journal-list">${entries.length ? entries.map(e=>`<article class="journal-entry"><div class="journal-date"><strong>Día ${e.day}</strong><span>${formatHour(e.hour)}</span></div><div class="journal-dot">${icon(e.kind==='romance'?'heart':e.kind==='travel'?'pin':e.kind==='achievement'?'star':e.kind==='family'?'home':'leaf')}</div><div class="journal-body"><h3>${escape(e.title)}</h3>${e.npcId?`<span class="journal-person-label">${escape(game.getNPC(e.npcId)?.name || '')}</span>`:''}<p>${escape(e.text)}</p><button class="text-button memory-star" data-memory-index="${game.state.journal.indexOf(e)}" aria-label="Marcar recuerdo: ${escape(e.title)}">${icon('star')} Guardar recuerdo</button>${e.tags?.length?`<div class="event-tags">${e.tags.map(t=>`<span class="trait-chip">${escape(tagNames[t]||t)}</span>`).join('')}</div>`:''}</div></article>`).join('') : '<div class="empty-state">Tu primer recuerdo está a una decisión de distancia.</div>'}</div>`;
  }
  function formatHour(hour) {const minutes=Math.round(hour*60);return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;}

  function navigate(next) {
    if (!routes[next]) return;
    view=next;
    const hash='#/'+routes[next];
    if(location.hash!==hash)location.hash=hash;
    render();
    window.scrollTo({top:0,behavior:'instant'});
    main.focus({preventScroll:true});
  }

  function focusSelector(el) {
    if(!el)return null;
    if(el.id)return '#'+CSS.escape(el.id);
    for(const key of ['npc','open','trait','color'])if(el.dataset?.[key])return `[data-${key}="${CSS.escape(el.dataset[key])}"]`;
    if(el.name)return `[name="${CSS.escape(el.name)}"]`;
    return null;
  }
  function openDialog(html, className = '') {
    const wasOpen=dialog.open;
    const previous=document.activeElement;
    const scroll=dialog.scrollTop;
    const selector=focusSelector(previous);
    if(!wasOpen){returnFocus=previous;returnFocusSelector=selector;}
    $('#dialog-content').innerHTML=html;
    dialog.className=`game-dialog ${className}`;
    const title=$('.dialog-title',dialog);
    if(title){title.id='dialog-title';title.tabIndex=-1;}
    if (!dialog.open) dialog.showModal();
    hydrateIcons();hydrateMeters(dialog);
    if(!wasOpen)(title || $('input,button',dialog))?.focus({preventScroll:true});
    else {const replacement=selector?$(selector,dialog):null;(replacement || title)?.focus({preventScroll:true});dialog.scrollTop=scroll;}
  }
  function closeDialog() { dialog.close(); activeNPC=null; lastDialogue=null; creatorDraft=null; }

  function renderPersonHistory(n,r) {
    const dynamic=game.state.npcStates?.[n.id];
    return `<section class="person-history"><h3>Lo que le importa</h3><p>${escape((Array.isArray(n.needs)?n.needs:data.npcs.find(p=>p.id===n.id)?.needs || ['Ser escuchade','Tener su propio espacio']).join(' · '))}</p><p>Personalidad: ${n.traits.map(escape).join(' · ')}${dynamic?' · Ánimo '+Math.round(dynamic.mood)+'/100':''}</p><h3>Vuestra historia reciente</h3>${r.sharedHistory?.length?`<ol>${r.sharedHistory.slice(-4).reverse().map(h=>`<li><strong>Día ${h.day} · ${escape(h.title)}</strong><p>${escape(h.text)}</p></li>`).join('')}</ol>`:'<p>Aún estáis escribiendo las primeras líneas.</p>'}</section>`;
  }

  function renderNightPanel(n,r,present) {
    if(n.family || n.child || n.age<18 || game.getAge()<18)return '';
    if(!(data.nightLocations || []).includes(game.state.location) && !r.casual?.history?.length)return '';
    const options=game.getNightOptions?.(n.id) || [];
    if(!options.length)return '';
    const casual=r.casual || {expectations:'unknown',attraction:0,encounters:0,history:[]};
    const labels={unknown:'Por hablar',casual:'Sin compromiso, de mutuo acuerdo',romantic:'Busca una relación',declined:'Prefiere no seguir por aquí'};
    return `<section class="nightlife-panel"><div class="nightlife-header"><div><span class="eyebrow">OTRAS FORMAS DE CONECTAR</span><h3>Química sin promesas.</h3></div>${icon('moon')}</div><p class="night-note">La atracción no es lo mismo que el amor. Podéis compartir una noche y seguir caminos distintos, siempre que ambos queráis lo mismo.</p><div class="night-preferences"><span>Expectativas habladas</span><strong class="expectation-chip">${escape(labels[casual.expectations] || labels.unknown)}</strong></div><div class="casual-meters"><div class="stat-row"><div class="stat-label"><span>Química compartida</span><strong>${Math.round(casual.attraction)}/100</strong></div><div class="stat-track"><div class="stat-fill" style="width:${casual.attraction}%;--stat-color:#b48baf"></div></div></div><div><span>Encuentros compartidos</span><strong>${casual.encounters}</strong></div></div><div class="night-options">${options.map(o=>`<button class="night-option" data-night-action="${escape(o.id)}" data-person="${n.id}" ${!present || !o.available?'disabled':''}><span class="interaction-icon">${icon(o.icon)}</span><span><strong>${escape(o.id==='oneNight'?'Ligue de una noche':o.label)}</strong><small>${escape(o.description || '')}</small><small>${o.available && present?`${o.duration} h · ${o.energy ?? o.energyCost ?? 0} energía${o.cost?' · '+money(o.cost):''}`:escape(!present?'Encuéntrate con esta persona para compartir el momento.':o.reason)}</small></span></button>`).join('')}</div>${casual.history?.length?`<details class="person-history"><summary>Vuestros encuentros, sin etiquetas</summary><ol>${casual.history.slice(-4).reverse().map(h=>`<li><strong>Día ${h.day} · ${escape(h.title)}</strong><p>${escape(h.text)}</p></li>`).join('')}</ol></details>`:''}</section>`;
  }
  function handleNightAction(npcId,type,options={}) {
    const result=game.interactNight(npcId,type,options);
    if(result.requiresInfidelityConfirmation){pendingInfidelity={npcId,type,night:true,options};return confirmInfidelity(result.partnerId);}
    if(result.requiresEncounterConfirmation){pendingNightIntent={npcId,type,options};return confirmCasualEncounter(npcId);}
    if(result.ok)pendingNightIntent=null;
    render();
    if(result.ok && game.shouldEndDay())showDaySummary(true);
    else if(game.getPendingEvent()?.mandatory)showEvent();
    else showNPC(npcId,result);
  }
  function confirmCasualEncounter(npcId) {
    const n=game.getNPC(npcId);
    const option=game.getNightOptions(npcId).find(o=>o.id==='oneNight');
    openDialog(`<div class="dialog-body encounter-confirm"><div class="dialog-eyebrow">UN ENCUENTRO ENTRE ADULTOS</div><h2 class="dialog-title">Una noche, sin prometer mañana.</h2><p class="confirm-copy">${escape(n.name)} y tú habéis hablado de compartir un encuentro íntimo sin compromiso. Ambos podéis cambiar de opinión. La escena se cierra con discreción y continúa después; no se crea una pareja ni una cita pendiente.</p><div class="notice">${icon('clock')} El encuentro ocupa ${option.duration} h y ${option.energy ?? option.energyCost ?? 10} de energía${option.cost?' · '+money(option.cost):''}. Elegirlo no te obliga a repetir ni a mantener el contacto.</div><div class="dialog-footer"><button class="button secondary" data-npc="${npcId}">Prefiero dejarlo aquí</button><button class="button primary" id="confirm-casual-encounter">Sí, compartir este encuentro</button></div></div>`, 'encounter-dialog');
  }
  function confirmWaitOpening(id) {
    const loc=data.locations.find(l=>l.id===id);if(!loc)return;
    pendingWaitPlace=id;
    const target=Math.max(game.state.hour,loc.opensAt-(game.state.location===id?0:0.5));
    const elapsed=target-game.state.hour;
    openDialog(`<div class="dialog-body"><div class="dialog-eyebrow">ORGANIZA TU SALIDA</div><h2 class="dialog-title">¿Esperar a que abra?</h2><p class="confirm-copy">${escape(loc.name)} abre a las ${formatHour(loc.opensAt)}. Esperarás hasta las ${formatHour(target)} para poder llegar a la apertura. Pasarán ${Number(elapsed.toFixed(2))} h y emplearás ${Math.ceil(elapsed*2)} de energía; no se realiza ninguna otra actividad durante la espera.</p><div class="dialog-footer"><button class="button secondary" data-close>Mejor hacer otro plan</button><button class="button primary" id="confirm-wait-opening">Esperar y organizar la salida</button></div></div>`);
  }

  function showNPC(id, result = null) {
    activeNPC=id;
    if (result) lastDialogue=result;
    const n=game.getNPC(id), r=game.getRelationship(id);
    const present=game.getPresentNPCs().some(p=>p.id===id);
    const at=data.locations.filter(l=>game.getPresentNPCs(l.id,Math.min(23,game.state.hour + (l.id===game.state.location ? 0 : 0.5))).some(p=>p.id===id));
    const relationshipLabel= r.casual?.encounters>0 && !['family','partner','dating','friend'].includes(r.status)?'Encuentro casual, sin compromiso':{family:n.relation,acquaintance:'Os estáis conociendo',friend:'Una bonita amistad',coworker:'Compañeros de camino',rival:'Una relación con tensiones',dating:r.dates ? 'Seguís descubriéndoos' : 'Tenéis una cita pendiente',partner:'Una historia en común'}[r.status];
    const actions = [
      ['chat','chat','Romper el hielo','Preguntar qué tal va su día'],
      ['listen','heart','Escuchar de verdad',`Hablar de ${n.interests[0]?.toLowerCase() || 'lo que le importa'}`],
      ['joke','smile','Compartir una broma','Una sonrisa para acercaros'],
      ['help','leaf','Ofrecer tu ayuda','Estar cuando hace falta'],
      ['disagree','chat','Expresar un desacuerdo','Decir lo que piensas, aunque no coincidáis'],
      ['gift','gift','Tener un detalle','Un regalo pensado para esta persona · 12 €'],
      ['apologize','shield','Pedir disculpas','Reconocer un error y reparar el vínculo']
    ];
    actions.push(...(data.interactions || []).map(a=>[a.id,a.icon,a.label,a.description]));
    if(r.status==='partner' && game.state.narrative?.flags.secret_affair)actions.push(['confess','chat','Contar lo que ha pasado','Hablar con honestidad sobre la infidelidad']);
    if (!n.family && n.available) {
      actions.push(['flirt','sparkles','Mostrar interés','Un cumplido sincero, sin presionar']);
      if(r.status==='dating' || r.status==='partner') actions.push(['date','coffee','Disfrutar de la cita','En la cafetería o la plaza · 10 €']);
      else if(r.status!=='partner') actions.push(['askDate','heart','Proponer una cita','Preguntar si le gustaría quedar contigo']);
      if(r.status!=='partner') actions.push(['relationship','heart','Hablar de lo vuestro','Preguntar si quiere empezar una relación']);
      if(r.status==='partner' || r.status==='dating') actions.push(['breakup','leaf','Cerrar esta etapa','Hablar con respeto y terminar el vínculo romántico']);
    }
    actions.push(['boundary','shield',r.boundary ? 'Hablar de un nuevo comienzo' : 'Poner un límite',n.family ? 'Pedir espacio también es cuidarse' : r.boundary ? 'Abrir la posibilidad de volver a conocerse' : 'Explicar que prefieres una amistad']);
    openDialog(`<div class="dialog-body"><div class="npc-header"><div class="npc-portrait">${portrait(n,120)}</div><div class="npc-heading"><div class="dialog-eyebrow">${escape(n.family ? 'TU FAMILIA · '+n.relation.toUpperCase() : n.occupation.toUpperCase())}</div><h2 class="dialog-title">${escape(n.name)} ${escape(n.lastName)}</h2><p>${n.age} años · ${escape(n.pronouns)} <span class="presence-label">${present ? '● Aquí contigo' : '○ En otro lugar'}</span></p><span class="soft-badge">${escape(relationshipLabel || 'Un vínculo por descubrir')}</span></div></div><p class="npc-bio">${escape(n.bio)}</p><div class="interests">${n.interests.map(i=>`<span class="interest-tag">${escape(i)}</span>`).join('')}</div><div class="relationship-meters">${[['friendship',n.family?'Cariño':'Afecto','#7f9a7b'],['trust','Confianza','#a89cc2'],...(!n.family?[['romance','Interés romántico','#c38b8b']]:[])].map(([key,label,color])=>`<div class="relationship-meter"><span>${label}<strong>${Math.round(r[key])}%</strong></span><div class="stat-track"><div class="stat-fill" style="width:${r[key]}%;--stat-color:${color}"></div></div></div>`).join('')}</div>${lastDialogue ? `<div class="dialogue-bubble ${lastDialogue.ok?'success':'error'}" role="status" tabindex="-1"><span class="dialogue-speaker">${escape(lastDialogue.title || (lastDialogue.ok ? n.name : 'Un momento…'))}</span><p>${escape(lastDialogue.dialogue || lastDialogue.message)}</p>${lastDialogue.dialogue && lastDialogue.message ? `<small>${escape(lastDialogue.message)}</small>` : ''}</div>` : `<div class="dialogue-bubble"><span class="dialogue-speaker">UN VÍNCULO A TU RITMO</span><p>${n.family ? 'El cariño también se cuida en las pequeñas conversaciones.' : (data.nightLocations || []).includes(game.state.location)?'Podéis compartir un momento sin convertirlo en pareja. Hablar de lo que buscáis también forma parte del encuentro.':'La confianza se construye con tiempo, interés y respeto.'}</p></div>`}${!present ? `<div class="notice">${icon('pin')} No está en este lugar. ${at.length ? `Puedes encontrarle al llegar en ${at.map(l=>escape(l.name)).join(' o ')}.` : escape(n.schedule || 'Vuelve a buscarle en otro momento.')}</div><div class="dialog-footer">${at.map(l=>`<button class="button primary" data-visit-npc="${l.id}" data-person="${id}">Ir a ${escape(l.name)} ${icon('arrow')}</button>`).join('')}</div>` : ''}${renderNightPanel(n,r,present)}${renderPersonHistory(n,r)}<h3 class="npc-section-title">${present ? '¿Cómo quieres compartir este momento?' : 'Cuando os encontréis…'}</h3><div class="interaction-grid">${actions.map(([type,ic,label,desc])=>`<button class="interaction-button" data-interact="${type}" data-person="${id}" ${!present && !['boundary','breakup'].includes(type)?'disabled':''}><span class="interaction-icon">${icon(ic)}</span><span><strong>${label}</strong><small>${desc}</small></span></button>`).join('')}</div><p class="dialog-footnote">Cada interacción ocupa tiempo y energía. Respetar un «no» también fortalece tu historia.</p></div>`, 'npc-dialog');
    if (result) {
      const bubble = $('.dialogue-bubble', dialog);
      bubble.focus({preventScroll:true});
      bubble.scrollIntoView({block:'nearest',behavior:'instant'});
    }
  }

  function creator() {
    creatorDraft={...game.state.profile,aspirationIds:[...(game.state.aspirations || ['estabilidad'])],difficulty:game.state.direction?.settings.difficulty || 'equilibrada',traitIds:[...(game.state.profile.traitIds || [])]};
    showCreator();
  }
  function showCreator() {
    const p=creatorDraft;
    openDialog(`<div class="dialog-body"><div class="dialog-eyebrow">TU VIDA, TUS DECISIONES</div><h2 class="dialog-title">Empieza siendo tú.</h2><p class="dialog-description">Dale forma a tu protagonista. Puedes cambiarlo cuando quieras sin perder tu historia.</p><div class="creator-layout"><aside class="creator-preview"><div class="creator-avatar" id="creator-avatar">${portrait({...p,id:'creator'},210)}</div><h3 id="creator-name-preview">${escape(p.name)}</h3><p>Todo un mundo por delante.</p><div class="preview-sprig">${icon('leaf')}</div></aside><form class="creator-form" id="creator-form"><div class="step-label">01 / UN POCO SOBRE TI</div><div class="form-grid"><label class="form-field">Nombre<input name="name" maxlength="24" required value="${escape(p.name)}" autocomplete="given-name"></label><label class="form-field">Apellido<input name="lastName" maxlength="28" value="${escape(p.lastName)}" autocomplete="family-name"></label><label class="form-field">Edad<input name="age" type="number" min="18" max="80" required value="${p.age}"></label><label class="form-field">Pronombres<select name="pronouns">${['ella','él','elle'].map(v=>`<option ${p.pronouns===v?'selected':''}>${v}</option>`).join('')}</select></label><label class="form-field">Identidad<select name="gender">${[['nonbinary','No binaria'],['female','Mujer'],['male','Hombre']].map(([v,l])=>`<option value="${v}" ${p.gender===v?'selected':''}>${l}</option>`).join('')}</select></label><label class="form-field">Cabello<select name="hairStyle">${[['curly','Rizado'],['short','Corto'],['bob','Media melena'],['long','Largo']].map(([v,l])=>`<option value="${v}" ${p.hairStyle===v?'selected':''}>${l}</option>`).join('')}</select></label></div><div class="step-label">02 / TU PROPIO ESTILO</div>${colorField('skin','Tono de piel',['#f3d5b6','#e8bd96','#dba57b','#bd815c','#925e40','#624331'],p.skin)}${colorField('hair','Color de cabello',['#292625','#3d302b','#784a32','#b48648','#d5c6a7','#b1717c'],p.hair)}${colorField('outfit','Tu ropa',['#678d7a','#718da8','#ad7d75','#8d7aab','#b69860','#434e58'],p.outfit)}<div class="step-label">03 / LO QUE TE MUEVE <span>Elige hasta 2 rasgos</span></div><div class="trait-options">${data.traits.map(t=>`<button type="button" class="trait-option ${p.traitIds.includes(t.id)?'selected':''}" data-trait="${t.id}" aria-pressed="${p.traitIds.includes(t.id)}" title="${escape(t.description)}">${icon(t.icon)}${escape(t.label)}</button>`).join('')}</div><div class="step-label">04 / LO QUE QUIERES CUIDAR</div>${renderAspirationChoices(creatorDraft.aspirationIds)}<p class="form-hint">Elige una o dos aspiraciones. Después de empezar, cambiar de rumbo ocupa una hora, 8 de energía y una semana para asentarlo.</p><label class="form-field">Ritmo de la partida<select id="difficulty-select" name="difficulty">${data.difficulties.map(d=>`<option value="${d.id}" ${creatorDraft.difficulty===d.id?'selected':''}>${d.label}</option>`).join('')}</select></label><label class="form-field path-field">Tu momento vital<select name="path">${Object.entries(pathNames).map(([v,l])=>`<option value="${v}" ${p.path===v?'selected':''}>${l}</option>`).join('')}</select></label><p class="form-hint">Las relaciones románticas y los encuentros casuales son entre mayores de 18 años. El colegio representa educación para adultos.</p><div class="dialog-footer"><button class="button secondary" type="button" data-close>Cancelar</button><button class="button primary" type="submit">Esta es mi historia ${icon('arrow')}</button></div></form></div></div>`, 'creator-dialog');
  }
  function colorField(field,label,colors,current) {
    return `<div class="color-field"><span>${label}</span><div class="color-options" role="group" aria-label="${label}">${colors.map((c,i)=>`<button type="button" class="color-option ${c===current?'selected':''}" style="--swatch:${c}" data-color-field="${field}" data-color="${c}" aria-label="${label}, opción ${i+1}" aria-pressed="${c===current}">${c===current?icon('check'):''}</button>`).join('')}</div></div>`;
  }
  function syncCreatorFields() {
    if(!creatorDraft || !$('#creator-form')) return;
    const fields = new FormData($('#creator-form'));
    for (const [key,value] of fields.entries()) creatorDraft[key] = key==='age'?Number(value):value;
  }

  function showCheats() {
    openDialog(`<div class="dialog-body"><div class="dialog-eyebrow">UN POCO DE MAGIA EXTRA</div><h2 class="dialog-title">Las reglas también las eliges tú.</h2><p class="dialog-description">Experimenta con tu historia. Los trucos se guardan con la partida y puedes desactivarlos en cualquier momento.</p><label class="toggle-row"><span><strong>Activar trucos</strong><small>Un modo libre para jugar a tu manera</small></span><input type="checkbox" id="cheat-toggle" ${game.state.flags.cheats?'checked':''}></label><div class="cheat-grid">${[['money','wallet','Un pequeño colchón','Añadir 500 €'],['stats','sparkles','Tu mejor versión','Mejorar todas las estadísticas'],['energy','energy','Pilas recargadas','Recuperar energía y bajar el estrés']].map(([type,ic,label,desc])=>`<button class="cheat-card" data-cheat="${type}" ${!game.state.flags.cheats?'disabled':''}>${icon(ic)}<strong>${label}</strong><small>${desc}</small></button>`).join('')}</div>${game.state.flags.cheats?renderDebugger():''}<div class="settings-section"><h3>Un empujón a un vínculo</h3><p>Aumenta la amistad y la confianza. El romance sigue siendo una elección de ambos.</p><label class="form-field">Persona<select id="cheat-npc">${data.npcs.map(n=>`<option value="${n.id}">${escape(n.name)}${n.family?' · '+escape(n.relation):''}</option>`).join('')}</select></label><button class="button secondary" data-cheat="relationship" ${!game.state.flags.cheats?'disabled':''}>${icon('users')} Mejorar este vínculo</button></div></div>`, 'cheats-dialog');
  }

  function showHelp() {
    openDialog(`<div class="dialog-body"><div class="dialog-eyebrow">BIENVENIDO A VÍNCULOS</div><h2 class="dialog-title">Una vida a tu ritmo.</h2><p class="dialog-description">No hay un final correcto. Construye una vida que te apetezca vivir.</p><div class="help-list">${[['clock','El tiempo importa','Empiezas a las 09:00. Viajar tarda 30 minutos y las actividades consumen tiempo y energía. A las 23:00 toca descansar. Puedes terminar el día cuando quieras.'],['users','Las personas tienen su vida','Busca a cada persona en sus lugares habituales. Habla, escucha y ayuda para construir amistad y confianza. Repetir lo mismo en un día tiene menos efecto.'],['heart','Una relación se construye entre dos','Conoce primero a la otra persona, muestra interés y propón una cita. Si acepta, queda en la plaza o la cafetería. Empezar una relación requiere una conversación, y un no se respeta.'],['home','Tu familia también cuenta','Puedes hablar, compartir bromas, ayudar y poner límites a todos tus familiares. Sus vínculos son siempre familiares.'],['graduation','Elige tu camino','En Mi personaje puedes elegir colegio, universidad, trabajo o tiempo libre. Visita el lugar correspondiente para estudiar o trabajar.'],['leaf','Cuídate y guarda tus recuerdos','Come, descansa y vigila el estrés. Recoge las recompensas de tus objetivos. La partida se guarda automáticamente en este navegador; también puedes exportarla en Ajustes.']].map(([ic,title,text])=>`<div class="help-item"><span class="location-icon">${icon(ic)}</span><div><h3>${title}</h3><p>${text}</p></div></div>`).join('')}</div><div class="dialog-footer"><button class="button primary" data-close>Vamos a vivir ${icon('arrow')}</button></div></div>`);
  }

  function showSettings() {
    openDialog(`<div class="dialog-body"><div class="dialog-eyebrow">TU PARTIDA, A BUEN RECAUDO</div><h2 class="dialog-title">Ajustes y recuerdos.</h2><p class="dialog-description">Tu historia se guarda en este dispositivo. No necesitas una cuenta ni conexión para jugar.</p><div class="settings-section"><h3>Llévate tu historia</h3><p>Exporta una copia de la partida para conservarla o continuar en otro navegador.</p><div class="dialog-footer"><button class="button secondary" id="export-save">${icon('download')} Exportar partida</button><button class="button secondary" id="import-save">${icon('upload')} Importar partida</button><input id="import-file" type="file" accept=".json,application/json" hidden></div></div>${renderV3Settings()}<div class="settings-section"><h3>Opciones de juego</h3>${game.state.flags.cheatsUsed?'<p class="notice">Partida marcada con trucos: los logros están desactivados.</p>':''}<button class="button secondary" id="cheats-button">${icon('wand')} Trucos y depuración</button><p>Descubre cómo funcionan el tiempo, las relaciones y los itinerarios.</p><button class="text-button" data-open="help">Cómo jugar ${icon('arrow')}</button></div><div class="settings-section danger-section"><h3>Una página en blanco</h3><p>Empezar una historia nueva borra el progreso de este navegador. Exporta la actual si quieres conservarla.</p><button class="button danger" id="reset-game">Empezar de nuevo</button></div><div class="settings-section"><span class="tiny-label">VÍNCULOS · VERSIÓN 3.0 · HECHO PARA JUGAR A TU MANERA</span></div></div>`);
  }

  function confirmReset() {
    openDialog(`<div class="dialog-body"><div class="dialog-eyebrow">UN NUEVO COMIENZO</div><h2 class="dialog-title">¿Volvemos a la primera página?</h2><p class="confirm-copy">Se borrarán tus relaciones, estadísticas y recuerdos de esta partida. Esta acción no se puede deshacer. Puedes volver atrás y exportar una copia primero.</p><div class="dialog-footer"><button class="button secondary" data-open="settings">Conservar mi historia</button><button class="button danger" id="confirm-reset">Sí, empezar de nuevo</button></div></div>`);
  }

  document.addEventListener('click', event => {
    if(event.target.closest('a.skip-link')) {event.preventDefault();main.focus();main.scrollIntoView({block:'start',behavior:'instant'});return;}
    const button=event.target.closest('button,a.brand');
    if(!button || button.disabled) return;
    if(button.matches('a.brand')) {event.preventDefault();navigate('today');return;}
    if(button.dataset.view) return navigate(button.dataset.view);
    if(button.dataset.aspiration){syncCreatorFields();const id=button.dataset.aspiration;if(creatorDraft.aspirationIds.includes(id)){if(creatorDraft.aspirationIds.length===1)return toast('Conserva al menos una aspiración.',true);creatorDraft.aspirationIds=creatorDraft.aspirationIds.filter(x=>x!==id);}else if(creatorDraft.aspirationIds.length<2)creatorDraft.aspirationIds.push(id);else return toast('Puedes elegir hasta dos aspiraciones.',true);showCreator();return;}
    if(button.dataset.lifeAction)return runLifeAction(button);
    if(button.dataset.memoryIndex!==undefined){run(game.markMemory(Number(button.dataset.memoryIndex)));return;}
    if(button.dataset.exploreFilter){exploreFilter=button.dataset.exploreFilter;render();return;}
    if(button.dataset.waitPlace)return confirmWaitOpening(button.dataset.waitPlace);
    if(button.dataset.nightAction)return handleNightAction(button.dataset.person,button.dataset.nightAction);
    if(button.dataset.eventOpen)return showEvent();
    if(button.dataset.eventOption)return chooseEventOption(button.dataset.eventOption);
    if(button.dataset.eventDismiss){const r=game.deferEvent?.();if(r?.ok && dialog.open)closeDialog();eventResult=null;run(r);return;}
    if(button.dataset.messageReply){const r=game.replyMessage?.(button.dataset.messageReply,button.dataset.reply || 'warm');run(r);return;}
    if(button.dataset.npc) {lastDialogue=null;return showNPC(button.dataset.npc);}
    if(button.dataset.travel) {
      const result=game.travel(button.dataset.travel);
      run(result);
      if(result.ok) navigate('today');
      return;
    }
    if(button.dataset.visitNpc) {
      const result=game.travel(button.dataset.visitNpc);
      render();
      if(result.ok) {view='today';render();showNPC(button.dataset.person);}
      else showNPC(button.dataset.person,result);
      return;
    }
    if(button.dataset.interact) {
      if(button.dataset.interact==='breakup') {
        const id=button.dataset.person;
        openDialog(`<div class="dialog-body"><div class="dialog-eyebrow">UNA CONVERSACIÓN IMPORTANTE</div><h2 class="dialog-title">Cerrar esta etapa.</h2><p class="confirm-copy">¿Quieres terminar el vínculo romántico con ${escape(game.getNPC(id).name)}? Vuestra historia compartida permanece en el diario.</p><div class="dialog-footer"><button class="button secondary" data-npc="${id}">Seguir como estamos</button><button class="button danger" data-confirm-breakup="${id}">Terminar con respeto</button></div></div>`);
        return;
      }
      const result=game.interact(button.dataset.person,button.dataset.interact);
      if(result.requiresInfidelityConfirmation){pendingInfidelity={npcId:button.dataset.person,type:button.dataset.interact};return confirmInfidelity(result.partnerId);}
      if(button.dataset.interact==='confess' && result.ok){render();return showEvent();}
      render();if(result.ok && game.shouldEndDay?.())showDaySummary(true);else showNPC(button.dataset.person,result);return;
    }
    if(button.dataset.confirmBreakup) {const r=game.interact(button.dataset.confirmBreakup,'breakup');render();showNPC(button.dataset.confirmBreakup,r);return;}
    if(button.dataset.action) return run(game.performAction(button.dataset.action));
    if(button.dataset.claim) return run(game.claimGoal(button.dataset.claim));
    if(button.dataset.scroll) return $('#location-actions')?.scrollIntoView({behavior:'smooth',block:'start'});
    if(button.dataset.path) return run(game.choosePath(button.dataset.path));
    if(button.dataset.filter) {peopleFilter=button.dataset.filter;render();return;}
    if(button.hasAttribute('data-close')) return closeDialog();
    if(button.dataset.open) {const open={creator,cheats:showCheats,help:showHelp,settings:showSettings};return open[button.dataset.open]?.();}
    if(button.dataset.colorField) {
      syncCreatorFields();creatorDraft[button.dataset.colorField]=button.dataset.color;showCreator();return;
    }
    if(button.dataset.trait) {
      syncCreatorFields();const id=button.dataset.trait;
      if(creatorDraft.traitIds.includes(id)) creatorDraft.traitIds=creatorDraft.traitIds.filter(t=>t!==id);
      else if(creatorDraft.traitIds.length<2) creatorDraft.traitIds.push(id);
      else return toast('Elige hasta dos rasgos. Quita uno para probar otro.',true);
      showCreator();return;
    }
    if(button.dataset.cheat) {
      const id=$('#cheat-npc')?.value;
      const result=game.cheat(button.dataset.cheat,undefined,id);
      render();showCheats();toast(result.message,!result.ok);return;
    }
    switch(button.id) {
      case 'tutorial-skip':run(game.tutorialAction('skip'));break;
      case 'tutorial-restart':run(game.tutorialAction('restart'));closeDialog();navigate('today');break;
      case 'tutorial-rest':showDaySummary();break;
      case 'legacy-review':{const r=game.reviewLegacy();render();if(r.ok)showLegacy();else toast(r.message,true);break;}
      case 'sound-play':syncAudio(true);break;
      case 'close-dialog':closeDialog();break;
      case 'confirm-wait-opening':{const id=pendingWaitPlace;pendingWaitPlace=null;const r=game.waitUntilOpening(id);if(r.ok)closeDialog();run(r);break;}
      case 'confirm-casual-encounter':{const intent=pendingNightIntent;if(!intent)break;handleNightAction(intent.npcId,intent.type,{...intent.options,confirmEncounter:true});break;}
      case 'request-promotion':run(game.requestPromotion());break;
      case 'confirm-infidelity':{const intent=pendingInfidelity;if(!intent)break;pendingInfidelity=null;if(intent.night){handleNightAction(intent.npcId,intent.type,{...intent.options,allowInfidelity:true});break;}const r=game.interact(intent.npcId,intent.type,{allowInfidelity:true});render();if(r.ok&&game.shouldEndDay())showDaySummary(true);else if(game.getPendingEvent()?.mandatory)showEvent();else showNPC(intent.npcId,r);break;}
      case 'edit-profile':creator();break;
      case 'cheats-button':showCheats();break;
      case 'confirm-cheats':run(game.cheat('enable'));showCheats();break;
      case 'settings-top-button':
      case 'settings-button':showSettings();break;
      case 'help-button':showHelp();break;
      case 'all-stats':navigate('character');break;
      case 'sleep-button':showDaySummary();break;
      case 'sleep-unavailable-event':showDaySummary(true);break;
      case 'confirm-sleep': {
        const result=game.sleep();
        if(result.ok){closeDialog();view='today';navigate('today');showDaySummary(true,result.summary);}
        else toast(result.message,true);
        break;
      }
      case 'confirm-import': {
        const result=game.importSave(pendingImport);
        if(result.ok){pendingImport=null;closeDialog();render();}
        toast(result.message,!result.ok);break;
      }
      case 'dismiss-first-save':game.state.flags.storageNoticeSeen=true;game.save();render();break;
      case 'debug-force':runDebugForce();break;
      case 'debug-simulate':runDebugSimulation();break;
      case 'add-child':showChildDecision();break;
      case 'confirm-child':{const result=game.addChild?.($('#child-name').value);if(result?.ok){closeDialog();render();}toast(result?.message || 'No se pudo completar esta decisión.',!result?.ok);break;}
      case 'export-save': {
        const blob=new Blob([game.exportSave()],{type:'application/json'});
        const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`vinculos-dia-${game.state.day}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Tu historia se ha exportado. Guarda el archivo en un lugar seguro.');break;
      }
      case 'import-save':$('#import-file').click();break;
      case 'reset-game':confirmReset();break;
      case 'confirm-reset':journalPerson='';journalTag='';journalYear=null;game.reset();game.create({...defaultProfile,traitIds:data.traits.slice(0,2).map(t=>t.id)});closeDialog();navigate('today');creator();break;
    }
  });

  document.addEventListener('input',event=>{
    if(event.target.id==='sound-volume'){game.setPreferences({volume:Number(event.target.value)});if(ambienceGain)ambienceGain.gain.setTargetAtTime(Number(event.target.value)*.06,audioContext.currentTime,.1);}
    if(event.target.id==='people-search') {
      const pos=event.target.selectionStart;searchTerm=event.target.value;render();const input=$('#people-search');input.focus();if(input.type!=='search')input.setSelectionRange(pos,pos);
    }
    if(event.target.closest('#creator-form')) {
      syncCreatorFields();$('#creator-avatar').innerHTML=portrait({...creatorDraft,id:'creator'},210);$('#creator-name-preview').textContent=creatorDraft.name || 'Tu protagonista';
    }
  });
  document.addEventListener('change', async event=>{
    if(event.target.id==='settings-difficulty'){run(game.setDifficulty(event.target.value));}
    if(event.target.id==='sound-toggle'){game.setPreferences({audioEnabled:event.target.checked});syncAudio(true);}
    if(event.target.id==='sound-volume'){game.setPreferences({volume:Number(event.target.value)});if(ambienceGain)ambienceGain.gain.setTargetAtTime(Number(event.target.value)*.06,audioContext.currentTime,.1);}
    if(event.target.id==='journal-year'){journalYear=Number(event.target.value);render();}
    if(event.target.id==='journal-person'){journalPerson=event.target.value;render();}
    if(event.target.id==='journal-tag'){journalTag=event.target.value;render();}
    if(event.target.id==='cheat-toggle') {if(event.target.checked)confirmCheats();else{const result=game.cheat('toggle');render();showCheats();toast(result.message,!result.ok);}}
    if(event.target.id==='import-file' && event.target.files[0]) {
      const file=event.target.files[0];
      if(file.size>3000000) return toast('La partida no puede superar 3 MB.',true);
      try {
        const text=await file.text();
        const checked=game.validateImport?.(text);
        if(!checked?.ok)toast(checked?.message || 'El archivo no contiene una partida válida.',true);
        else {pendingImport=text;openDialog(`<div class="dialog-body"><div class="dialog-eyebrow">RECUPERAR UNA HISTORIA</div><h2 class="dialog-title">¿Sustituir la partida actual?</h2><p class="confirm-copy">La partida del archivo reemplazará tu progreso en este navegador. Exporta tu historia actual primero si quieres conservar ambas. El archivo ya ha sido validado.</p><div class="dialog-footer"><button class="button secondary" data-open="settings">Conservar la actual</button><button class="button primary" id="confirm-import">Importar y sustituir</button></div></div>`);}
      } catch {toast('No se pudo leer el archivo. Elige una partida JSON de Vínculos.',true);}
      event.target.value='';
    }
  });
  document.addEventListener('submit',event=>{
    if(event.target.id!=='creator-form') return;
    event.preventDefault();syncCreatorFields();
    const result=game.updateProfile(creatorDraft);
    if(result.ok) {closeDialog();render();toast('Este es tu momento. Tu personaje se ha actualizado.');}
    else toast(result.message,true);
  });
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog();}});
  dialog.addEventListener('close',()=>{if(dialog.open)return;activeNPC=null;lastDialogue=null;creatorDraft=null;const target=returnFocus?.isConnected?returnFocus:returnFocusSelector?$(returnFocusSelector):main;(target || main).focus({preventScroll:true});});
  window.addEventListener('hashchange',()=>{const next=viewFromHash();if(next!==view){view=next;render();main.focus({preventScroll:true});}});
  if(!Object.values(routes).some(route=>location.hash==='#/'+route))history.replaceState(null,'','#/'+routes[view]);
  const mobileQuery=window.matchMedia('(max-width: 900px)');
  const adaptPanel=()=>{$('#status-panel').open=!mobileQuery.matches;};
  adaptPanel();mobileQuery.addEventListener('change',adaptPanel);
  render();
})();
