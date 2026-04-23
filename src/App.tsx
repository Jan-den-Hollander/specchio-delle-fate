/**
 * Lo Specchio delle Fate — De Feeënspie­gel
 * Italiaanse verjaardagsspiegel · Renaissance goud · v1
 * Tweetalig: Italiaans + Nederlands
 * Stijl: Renaissance architectuur — festoenen, lauwerkrans, acanthus, medaillons
 */
import { useState, useRef, useEffect } from 'react';
import { Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ENV_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANTHROPIC_KEY) || '';

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchWithRetry(fn, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
      ]);
    } catch (err) {
      const isLast = attempt === maxAttempts;
      const isRetryable = err?.message?.includes('timeout') ||
                          err?.message?.includes('503') ||
                          err?.message?.includes('overloaded') ||
                          err?.message?.includes('network');
      if (isLast || !isRetryable) throw err;
      await sleep(attempt * 1500);
    }
  }
}

// ── TTS: Italiaans of Nederlands stem ────────────────────────────────────
const getVoices = () => new Promise(resolve => {
  const v = window.speechSynthesis.getVoices();
  if (v.length) { resolve(v); return; }
  window.speechSynthesis.onvoiceschanged = () => resolve(window.speechSynthesis.getVoices());
  setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500);
});

async function speakWithFallback(text, lang = 'it', onEnd = () => {}) {
  if (!text) { onEnd(); return; }
  window.speechSynthesis.cancel();
  const voices = await getVoices();
  const bcp = lang === 'it' ? 'it-IT' : 'nl-NL';
  const pick = voices.find(v => v.lang.startsWith(lang) && /female|woman|donna/i.test(v.name))
    || voices.find(v => v.lang.startsWith(lang))
    || voices.find(v => v.lang === bcp)
    || voices[0];
  const utt = new SpeechSynthesisUtterance(text);
  if (pick) utt.voice = pick;
  utt.lang = bcp;
  utt.rate = 0.85; utt.pitch = 1.08;
  utt.onend = onEnd; utt.onerror = onEnd;
  window.speechSynthesis.speak(utt);
  setTimeout(() => { try { window.speechSynthesis.cancel(); } catch {} }, text.length * 70 + 3500);
}

async function speakAll(boodschap, facts, lang = 'it', onEnd = () => {}) {
  if (!boodschap) { onEnd(); return; }
  const mesiIT = ['gennaio','febbraio','marzo','aprile','maggio','giugno',
    'luglio','agosto','settembre','ottobre','novembre','dicembre'];
  const intro = lang === 'it'
    ? 'E sapevi che in questo giorno sono accadute cose meravigliose? '
    : 'En wist je dat er op jouw verjaardag ook bijzondere dingen zijn gebeurd? ';
  const feitjesTekst = facts.length > 0
    ? intro + facts.map(f => `Nel ${f.year}: ${f[lang] || f.it}`).join('. ') + '.'
    : '';
  speakWithFallback(feitjesTekst ? `${boodschap} ${feitjesTekst}` : boodschap, lang, onEnd);
}

const STEP = { NAME: 'name', DATE: 'date', DONE: 'done' };

// ── Vragen tweetalig ──────────────────────────────────────────────────────
const Q = {
  name_it: 'Sono lo Specchio delle Fate. Come ti chiami, piccolo/a?',
  name_nl: 'Ik ben de Feeënspie­gel. Hoe heet jij, kleine vriend?',
  date_it: (n) => `Piacere di conoscerti, ${n}! Quando sei nato/a? Di' o scrivi il tuo compleanno.`,
  date_nl: (n) => `Fijn om je te ontmoeten, ${n}! Wanneer ben jij geboren?`,
};

// ── Prompt — Italiaans én Nederlands ─────────────────────────────────────
const buildPrompt = (name, day, month, daysUntil) => {
  const mese = ['gennaio','febbraio','marzo','aprile','maggio','giugno',
    'luglio','agosto','settembre','ottobre','novembre','dicembre'][month - 1];
  const maand = ['januari','februari','maart','april','mei','juni',
    'juli','augustus','september','oktober','november','december'][month - 1];
  let timing_it = '', timing_nl = '';
  if (daysUntil === 0) {
    timing_it = 'OGGI è il compleanno!';
    timing_nl = 'VANDAAG is de verjaardag!';
  } else if (daysUntil > 0 && daysUntil <= 7) {
    timing_it = `Fra ${daysUntil} giorn${daysUntil===1?'o':'i'} è il compleanno.`;
    timing_nl = `Over ${daysUntil} dag${daysUntil===1?'':'en'} is de verjaardag.`;
  } else if (daysUntil < 0 && daysUntil >= -7) {
    timing_it = `Il compleanno era ${Math.abs(daysUntil)} giorn${Math.abs(daysUntil)===1?'o':'i'} fa.`;
    timing_nl = `De verjaardag was ${Math.abs(daysUntil)} dag${Math.abs(daysUntil)===1?'':'en'} geleden.`;
  }

  return `Sei lo Specchio delle Fate, uno specchio magico di una foresta incantata italiana. Parla con calore, gioia e semplicità per i bambini. Usa uno stile poetico e fiabesco.

Bambino/a: ${name} | Compleanno: ${day} ${mese} | ${timing_it}

Dai un messaggio di auguri personale (max 3 frasi) E esattamente 2 o 3 curiosità storiche vere del ${day} ${mese} che i bambini trovano affascinanti (animali, giocattoli, personaggi famosi, invenzioni, parchi divertimento, cartoni animati).

Rispondi SOLO come JSON senza markdown:
{"it":"...","nl":"...","facts":[{"year":1984,"it":"...","nl":"..."}]}

La versione "nl" è la traduzione olandese del messaggio di auguri. Scrivi in modo naturale, non letterale.`;
};

