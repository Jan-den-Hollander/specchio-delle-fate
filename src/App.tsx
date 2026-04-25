/**
 * Lo Specchio delle Fate — v12
 * Renaissance frame · Cinzel/Cormorant · Alles in de spiegel
 * Gemini 2.5-flash → 2.0-flash fallback (tekst + TTS)
 * TTS afkap fix: AudioContext blijft open tot audio echt klaar is
 */
import { useState, useRef, useEffect } from 'react';
import { Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ── API ───────────────────────────────────────────────────────────────────
const ENV_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_KEY) || '';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const MODELS = {
  text: ['gemini-2.5-flash', 'gemini-2.0-flash'],
  tts:  ['gemini-2.5-flash-preview-tts', 'gemini-2.0-flash-preview-tts'],
};

// ── Taal config ───────────────────────────────────────────────────────────
const LANG = {
  it: {
    code: 'it', label: '🇮🇹 Italiano', speechLang: 'it-IT',
    title: 'Lo Specchio delle Fate',
    qName: 'Sono lo Specchio delle Fate.\nCome ti chiami?',
    qNameSpoken: 'Sono lo Specchio delle Fate. Come ti chiami?',
    qDate: (n) => `Che bello conoscerti, ${n}!\nQuando sei nato/a?`,
    qDateSpoken: (n) => `Che bello conoscerti, ${n}! Quando sei nato o nata?`,
    namePlaceholder: 'Scrivi il tuo nome...',
    datePlaceholder: '4 aprile · 15-04',
    dateHint: 'Es: 4 aprile · 15-04 · aprile 4',
    btnNext: 'Avanti ✨', btnShow: 'Mostrami ✦',
    btnNextChild: '✨ Prossimo bambino ✨',
    btnNextHint: 'Tocca per un altro bambino',
    thinking: 'Lo specchio sta pensando... ✨',
    noKey: 'Nessuna chiave API 🔑',
    badDate: 'Non capisco la data. Es: 4 aprile · 15-04 ✨',
    noName: 'Dimmi prima il tuo nome! 🌟',
    notHeard: 'Non ho capito 🌟',
    micError: 'Microfono non disponibile 🎤',
    listening: 'Sto ascoltando... 👂',
    fallbackNote: '✦ Lo specchio parla dalla sua memoria incantata ✦',
    bannerToday: '🎂 Oggi è il tuo grande giorno!',
    bannerSoon: (d) => `⏳ Ancora ${d} giorno${d===1?'':'i'} al tuo compleanno!`,
    bannerPast: (d) => `🎉 Auguri! ${Math.abs(d)} giorno${Math.abs(d)===1?'':'i'} fa!`,
    factHeader: '✦ Nel tuo giorno ✦',
    keyTitle: '🔑 Chiave API Gemini',
    keyHint: 'Inserisci la tua chiave Gemini.\nSalvata solo su questo dispositivo.',
    keyCancel: 'Annulla', keySave: 'Salva ✦',
    keyBtn: (has) => has ? 'Chiave API ✓' : 'Imposta chiave API',
    emoji: { name: '🧚🪄', date: '🎂' },
    system: 'Sei lo Specchio delle Fate, uno specchio magico di una foresta incantata italiana. Parla con calore, gioia e semplicità per i bambini. Stile poetico e fiabesco. Rispondi SOLO come JSON senza markdown.',
    buildPrompt: (name, day, month, daysUntil) => {
      const mese = ['gennaio','febbraio','marzo','aprile','maggio','giugno',
        'luglio','agosto','settembre','ottobre','novembre','dicembre'][month-1];
      let timing = '';
      if (daysUntil===0) timing='OGGI è il compleanno!';
      else if (daysUntil>0&&daysUntil<=7) timing=`Fra ${daysUntil} giorn${daysUntil===1?'o':'i'} è il compleanno.`;
      else if (daysUntil<0&&daysUntil>=-7) timing=`Il compleanno era ${Math.abs(daysUntil)} giorn${Math.abs(daysUntil)===1?'o':'i'} fa.`;
      return `Bambino/a: ${name} | Compleanno: ${day} ${mese} | ${timing}

Dai un messaggio di auguri personale (max 3 frasi) E esattamente 2 o 3 curiosità storiche vere del ${day} ${mese} che i bambini trovano affascinanti (artisti, animali, giocattoli, parchi, cartoni, invenzioni).

Rispondi SOLO come JSON senza markdown:
{"it":"...","nl":"...","facts":[{"year":1984,"it":"...","nl":"..."}]}

"nl" è la traduzione olandese naturale del messaggio.`;
    },
  },
  nl: {
    code: 'nl', label: '🇳🇱 Nederlands', speechLang: 'nl-NL',
    title: 'De Feeënspiegel',
    qName: 'Ik ben de Feeënspiegel.\nHoe heet jij?',
    qNameSpoken: 'Ik ben de Feeënspiegel. Hoe heet jij?',
    qDate: (n) => `Fijn om je te ontmoeten, ${n}!\nWanneer ben jij geboren?`,
    qDateSpoken: (n) => `Fijn om je te ontmoeten, ${n}! Wanneer ben jij geboren?`,
    namePlaceholder: 'Typ je naam...',
    datePlaceholder: '4 april · 15-04',
    dateHint: 'Bijv: 4 april · 15-04 · april 4',
    btnNext: 'Verder ✨', btnShow: 'Toon mij ✦',
    btnNextChild: '✨ Volgend kind ✨',
    btnNextHint: 'Tik hier voor een ander kind',
    thinking: 'De spiegel denkt na... ✨',
    noKey: 'Geen API sleutel 🔑',
    badDate: 'Ik begrijp de datum niet. Bijv: 4 april · 15-04 ✨',
    noName: 'Vertel mij eerst hoe je heet! 🌟',
    notHeard: 'Niet goed gehoord 🌟',
    micError: 'Microfoon werkt niet 🎤',
    listening: 'Ik luister... 👂',
    fallbackNote: '✦ De spiegel spreekt uit haar betoverde geheugen ✦',
    bannerToday: '🎂 Vandaag is jouw grote dag!',
    bannerSoon: (d) => `⏳ Nog ${d} dag${d===1?'':'en'} tot jouw verjaardag!`,
    bannerPast: (d) => `🎉 Gefeliciteerd! ${Math.abs(d)} dag${Math.abs(d)===1?'':'en'} geleden!`,
    factHeader: '✦ Op jouw dag ✦',
    keyTitle: '🔑 Gemini API Sleutel',
    keyHint: 'Voer je Gemini sleutel in.\nAlleen op dit apparaat opgeslagen.',
    keyCancel: 'Annuleer', keySave: 'Opslaan ✦',
    keyBtn: (has) => has ? 'API sleutel ✓' : 'API sleutel instellen',
    emoji: { name: '🧚🪄', date: '🎂' },
    system: 'Je bent de Feeënspiegel in een betoverd sprookjesbos. Spreek warm, vrolijk en kindvriendelijk. Poëtisch en sprookjesachtig. Antwoord ALLEEN als JSON zonder markdown.',
    buildPrompt: (name, day, month, daysUntil) => {
      const maand = ['januari','februari','maart','april','mei','juni',
        'juli','augustus','september','oktober','november','december'][month-1];
      let timing = '';
      if (daysUntil===0) timing='VANDAAG is de verjaardag!';
      else if (daysUntil>0&&daysUntil<=7) timing=`Over ${daysUntil} dag${daysUntil===1?'':'en'} is de verjaardag.`;
      else if (daysUntil<0&&daysUntil>=-7) timing=`De verjaardag was ${Math.abs(daysUntil)} dag${Math.abs(daysUntil)===1?'':'en'} geleden.`;
      return `Kind: ${name} | Verjaardag: ${day} ${maand} | ${timing}

Geef een persoonlijke verjaardagsboodschap (max 3 zinnen) EN precies 2 of 3 echte historische feitjes van ${day} ${maand} die kinderen leuk vinden.

Antwoord ALLEEN als JSON zonder markdown:
{"it":"...","nl":"...","facts":[{"year":1984,"it":"...","nl":"..."}]}

"it" is de Italiaanse vertaling van de boodschap.`;
    },
  },
};

