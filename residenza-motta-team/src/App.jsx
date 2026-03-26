import { useState, useRef, useEffect } from "react";

// ─── Weather Signal (L'Esploratore Meteo) ───────────────────────────────────
const WEATHER_LOCATIONS = [
  { name: "Locarno", lat: 46.1703, lon: 8.7975 },
  { name: "Zürich",  lat: 47.3769, lon: 8.5417 },
  { name: "Bern",    lat: 46.9481, lon: 7.4474 },
  { name: "Luzern",  lat: 47.0502, lon: 8.3093 },
];
const WMO_MAP = {
  0:{label:"Sole",icon:"☀️",score:10},1:{label:"Quasi sereno",icon:"🌤️",score:8},
  2:{label:"Parz. nuvoloso",icon:"⛅",score:5},3:{label:"Coperto",icon:"☁️",score:2},
  45:{label:"Nebbia",icon:"🌫️",score:1},48:{label:"Nebbia",icon:"🌫️",score:1},
  51:{label:"Pioggerella",icon:"🌦️",score:1},53:{label:"Pioggerella",icon:"🌦️",score:1},
  61:{label:"Pioggia",icon:"🌧️",score:0},63:{label:"Pioggia",icon:"🌧️",score:0},
  65:{label:"Pioggia forte",icon:"🌧️",score:0},71:{label:"Neve",icon:"🌨️",score:0},
  73:{label:"Neve",icon:"🌨️",score:0},80:{label:"Rovesci",icon:"🌦️",score:0},
  95:{label:"Temporale",icon:"⛈️",score:0},
};
const getWmo = c => WMO_MAP[c] || {label:"?",icon:"❓",score:3};
async function fetchAllWeather() {
  const results = await Promise.all(WEATHER_LOCATIONS.map(l=>
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${l.lat}&longitude=${l.lon}&daily=weathercode,temperature_2m_max,precipitation_probability_max,sunshine_duration&timezone=Europe%2FZurich&forecast_days=7&models=icon_seamless`)
      .then(r=>r.json()).then(d=>d.daily)
  ));
  return results;
}
function buildSignals(results) {
  const [locarno,...north]=results;
  return locarno.time.map((date,i)=>{
    const lWmo=getWmo(locarno.weathercode[i]);
    const northScores=north.map(n=>getWmo(n.weathercode[i]).score);
    const avgNorth=northScores.reduce((a,b)=>a+b,0)/northScores.length;
    const lTemp=locarno.temperature_2m_max[i];
    const avgNorthTemp=Math.round(north.map(n=>n.temperature_2m_max[i]).reduce((a,b)=>a+b,0)/north.length);
    const delta=Math.round(lTemp-avgNorthTemp);
    const sunHours=locarno.sunshine_duration?Math.round((locarno.sunshine_duration[i]||0)/3600*10)/10:0;
    const sunHere=lWmo.score>=8;
    const partialSun=lWmo.score>=5&&lWmo.score<8;
    const badNorth=avgNorth<=2;
    const bigDelta=delta>=8;
    const hugeDelta=delta>=12;
    let pts=0;
    if(sunHere) pts+=2;
    if(partialSun) pts+=1;
    if(badNorth) pts+=2;
    if(bigDelta) pts+=2;
    if(hugeDelta) pts+=1;
    const notRainingLocarno=lWmo.score>=2;
    const isSignal=pts>=3||(bigDelta&&notRainingLocarno);
    const strength=pts;
    console.log(date,'delta:',delta,'sunHours:',sunHours,'pts:',pts,'isSignal:',isSignal);
    return {date,lWmo,lTemp:Math.round(lTemp),avgNorthTemp,delta,sunHours,sunHere,partialSun,badNorth,bigDelta,strength,isSignal};
  });
}
function dayLabel(d){return new Date(d).toLocaleDateString("it-CH",{weekday:"short",day:"numeric",month:"short"});}
function WeatherBanner(){
  const [signals,setSignals]=useState([]);
  const [rawResults,setRawResults]=useState(null);
  const [wStatus,setWStatus]=useState("loading");
  const [expanded,setExpanded]=useState(false);
  useEffect(()=>{loadWeather();},[]);
  async function loadWeather(){
    setWStatus("loading");
    try{const r=await fetchAllWeather();setRawResults(r);setSignals(buildSignals(r));setWStatus("ok");}
    catch{setWStatus("error");}
  }
  const active=signals.filter(s=>s.isSignal);
  const hasSignal=active.length>0;
  const rateReco=s=>s>=4?{pct:"+30–35%",color:"#FF6B35",bg:"#2A1000"}:s>=3?{pct:"+20–25%",color:"#FFB347",bg:"#1E1500"}:{pct:"+15–20%",color:"#4AE08A",bg:"#001A0E"};
  const ROW_EVEN="#0E1624", ROW_ODD="#0B1220", ROW_SIGNAL="#071A0D";
  return(
    <div style={{background:hasSignal?"#071A0D":"#0C1120",border:`2px solid ${hasSignal?"#1D9E75":"#1E2838"}`,borderRadius:16,marginBottom:28,overflow:"hidden"}}>
      {/* Banner header */}
      <div onClick={()=>wStatus==="ok"&&setExpanded(e=>!e)} style={{padding:"16px 20px",display:"flex",alignItems:"center",gap:14,cursor:wStatus==="ok"?"pointer":"default",borderBottom:expanded?"1px solid #141E30":"none"}}>
        <span style={{fontSize:28}}>{wStatus==="loading"?"⏳":hasSignal?"🚨":"😴"}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:600,color:hasSignal?"#4AE08A":"#4A5A6C",letterSpacing:"0.01em"}}>
            {wStatus==="loading"&&"Caricamento meteo MeteoSwiss…"}
            {wStatus==="error"&&"Errore dati meteo — riprova"}
            {wStatus==="ok"&&(hasSignal?`🚨 SEGNALE ATTIVO · ${active.length} giorn${active.length===1?"o":"i"} · Alza i prezzi ora`:"😴 Nessun segnale questa settimana · Prezzi invariati")}
          </div>
          {wStatus==="ok"&&hasSignal&&(
            <div style={{fontSize:13,color:"#2E9E60",marginTop:4}}>
              {active.map(s=>`${dayLabel(s.date)} ${s.lWmo.icon} ${s.lTemp}°C Locarno vs ${s.avgNorthTemp}°C nord (+${s.delta}°C)`).join("  ·  ")}
            </div>
          )}
          {wStatus==="ok"&&!hasSignal&&(
            <div style={{fontSize:13,color:"#2A3848",marginTop:4}}>Nessun differenziale meteo significativo tra Locarno e le città svizzero-tedesche</div>
          )}
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",flexShrink:0}}>
          <button onClick={e=>{e.stopPropagation();loadWeather();}} style={{background:"none",border:"1px solid #1E2838",borderRadius:8,padding:"6px 14px",color:"#4A6A8A",fontSize:13,cursor:"pointer"}}>↻ Aggiorna</button>
          {wStatus==="ok"&&<span style={{fontSize:14,color:"#2A3848"}}>{expanded?"▲":"▼"}</span>}
        </div>
      </div>

      {/* Expanded table */}
      {expanded&&wStatus==="ok"&&rawResults&&(
        <div>
          {/* Column headers */}
          <div style={{display:"grid",gridTemplateColumns:"130px repeat(4,1fr) 90px",padding:"10px 20px 8px",background:"#080E18",borderBottom:"1px solid #141E30"}}>
            {["","Locarno ☀️","Zürich","Bern","Luzern","Segnale"].map((h,i)=>(
              <div key={i} style={{fontSize:11,color:"#3A5A7A",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:500,textAlign:i===5?"center":"left"}}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {signals.map((sig,i)=>{
            const rowBg = sig.isSignal ? ROW_SIGNAL : i%2===0 ? ROW_EVEN : ROW_ODD;
            const r = rateReco(sig.strength);
            return(
              <div key={i} style={{display:"grid",gridTemplateColumns:"130px repeat(4,1fr) 90px",padding:"12px 20px",background:sig.isSignal?ROW_SIGNAL:rowBg,borderBottom:i<6?"1px solid #0A1420":"none",alignItems:"center",borderLeft:sig.isSignal?"3px solid #1D9E75":"3px solid transparent"}}>
                <div style={{fontSize:14,fontWeight:sig.isSignal?600:400,color:sig.isSignal?"#4AE08A":"#C0D0E0"}}>
                {dayLabel(sig.date)}
                {sig.sunHours>0&&<span style={{fontSize:11,color:sig.sunHere?"#FFD700":sig.partialSun?"#B8A040":"#2A3848",marginLeft:6}}>{sig.sunHours}h ☀️</span>}
                {sig.bigDelta&&<span style={{fontSize:11,color:"#FF8C42",marginLeft:4}}>+{sig.delta}°</span>}
              </div>
                {rawResults.map((loc,li)=>{
                  const w=getWmo(loc.weathercode[i]);
                  const temp=Math.round(loc.temperature_2m_max[i]);
                  const precip=loc.precipitation_probability_max[i];
                  return(
                    <div key={li} style={{fontSize:14,display:"flex",alignItems:"center",gap:5}}>
                      <span style={{fontSize:16}}>{w.icon}</span>
                      <span style={{color:li===0?"#FFFFFF":"#A0B8CC",fontWeight:li===0?500:400}}>{temp}°C</span>
                      {precip>20&&<span style={{fontSize:11,color:"#3A5A7A"}}>{precip}%</span>}
                    </div>
                  );
                })}
                <div style={{textAlign:"center"}}>
                  {sig.isSignal?(
                    <span style={{fontSize:14,color:r.color,fontWeight:700,background:r.bg,padding:"3px 10px",borderRadius:6}}>{r.pct}</span>
                  ):(
                    <span style={{color:"#1A2830",fontSize:13}}>—</span>
                  )}
                </div>
              </div>
            );
          })}

          <div style={{padding:"10px 20px",background:"#080E18",borderTop:"1px solid #141E30",fontSize:12,color:"#1E3048",lineHeight:1.7}}>
            Fonte: Open-Meteo · Modello MeteoSwiss ICON · ⚡ Alza i prezzi entro martedì–mercoledì mattina · 67% delle prenotazioni last-minute arriva giovedì–sabato
          </div>
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

const CTX = `
PROPERTY: Residenza Motta — boutique serviced apartments, Locarno Old Town (Città Vecchia), Ticino, Switzerland. Via della Motta 11, 6600 Locarno. Family-run 25+ years, now led by Lorenzo and siblings. Languages: IT/DE/FR/EN/ES. On-site: Caffè/Bistro BarTolomeo (breakfast/meals on request). Mediterranean courtyard. Ticino Ticket included.
UNITS (11 short-term): Studios Nr.7, Nr.8, Nr.12 | Cozy Studio Nr.1 | Superior 1-Room Nr.9 | 2-Rooms Nr.10, Nr.17 | Superior 2-Rooms Nr.4 | Penthouse Nr.18 | Charming Nr.15 | Sunny Nr.3.

CHANNELS: Booking.com 55% revenue / 15% commission | Amenitiz direct 13% | Airbnb 4% | Manual/corporate 25%.
2025 PERFORMANCE: CHF 257,000 revenue | RevPAR CHF 64/night | 2026 target: CHF 90–95 RevPAR (+40%).
GUESTS: 73.5% Swiss (ZH, BE, AG, LU, ZG), 7% Germany, 2% Italy | 53% couples, 27% families, 10% groups, 9% solo. 80% book on mobile.
BOOKING BEHAVIOR: Median lead time 23 days. 33.7% book within 7 days of arrival.
RATES: Studios CHF 110–200 | Superior 1-Room CHF 140–250 | 2-Rooms CHF 140–260 | Penthouse CHF 160–320 | Charming/Sunny CHF 130–260.

DATA CORRECTIONS (always apply):
- Nr.9 ADR CHF 222 inflated: Wiedenmann group (7 rooms, Jun 27–Jul 7) split incorrectly onto Nr.9 only. Real ADR ~CHF 125–145.
- August 2025 real occupancy ~55% not 43%: 5 bookings (Aug 17–27) entered as 1-night stays in error.
- 2026 vs 2025 ADR comparisons: subtract CHF 30 cleaning fee (new in 2026) before comparing. Raw 2026 ADR looks lower but effective rate is not.

2026 ON THE BOOKS (Mar 17): March 31% | April 20% | May 21% | June 16% | July 19% | August 5%.
Film Festival Jul 25–Aug 10: 7/11 units partially booked at severely underpriced rates (Penthouse CHF 152/n, Studio 12 CHF 100/n).

PRICING PHILOSOPHY (critical context — never ignore):
- Owner is testing softer pricing to drive occupancy but volume is not responding enough to compensate. Yield trap risk.
- HBenchmark comp set (11 Locarno 3★): their ADR CHF 80–101, occ 49–53%. Motta runs higher ADR, lower occupancy.
- Owner wants to find right LOS/occupancy/ADR balance — not ready for aggressive rate increases. Always present pricing as options with tradeoffs, never black/white.
- Priority order: 1) Visibility 2) LOS optimization 3) Rate calibration.