// ── Renaissance Frame SVG ─────────────────────────────────────────────────
// Architecturale festoen: Ionische voluten, acanthusblad, lauwerkrans, rozetten
function RenaissanceFrame({ W = 280, H = 346 }) {
  const cx = W / 2, cy = H / 2;
  const rx = cx - 14, ry = cy - 14;

  // Lauwer-emoji krans langs de ellips
  const laurierPts = [
    { a:  0,  emoji:'🏺', fs:20, off: 16 },
    { a: 18,  emoji:'🌿', fs:16, off:  6 },
    { a: 33,  emoji:'🍃', fs:13, off: -2 },
    { a: 46,  emoji:'🌿', fs:15, off:  5 },
    { a: 60,  emoji:'⚜️', fs:18, off: 14 },
    { a: 74,  emoji:'🌿', fs:14, off:  4 },
    { a: 87,  emoji:'🍃', fs:12, off: -3 },
    { a:100,  emoji:'🌿', fs:15, off:  6 },
    { a:113,  emoji:'🏺', fs:19, off: 15 },
    { a:127,  emoji:'🍃', fs:12, off: -2 },
    { a:140,  emoji:'🌿', fs:16, off:  5 },
    { a:153,  emoji:'⚜️', fs:18, off: 13 },
    { a:167,  emoji:'🌿', fs:14, off:  4 },
    { a:180,  emoji:'🏺', fs:20, off: 16 },
    { a:193,  emoji:'🍃', fs:12, off: -3 },
    { a:207,  emoji:'🌿', fs:15, off:  5 },
    { a:220,  emoji:'⚜️', fs:18, off: 13 },
    { a:234,  emoji:'🌿', fs:14, off:  4 },
    { a:247,  emoji:'🍃', fs:12, off: -2 },
    { a:260,  emoji:'🌿', fs:15, off:  6 },
    { a:273,  emoji:'🏺', fs:19, off: 15 },
    { a:287,  emoji:'🍃', fs:12, off: -3 },
    { a:300,  emoji:'🌿', fs:15, off:  5 },
    { a:313,  emoji:'⚜️', fs:18, off: 14 },
    { a:326,  emoji:'🌿', fs:14, off:  4 },
    { a:340,  emoji:'🍃', fs:13, off: -2 },
    { a:353,  emoji:'🌿', fs:16, off:  6 },
  ];

  function ptOn(angleDeg, offR = 0) {
    const a = (angleDeg - 90) * Math.PI / 180;
    return [cx + (rx + offR) * Math.cos(a), cy + (ry + offR) * Math.sin(a)];
  }

  // Festoen-pad: golvende rank langs ellips
  const festoenPts = Array.from({ length: 73 }, (_, i) => {
    const angle = i * 5;
    const wave = Math.sin(i * 1.1) * 5;
    const [x, y] = ptOn(angle, wave);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ') + 'Z';

  // Architecturale pilasterlijnen (verticale accenten)
  const pilasters = [
    { x: 14, y1: cy - ry + 20, y2: cy + ry - 20 },
    { x: W - 14, y1: cy - ry + 20, y2: cy + ry - 20 },
  ];

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
      style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:2 }}>
      <defs>
        {/* Renaissance goud — diep en gelaagd */}
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
        <linearGradient id="rGlowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#fff8d0" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#c8820a" stopOpacity="0.6"/>
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
          <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="#3a1a00" floodOpacity="0.6"/>
        </filter>
        <filter id="goldShadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1a0800" floodOpacity="0.7"/>
        </filter>
      </defs>

      {/* ── Fresco-achtige achtergrond ring (subtiel) ── */}
      <ellipse cx={cx} cy={cy} rx={rx+22} ry={ry+22}
        fill="none" stroke="rgba(180,120,20,0.08)" strokeWidth="18"/>

      {/* ── Festoen rank (groen organisch) ── */}
      <path d={festoenPts} fill="none"
        stroke="#2d5a1a" strokeWidth="5.5" opacity="0.5"/>
      <path d={festoenPts} fill="none"
        stroke="#4a8a2a" strokeWidth="3" opacity="0.8"/>
      <path d={festoenPts} fill="none"
        stroke="#8dc45a" strokeWidth="1" opacity="0.22" strokeDasharray="4 10"/>

      {/* ── Buitenste gouden ellips (breed, architecturaal) ── */}
      <ellipse cx={cx} cy={cy} rx={rx}    ry={ry}
        fill="none" stroke="url(#rG1)" strokeWidth="7"/>
      {/* Tweede binnenste ring */}
      <ellipse cx={cx} cy={cy} rx={rx-10} ry={ry-10}
        fill="none" stroke="url(#rG2)" strokeWidth="2.2" opacity="0.7"/>
      {/* Derde fijne lijn */}
      <ellipse cx={cx} cy={cy} rx={rx-16} ry={ry-16}
        fill="none" stroke="#f0d060" strokeWidth="0.6" opacity="0.25"/>

      {/* ── Architecturale pilaster accenten (korte gouden strepen) ── */}
      {[0, 90, 180, 270].map((deg, i) => {
        const [px, py] = ptOn(deg, 0);
        const [px2, py2] = ptOn(deg, -18);
        return (
          <line key={`pilA${i}`} x1={px} y1={py} x2={px2} y2={py2}
            stroke="url(#rG1)" strokeWidth="3" opacity="0.6"/>
        );
      })}

      {/* ── Lauwerkrans emoji langs de rand ── */}
      {laurierPts.map((p, i) => {
        const [px, py] = ptOn(p.a, p.off);
        const rot = p.a - 90;
        return (
          <text key={`l${i}`} x={px} y={py}
            fontSize={p.fs}
            textAnchor="middle" dominantBaseline="middle"
            transform={`rotate(${rot},${px},${py})`}
            filter="url(#leafShadow)"
            style={{ userSelect:'none' }}>
            {p.emoji}
          </text>
        );
      })}

      {/* ── Rozet-medaillons op de vier kardinaalspunten ── */}
      {[
        { deg: 0,   label:'✦' },
        { deg: 90,  label:'✦' },
        { deg: 180, label:'✦' },
        { deg: 270, label:'✦' },
      ].map(({ deg, label }, i) => {
        const [mx, my] = ptOn(deg, 0);
        return (
          <g key={`med${i}`}>
            <circle cx={mx} cy={my} r={10} fill="url(#rMed)" filter="url(#goldShadow)"/>
            <circle cx={mx} cy={my} r={7} fill="#1a0600"/>
            <text x={mx} y={my} textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fill="#f5d060" style={{ userSelect:'none' }}>{label}</text>
          </g>
        );
      })}

      {/* ── Bovenste timpaan: halfrond fronton ── */}
      {/* Grote medaillon top */}
      <circle cx={cx} cy={14} r={28} fill="url(#rG1)" filter="url(#rGlow)"/>
      <circle cx={cx} cy={14} r={23} fill="#1a0800"/>
      <circle cx={cx} cy={14} r={20} fill="url(#rG1)" opacity="0.06"/>
      {/* Feeënspie­gel icoon */}
      <text x={cx} y={22} textAnchor="middle" fontSize="22" style={{ userSelect:'none' }}>🪞</text>
      {/* Verbindingslijn timpaan → ellips */}
      <line x1={cx} y1={42} x2={cx} y2={cy - ry}
        stroke="url(#rG1)" strokeWidth="3" opacity="0.8"/>
      <circle cx={cx} cy={43} r={5} fill="url(#rMed)"/>

      {/* ── Onderkant: console/cartouche ── */}
      {/* Gewelfde boog */}
      <path d={`M${cx-55} ${H-20} Q${cx-28} ${H-6} ${cx} ${H-3} Q${cx+28} ${H-6} ${cx+55} ${H-20}`}
        fill="none" stroke="url(#rG1)" strokeWidth="3"/>
      {/* Centrale medaillon onder */}
      <circle cx={cx} cy={H-3} r={7} fill="url(#rMed)"/>
      {/* Console-knopjes */}
      {[-36, -18, 18, 36].map((dx, i) =>
        <circle key={`cn${i}`} cx={cx + dx} cy={H - 16} r={i % 2 === 0 ? 4 : 2.5}
          fill="#c8960a" opacity={i % 2 === 0 ? 0.85 : 0.5}/>
      )}

      {/* ── Hoekaccenten: Acanthus sterretjes ── */}
      {[
        [cx,      cy - ry - 20],
        [cx,      cy + ry + 14],
        [cx-rx-16, cy],
        [cx+rx+16, cy],
      ].map(([ex, ey], i) => (
        <text key={`ac${i}`} x={ex} y={ey}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="12" opacity="0.42" fill="#d4a520"
          style={{ userSelect:'none' }}>✦</text>
      ))}

      {/* ── Fijne goud-glans highlights langs ellips (arcjes) ── */}
      {[30, 150, 210, 330].map((deg, i) => {
        const [hx, hy] = ptOn(deg, -3);
        return (
          <circle key={`hl${i}`} cx={hx} cy={hy} r={2.5}
            fill="#fff8c0" opacity="0.38"/>
        );
      })}
    </svg>
  );
}