const STEP = { LANG: 'lang', NAME: 'name', DATE: 'date', DONE: 'done' };

// ── Retry helper ──────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchWithRetry(fn, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000))
      ]);
    } catch (err) {
      const isLast = attempt === maxAttempts;
      const isRetryable = ['timeout','503','overloaded','network'].some(s => err?.message?.includes(s));
      if (isLast || !isRetryable) throw err;
      await sleep(attempt * 1500);
    }
  }
}

// ── Gemini TTS met model-fallback + afkap fix ─────────────────────────────
async function geminiTTS(text, apiKey) {
  let lastErr;
  for (const model of MODELS.tts) {
    try {
      const resp = await fetch(
        `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } },
            },
          }),
        }
      );
      if (!resp.ok) throw new Error('TTS ' + resp.status);
      const data = await resp.json();
      const b64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!b64) throw new Error('No audio data');

      // Decode raw PCM → AudioContext
      const raw = atob(b64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

      // Keep AudioContext alive until playback is fully done
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
      const buf = ctx.createBuffer(1, float32.length, 24000);
      buf.copyToChannel(float32, 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);

      return new Promise((resolve, reject) => {
        src.onended = () => {
          // kleine marge zodat laatste milliseconden niet worden afgeknipt
          setTimeout(() => { ctx.close(); resolve(); }, 250);
        };
        src.onerror = (e) => { ctx.close(); reject(e); };
        src.start(0);
      });
    } catch (err) {
      lastErr = err;
      // probeer volgend TTS model
    }
  }
  throw lastErr;
}

// ── Browser TTS fallback ──────────────────────────────────────────────────
const getVoices = () => new Promise(resolve => {
  const v = window.speechSynthesis.getVoices();
  if (v.length) { resolve(v); return; }
  window.speechSynthesis.onvoiceschanged = () => resolve(window.speechSynthesis.getVoices());
  setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500);
});

async function browserSpeak(text, langCode = 'it', onEnd = () => {}) {
  if (!text) { onEnd(); return; }
  window.speechSynthesis.cancel();
  const voices = await getVoices();
  const bcp = langCode === 'it' ? 'it-IT' : 'nl-NL';
  const pick = voices.find(v => v.lang.startsWith(langCode) && /female|woman|donna/i.test(v.name))
    || voices.find(v => v.lang.startsWith(langCode))
    || voices.find(v => v.lang === bcp)
    || voices[0];
  const utt = new SpeechSynthesisUtterance(text);
  if (pick) utt.voice = pick;
  utt.lang = bcp;
  utt.rate = 0.84; utt.pitch = 1.1;
  utt.onend = onEnd; utt.onerror = onEnd;
  window.speechSynthesis.speak(utt);
}

// ── Spreek tekst (Gemini → browser fallback) ──────────────────────────────
async function speakText(text, langCode, apiKey, onStart = () => {}, onEnd = () => {}) {
  if (!text) { onEnd(); return; }
  onStart();
  if (apiKey) {
    try {
      await geminiTTS(text, apiKey);
      onEnd();
      return;
    } catch { /* val terug op browser */ }
  }
  browserSpeak(text, langCode, onEnd);
}

// ── Spreek boodschap + feitjes als één geheel ─────────────────────────────
async function speakAll(tekst, facts, langCode, apiKey, onStart, onEnd) {
  if (!tekst) { onEnd?.(); return; }
  const intro = langCode === 'it'
    ? 'E sapevi che in questo giorno sono accadute cose meravigliose? '
    : 'En wist je dat er op jouw verjaardag bijzondere dingen zijn gebeurd? ';
  const factsTekst = facts.length > 0
    ? intro + facts.map(f => `Nel ${f.year}: ${f[langCode] || f.it || f.nl}`).join('. ') + '.'
    : '';
  const volledig = factsTekst ? `${tekst} ${factsTekst}` : tekst;
  await speakText(volledig, langCode, apiKey, onStart, onEnd);
}

// ── Fallback boodschappen ─────────────────────────────────────────────────
function buildFallback(name, day, month, daysUntil, lang) {
  const mesi = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  const mnd  = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
  const mese = mesi[month-1], maand = mnd[month-1];
  let it='', nl='';
  if (daysUntil===0) {
    it=`Oggi è il tuo giorno magico, ${name}! Il mondo intero è felice che tu ci sia!`;
    nl=`Vandaag is jouw magische dag, ${name}! De hele wereld is blij dat jij er bent!`;
  } else if (daysUntil>0&&daysUntil<=7) {
    it=`Mancano solo ${daysUntil} giorn${daysUntil===1?'o':'i'}, ${name}! Il tuo compleanno sta arrivando!`;
    nl=`Nog maar ${daysUntil} dag${daysUntil===1?'':'en'}, ${name}! Jouw verjaardag komt er heel snel aan!`;
  } else if (daysUntil<0&&daysUntil>=-7) {
    it=`Auguri in ritardo, ${name}! Il tuo giorno speciale era solo ${Math.abs(daysUntil)} giorn${Math.abs(daysUntil)===1?'o':'i'} fa.`;
    nl=`Gefeliciteerd, ${name}! Jouw bijzondere dag was maar ${Math.abs(daysUntil)} dag${Math.abs(daysUntil)===1?'':'en'} geleden.`;
  } else {
    it=`Che meraviglia essere nati il ${day} ${mese}, ${name}! È un giorno davvero magico.`;
    nl=`Wat bijzonder dat jij op ${day} ${maand} geboren bent, ${name}! Dat is een heel magische dag.`;
  }
  const itMsg = `${it} Lo Specchio delle Fate sa che sei una persona speciale. Chiudi gli occhi ed esprimi un desiderio — a volte si avverano davvero! ✨`;
  const nlMsg = `${nl} De Feeënspiegel weet dat jij bijzonder bent. Sluit je ogen en maak een wens — soms komen die echt uit! ✨`;

  const feiten = {
    inverno:  [{year:1812,it:'I fratelli Grimm scrissero il loro primo libro di fiabe magiche per i bambini.',nl:'De gebroeders Grimm schreven hun eerste sprookjesboek vol magische verhalen.'},{year:1955,it:'Aprì il primo Disneyland, un parco delle fate pieno di sogni e magia.',nl:'Het eerste Disneyland opende zijn poorten, een echt sprookjespark vol dromen.'}],
    primavera:[{year:1937,it:'Biancaneve fu il primo film d\'animazione lungo della storia — e vissero felici e contenti!',nl:'Sneeuwwitje was de eerste lange animatiefilm ooit — en ze leefden nog lang en gelukkig!'},{year:1989,it:'La Sirenetta nuotò per la prima volta sullo schermo grande, incantando il mondo.',nl:'De Kleine Zeemeermin zwom voor het eerst op het doek en betoverde de hele wereld.'}],
    estate:   [{year:1865,it:'Alice scoprì il Paese delle Meraviglie cadendo nella tana del coniglio.',nl:'Alice ontdekte Wonderland door in het konijnenhol te vallen.'},{year:1997,it:'Harry Potter salì per la prima volta sulla sua scopa magica e volò verso Hogwarts.',nl:'Harry Potter vloog voor het eerst op zijn bezemsteel naar Hogwarts.'}],
    autunno:  [{year:1928,it:'Topolino parlò per la prima volta, dando inizio a un mondo magico di cartoni animati.',nl:'Mickey Mouse sprak voor het eerst, het begin van een magische wereld vol tekenfilms.'},{year:1889,it:'Aprì la Torre Eiffel, alta come il cappello di un mago gigante!',nl:'De Eiffeltoren opende zijn deuren, zo hoog als de hoed van een reuzentovenaars!'}],
  };
  const stagione = [12,1,2].includes(month)?'inverno':[3,4,5].includes(month)?'primavera':[6,7,8].includes(month)?'estate':'autunno';
  return { it:itMsg, nl:nlMsg, facts:feiten[stagione], _isFallback:true };
}

// ── Datum parser ──────────────────────────────────────────────────────────
function parseBirthDate(input) {
  const raw = input.trim().toLowerCase();
  const M = {
    gennaio:1,gen:1,january:1,jan:1,januari:1,
    febbraio:2,feb:2,february:2,februari:2,
    marzo:3,mar:3,march:3,maart:3,mrt:3,
    aprile:4,apr:4,april:4,
    maggio:5,mag:5,may:5,mei:5,
    giugno:6,giu:6,june:6,juni:6,jun:6,
    luglio:7,lug:7,july:7,juli:7,jul:7,
    agosto:8,ago:8,august:8,augustus:8,aug:8,
    settembre:9,set:9,september:9,sep:9,sept:9,
    ottobre:10,ott:10,october:10,oktober:10,okt:10,oct:10,
    novembre:11,nov:11,november:11,
    dicembre:12,dic:12,december:12,
  };
  const mm = raw.match(/\b(gennaio|gen|febbraio|feb|marzo|mar|aprile|apr|maggio|mag|giugno|giu|luglio|lug|agosto|ago|settembre|set|ottobre|ott|novembre|nov|dicembre|dic|januari|februari|maart|mrt|april|mei|juni|juli|augustus|september|sept|oktober|okt|november|december|january|february|march|may|june|july|august|october)\b/);
  if (mm) {
    const month = M[mm[1]];
    const nums = raw.match(/\d+/g)?.map(Number) || [];
    const day = nums.find(n => n>=1&&n<=31);
    if (day&&month) return { day, month };
  }
  const clean = raw.replace(/[\/\.\s]/g,'-');
  const parts = clean.split('-').map(p => parseInt(p,10));
  if (parts.length>=2) {
    const [a,b] = parts;
    if (a>=1&&a<=31&&b>=1&&b<=12) return { day:a, month:b };
    if (b>=1&&b<=31&&a>=1&&a<=12) return { day:b, month:a };
  }
  return null;
}

function computeDaysUntil(day, month) {
  const now = new Date(), y = now.getFullYear();
  let bd = new Date(y, month-1, day);
  const diff = Math.round((bd-now)/86400000);
  if (diff>180)  { bd=new Date(y-1,month-1,day); return Math.round((bd-now)/86400000); }
  if (diff<-180) { bd=new Date(y+1,month-1,day); return Math.round((bd-now)/86400000); }
  return diff;
}

// ── Renaissance Frame SVG ─────────────────────────────────────────────────
function RenaissanceFrame({ W=300, H=420 }) {
  const cx=W/2, cy=H/2, rx=cx-12, ry=cy-12;

  const laurierPts = [
    {a:0,emoji:'🏺',fs:20,off:15},{a:16,emoji:'🌿',fs:15,off:5},
    {a:30,emoji:'🍃',fs:12,off:-2},{a:44,emoji:'🌿',fs:14,off:4},
    {a:58,emoji:'⚜️',fs:18,off:13},{a:72,emoji:'🌿',fs:13,off:3},
    {a:86,emoji:'🍃',fs:11,off:-3},{a:100,emoji:'🌿',fs:14,off:5},
    {a:114,emoji:'🏺',fs:19,off:14},{a:128,emoji:'🍃',fs:11,off:-2},
    {a:142,emoji:'🌿',fs:15,off:4},{a:156,emoji:'⚜️',fs:17,off:12},
    {a:170,emoji:'🌿',fs:13,off:3},{a:180,emoji:'🏺',fs:20,off:15},
    {a:194,emoji:'🍃',fs:11,off:-3},{a:208,emoji:'🌿',fs:14,off:4},
    {a:222,emoji:'⚜️',fs:17,off:12},{a:236,emoji:'🌿',fs:13,off:3},
    {a:250,emoji:'🍃',fs:11,off:-2},{a:264,emoji:'🌿',fs:14,off:5},
    {a:278,emoji:'🏺',fs:19,off:14},{a:292,emoji:'🍃',fs:11,off:-3},
    {a:306,emoji:'🌿',fs:14,off:4},{a:320,emoji:'⚜️',fs:17,off:12},
    {a:334,emoji:'🌿',fs:13,off:3},{a:348,emoji:'🍃',fs:12,off:-2},
  ];

  function ptOn(deg, off=0) {
    const a=(deg-90)*Math.PI/180;
    return [cx+(rx+off)*Math.cos(a), cy+(ry+off)*Math.sin(a)];
  }

  const festoen = Array.from({length:73},(_,i)=>{
    const angle=i*5, wave=Math.sin(i*1.1)*5;
    const [x,y]=ptOn(angle,wave);
    return `${i===0?'M':'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ')+'Z';

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
      style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2}}>
      <defs>
        <linearGradient id="rG1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#fff3b0"/>
          <stop offset="20%"  stopColor="#c8960a"/>
          <stop offset="50%"  stopColor="#8B5E00"/>
          <stop offset="78%"  stopColor="#d4a520"/>
          <stop offset="100%" stopColor="#6b4400"/>
        </linearGradient>
        <linearGradient id="rG2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#ffe98a"/>
          <stop offset="45%"  stopColor="#b07a08"/>
          <stop offset="100%" stopColor="#f0d060"/>
        </linearGradient>
        <radialGradient id="rMed" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fff3b0"/>
          <stop offset="40%"  stopColor="#d4a520"/>
          <stop offset="100%" stopColor="#6b3c00"/>
        </radialGradient>
        <filter id="rGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="b"/>
          <feComposite in="SourceGraphic" in2="b" operator="over"/>
        </filter>
        <filter id="leafShadow">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#3a1a00" floodOpacity="0.6"/>
        </filter>
        <filter id="goldShadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1a0800" floodOpacity="0.7"/>
        </filter>
      </defs>

      <path d={festoen} fill="none" stroke="#2d5a1a" strokeWidth="5.5" opacity="0.5"/>
      <path d={festoen} fill="none" stroke="#4a8a2a" strokeWidth="3"   opacity="0.8"/>
      <path d={festoen} fill="none" stroke="#8dc45a" strokeWidth="1"   opacity="0.2" strokeDasharray="4 10"/>
      <ellipse cx={cx} cy={cy} rx={rx}    ry={ry}    fill="none" stroke="url(#rG1)" strokeWidth="7"/>
      <ellipse cx={cx} cy={cy} rx={rx-10} ry={ry-10} fill="none" stroke="url(#rG2)" strokeWidth="2" opacity="0.7"/>
      <ellipse cx={cx} cy={cy} rx={rx-16} ry={ry-16} fill="none" stroke="#f0d060"   strokeWidth="0.6" opacity="0.22"/>

      {[0,90,180,270].map((deg,i)=>{
        const [px,py]=ptOn(deg,0), [px2,py2]=ptOn(deg,-18);
        return <line key={i} x1={px} y1={py} x2={px2} y2={py2} stroke="url(#rG1)" strokeWidth="3" opacity="0.55"/>;
      })}

      {laurierPts.map((p,i)=>{
        const [px,py]=ptOn(p.a,p.off);
        return <text key={i} x={px} y={py} fontSize={p.fs} textAnchor="middle" dominantBaseline="middle"
          transform={`rotate(${p.a-90},${px},${py})`} filter="url(#leafShadow)" style={{userSelect:'none'}}>{p.emoji}</text>;
      })}

      {[0,90,180,270].map((deg,i)=>{
        const [mx,my]=ptOn(deg,0);
        return (<g key={i}>
          <circle cx={mx} cy={my} r={10} fill="url(#rMed)" filter="url(#goldShadow)"/>
          <circle cx={mx} cy={my} r={7}  fill="#1a0600"/>
          <text x={mx} y={my} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#f5d060" style={{userSelect:'none'}}>✦</text>
        </g>);
      })}

      <circle cx={cx} cy={14} r={28} fill="url(#rG1)" filter="url(#rGlow)"/>
      <circle cx={cx} cy={14} r={23} fill="#1a0800"/>
      <text x={cx} y={22} textAnchor="middle" fontSize="22" style={{userSelect:'none'}}>🪞</text>
      <line x1={cx} y1={42} x2={cx} y2={cy-ry} stroke="url(#rG1)" strokeWidth="3" opacity="0.8"/>
      <circle cx={cx} cy={43} r={5} fill="url(#rMed)"/>
      <path d={`M${cx-55} ${H-18} Q${cx} ${H-4} ${cx+55} ${H-18}`} fill="none" stroke="url(#rG1)" strokeWidth="3"/>
      <circle cx={cx} cy={H-3} r={7} fill="url(#rMed)"/>
      {[-34,-17,17,34].map((dx,i)=>
        <circle key={i} cx={cx+dx} cy={H-15} r={i%2===0?4:2.5} fill="#c8960a" opacity={i%2===0?0.85:0.5}/>
      )}
    </svg>
  );
}