COMP SET:
- Great2Stay City Center: score 8.2, CHF 130–200/n — lower quality finish
- Pardo by Quokka 360: score 9.1, CHF 140–210/n — professionally managed, strong ranking
- Locarno City by Quokka 360: score 9.3, CHF 120–190/n — studio benchmark
- Palazzo Canetti (hotel, on Piazza Grande): score 8.9, CHF 150–280/n — no kitchen
- Residenza Vivian (lakefront): score 9.2, CHF 160–240/n
- Sasso Boretto (luxury): CHF 200–380/n — Penthouse rate ceiling reference
- Attico Bellavista (Airbnb penthouse, Jacuzzi): CHF 250–450/n — Nr.18 ceiling

VISIBILITY PROBLEMS (top priority):
- Google Business Profile: claimed but severely underoptimized
- Google reviews: only 48 (vs 159 on Booking.com at score 9.2) — recency unknown, Google weights recency heavily
- Website: live, good content, zero SEO/SEM — outranked by 5+ aggregators for own name
- Airbnb: 85% less page views than similar listings. Listings updated Mar 2026. 79 nights / CHF 11,729 gross in 2025.
- Facebook: 43 likes, effectively dead
- Zero organic discovery outside Booking.com

GUEST COMMUNICATION (current state — all gaps):
- NO pre-arrival, mid-stay, or post-checkout messaging strategy
- NO Google review request flow
- NO direct booking re-engagement after stay
- Lorenzo messages most guests personally on his PERSONAL WhatsApp — guests love the warmth
- Phone numbers come from Booking.com reservations — legal constraint: can only use for operational messages (key instructions, arrival info), NOT marketing
- All Booking.com emails masked (@guest.booking.com) — zero email capture from 55% of guests
- Booking.com messaging system (pre/during stay) = only compliant channel for OTA guests — can use this to request Google reviews during stay
- WhatsApp Business preferred approach: automate the TIMING, preserve Lorenzo's VOICE
- No guest database, no CRM, no loyalty program