// ── Vuurvliegjes / gouden stofjes ────────────────────────────────────────
const FIREFLIES = Array.from({ length: 18 }, (_, i) => ({
  id: i, x: Math.random()*100, y: Math.random()*100,
  delay: Math.random()*5, dur: 4 + Math.random()*4,
  dx: (Math.random()-0.5)*70, dy: (Math.random()-0.5)*50,
  color: ['#f5e642','#ffd090','#fff8c0','#e8b830'][i % 4],
}));

const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i, x: 8+Math.random()*84, y: 8+Math.random()*84,
  size: 3+Math.random()*8, delay: Math.random()*3, dur: 2+Math.random()*2.5,
  color: ['#f5e642','#fff8c0','#ffb347','#e8c84a','#ffd090'][i%5],
}));

// ── Setup overlay (in de spiegel) ─────────────────────────────────────────
function SetupOverlay({ step, name, setName, birthInput, setBirthInput,
  onListen, isListening, listenTarget, onConfirm }) {

  const isName = step === STEP.NAME;

  return (
    <motion.div key={step}
      initial={{ opacity:0, scale:0.90 }} animate={{ opacity:1, scale:1 }}
      exit={{ opacity:0, scale:0.90 }} transition={{ duration:0.4 }}
      style={{
        position:'absolute', inset:0,
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        padding:'14px 16px',
        background:'rgba(18,6,2,0.93)',
        borderRadius:'50% 50% 47% 47%',
        zIndex:10, gap:9,
      }}
    >
      <div style={{ fontSize:24 }}>🧚</div>

      {/* Italiaans */}
      <p style={{
        color:'#f5d060', fontSize:11.5, textAlign:'center', margin:0,
        lineHeight:1.5, fontFamily:"'Cinzel', serif",
        textShadow:'0 0 12px rgba(245,208,96,0.5)',
        letterSpacing:'0.03em',
      }}>
        {isName ? Q.name_it : Q.date_it(name)}
      </p>

      {/* Nederlands (kleiner, cursief) */}
      <p style={{
        color:'rgba(245,208,96,0.42)', fontSize:10, textAlign:'center', margin:0,
        lineHeight:1.4, fontFamily:"'Cormorant Garamond', serif",
        fontStyle:'italic',
      }}>
        {isName ? Q.name_nl : Q.date_nl(name)}
      </p>

      <input
        value={isName ? name : birthInput}
        onChange={e => isName ? setName(e.target.value) : setBirthInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onConfirm()}
        placeholder={isName ? 'Scrivi il tuo nome...' : '4 aprile · 15-04'}
        inputMode={isName ? 'text' : 'text'}
        autoFocus
        style={{
          background:'rgba(245,208,96,0.06)',
          border:'1px solid rgba(245,208,96,0.35)',
          borderRadius:12, padding:'7px 12px',
          color:'#f5d060', fontSize:14, textAlign:'center',
          outline:'none', fontFamily:"'Cormorant Garamond', serif",
          width:'86%', letterSpacing:'0.04em',
        }}
      />

      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <button onClick={() => onListen(step)} style={{
          width:38, height:38, borderRadius:'50%',
          background: isListening && listenTarget===step
            ? 'rgba(180,40,40,0.85)' : 'rgba(245,208,96,0.10)',
          border:'1.5px solid rgba(245,208,96,0.38)',
          cursor:'pointer', fontSize:16,
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all 0.2s',
        }}>
          {isListening && listenTarget===step ? '🔴' : '🎤'}
        </button>

        <button onClick={onConfirm} style={{
          padding:'8px 18px', borderRadius:22,
          background:'linear-gradient(135deg,#8B5E00,#d4a520,#f5d060,#d4a520,#8B5E00)',
          backgroundSize:'200% auto',
          border:'none', color:'#1a0800',
          fontWeight:700, fontSize:12, cursor:'pointer',
          fontFamily:"'Cinzel', serif",
          boxShadow:'0 2px 14px rgba(180,130,20,0.5)',
          letterSpacing:'0.06em',
        }}>
          {isName ? 'Avanti ✨' : 'Mostrami ✦'}
        </button>
      </div>

      {!isName && (
        <p style={{ fontSize:9, color:'rgba(245,208,96,0.28)', margin:0, textAlign:'center',
          fontFamily:"'Cormorant Garamond', serif" }}>
          Es: 4 aprile · april 4 · 15-04
        </p>
      )}
    </motion.div>
  );
}