// ── Vuurvliegjes ──────────────────────────────────────────────────────────
const FIREFLIES = Array.from({length:18},(_,i)=>({
  id:i, x:Math.random()*100, y:Math.random()*100,
  delay:Math.random()*5, dur:4+Math.random()*4,
  dx:(Math.random()-.5)*70, dy:(Math.random()-.5)*50,
  color:['#f5e642','#ffd090','#fff8c0','#e8b830'][i%4],
}));
const PARTICLES = Array.from({length:14},(_,i)=>({
  id:i, x:5+Math.random()*90, y:5+Math.random()*90,
  size:3+Math.random()*7, delay:Math.random()*3, dur:2+Math.random()*2.5,
  color:['#f5e642','#fff8c0','#ffb347','#e8c84a','#ffd090'][i%5],
}));

// ── Spiegelinhoud ─────────────────────────────────────────────────────────
function MirrorContent({
  step, lang, onSelectLang,
  name, setName, birthInput, setBirthInput,
  onListen, isListening, listenTarget, onConfirm,
  message, isThinking, setLang, onSpeak,
}) {
  const isDone = step===STEP.DONE;
  const isName = step===STEP.NAME;
  const L = LANG[lang];

  // Taalkeuze
  if (step===STEP.LANG) return (
    <motion.div key="lang"
      initial={{opacity:0,scale:0.88}} animate={{opacity:1,scale:1}}
      exit={{opacity:0,scale:0.88}} transition={{duration:0.4}}
      style={{
        position:'absolute',inset:0,display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',
        padding:'12px 16px',background:'rgba(14,6,2,0.93)',
        borderRadius:'50% 50% 47% 47%',zIndex:10,gap:14,
      }}
    >
      <div style={{fontSize:28}}>🪞</div>
      <p style={{color:'#f5d060',fontSize:12,textAlign:'center',margin:0,
        fontFamily:"'Cinzel',serif",letterSpacing:'0.08em',
        textShadow:'0 0 12px rgba(245,208,96,0.5)',lineHeight:1.7}}>
        Scegli la lingua
        <br/><span style={{opacity:0.42,fontSize:9.5,fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic'}}>Kies je taal</span>
      </p>
      {Object.values(LANG).map(l=>(
        <button key={l.code} onClick={()=>onSelectLang(l.code)} style={{
          padding:'10px 0',borderRadius:22,width:'78%',
          background:'linear-gradient(135deg,rgba(180,130,20,0.14),rgba(180,130,20,0.06))',
          border:'1.5px solid rgba(245,208,96,0.38)',
          color:'#f5d060',fontSize:14,cursor:'pointer',
          fontFamily:"'Cinzel',serif",letterSpacing:'0.08em',
          transition:'all 0.18s',boxShadow:'0 2px 12px rgba(0,0,0,0.3)',
        }}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(180,130,20,0.28)'}
          onMouseLeave={e=>e.currentTarget.style.background='linear-gradient(135deg,rgba(180,130,20,0.14),rgba(180,130,20,0.06))'}
        >{l.label}</button>
      ))}
    </motion.div>
  );

  // Naam / Datum
  if (!isDone) return (
    <motion.div key={step}
      initial={{opacity:0,scale:0.88}} animate={{opacity:1,scale:1}}
      exit={{opacity:0,scale:0.88}} transition={{duration:0.4}}
      style={{
        position:'absolute',inset:0,display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',
        padding:'12px 16px',background:'rgba(14,6,2,0.93)',
        borderRadius:'50% 50% 47% 47%',zIndex:10,gap:8,
      }}
    >
      <div style={{fontSize:26}}>{isName?L.emoji.name:L.emoji.date}</div>
      <p style={{color:'#f5d060',fontSize:12,textAlign:'center',margin:0,
        lineHeight:1.5,fontFamily:"'Cinzel',serif",
        textShadow:'0 0 12px rgba(245,208,96,0.5)',letterSpacing:'0.03em',
        whiteSpace:'pre-line'}}>
        {isName?L.qName:L.qDate(name)}
      </p>
      <input
        value={isName?name:birthInput}
        onChange={e=>isName?setName(e.target.value):setBirthInput(e.target.value)}
        onKeyDown={e=>e.key==='Enter'&&onConfirm()}
        placeholder={isName?L.namePlaceholder:L.datePlaceholder}
        autoFocus
        style={{
          background:'rgba(245,208,96,0.06)',
          border:'1px solid rgba(245,208,96,0.32)',
          borderRadius:12,padding:'7px 12px',
          color:'#f5d060',fontSize:14,textAlign:'center',
          outline:'none',fontFamily:"'Cormorant Garamond',serif",
          width:'84%',letterSpacing:'0.04em',
        }}
      />
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <button onClick={()=>onListen(step)} style={{
          width:36,height:36,borderRadius:'50%',
          background:isListening&&listenTarget===step?'rgba(180,40,40,0.85)':'rgba(245,208,96,0.10)',
          border:'1.5px solid rgba(245,208,96,0.35)',cursor:'pointer',fontSize:15,
          display:'flex',alignItems:'center',justifyContent:'center',
        }}>
          {isListening&&listenTarget===step?'🔴':'🎤'}
        </button>
        <button onClick={onConfirm} style={{
          padding:'7px 16px',borderRadius:20,
          background:'linear-gradient(135deg,#8B5E00,#d4a520,#f5d060)',
          border:'none',color:'#1a0800',fontWeight:700,fontSize:11.5,cursor:'pointer',
          fontFamily:"'Cinzel',serif",boxShadow:'0 2px 12px rgba(180,130,20,0.5)',
          letterSpacing:'0.06em',
        }}>
          {isName?L.btnNext:L.btnShow}
        </button>
      </div>
      {!isName&&(
        <p style={{fontSize:8.5,color:'rgba(245,208,96,0.24)',margin:0,
          fontFamily:"'Cormorant Garamond',serif",textAlign:'center'}}>
          {L.dateHint}
        </p>
      )}
    </motion.div>
  );

  // Resultaat
  return (
    <motion.div key="done" initial={{opacity:0}} animate={{opacity:1}}
      style={{
        position:'absolute',inset:0,display:'flex',flexDirection:'column',
        alignItems:'center',padding:'8px 13px 12px',
        background:'rgba(12,5,1,0.88)',borderRadius:'50% 50% 47% 47%',
        zIndex:10,overflowY:'auto',gap:0,
      }}
    >
      {/* Taalvlaggen + 🔊 */}
      <div style={{display:'flex',gap:5,alignItems:'center',justifyContent:'center',
        width:'100%',marginBottom:5,marginTop:3,flexShrink:0}}>
        {['it','nl'].map(l=>(
          <button key={l} onClick={()=>setLang(l)} style={{
            padding:'2px 9px',borderRadius:10,fontSize:10,cursor:'pointer',
            background:lang===l?'rgba(180,130,20,0.32)':'rgba(180,130,20,0.07)',
            border:`1px solid ${lang===l?'rgba(245,208,96,0.65)':'rgba(245,208,96,0.16)'}`,
            color:lang===l?'#f5d060':'rgba(245,208,96,0.32)',
            fontFamily:"'Cinzel',serif",letterSpacing:'0.06em',transition:'all 0.2s',
          }}>
            {l==='it'?'🇮🇹 IT':'🇳🇱 NL'}
          </button>
        ))}
        <button onClick={onSpeak} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,opacity:0.52,padding:'0 2px'}}>🔊</button>
      </div>

      {isThinking?(
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{display:'flex',gap:7}}>
            {[0,200,400].map((d,i)=>(
              <div key={i} style={{width:9,height:9,borderRadius:'50%',background:'#f5d060',
                animation:`bounce 1s ease-in-out ${d}ms infinite`,boxShadow:'0 0 7px #f5d060'}}/>
            ))}
          </div>
        </div>
      ):message?(
        <div style={{display:'flex',flexDirection:'column',gap:5,width:'100%',overflowY:'auto'}}>
          <p style={{margin:0,color:'#f5d060',lineHeight:1.62,fontSize:12,
            fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',textAlign:'center',
            textShadow:'0 0 10px rgba(245,208,96,0.16)'}}>
            ✨ {message[lang]||message.it}
          </p>
          {(message.facts||[]).length>0&&(
            <div style={{borderTop:'1px solid rgba(180,130,20,0.18)',paddingTop:5,
              display:'flex',flexDirection:'column',gap:4}}>
              <p style={{margin:'0 0 2px',fontSize:7.5,color:'rgba(180,130,20,0.48)',
                letterSpacing:'0.14em',textTransform:'uppercase',
                fontFamily:"'Cinzel',serif",textAlign:'center'}}>
                {L.factHeader}
              </p>
              {message.facts.map((f,i)=>(
                <div key={i} style={{background:'rgba(245,208,96,0.03)',
                  border:'1px solid rgba(180,130,20,0.13)',borderRadius:8,padding:'4px 8px'}}>
                  <span style={{color:'#c8960a',fontSize:9,fontWeight:700,fontFamily:"'Cinzel',serif"}}>{f.year} · </span>
                  <span style={{color:'rgba(245,208,96,0.68)',fontSize:10,
                    fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic'}}>
                    {f[lang]||f.it}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ):null}
    </motion.div>
  );
}

// ── Hoofd component ───────────────────────────────────────────────────────
export default function SpecchioFate() {
  const [step, setStep]               = useState(STEP.LANG);
  const [lang, setLang]               = useState('it');
  const [name, setName]               = useState('');
  const [birthInput, setBirthInput]   = useState('');
  const [message, setMessage]         = useState(null);
  const [status, setStatus]           = useState('');
  const [isListening, setIsListening] = useState(false);
  const [listenTarget, setListenTarget] = useState(null);
  const [isThinking, setIsThinking]   = useState(false);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [daysInfo, setDaysInfo]       = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKey] = useState(()=>{
    if (ENV_KEY) return ENV_KEY;
    try { return localStorage.getItem('specchio_fate_gemini_key')||''; } catch { return ''; }
  });

  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const recRef    = useRef(null);

  // Camera
  useEffect(()=>{
    (async()=>{
      try {
        const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
        streamRef.current=stream;
        if (videoRef.current) videoRef.current.srcObject=stream;
      } catch {}
    })();
    return ()=>streamRef.current?.getTracks().forEach(t=>t.stop());
  },[]);

  // Spreek vraag voor
  useEffect(()=>{
    if (step===STEP.LANG||step===STEP.DONE) return;
    let cancelled=false;
    const L=LANG[lang];
    const tekst=step===STEP.NAME?L.qNameSpoken:L.qDateSpoken(name);
    const delay=setTimeout(()=>{
      if (cancelled) return;
      speakText(tekst,lang,apiKey,()=>setIsSpeaking(true),()=>{ if (!cancelled) setIsSpeaking(false); });
    },500);
    return ()=>{ cancelled=true; clearTimeout(delay); window.speechSynthesis.cancel(); };
  },[step,lang]);

  const L = LANG[lang];

  const selectLang=(code)=>{ setLang(code); setStep(STEP.NAME); };

  const confirmName=()=>{
    if (!name.trim()) { setStatus(L.noName); return; }
    setStatus(''); setStep(STEP.DATE);
  };

  const confirmDate=()=>{
    const parsed=parseBirthDate(birthInput);
    if (!parsed) { setStatus(L.badDate); return; }
    const days=computeDaysUntil(parsed.day,parsed.month);
    setDaysInfo(days); setStatus('');
    setStep(STEP.DONE);
    fetchMessage(name,parsed.day,parsed.month,days);
  };

  const startListening=(target)=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if (!SR) { setStatus(L.micError); return; }
    try { recRef.current?.stop(); } catch {}
    const rec=new SR();
    recRef.current=rec;
    rec.lang=L.speechLang; rec.continuous=false; rec.interimResults=false;
    rec.onstart =()=>{ setIsListening(true);  setListenTarget(target); setStatus(L.listening); };
    rec.onend   =()=>{ setIsListening(false); setListenTarget(null);   setStatus(''); };
    rec.onerror =()=>{ setIsListening(false); setListenTarget(null);   setStatus(L.notHeard); };
    rec.onresult=(e)=>{
      const heard=e.results[0][0].transcript;
      if (target===STEP.NAME) setName(heard.replace(/[^a-zA-ZÀ-ÿ\s'-]/g,'').trim());
      else setBirthInput(heard);
    };
    rec.start();
  };

  // ── Gemini tekstgeneratie met model-fallback ──────────────────────────
  const fetchMessage=async(n,day,month,days)=>{
    if (!apiKey) { setStatus(L.noKey); return; }
    setIsThinking(true); setMessage(null); setStatus(L.thinking);

    let resp, lastErr;
    try {
      for (const model of MODELS.text) {
        try {
          resp=await fetchWithRetry(()=>
            fetch(`${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`,{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({
                contents:[{parts:[{text:L.buildPrompt(n,day,month,days)}]}],
                systemInstruction:{parts:[{text:L.system}]},
                generationConfig:{temperature:0.9,maxOutputTokens:1200},
              }),
            }).then(r=>r.json())
          );
          if (resp.error) throw new Error(resp.error.message);
          break;
        } catch(err) { lastErr=err; }
      }
      if (!resp||resp.error) throw lastErr||new Error('Alle modellen faalden');

      const raw=resp.candidates?.[0]?.content?.parts?.[0]?.text||'{}';
      const data=JSON.parse(raw.replace(/```json|```/g,'').trim());
      setMessage(data); setStatus(''); setIsThinking(false);
      const tekst=data[lang]||data.it||'';
      if (tekst) speakAll(tekst,data.facts||[],lang,apiKey,()=>setIsSpeaking(true),()=>setIsSpeaking(false));
    } catch {
      setIsThinking(false);
      const fb=buildFallback(n,day,month,days,lang);
      setMessage(fb); setStatus('');
      const tekst=fb[lang]||fb.it||'';
      speakAll(tekst,fb.facts||[],lang,apiKey,()=>setIsSpeaking(true),()=>setIsSpeaking(false));
    }
  };

  const handleReset=()=>{
    window.speechSynthesis.cancel();
    setStep(STEP.LANG); setName(''); setBirthInput('');
    setMessage(null); setDaysInfo(null);
    setStatus(''); setIsSpeaking(false); setLang('it');
  };

  const banner=(()=>{
    if (daysInfo===null) return null;
    if (daysInfo===0)            return {text:L.bannerToday,          color:'#f5d060'};
    if (daysInfo>0&&daysInfo<=7) return {text:L.bannerSoon(daysInfo), color:'#ffb347'};
    if (daysInfo<0&&daysInfo>=-7)return {text:L.bannerPast(daysInfo), color:'#a8edea'};
    return null;
  })();

  const isDone=step===STEP.DONE;
  const FW=300, FH=420;

  return (
    <div style={S.app}>
      <style>{CSS}</style>
      <div style={S.bg}/><div style={S.bgFresco}/>

      {/* Vuurvliegjes */}
      <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,overflow:'hidden'}}>
        {FIREFLIES.map(f=>(
          <div key={f.id} style={{
            position:'absolute',left:`${f.x}%`,top:`${f.y}%`,
            width:4,height:4,borderRadius:'50%',background:f.color,
            boxShadow:`0 0 6px ${f.color}`,
            animation:`ffloat ${f.dur}s ease-in-out ${f.delay}s infinite`,
            '--dx':`${f.dx}px`,'--dy':`${f.dy}px`,
          }}/>
        ))}
      </div>

      {/* Titel */}
      <header style={S.header}>
        <div style={S.titleDiv}>✦ &nbsp; ✦ &nbsp; ✦</div>
        <h1 style={S.title}>
          {step===STEP.LANG?'Lo Specchio delle Fate':L.title}
        </h1>
        <div style={S.titleDiv}>✦ &nbsp; ✦ &nbsp; ✦</div>
      </header>

      {/* Banner */}
      <AnimatePresence>
        {banner&&(
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            style={{...S.banner,borderColor:banner.color,color:banner.color}}>
            {banner.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spiegel */}
      <div style={{...S.mirrorWrap,width:FW,height:FH}}>
        <RenaissanceFrame W={FW} H={FH}/>
        <div style={{
          position:'absolute',top:22,left:22,
          width:FW-44,height:FH-44,
          borderRadius:'50% 50% 47% 47%',
          overflow:'hidden',
          background:'linear-gradient(160deg,#0e0906 0%,#040200 100%)',
          animation:'mirrorPulse 4.5s ease-in-out infinite',zIndex:1,
        }}>
          <video ref={videoRef} autoPlay playsInline muted style={S.video}/>

          {isDone&&message&&(
            <div style={{position:'absolute',inset:0,pointerEvents:'none',
              overflow:'hidden',borderRadius:'50% 50% 47% 47%',zIndex:3}}>
              {PARTICLES.map(p=>(
                <div key={p.id} style={{
                  position:'absolute',left:`${p.x}%`,top:`${p.y}%`,
                  width:p.size,height:p.size,borderRadius:'50%',
                  background:p.color,opacity:0,
                  animation:`sparkle ${p.dur}s ease-in-out ${p.delay}s infinite`,
                  boxShadow:`0 0 ${p.size}px ${p.color}`,
                }}/>
              ))}
            </div>
          )}

          <AnimatePresence>
            <MirrorContent
              step={step} lang={lang} onSelectLang={selectLang}
              name={name} setName={setName}
              birthInput={birthInput} setBirthInput={setBirthInput}
              onListen={startListening}
              isListening={isListening} listenTarget={listenTarget}
              onConfirm={step===STEP.NAME?confirmName:confirmDate}
              message={message} isThinking={isThinking}
              setLang={(l)=>{
                setLang(l);
                if (message) {
                  const tekst=message[l]||message.it||'';
                  speakAll(tekst,message.facts||[],l,apiKey,()=>setIsSpeaking(true),()=>setIsSpeaking(false));
                }
              }}
              onSpeak={()=>{
                if (!message) return;
                const tekst=message[lang]||message.it||'';
                speakAll(tekst,message.facts||[],lang,apiKey,()=>setIsSpeaking(true),()=>setIsSpeaking(false));
              }}
            />
          </AnimatePresence>

          {isSpeaking&&(
            <div style={{position:'absolute',inset:-5,borderRadius:'50% 50% 47% 47%',
              border:'3px solid #f5d060',animation:'speakRing 1.2s ease-in-out infinite',
              pointerEvents:'none',zIndex:20}}/>
          )}
        </div>

        {isDone&&name&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{...S.nameBadge,bottom:-14}}>
            ✦ {name} ✦
          </motion.div>
        )}
      </div>

      {status&&<p style={S.status}>{status}</p>}

      <AnimatePresence>
        {message?._isFallback&&!isThinking&&(
          <motion.p initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{margin:'2px 0 0',fontSize:9.5,color:'rgba(245,208,96,0.26)',
              fontStyle:'italic',textAlign:'center',zIndex:5,
              fontFamily:"'Cormorant Garamond',serif"}}>
            {L.fallbackNote}
          </motion.p>
        )}
      </AnimatePresence>

      {isDone&&!isThinking&&message&&(
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:1.8}}
          style={{marginTop:16,display:'flex',flexDirection:'column',
            alignItems:'center',gap:5,zIndex:5}}>
          <button onClick={handleReset} style={S.btnNext}>{L.btnNextChild}</button>
          <p style={{margin:0,fontSize:9,color:'rgba(245,208,96,0.2)',
            fontStyle:'italic',fontFamily:"'Cormorant Garamond',serif"}}>
            {L.btnNextHint}
          </p>
        </motion.div>
      )}

      {!ENV_KEY&&(
        <button onClick={()=>setShowKeyModal(true)} style={S.btnKey}>
          <Key size={10} style={{marginRight:4}}/>
          {L.keyBtn(!!apiKey)}
        </button>
      )}

      <AnimatePresence>
        {showKeyModal&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={S.modal} onClick={e=>e.target===e.currentTarget&&setShowKeyModal(false)}>
            <div style={S.modalBox}>
              <h2 style={S.modalTitle}>{L.keyTitle}</h2>
              <p style={S.modalHint}>{L.keyHint}</p>
              <input type="password" id="keyInp" defaultValue={apiKey}
                placeholder="AIza..." style={S.modalInput}/>
              <div style={{display:'flex',gap:10,marginTop:16}}>
                <button onClick={()=>setShowKeyModal(false)} style={S.modalCancel}>{L.keyCancel}</button>
                <button onClick={()=>{
                  const k=document.getElementById('keyInp').value;
                  try { localStorage.setItem('specchio_fate_gemini_key',k); } catch {}
                  setShowKeyModal(false); window.location.reload();
                }} style={S.modalSave}>{L.keySave}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── CSS ───────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap');
  * { box-sizing:border-box; }
  input::placeholder { color:rgba(245,208,96,0.22); }
  @keyframes ffloat {
    0%   { opacity:0; transform:translate(0,0); }
    25%  { opacity:0.72; }
    50%  { opacity:0.2; transform:translate(var(--dx,20px),var(--dy,-18px)); }
    75%  { opacity:0.6; }
    100% { opacity:0; transform:translate(0,0); }
  }
  @keyframes sparkle {
    0%,100% { opacity:0; transform:scale(0.4); }
    50%     { opacity:0.82; transform:scale(1.3); }
  }
  @keyframes bounce {
    0%,100% { transform:translateY(0); opacity:0.35; }
    50%     { transform:translateY(-8px); opacity:1; }
  }
  @keyframes speakRing {
    0%,100% { opacity:0.25; transform:scale(1); }
    50%     { opacity:1; transform:scale(1.05); }
  }
  @keyframes mirrorPulse {
    0%,100% { box-shadow:0 0 36px rgba(180,130,20,0.18),0 0 70px rgba(180,130,20,0.05),inset 0 0 30px rgba(0,0,0,0.6); }
    50%     { box-shadow:0 0 60px rgba(180,130,20,0.42),0 0 110px rgba(180,130,20,0.14),inset 0 0 30px rgba(0,0,0,0.6); }
  }
  @keyframes titleShimmer {
    0%,100% { text-shadow:0 0 12px rgba(245,208,96,0.32),0 2px 4px rgba(0,0,0,0.9); }
    50%     { text-shadow:0 0 28px rgba(245,208,96,0.88),0 0 52px rgba(245,208,96,0.28),0 2px 4px rgba(0,0,0,0.9); }
  }
  @keyframes bannerGlow {
    0%,100% { box-shadow:0 0 10px rgba(245,208,96,0.16); }
    50%     { box-shadow:0 0 22px rgba(245,208,96,0.48); }
  }
`;

// ── Styles ────────────────────────────────────────────────────────────────
const S = {
  app: {
    minHeight:'100vh',background:'#0f0804',
    color:'#f0e0c0',fontFamily:"'Cormorant Garamond',serif",
    display:'flex',flexDirection:'column',alignItems:'center',
    padding:'0 0 48px',position:'relative',overflow:'hidden',
  },
  bg: {
    position:'fixed',inset:0,pointerEvents:'none',zIndex:0,
    background:'radial-gradient(ellipse at 50% 0%,rgba(80,38,6,0.72) 0%,rgba(14,8,2,0.96) 58%,#080401 100%)',
  },
  bgFresco: {
    position:'fixed',inset:0,pointerEvents:'none',zIndex:0,
    background:`
      radial-gradient(ellipse at 10% 95%,rgba(60,24,4,0.22) 0%,transparent 48%),
      radial-gradient(ellipse at 90% 95%,rgba(60,24,4,0.22) 0%,transparent 48%),
      radial-gradient(ellipse at 50% 100%,rgba(80,36,4,0.28) 0%,transparent 40%)`,
  },
  header: {
    width:'100%',maxWidth:480,padding:'8px 16px 4px',
    display:'flex',flexDirection:'column',alignItems:'center',
    position:'relative',zIndex:5,gap:3,
  },
  titleDiv: {
    fontSize:10,color:'rgba(245,208,96,0.28)',
    letterSpacing:'0.55em',fontFamily:"'Cinzel',serif",
  },
  title: {
    margin:'2px 0',fontSize:19,fontWeight:600,
    color:'#f5d060',letterSpacing:'0.12em',
    fontFamily:"'Cinzel',serif",
    animation:'titleShimmer 3.5s ease-in-out infinite',
  },
  banner: {
    width:'100%',maxWidth:360,margin:'3px 12px 4px',
    padding:'6px 14px',background:'rgba(20,10,2,0.9)',
    border:'1px solid',borderRadius:14,
    fontSize:12,textAlign:'center',zIndex:5,position:'relative',
    fontFamily:"'Cinzel',serif",letterSpacing:'0.04em',
    animation:'bannerGlow 2.5s ease-in-out infinite',
  },
  mirrorWrap: {
    position:'relative',display:'flex',alignItems:'center',justifyContent:'center',
    zIndex:5,marginBottom:6,marginTop:4,
  },
  video: {
    width:'100%',height:'100%',objectFit:'cover',
    transform:'scaleX(-1)',
    filter:'brightness(0.82) contrast(1.08) saturate(0.65) sepia(0.12)',
  },
  nameBadge: {
    position:'absolute',left:'50%',transform:'translateX(-50%)',
    background:'linear-gradient(135deg,rgba(30,14,2,0.97),rgba(18,8,0,0.97))',
    border:'1px solid rgba(180,130,20,0.48)',
    borderRadius:20,padding:'4px 20px',
    fontSize:11.5,color:'#f5d060',whiteSpace:'nowrap',zIndex:10,
    letterSpacing:'0.12em',fontFamily:"'Cinzel',serif",
    boxShadow:'0 2px 12px rgba(0,0,0,0.6)',
  },
  status: {
    fontSize:11.5,color:'rgba(245,208,96,0.45)',fontStyle:'italic',
    margin:'4px 12px',zIndex:5,textAlign:'center',position:'relative',
    maxWidth:340,lineHeight:1.6,fontFamily:"'Cormorant Garamond',serif",
  },
  btnNext: {
    padding:'10px 24px',
    background:'linear-gradient(135deg,#6b3c00,#c8960a,#f5d060,#c8960a,#6b3c00)',
    backgroundSize:'200% auto',border:'none',borderRadius:28,
    color:'#1a0800',fontWeight:600,cursor:'pointer',
    fontSize:12.5,fontFamily:"'Cinzel',serif",letterSpacing:'0.06em',
    boxShadow:'0 4px 20px rgba(180,130,20,0.42)',
  },
  btnKey: {
    marginTop:14,padding:'5px 14px',background:'transparent',
    border:'1px solid rgba(180,130,20,0.12)',borderRadius:20,fontSize:9.5,
    color:'rgba(180,130,20,0.30)',letterSpacing:'0.10em',cursor:'pointer',
    display:'flex',alignItems:'center',zIndex:5,fontFamily:"'Cinzel',serif",
  },
  modal: {
    position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',
    display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,
  },
  modalBox: {
    background:'linear-gradient(160deg,#1c0e04,#0c0501)',
    border:'2px solid rgba(180,130,20,0.48)',
    borderRadius:20,padding:24,maxWidth:300,width:'90%',
    boxShadow:'0 8px 44px rgba(0,0,0,0.85)',
  },
  modalTitle: {
    margin:'0 0 4px',fontWeight:600,fontSize:16,
    color:'#f5d060',textAlign:'center',
    fontFamily:"'Cinzel',serif",letterSpacing:'0.06em',
  },
  modalHint: {
    margin:'0 0 14px',fontSize:11,lineHeight:1.65,
    color:'rgba(245,208,96,0.4)',textAlign:'center',whiteSpace:'pre-line',
  },
  modalInput: {
    width:'100%',background:'rgba(0,0,0,0.45)',
    border:'1px solid rgba(180,130,20,0.28)',
    borderRadius:10,padding:'10px 14px',
    fontSize:13,color:'#f0e0c0',outline:'none',textAlign:'center',
  },
  modalCancel: {
    flex:1,padding:'9px',background:'transparent',
    border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,
    color:'rgba(255,255,255,0.28)',cursor:'pointer',fontSize:12,
    fontFamily:"'Cinzel',serif",
  },
  modalSave: {
    flex:1,padding:'9px',
    background:'linear-gradient(135deg,#c8960a,#f5d060)',
    border:'none',borderRadius:10,color:'#1a0800',
    fontWeight:700,cursor:'pointer',fontSize:12,
    fontFamily:"'Cinzel',serif",letterSpacing:'0.05em',
  },
};