GUEST DATA CAPTURE (priority gap):
- Direct/manual bookings (38%): emails in Amenitiz but not systematically used
- OTA guests: no data captured beyond masked contact
- Solution needed: check-in welcome form or WiFi registration to capture real email/phone from OTA guests

STRATEGIC PRIORITIES AGREED (in order):
1. Google Business Profile optimization + review recency drive
2. Guest data capture system at check-in (welcome form / WiFi login)
3. WhatsApp Business messaging flow: pre-arrival / during stay / post-checkout
4. Airbnb listing optimization (started Mar 2026)
5. LOS testing per season and unit type
6. Rate calibration (only after visibility + occupancy picture clearer)
7. Direct booking growth: 13% → 25%+, recovering ~CHF 21,000/year in OTA commissions

KEY EVENTS 2026: Film Festival Locarno Jul 25–Aug 10 (+40–60% ADR, min 7n) | Settimane Musicali Ascona Aug/Sep (+20–30%) | Swiss school holidays ZH/BE/AG/LU/ZG | Easter Mar 28–Apr 12 | Camellia season Feb–Apr | Rabadan Bellinzona Feb.
MONTHLY REVPAR TARGETS: Apr CHF 95 | May CHF 90 | Jun CHF 100 | Jul CHF 160 | Aug CHF 140 | Sep CHF 90 | Oct CHF 95.
`;

const AGENTS = {
  direttrice: {
    name: "La Direttrice",
    title: "Growth Strategist",
    color: "#C4602A",
    icon: "◈",
    persona: `ROLE: You are La Direttrice — chief growth strategist and orchestrator for Residenza Motta. You own the direct booking roadmap, channel strategy, and OTA reduction plan.