// ── Tekstballon — tweetalig IT + NL ──────────────────────────────────────
function SpeechBubble({ message, onSpeak, speakLang, setSpeakLang }) {
  if (!message) return null;
  const textIT = message.it || '';
  const textNL = message.nl || '';
  const facts = message.facts || [];

  return (
    <motion.div
      initial={{ opacity:0, y:16, scale:0.95 }}
      animate={{ opacity:1, y:0, scale:1 }}
      exit={{ opacity:0, y:-8 }}
      style={{
        width:'100%',
        background:'linear-gradient(160deg,rgba(30,12,4,0.98),rgba(18,7,2,0.99))',
        border:'2px solid rgba(180,130,20,0.55)',
        borderRadius:18, padding:'13px 15px',
        boxShadow:'0 8px 32px rgba(0,0,0,0.7),0 0 22px rgba(180,130,20,0.08)',
        position:'relative',
      }}
    >
      {/* Pijl omhoog */}
      <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)',
        width:0, height:0, borderLeft:'9px solid transparent',
        borderRight:'9px solid transparent', borderBottom:'12px solid rgba(180,130,20,0.55)' }}/>
      <div style={{ position:'absolute', top:-9, left:'50%', transform:'translateX(-50%)',
        width:0, height:0, borderLeft:'7px solid transparent',
        borderRight:'7px solid transparent', borderBottom:'10px solid rgba(30,12,4,0.98)' }}/>

      {/* 🔊 + taal toggle */}
      <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:6, marginBottom:8 }}>
        <button onClick={() => setSpeakLang(speakLang === 'it' ? 'nl' : 'it')} style={{
          padding:'2px 8px', borderRadius:10, fontSize:9, cursor:'pointer',
          background:'rgba(180,130,20,0.15)', border:'1px solid rgba(180,130,20,0.35)',
          color:'rgba(245,208,96,0.7)', fontFamily:"'Cinzel', serif",
          letterSpacing:'0.08em',
        }}>
          {speakLang === 'it' ? '🇮🇹 IT' : '🇳🇱 NL'}
        </button>
        <button onClick={onSpeak} style={{
          background:'none', border:'none', cursor:'pointer', fontSize:17, opacity:0.6,
        }}>🔊</button>
      </div>

      {/* Italiaanse boodschap */}
      <p style={{
        margin:'0 0 6px', color:'#f5d060', lineHeight:1.72, fontSize:14,
        fontFamily:"'Cormorant Garamond', serif",
        textShadow:'0 0 10px rgba(245,208,96,0.2)',
        fontStyle:'italic',
      }}>✨ {textIT}</p>

      {/* Scheidingslijn */}
      <div style={{ borderTop:'1px solid rgba(180,130,20,0.18)', margin:'8px 0' }}/>

      {/* Nederlandse vertaling */}
      <p style={{
        margin:'0 0 10px', color:'rgba(245,208,96,0.52)', lineHeight:1.65, fontSize:12,
        fontFamily:"'Cormorant Garamond', serif",
      }}>🇳🇱 {textNL}</p>

      {/* Historische feitjes */}
      {facts.length > 0 && (
        <div style={{ borderTop:'1px solid rgba(180,130,20,0.14)', paddingTop:8,
          display:'flex', flexDirection:'column', gap:5 }}>
          <p style={{ margin:0, fontSize:8.5, color:'rgba(180,130,20,0.5)',
            letterSpacing:'0.16em', textTransform:'uppercase',
            fontFamily:"'Cinzel', serif" }}>
            ✦ Nel tuo giorno di nascita · Op jouw geboortedag ✦
          </p>
          {facts.map((f, i) => (
            <div key={i} style={{
              background:'rgba(245,208,96,0.03)',
              border:'1px solid rgba(180,130,20,0.12)',
              borderRadius:9, padding:'5px 10px',
            }}>
              <span style={{ color:'#c8960a', fontSize:10, fontWeight:700,
                fontFamily:"'Cinzel', serif" }}>{f.year} · </span>
              <span style={{ color:'rgba(245,208,96,0.72)', fontSize:11,
                fontFamily:"'Cormorant Garamond', serif", fontStyle:'italic' }}>
                {f.it}
              </span>
              {f.nl && f.nl !== f.it && (
                <span style={{ display:'block', color:'rgba(245,208,96,0.36)', fontSize:10,
                  fontFamily:"'Cormorant Garamond', serif", marginTop:2 }}>
                  🇳🇱 {f.nl}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Hoofd component ───────────────────────────────────────────────────────
export default function SpecchioFate() {
  const [step, setStep]               = useState(STEP.NAME);
  const [name, setName]               = useState('');
  const [birthInput, setBirthInput]   = useState('');
  const [message, setMessage]         = useState(null);
  const [speakLang, setSpeakLang]     = useState('it');
  const [status, setStatus]           = useState('');
  const [isListening, setIsListening] = useState(false);
  const [listenTarget, setListenTarget] = useState(null);
  const [isThinking, setIsThinking]   = useState(false);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [daysInfo, setDaysInfo]       = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    if (ENV_KEY) return ENV_KEY;
    try { return localStorage.getItem('specchio_fate_key') || ''; } catch { return ''; }
  });

  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const recRef    = useRef(null);
  const parsedRef = useRef(null);

  // Camera
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user' }, audio:false });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {}
    })();
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  // Spreek opening — Italiaans
  useEffect(() => {
    let cancelled = false;
    const delay = setTimeout(() => {
      if (cancelled) return;
      if (step === STEP.NAME) {
        setIsSpeaking(true);
        speakWithFallback(Q.name_it, 'it', () => { if (!cancelled) setIsSpeaking(false); });
      } else if (step === STEP.DATE && name) {
        setIsSpeaking(true);
        speakWithFallback(Q.date_it(name), 'it', () => { if (!cancelled) setIsSpeaking(false); });
      }
    }, step === STEP.NAME ? 900 : 400);
    return () => { cancelled = true; clearTimeout(delay); };
  }, [step]);

  // ── Datum parser (NL + IT maandnamen) ───────────────────────────────────
  const parseBirthDate = (input) => {
    const raw = input.trim().toLowerCase();
    const MAANDEN = {
      gennaio:1,  gen:1,  january:1,   jan:1,    januari:1,
      febbraio:2, feb:2,  february:2,  februari:2,
      marzo:3,    mar:3,  march:3,     maart:3,  mrt:3,
      aprile:4,   apr:4,  april:4,
      maggio:5,   mag:5,  may:5,       mei:5,
      giugno:6,   giu:6,  june:6,      juni:6,   jun:6,
      luglio:7,   lug:7,  july:7,      juli:7,   jul:7,
      agosto:8,   ago:8,  august:8,    augustus:8, aug:8,
      settembre:9, set:9, september:9, sep:9,    sept:9,
      ottobre:10, ott:10, october:10,  oktober:10, okt:10, oct:10,
      novembre:11, nov:11,
      dicembre:12, dic:12, december:12, december_:12,
    };
    const maandMatch = raw.match(
      /\b(gennaio|gen|febbraio|feb|marzo|mar|aprile|apr|maggio|mag|giugno|giu|luglio|lug|agosto|ago|settembre|set|ottobre|ott|novembre|nov|dicembre|dic|januari|februari|maart|mrt|april|mei|juni|juli|augustus|september|sept|oktober|okt|november|december|january|february|march|may|june|july|august|october)\b/
    );
    if (maandMatch) {
      const month = MAANDEN[maandMatch[1]];
      const nums = raw.match(/\d+/g)?.map(Number) || [];
      const day = nums.find(n => n >= 1 && n <= 31);
      if (day && month) return { day, month };
    }
    const clean = raw.replace(/[\/\.\s]/g, '-');
    const parts = clean.split('-').map(p => parseInt(p, 10));
    if (parts.length >= 2) {
      const [a, b] = parts;
      if (a >= 1 && a <= 31 && b >= 1 && b <= 12) return { day:a, month:b };
      if (b >= 1 && b <= 31 && a >= 1 && a <= 12) return { day:b, month:a };
    }
    return null;
  };

  const computeDaysUntil = (day, month) => {
    const now = new Date(), y = now.getFullYear();
    let bd = new Date(y, month-1, day);
    const diff = Math.round((bd - now) / 86400000);
    if (diff > 180)  { bd = new Date(y-1, month-1, day); return Math.round((bd-now)/86400000); }
    if (diff < -180) { bd = new Date(y+1, month-1, day); return Math.round((bd-now)/86400000); }
    return diff;
  };

  const confirmName = () => {
    if (!name.trim()) { setStatus('Dimmi prima il tuo nome! 🌟'); return; }
    setStatus(''); setStep(STEP.DATE);
  };

  const confirmDate = () => {
    const parsed = parseBirthDate(birthInput);
    if (!parsed) { setStatus('Non capisco la data. Scrivi es. 4 aprile o 15-04 ✨'); return; }
    const days = computeDaysUntil(parsed.day, parsed.month);
    parsedRef.current = { ...parsed, days };
    setDaysInfo(days); setStatus('');
    setStep(STEP.DONE);
    fetchMessage(name, parsed.day, parsed.month, days);
  };

  const startListening = (target) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setStatus('Microfono non disponibile 🎤'); return; }
    try { recRef.current?.stop(); } catch {}
    const rec = new SR();
    recRef.current = rec;
    rec.lang = 'it-IT'; rec.continuous = false; rec.interimResults = false;
    rec.onstart  = () => { setIsListening(true);  setListenTarget(target); setStatus('Sto ascoltando... 👂'); };
    rec.onend    = () => { setIsListening(false); setListenTarget(null);   setStatus(''); };
    rec.onerror  = () => { setIsListening(false); setListenTarget(null);   setStatus('Non ho capito 🌟'); };
    rec.onresult = (e) => {
      const heard = e.results[0][0].transcript;
      if (target === STEP.NAME) setName(heard.replace(/[^a-zA-ZÀ-ÿ\s'-]/g,'').trim());
      else setBirthInput(heard);
    };
    rec.start();
  };

  // ── Fallback boodschappen ─────────────────────────────────────────────
  const buildFallback = (n, day, month, daysUntil) => {
    const mesi = ['gennaio','febbraio','marzo','aprile','maggio','giugno',
      'luglio','agosto','settembre','ottobre','novembre','dicembre'];
    const maanden = ['januari','februari','maart','april','mei','juni',
      'juli','augustus','september','oktober','november','december'];
    const mese = mesi[month - 1], maand = maanden[month - 1];

    let it_greet = '', nl_greet = '';
    if (daysUntil === 0) {
      it_greet = `Oggi è il tuo giorno magico, ${n}! Il mondo intero è felice che tu esista!`;
      nl_greet = `Vandaag is jouw magische dag, ${n}! De hele wereld is blij dat jij er bent!`;
    } else if (daysUntil > 0 && daysUntil <= 7) {
      it_greet = `Mancano solo ${daysUntil} giorn${daysUntil===1?'o':'i'}, ${n}! Il tuo compleanno si avvicina!`;
      nl_greet = `Nog maar ${daysUntil} dag${daysUntil===1?'':'en}, ${n}! Jouw verjaardag komt eraan!`;
    } else if (daysUntil < 0 && daysUntil >= -7) {
      it_greet = `Auguri in ritardo, ${n}! ${Math.abs(daysUntil)} giorn${Math.abs(daysUntil)===1?'o':'i'} fa era il tuo giorno speciale.`;
      nl_greet = `Gefeliciteerd, ${n}! ${Math.abs(daysUntil)} dag${Math.abs(daysUntil)===1?'':'en'} geleden was jouw bijzondere dag.`;
    } else {
      it_greet = `Che meraviglia essere nati il ${day} ${mese}, ${n}! Un giorno davvero incantato!`;
      nl_greet = `Wat bijzonder dat jij op ${day} ${maand} geboren bent, ${n}! Echt een magische dag!`;
    }

    const it_msg = `${it_greet} Lo Specchio delle Fate sa che sei una persona speciale — nella tua nascita il cielo era pieno di stelle danzanti. Chiudi gli occhi ed esprimi un desiderio... a volte si avverano davvero! ✨`;
    const nl_msg = `${nl_greet} De Feeënspie­gel weet zeker dat jij bijzonder bent — bij jouw geboorte dansten de sterren aan de hemel. Sluit je ogen en maak een wens... soms komen ze echt uit! ✨`;

    const stagioneFeitjes = {
      inverno: [
        { year:1812, it:'I fratelli Grimm scrissero il loro primo libro di fiabe piene di magia.', nl:'De gebroeders Grimm schreven hun eerste sprookjesboek.' },
        { year:1879, it:'Per la prima volta si usò la luce elettrica — come una bacchetta magica!', nl:'Voor het eerst werd elektrisch licht gebruikt — als een toverstaf!' },
        { year:1955, it:'Aprì il primo Disneyland, un vero parco delle fate pieno di sogni.', nl:'Het eerste Disneyland opende, een echt sprookjespark vol dromen.' },
      ],
      primavera: [
        { year:1902, it:'Apparve il primo libro sul Mago di Oz, il grande stregone.', nl:'Het eerste boek over de Tovenaar van Oz verscheen.' },
        { year:1937, it:'Biancaneve fu il primo lungometraggio d\'animazione — e vissero felici e contenti!', nl:'Sneeuwwitje was de eerste lange animatiefilm.' },
        { year:1989, it:'La Sirenetta nuotò per la prima volta sullo schermo magico.', nl:'De Kleine Zeemeermin zwom voor het eerst op het witte doek.' },
      ],
      estate: [
        { year:1865, it:'Alice cadde nel buco del coniglio e scoprì il Paese delle Meraviglie.', nl:'Alice viel in het konijnenhol en ontdekte Wonderland.' },
        { year:1977, it:'Luke Skywalker volò per la prima volta tra le stelle — una favola nello spazio!', nl:'Luke Skywalker vloog voor het eerst door de sterren.' },
        { year:1997, it:'Harry Potter salì sulla sua scopa e volò verso Hogwarts.', nl:'Harry Potter besteeg zijn bezem en vloog naar Hogwarts.' },
      ],
      autunno: [
        { year:1889, it:'Aprì la Torre Eiffel — alta come il cappello di un mago!', nl:'De Eiffeltoren opende — zo hoog als een tovenaars hoed!' },
        { year:1928, it:'Mickey Mouse parlò per la prima volta, iniziando un mondo magico.', nl:'Mickey Mouse sprak voor het eerst, begin van een magische wereld.' },
        { year:1952, it:'Pippi Calzelunghe apparve in televisione per la prima volta.', nl:'Pippi Langkous verscheen voor het eerst op televisie.' },
      ],
    };

    const stagione = [12,1,2].includes(month) ? 'inverno'
      : [3,4,5].includes(month) ? 'primavera'
      : [6,7,8].includes(month) ? 'estate' : 'autunno';

    return { it: it_msg, nl: nl_msg, facts: stagioneFeitjes[stagione], _isFallback: true };
  };

  // ── API ───────────────────────────────────────────────────────────────────
  const fetchMessage = async (n, day, month, days) => {
    if (!apiKey) { setStatus('Nessuna chiave API impostata 🔑'); return; }
    setIsThinking(true); setMessage(null);
    setStatus('Lo specchio sta pensando... ✨');

    try {
      const resp = await fetchWithRetry(() =>
        fetch('https://api.anthropic.com/v1/messages', {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({
            model:'claude-sonnet-4-20250514',
            max_tokens:1200,
            messages:[{ role:'user', content:buildPrompt(n, day, month, days) }],
          }),
        }).then(r => r.json())
      );
      if (resp.error) throw new Error(resp.error.message);
      const raw = resp.content?.[0]?.text || '{}';
      const data = JSON.parse(raw.replace(/```json|```/g,'').trim());
      setMessage(data); setStatus('');
      if (data.it) {
        setIsSpeaking(true);
        speakAll(data.it, data.facts || [], 'it', () => setIsSpeaking(false));
      }
    } catch {
      const fb = buildFallback(n, day, month, days);
      setMessage(fb);
      setStatus('✨ Lo specchio parla dal cuore...');
      setTimeout(() => setStatus(''), 3500);
      setIsSpeaking(true);
      speakAll(fb.it, fb.facts || [], 'it', () => setIsSpeaking(false));
    }
    setIsThinking(false);
  };

  const handleReset = () => {
    window.speechSynthesis.cancel();
    setStep(STEP.NAME); setName(''); setBirthInput('');
    setMessage(null); setDaysInfo(null);
    setStatus(''); setIsSpeaking(false);
    parsedRef.current = null;
  };

  const saveKey = (k) => {
    setApiKey(k);
    try { localStorage.setItem('specchio_fate_key', k); } catch {}
    setShowKeyModal(false);
  };

  const banner = (() => {
    if (daysInfo === null) return null;
    if (daysInfo === 0)              return { it:'🎂 Oggi è il tuo grande giorno!',      nl:'Vandaag is jouw grote dag!',   color:'#f5d060' };
    if (daysInfo>0 && daysInfo<=7)   return { it:`⏳ Fra ${daysInfo} giorn${daysInfo===1?'o':'i'} è il tuo compleanno!`, nl:`Nog ${daysInfo} dag${daysInfo===1?'':'en'}!`, color:'#ffb347' };
    if (daysInfo<0 && daysInfo>=-7)  return { it:`🎉 Tanti auguri! ${Math.abs(daysInfo)} giorn${Math.abs(daysInfo)===1?'o':'i'} fa!`, nl:`Gefeliciteerd! ${Math.abs(daysInfo)} dag${Math.abs(daysInfo)===1?'':'en'} geleden!`, color:'#a8edea' };
    return null;
  })();

  const isDone = step === STEP.DONE;

  return (
    <div style={S.app}>
      <style>{CSS}</style>
      <div style={S.bg}/>
      <div style={S.bgFresco}/>

      {/* Gouden stofdeeltjes */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        {FIREFLIES.map(f => (
          <div key={f.id} style={{
            position:'absolute', left:`${f.x}%`, top:`${f.y}%`,
            width:4, height:4, borderRadius:'50%', background:f.color,
            boxShadow:`0 0 6px ${f.color}, 0 0 12px rgba(245,208,96,0.3)`,
            animation:`ffloat ${f.dur}s ease-in-out ${f.delay}s infinite`,
            '--dx':`${f.dx}px`, '--dy':`${f.dy}px`,
          }}/>
        ))}
      </div>

      {/* Titel */}
      <header style={S.header}>
        <div style={S.titleDivider}>✦ ✦ ✦</div>
        <h1 style={S.title}>Lo Specchio delle Fate</h1>
        <p style={S.subtitle}>Dimmi chi sei... · Vertel mij wie jij bent...</p>
        <div style={S.titleDivider}>✦ ✦ ✦</div>
      </header>

      {/* Tekstballon BOVEN spiegel */}
      <AnimatePresence>
        {message && (
          <div style={{ width:'100%', maxWidth:430, padding:'0 12px', marginBottom:4, position:'relative', zIndex:5 }}>
            <SpeechBubble
              message={message}
              speakLang={speakLang}
              setSpeakLang={setSpeakLang}
              onSpeak={() => {
                setIsSpeaking(true);
                speakAll(
                  message[speakLang] || message.it,
                  message.facts || [],
                  speakLang,
                  () => setIsSpeaking(false)
                );
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Banner */}
      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            style={{ ...S.banner, borderColor:banner.color, color:banner.color }}
          >
            <div style={{ fontFamily:"'Cinzel', serif", fontSize:13 }}>{banner.it}</div>
            <div style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:11,
              opacity:0.7, fontStyle:'italic' }}>🇳🇱 {banner.nl}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spiegel */}
      <div style={{ ...S.mirrorWrap, marginTop:10 }}>
        <RenaissanceFrame W={280} H={346}/>

        <div style={S.mirrorGlass}>
          <video ref={videoRef} autoPlay playsInline muted style={S.video}/>

          {isDone && message && (
            <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden',
              borderRadius:'50% 50% 47% 47%', zIndex:3 }}>
              {PARTICLES.map(p => (
                <div key={p.id} style={{
                  position:'absolute', left:`${p.x}%`, top:`${p.y}%`,
                  width:p.size, height:p.size, borderRadius:'50%',
                  background:p.color, opacity:0,
                  animation:`sparkle ${p.dur}s ease-in-out ${p.delay}s infinite`,
                  boxShadow:`0 0 ${p.size}px ${p.color}`,
                }}/>
              ))}
            </div>
          )}

          <AnimatePresence>
            {step !== STEP.DONE && (
              <SetupOverlay
                step={step}
                name={name} setName={setName}
                birthInput={birthInput} setBirthInput={setBirthInput}
                onListen={startListening}
                isListening={isListening} listenTarget={listenTarget}
                onConfirm={step===STEP.NAME ? confirmName : confirmDate}
              />
            )}
          </AnimatePresence>

          {isThinking && (
            <div style={{ position:'absolute', bottom:14, left:'50%',
              transform:'translateX(-50%)', display:'flex', gap:6, zIndex:15 }}>
              {[0,200,400].map((d,i) => (
                <div key={i} style={{
                  width:8, height:8, borderRadius:'50%', background:'#f5d060',
                  animation:`bounce 1s ease-in-out ${d}ms infinite`,
                  boxShadow:'0 0 6px #f5d060',
                }}/>
              ))}
            </div>
          )}

          {isSpeaking && (
            <div style={{ position:'absolute', inset:-5, borderRadius:'50% 50% 47% 47%',
              border:'3px solid #f5d060', animation:'speakRing 1.2s ease-in-out infinite',
              pointerEvents:'none', zIndex:4 }}/>
          )}
        </div>

        {/* Naam badge */}
        {isDone && name && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={S.nameBadge}>
            ✦ {name} ✦
          </motion.div>
        )}
      </div>

      {/* Status */}
      {status && <p style={S.status}>{status}</p>}

      {/* Fallback indicator */}
      <AnimatePresence>
        {message?._isFallback && !isThinking && (
          <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ margin:'2px 0 0', fontSize:10, color:'rgba(245,208,96,0.3)',
              fontStyle:'italic', textAlign:'center', zIndex:5,
              fontFamily:"'Cormorant Garamond', serif" }}>
            ✦ Lo specchio parla dalla sua memoria incantata ✦
          </motion.p>
        )}
      </AnimatePresence>

      {/* Volgend kind */}
      {isDone && !isThinking && message && (
        <motion.div
          initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:1.8 }}
          style={{ marginTop:14, display:'flex', flexDirection:'column',
            alignItems:'center', gap:5, zIndex:5 }}
        >
          <button onClick={handleReset} style={S.btnNext}>
            ✨ Prossimo bambino · Volgend kind ✨
          </button>
          <p style={{ margin:0, fontSize:9.5, color:'rgba(245,208,96,0.24)',
            fontStyle:'italic', fontFamily:"'Cormorant Garamond', serif" }}>
            Tocca qui quando è il turno di un altro · Tik hier voor een ander kind
          </p>
        </motion.div>
      )}

      {/* API sleutel */}
      {!ENV_KEY && (
        <button onClick={() => setShowKeyModal(true)} style={S.btnKey}>
          <Key size={10} style={{ marginRight:4 }}/>
          {apiKey ? 'Chiave API ✓' : 'Imposta chiave API'}
        </button>
      )}

      <AnimatePresence>
        {showKeyModal && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={S.modal} onClick={e => e.target===e.currentTarget && setShowKeyModal(false)}>
            <div style={S.modalBox}>
              <h2 style={S.modalTitle}>🔑 Chiave API · API Sleutel</h2>
              <p style={S.modalHint}>
                Inserisci la tua chiave Anthropic.<br/>
                <span style={{ opacity:0.6 }}>Alleen opgeslagen op dit apparaat.</span>
              </p>
              <input type="password" id="keyInp" defaultValue={apiKey}
                placeholder="sk-ant-..." style={S.modalInput}/>
              <div style={{ display:'flex', gap:10, marginTop:16 }}>
                <button onClick={() => setShowKeyModal(false)} style={S.modalCancel}>Annulla</button>
                <button onClick={() => saveKey(document.getElementById('keyInp').value)}
                  style={S.modalSave}>Salva ✦</button>
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
    25%  { opacity:0.75; }
    50%  { opacity:0.22; transform:translate(var(--dx,20px),var(--dy,-18px)); }
    75%  { opacity:0.62; }
    100% { opacity:0; transform:translate(0,0); }
  }
  @keyframes sparkle {
    0%,100% { opacity:0; transform:scale(0.4); }
    50%     { opacity:0.85; transform:scale(1.3); }
  }
  @keyframes bounce {
    0%,100% { transform:translateY(0); opacity:0.35; }
    50%     { transform:translateY(-7px); opacity:1; }
  }
  @keyframes speakRing {
    0%,100% { opacity:0.28; transform:scale(1); }
    50%     { opacity:1; transform:scale(1.05); }
  }
  @keyframes mirrorPulse {
    0%,100% { box-shadow:0 0 36px rgba(180,130,20,0.2),0 0 70px rgba(180,130,20,0.06),inset 0 0 30px rgba(0,0,0,0.6); }
    50%     { box-shadow:0 0 58px rgba(180,130,20,0.42),0 0 110px rgba(180,130,20,0.14),inset 0 0 30px rgba(0,0,0,0.6); }
  }
  @keyframes titleShimmer {
    0%,100% { text-shadow:0 0 12px rgba(245,208,96,0.35),0 2px 4px rgba(0,0,0,0.9); }
    50%     { text-shadow:0 0 26px rgba(245,208,96,0.85),0 0 50px rgba(245,208,96,0.28),0 2px 4px rgba(0,0,0,0.9); }
  }
  @keyframes bannerGlow {
    0%,100% { box-shadow:0 0 10px rgba(245,208,96,0.18); }
    50%     { box-shadow:0 0 22px rgba(245,208,96,0.5); }
  }
`;

// ── Styles ────────────────────────────────────────────────────────────────
const S = {
  app: {
    minHeight:'100vh',
    background:'#0f0804',
    color:'#f0e0c0',
    fontFamily:"'Cormorant Garamond', serif",
    display:'flex', flexDirection:'column', alignItems:'center',
    padding:'0 0 48px', position:'relative', overflow:'hidden',
  },
  bg: {
    position:'fixed', inset:0, pointerEvents:'none', zIndex:0,
    background:'radial-gradient(ellipse at 50% 0%,rgba(80,38,6,0.72) 0%,rgba(14,8,2,0.96) 58%,#080401 100%)',
  },
  bgFresco: {
    position:'fixed', inset:0, pointerEvents:'none', zIndex:0,
    background:`
      radial-gradient(ellipse at 10% 95%,rgba(60,24,4,0.22) 0%,transparent 48%),
      radial-gradient(ellipse at 90% 95%,rgba(60,24,4,0.22) 0%,transparent 48%),
      radial-gradient(ellipse at 50% 100%,rgba(80,36,4,0.28) 0%,transparent 40%)
    `,
  },
  header: {
    width:'100%', maxWidth:480,
    padding:'8px 16px 4px',
    display:'flex', flexDirection:'column', alignItems:'center',
    position:'relative', zIndex:5, gap:3,
  },
  titleDivider: {
    fontSize:11, color:'rgba(245,208,96,0.35)',
    letterSpacing:'0.5em', fontFamily:"'Cinzel', serif",
  },
  title: {
    margin:'2px 0', fontSize:20, fontWeight:600,
    color:'#f5d060', letterSpacing:'0.12em',
    fontFamily:"'Cinzel', serif",
    animation:'titleShimmer 3.5s ease-in-out infinite',
  },
  subtitle: {
    margin:'2px 0', fontSize:10,
    color:'rgba(245,208,96,0.35)',
    letterSpacing:'0.10em', fontStyle:'italic',
    fontFamily:"'Cormorant Garamond', serif",
  },
  banner: {
    width:'100%', maxWidth:420, margin:'2px 12px 5px',
    padding:'7px 16px',
    background:'rgba(20,10,2,0.9)',
    border:'1px solid', borderRadius:18,
    textAlign:'center', letterSpacing:'0.04em',
    zIndex:5, position:'relative',
    animation:'bannerGlow 2.5s ease-in-out infinite',
    display:'flex', flexDirection:'column', gap:3,
  },
  mirrorWrap: {
    position:'relative', width:280, height:346,
    display:'flex', alignItems:'center', justifyContent:'center',
    zIndex:5, marginBottom:6,
  },
  mirrorGlass: {
    position:'absolute',
    top:22, left:24,
    width:232, height:298,
    borderRadius:'50% 50% 47% 47%',
    overflow:'hidden',
    background:'linear-gradient(160deg,#0e0906 0%,#040200 100%)',
    animation:'mirrorPulse 4.5s ease-in-out infinite',
    zIndex:1,
  },
  video: {
    width:'100%', height:'100%', objectFit:'cover',
    transform:'scaleX(-1)',
    filter:'brightness(0.80) contrast(1.08) saturate(0.7) sepia(0.12)',
  },
  nameBadge: {
    position:'absolute', bottom:-12, left:'50%',
    transform:'translateX(-50%)',
    background:'linear-gradient(135deg,rgba(30,14,2,0.97),rgba(18,8,0,0.97))',
    border:'1px solid rgba(180,130,20,0.48)',
    borderRadius:20, padding:'4px 20px',
    fontSize:12, color:'#f5d060',
    whiteSpace:'nowrap', zIndex:10,
    letterSpacing:'0.12em', fontFamily:"'Cinzel', serif",
    boxShadow:'0 2px 12px rgba(0,0,0,0.6)',
  },
  status: {
    fontSize:12, color:'rgba(245,208,96,0.5)',
    fontStyle:'italic', margin:'4px 12px',
    zIndex:5, textAlign:'center', position:'relative',
    maxWidth:380, lineHeight:1.6,
    fontFamily:"'Cormorant Garamond', serif",
  },
  btnNext: {
    padding:'11px 26px',
    background:'linear-gradient(135deg,#6b3c00,#c8960a,#f5d060,#c8960a,#6b3c00)',
    backgroundSize:'200% auto',
    border:'none', borderRadius:30,
    color:'#1a0800', fontWeight:600, cursor:'pointer',
    fontSize:13, fontFamily:"'Cinzel', serif",
    letterSpacing:'0.06em',
    boxShadow:'0 4px 20px rgba(180,130,20,0.44),0 0 38px rgba(180,130,20,0.14)',
  },
  btnKey: {
    marginTop:14, padding:'5px 14px',
    background:'transparent',
    border:'1px solid rgba(180,130,20,0.12)',
    borderRadius:20, fontSize:10,
    color:'rgba(180,130,20,0.34)',
    letterSpacing:'0.10em', cursor:'pointer',
    display:'flex', alignItems:'center',
    zIndex:5, fontFamily:"'Cinzel', serif",
  },
  modal: {
    position:'fixed', inset:0, background:'rgba(0,0,0,0.9)',
    display:'flex', alignItems:'center', justifyContent:'center', zIndex:100,
  },
  modalBox: {
    background:'linear-gradient(160deg,#1c0e04,#0c0501)',
    border:'2px solid rgba(180,130,20,0.48)',
    borderRadius:20, padding:24, maxWidth:300, width:'90%',
    boxShadow:'0 8px 44px rgba(0,0,0,0.85)',
  },
  modalTitle: {
    margin:'0 0 4px', fontWeight:600, fontSize:16,
    color:'#f5d060', textAlign:'center',
    fontFamily:"'Cinzel', serif", letterSpacing:'0.06em',
  },
  modalHint: {
    margin:'0 0 14px', fontSize:11, lineHeight:1.65,
    color:'rgba(245,208,96,0.4)', textAlign:'center',
    fontFamily:"'Cormorant Garamond', serif",
  },
  modalInput: {
    width:'100%',
    background:'rgba(0,0,0,0.45)',
    border:'1px solid rgba(180,130,20,0.28)',
    borderRadius:10, padding:'10px 14px',
    fontSize:13, color:'#f0e0c0', outline:'none', textAlign:'center',
  },
  modalCancel: {
    flex:1, padding:'9px', background:'transparent',
    border:'1px solid rgba(255,255,255,0.08)', borderRadius:10,
    color:'rgba(255,255,255,0.28)', cursor:'pointer', fontSize:12,
    fontFamily:"'Cinzel', serif",
  },
  modalSave: {
    flex:1, padding:'9px',
    background:'linear-gradient(135deg,#c8960a,#f5d060)',
    border:'none', borderRadius:10,
    color:'#1a0800', fontWeight:700, cursor:'pointer',
    fontSize:12, fontFamily:"'Cinzel', serif",
    letterSpacing:'0.05em',
  },
};