OBJECTIVE: Grow direct bookings from 13% to 25%+ of total revenue. Recover ~CHF 21,000/year in Booking.com commissions. Support RevPAR growth from CHF 64 (2025) toward CHF 90–95 (2026).

STRATEGIC PRIORITIES (in order):
1. Visibility — Google, Airbnb, organic discovery
2. Guest data capture — build the list from zero
3. Messaging flow — WhatsApp-first, Lorenzo's voice
4. LOS optimization per season and unit
5. Rate calibration — only after visibility and occupancy improve
6. Direct booking growth

DECISION PRINCIPLES: Always ask before concluding. Present options with tradeoffs, never black/white answers. Done is better than perfect. Visibility problems are solved before pricing problems. Never recommend rate increases without checking occupancy context first.

TEAM RELATIONSHIPS: Il Sommelier owns rates — brief him on demand context. La Scrittrice owns copy — brief her on channel and audience. Il Custode owns guest relationships — brief him on conversion goal. L'Esploratore feeds demand intelligence proactively.

GOVERNANCE: You orchestrate missions — assign tasks, never execute copy or pricing yourself. Final output is always a numbered action plan executable this week.

DATA VISIBILITY: No live access to Google Analytics, HBenchmark, or Amenitiz. Ask user to share current data before making recommendations. Never assume metrics are unchanged from last known values.

LANGUAGE: Match the language of the question — Italian, German, French, or English.`
  },
  sommelier: {
    name: "Il Sommelier",
    title: "Pricing Oracle",
    color: "#2E7A50",
    icon: "◉",
    persona: `ROLE: You are Il Sommelier dei Prezzi — revenue manager and pricing oracle for Residenza Motta. You own all rate decisions, minimum stay rules, and yield strategy.

OBJECTIVE: Grow RevPAR from CHF 64 (2025) to CHF 90–95 (2026). Gap must come from April–October only. Never chase RevPAR in Nov–Jan.

APARTMENT TIERS & RATE RANGES:
- Studio (Nr.1, Nr.8, Nr.12, Nr.15): base CHF 110–140 | shoulder CHF 140–170 | peak CHF 170–210
- Superior Studio (Nr.7, Nr.9): base CHF 140–170 | shoulder CHF 170–210 | peak CHF 210–260
- 2-Rooms (Nr.10): base CHF 150–180 | shoulder CHF 180–220 | peak CHF 220–270
- Superior 2-Rooms (Nr.4, Nr.17, Nr.3): base CHF 160–190 | shoulder CHF 190–230 | peak CHF 230–280
- Penthouse (Nr.18): base CHF 180–220 | shoulder CHF 220–270 | peak CHF 270–340

RESPONSE FORMAT — always follow this sequence:
1. DEMAND SIGNAL — what is driving this period
2. RECOMMENDED RATE — specific CHF/night per tier, shown TWO ways: (a) rate excluding cleaning fee, (b) effective rate including CHF 30 cleaning fee
3. MINIMUM STAY — 2, 3, or 7 nights depending on demand
4. FLOOR — minimum acceptable rate, never go below this
5. RISK IF NO ACTION — specific CHF amount of revenue permanently lost if not acted on

PRICING PRINCIPLES: Always present options with tradeoffs — never black/white. Owner is finding the right balance between LOS, occupancy, and ADR. When comparing 2026 vs 2025 ADR, always subtract CHF 30 cleaning fee from 2026 rate first. August 2025 real occupancy was ~55% not 43% — use corrected figure.

WEATHER SIGNAL: Locarno sun or dry + delta ≥8°C vs ZH/BE/LU = immediate last-minute demand spike. Recommend +20–35% for next 7–10 days.

DATA VISIBILITY: No live occupancy data. Always ask user to share current on-the-books figures before making specific rate recommendations.

LANGUAGE: Match the language of the question.`
  },
  scrittrice: {
    name: "La Scrittrice",
    title: "Content & Copy",
    color: "#6B4DAE",
    icon: "◇",
    persona: `ROLE: You are La Scrittrice — copywriter and content strategist for Residenza Motta. You own all guest-facing words: emails, WhatsApp messages, social posts, listing descriptions, direct booking copy, in-property materials.

OBJECTIVE: Every piece of copy has one job — make the guest feel Residenza Motta is worth contacting directly and returning to.

GUEST PROFILE: Primary guest is Swiss German-speaking couples from ZH/BE/AG. They are precise and skeptical — they respond to specificity, not adjectives. "5 minutes from Piazza Grande on foot" beats "beautiful central location." "Nespresso capsules included" beats "fully equipped kitchen."

VOICE: Warm, personal, and authentic — Lorenzo's voice. Never corporate. Never a hotel chain. This is a family home that welcomes guests.

OUTPUT RULES:
- Emails: always include subject line first. Keep under 150 words. One clear call to action.
- WhatsApp: under 160 characters. Conversational, never salesy.
- Social: write for mobile scroll-stop. First line must hook.
- Always include a real incentive to book direct and honest urgency — never manufactured.

LANGUAGE RULES:
- Guest communications (WhatsApp, email, post-stay): DE/FR/IT/EN matching guest origin
- On-property materials (welcome card, WiFi, in-room info): all four languages DE + IT + FR + EN
- Airbnb/Booking.com listings: DE primary, IT + EN secondary
- Social media: IT primary, DE secondary`
  },
  custode: {
    name: "Il Custode",
    title: "Guest Intelligence",
    color: "#1A6FA0",
    icon: "◎",
    persona: `ROLE: You are Il Custode — keeper of guest relationships and CRM architect for Residenza Motta. You build the guest database from zero and design the full relationship lifecycle.

OBJECTIVE: Turn every OTA checkout into a future direct booking. Build a guest database that Residenza Motta owns — not Booking.com.

CURRENT STATE (critical context):
- No CRM or guest database exists yet
- Booking.com emails are all masked (@guest.booking.com) — zero email capture from 55% of guests
- Booking.com phone numbers can only be used for operational messages about the current reservation — NOT marketing
- Booking.com messaging system (pre/during stay) is the only compliant channel for OTA guests
- Lorenzo contacts guests personally via WhatsApp — guests love this warmth
- ~90% of guests share a phone number
- Direct/manual bookings (38%): emails exist in Amenitiz but not systematically used

YOUR PRIORITIES IN ORDER:
1. Design the data capture system — what to collect, when, how (welcome form, WiFi login, check-in moment)
2. Define what data matters — name, email, phone, nationality, party type, return intent
3. Build the WhatsApp/messaging flow — pre-arrival, during stay, post-checkout, review request, re-engagement
4. Design the direct booking re-engagement sequence for past guests

DESIGN PRINCIPLES: Automate the timing, preserve Lorenzo's voice. Never feel like mass marketing. Always flag what data needs to be captured before designing any flow.

LANGUAGE: Match the language of the question.`
  },
  esploratore: {
    name: "L'Esploratore",
    title: "Market Scout",
    color: "#9A6218",
    icon: "◬",
    persona: `ROLE: You are L'Esploratore — market intelligence, demand signals, events calendar, and competitor monitoring for Residenza Motta. You give actionable intelligence 48–72 hours before it needs to be acted on.

WEATHER SIGNAL (highest priority — check every Tuesday):
Locarno sun or dry + delta ≥8°C vs ZH/BE/LU = last-minute demand spike. Recommend immediate rate increase +20–35% for next 7–10 days. This is the single most powerful last-minute pricing lever.

EVENTS CALENDAR 2026 (with rate impact):
- Camelie Locarno: late Mar–Apr → +15–20%
- JazzAscona: Jun 25–Jul 4 → +20–25%
- Notte Bianca Locarno: June (1 night) → +15%
- Moon & Stars Locarno: Jul 9–19 → +25–30%
- Locarno Film Festival: Aug 5–15 → +40–60% peak of peaks, min 7-night stay
- Vallemaggia Magic Blues: Aug → +15–20%
- Settimane Musicali Ascona: Aug–Sep → +20–30%
- Christmas market Piazza Grande: late Nov–Jan → +20% Dec/NYE spikes
- Stranociada Carnival Locarno + Rabadan Bellinzona: Feb → fills dead zone

SWISS SCHOOL HOLIDAYS (primary demand driver): ZH/BE/AG/LU/ZG — Easter, Whitsun/Pfingsten, Summer Jul–Aug, Autumn Oct, Christmas/NYE.

LONG WEEKENDS / BRÜCKTAGE: Ascension, Whit Monday, Swiss National Day Aug 1, etc. → +15–25%.

COMPETITOR MONITORING: When user shares HBenchmark screenshots or Booking.com competitor data, interpret it and recommend specific action. Never assume data is current — always ask for fresh screenshots.

DATA VISIBILITY: No live access. Interpret data the user shares. The weather signal widget in the app runs automatically via Open-Meteo MeteoSwiss ICON model.

LANGUAGE: Match the language of the question.`
  }
};

const ORCHESTRATOR_SYSTEM = `You are the orchestration brain for Residenza Motta's AI growth team.

Given a user brief, you must:
1. Decide which 2–4 specialist agents are most relevant (from: sommelier, scrittrice, custode, esploratore — NOT direttrice, she orchestrates)
2. Write a focused assignment for each selected agent (2–3 sentences, specific to the brief)
3. Designate one agent as the synthesizer who will read all outputs and write the final action plan

Respond ONLY with valid JSON. No preamble, no markdown fences. Exactly this format:
{
  "mission_title": "short title for this mission (max 6 words)",
  "agents": [
    {"id": "sommelier", "assignment": "..."},
    {"id": "scrittrice", "assignment": "..."}
  ],
  "synthesizer": "custode",
  "synthesizer_instruction": "Read all agent outputs above and write a 5-point numbered action plan the owner can execute this week. Be concrete: dates, rates, channels, copy snippets."
}

Valid agent ids: sommelier, scrittrice, custode, esploratore
The synthesizer must also appear in the agents array (they do their specialist work first, then synthesize).`;

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin { to{transform:rotate(360deg)} }
  ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#1E2838;border-radius:3px}
  .fadeup { animation: fadeUp .35s ease forwards; opacity:0; }
  textarea { resize:none; }
  textarea:focus, button:focus { outline:none; }
  .ex-btn:hover { background: #141E30 !important; color: #8A7A68 !important; }
`;

const BG = "#080C14";
const PANEL = "#0C1120";
const CARD = "#0F1828";
const BORDER = "#141E30";
const GOLD = "#9A6218";

async function callClaude(system, messages, onChunk) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages,
    }),
  });
  const data = await res.json();
  if (!data.content?.[0]?.text) throw new Error(data.error?.message || "API error");
  return data.content[0].text;
}

function Spinner({ color }) {
  return (
    <span style={{
      display: "inline-block", width: 14, height: 14, border: `2px solid ${color}30`,
      borderTopColor: color, borderRadius: "50%",
      animation: "spin .7s linear infinite", verticalAlign: "middle"
    }} />
  );
}

function AgentCard({ id, assignment, output, status }) {
  const agent = AGENTS[id];
  return (
    <div className="fadeup" style={{
      background: CARD, border: `1px solid ${status === "done" ? agent.color + "40" : BORDER}`,
      borderRadius: 14, overflow: "hidden", transition: "border-color .3s"
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px", borderBottom: `1px solid ${BORDER}`,
        display: "flex", alignItems: "center", gap: 10, background: agent.color + "0A"
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: agent.color + "18", border: `1px solid ${agent.color}35`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: agent.color
        }}>{agent.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, color: "#EAE0D0", lineHeight: 1 }}>{agent.name}</div>
          <div style={{ fontSize: 9.5, color: agent.color, textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 2 }}>{agent.title}</div>
        </div>
        {status === "running" && <Spinner color={agent.color} />}
        {status === "done" && <span style={{ fontSize: 11, color: agent.color }}>✓</span>}
      </div>

      {/* Assignment */}
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${BORDER}`, background: "#0A1020" }}>
        <div style={{ fontSize: 10, color: "#8A9AB8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 5 }}>Assignment</div>
        <div style={{ fontSize: 14, color: "#B0C0D8", lineHeight: 1.6 }}>{assignment}</div>
      </div>

      {/* Output */}
      <div style={{ padding: "12px 16px", minHeight: 60 }}>
        {status === "waiting" && (
          <div style={{ fontSize: 13.5, color: "#8090A8", fontStyle: "italic" }}>Waiting for turn…</div>
        )}
        {status === "running" && !output && (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {[0,.15,.3].map((d,i) => (
              <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: agent.color, animation: `pulse 1.2s ${d}s ease-in-out infinite` }} />
            ))}
          </div>
        )}
        {output && (
          <div style={{ fontSize: 15.5, color: "#EDE4D8", lineHeight: 1.82, whiteSpace: "pre-wrap" }}>{output}</div>
        )}
      </div>
    </div>
  );
}

function SynthesisCard({ agent, output, status }) {
  const a = AGENTS[agent];
  if (!a) return null;
  return (
    <div className="fadeup" style={{
      background: CARD, border: `2px solid ${status === "done" ? a.color : BORDER}`,
      borderRadius: 14, overflow: "hidden", transition: "border-color .3s"
    }}>
      <div style={{
        padding: "14px 18px", borderBottom: `1px solid ${BORDER}`,
        background: a.color + "12", display: "flex", alignItems: "center", gap: 10
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
          background: a.color + "22", border: `1px solid ${a.color}50`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: a.color
        }}>{a.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: a.color, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 3 }}>Final Action Plan</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: "#EAE0D0" }}>{a.name} synthesizes</div>
        </div>
        {status === "running" && <Spinner color={a.color} />}
        {status === "done" && <span style={{ fontSize: 15, color: a.color }}>✓ Complete</span>}
      </div>
      <div style={{ padding: "16px 18px", minHeight: 80 }}>
        {status === "running" && !output && (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {[0,.15,.3].map((d,i) => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: a.color, animation: `pulse 1.2s ${d}s ease-in-out infinite` }} />
            ))}
          </div>
        )}
        {output && <div style={{ fontSize: 16, color: "#EDE4D8", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{output}</div>}
      </div>
    </div>
  );
}

const EXAMPLES = [
  "We have 3 empty weeks in August around the Film Festival — how do we fill them and at what price?",
  "Design a post-stay email campaign to convert our Booking.com guests to direct for their next visit",
  "Easter is 11 days away and April occupancy is only 20% — what do we do this week?",
  "We want to launch a best-price-guarantee. What's the strategy, copy, and CRM follow-up?",
];

export default function App() {
  const [brief, setBrief] = useState("");
  const [mission, setMission] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | planning | running | done
  const [agentStatuses, setAgentStatuses] = useState({});
  const [agentOutputs, setAgentOutputs] = useState({});
  const [synthStatus, setSynthStatus] = useState("waiting");
  const [synthOutput, setSynthOutput] = useState("");
  const [error, setError] = useState("");
  const taRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  useEffect(() => {
    if (phase !== "idle") bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentOutputs, synthOutput, phase]);

  async function run() {
    if (!brief.trim() || phase !== "idle") return;
    setPhase("planning");
    setMission(null);
    setAgentStatuses({});
    setAgentOutputs({});
    setSynthStatus("waiting");
    setSynthOutput("");
    setError("");

    let plan;
    try {
      const raw = await callClaude(
        ORCHESTRATOR_SYSTEM + "\n\n--- PROPERTY CONTEXT ---\n" + CTX,
        [{ role: "user", content: brief }]
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      plan = JSON.parse(clean);
    } catch (e) {
      setError("Orchestration failed: " + e.message);
      setPhase("idle");
      return;
    }

    setMission(plan);
    setPhase("running");

    const initStatuses = {};
    plan.agents.forEach((a, i) => { initStatuses[a.id] = i === 0 ? "running" : "waiting"; });
    setAgentStatuses({ ...initStatuses });

    const outputs = {};

    for (let i = 0; i < plan.agents.length; i++) {
      const { id, assignment } = plan.agents[i];
      setAgentStatuses(s => ({ ...s, [id]: "running" }));

      const prevContext = Object.entries(outputs)
        .map(([aid, out]) => `=== ${AGENTS[aid].name} (${AGENTS[aid].title}) ===\n${out}`)
        .join("\n\n");

      const userMsg = prevContext
        ? `USER BRIEF: ${brief}\n\nYOUR ASSIGNMENT: ${assignment}\n\nCONTEXT FROM PRIOR AGENTS:\n${prevContext}`
        : `USER BRIEF: ${brief}\n\nYOUR ASSIGNMENT: ${assignment}`;

      try {
        const out = await callClaude(
          AGENTS[id].persona + "\n\n--- RESIDENZA MOTTA CONTEXT ---\n" + CTX,
          [{ role: "user", content: userMsg }]
        );
        outputs[id] = out;
        setAgentOutputs({ ...outputs });
        setAgentStatuses(s => ({ ...s, [id]: "done" }));
        if (i + 1 < plan.agents.length) {
          setAgentStatuses(s => ({ ...s, [plan.agents[i + 1].id]: "running" }));
        }
      } catch (e) {
        outputs[id] = `Error: ${e.message}`;
        setAgentOutputs({ ...outputs });
        setAgentStatuses(s => ({ ...s, [id]: "done" }));
      }
    }

    // Synthesis
    setSynthStatus("running");
    const allOutputs = plan.agents
      .map(a => `=== ${AGENTS[a.id].name} (${AGENTS[a.id].title}) ===\n${outputs[a.id] || ""}`)
      .join("\n\n");

    try {
      const synth = await callClaude(
        AGENTS[plan.synthesizer].persona + "\n\n--- RESIDENZA MOTTA CONTEXT ---\n" + CTX,
        [{
          role: "user",
          content: `USER BRIEF: ${brief}\n\nAGENT OUTPUTS:\n${allOutputs}\n\nYOUR TASK: ${plan.synthesizer_instruction}`
        }]
      );
      setSynthOutput(synth);
      setSynthStatus("done");
    } catch (e) {
      setSynthOutput(`Error: ${e.message}`);
      setSynthStatus("done");
    }

    setPhase("done");
  }

  function reset() {
    setPhase("idle");
    setMission(null);
    setBrief("");
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "'Outfit', sans-serif", color: "#EAE0D0" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 20px 60px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 14 }}>
            <div style={{ height: 1, width: 36, background: `linear-gradient(to right, transparent, ${GOLD}44)` }} />
            <div style={{ fontSize: 9.5, color: GOLD, letterSpacing: "0.22em", textTransform: "uppercase" }}>Residenza Motta · Growth Team</div>
            <div style={{ height: 1, width: 36, background: `linear-gradient(to left, transparent, ${GOLD}44)` }} />
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 38, fontWeight: 700, color: "#EAE0D0", lineHeight: 1.08 }}>
            Mission Briefing
          </h1>
          <p style={{ fontSize: 15, color: "#A0B0C8", marginTop: 10, lineHeight: 1.65 }}>
            Describe a challenge or opportunity. The team self-organizes, each agent builds on the last, then synthesizes one action plan.
          </p>
        </div>

        <WeatherBanner />

        {/* Brief Input */}
        {phase === "idle" && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
              <textarea
                ref={taRef}
                value={brief}
                onChange={e => {
                  setBrief(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 180) + "px";
                }}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }}
                placeholder="Describe your challenge, opportunity, or question…"
                rows={3}
                style={{
                  width: "100%", background: "transparent", border: "none",
                  padding: "18px 20px 12px", color: "#EAE0D0", fontSize: 15,
                  fontFamily: "'Outfit', sans-serif", lineHeight: 1.65,
                }}
              />
              <div style={{ padding: "10px 16px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#1E2838" }}>⌘ + Enter to send</span>
                <button
                  onClick={run}
                  disabled={!brief.trim()}
                  style={{
                    background: brief.trim() ? GOLD : "#0F1828",
                    border: "none", borderRadius: 10, padding: "9px 20px",
                    color: brief.trim() ? "#fff" : "#1E2838",
                    fontSize: 15, fontFamily: "'Outfit', sans-serif", fontWeight: 500,
                    cursor: brief.trim() ? "pointer" : "default", transition: "all .2s",
                    letterSpacing: "0.02em"
                  }}
                >Brief the team →</button>
              </div>
            </div>

            {/* Examples */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 10, color: "#1E2838", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 10, textAlign: "center" }}>Try one of these</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {EXAMPLES.map((ex, i) => (
                  <button key={i} className="ex-btn" onClick={() => setBrief(ex)}
                    style={{
                      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
                      padding: "10px 14px", color: "#B0C0D8", fontSize: 15, textAlign: "left",
                      cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "all .15s", lineHeight: 1.5
                    }}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active Mission */}
        {mission && (
          <div style={{ marginBottom: 28 }}>
            {/* Mission header */}
            <div style={{
              background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14,
              padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 14
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: GOLD, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 5 }}>Active mission</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: "#EAE0D0", lineHeight: 1.15, marginBottom: 8 }}>
                  {mission.mission_title}
                </div>
                <div style={{ fontSize: 15, color: "#B0C0D8", lineHeight: 1.6, fontStyle: "italic" }}>"{brief}"</div>
              </div>
              {phase === "done" && (
                <button onClick={reset}
                  style={{
                    background: "none", border: `1px solid ${BORDER}`, borderRadius: 8,
                    padding: "7px 14px", color: "#B0C0D8", fontSize: 13.5, cursor: "pointer",
                    fontFamily: "'Outfit', sans-serif", transition: "all .15s", flexShrink: 0
                  }}>New brief</button>
              )}
            </div>

            {/* Phase indicator */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {[
                { key: "planning", label: "Orchestrating" },
                { key: "running", label: "Agents working" },
                { key: "done", label: "Plan ready" }
              ].map((p, i) => {
                const phases = ["planning", "running", "done"];
                const currentIdx = phases.indexOf(phase);
                const pIdx = phases.indexOf(p.key);
                const active = pIdx <= currentIdx;
                return (
                  <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: active ? GOLD : "#1A2436",
                      animation: p.key === phase && phase !== "done" ? "pulse 1.2s ease infinite" : "none"
                    }} />
                    <span style={{ fontSize: 11, color: active ? "#8A7A68" : "#1A2436" }}>{p.label}</span>
                    {i < 2 && <span style={{ fontSize: 11, color: "#606878", margin: "0 2px" }}>›</span>}
                  </div>
                );
              })}
            </div>

            {/* Agent cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {mission.agents.map(a => (
                <AgentCard
                  key={a.id}
                  id={a.id}
                  assignment={a.assignment}
                  output={agentOutputs[a.id] || ""}
                  status={agentStatuses[a.id] || "waiting"}
                />
              ))}
            </div>

            {/* Synthesis */}
            {(synthStatus !== "waiting" || phase === "done") && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ height: 1, flex: 1, background: `linear-gradient(to right, transparent, ${GOLD}33)` }} />
                  <span style={{ fontSize: 10, color: GOLD, textTransform: "uppercase", letterSpacing: "0.16em" }}>synthesis</span>
                  <div style={{ height: 1, flex: 1, background: `linear-gradient(to left, transparent, ${GOLD}33)` }} />
                </div>
                <SynthesisCard
                  agent={mission.synthesizer}
                  output={synthOutput}
                  status={synthStatus}
                />
              </div>
            )}

            {phase === "done" && (
              <div style={{ textAlign: "center", marginTop: 24 }}>
                <button onClick={reset} style={{
                  background: "none", border: `1px solid ${GOLD}44`, borderRadius: 10,
                  padding: "10px 24px", color: GOLD, fontSize: 15, cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif", transition: "all .2s", letterSpacing: "0.02em"
                }}>← New mission brief</button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ background: "#1A0A0A", border: "1px solid #3A1A1A", borderRadius: 10, padding: "12px 16px", color: "#C45050", fontSize: 15, marginTop: 16 }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />

        {/* Footer agents roster */}
        {phase === "idle" && (
          <div style={{ marginTop: 40, borderTop: `1px solid ${BORDER}`, paddingTop: 28 }}>
            <div style={{ fontSize: 10, color: "#1A2030", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 16, textAlign: "center" }}>The team</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {Object.entries(AGENTS).map(([id, a]) => (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: a.color }}>{a.icon}</span>
                  <span style={{ fontSize: 13.5, color: "#A0B0C8" }}>{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
