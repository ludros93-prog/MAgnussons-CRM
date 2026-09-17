import { ArrowRight, CalendarClock, ClipboardCheck, FileCheck2, HeartHandshake, PackageCheck, Target, Zap } from 'lucide-react';

export function CRMAutomation({ followupDays }: { followupDays: number }) {
  const existing = [
    { icon: CalendarClock,title:'Importerade kunder får en första avstämning',trigger:'En befintlig kund importeras utan nästa kontaktdatum',action:'Planera en avstämning inom sju dagar och tilldela kundansvarig.' },
    { icon: ClipboardCheck,title:'Mötet får en uppföljning',trigger:'Ett kundmöte markeras genomfört',action:'Skapa en aktivitet för återkoppling och nästa steg.' },
    { icon: CalendarClock, title: 'Årshjulet planerar kontakten', trigger: 'Ett inköpsbehov sparas med leveransdatum och framförhållning', action: 'Skapa eller uppdatera ansvarigs uppgift. När ett återkommande behov markeras hanterat planeras nästa tillfälle.' },
    { icon: ClipboardCheck, title: 'Anteckningen blir ett nästa steg', trigger: 'Anteckningen sparas med aktivitet, ansvarig och datum', action: 'Spara originaltexten och skapa uppgiften samtidigt.' },
    { icon: FileCheck2, title: 'Korrektur och beställning får sista datum', trigger: 'Affären sparas med korrektur- eller beställningsdatum', action: 'Planera uppgifter som avslutas när godkännande respektive leverantörsbekräftelse registreras på ordern.' },
    { icon: Target, title: 'Prospekt får en nästa aktivitet', trigger: 'Bearbetningen sparas med nästa steg och datum', action: 'Skapa eller uppdatera säljarens uppgift.' },
    { icon: FileCheck2, title: 'Offerten får en uppföljning', trigger: 'Affären flyttas till offert eller beslut', action: 'Lägg upp en uppföljning på affärens nästa datum.' },
    { icon: ClipboardCheck, title: 'Första ordern startar onboarding', trigger: 'Första affären med ett prospekt vinns', action: 'Skapa order och onboarding med ansvarig och checklista.' },
    { icon: PackageCheck, title: 'Leveransen följs upp', trigger: 'Ordern registreras som levererad', action: `Skapa en uppgift ${followupDays} dagar efter leveransdatum.` },
    { icon: CalendarClock, title: 'Nästa inköp kommer upp i tid', trigger: 'Kundplanen sparas med datum för nästa behov', action: 'Planera en uppgift 14 dagar före kundens behovsdatum.' },
    { icon: HeartHandshake, title: 'Kundärendet får en ansvarig', trigger: 'Ett öppet ärende sparas i kundplanen', action: 'Skapa eller uppdatera uppgiften med åtgärd, ansvarig och datum.' },
  ];
  const proposed = [
    {title:'Offertuppföljning',trigger:'En öppen offertaktivitet är minst två kalenderdagar sen.',action:'Visa den under Prioritera nu hos ansvarig. Efter fem dagar markeras den för chefsuppföljning i teamvyn.',note:'Försvinner när uppgiften avslutas, flyttas fram eller affären lämnar offert/beslut.'},
    {title:'Leveransrisk',trigger:'Kundens leverans är inom fem kalenderdagar och korrektur, leverantörsbesked eller ändringsgodkännande saknas.',action:'Visa den ansvariges order med exakt vad som behöver lösas.',note:'Försvinner när underlaget är klart, leveransdatumet ändras eller ordern skickas.'},
    {title:'Kund utan nästa steg',trigger:'En aktiv kund saknar öppna aktiviteter och kommande CRM-möten.',action:'Visa kunden under Kunder att kontakta.',note:'Försvinner när nästa aktivitet eller möte planeras.'},
  ];
  return <section className="automation-section" aria-labelledby="automation-title">
    <div className="automation-heading"><span className="automation-symbol"><Zap size={23}/></span><div><div className="eyebrow">AUTOMATIK & UPPFÖLJNING</div><h2 id="automation-title">Nästa steg ska inte falla mellan stolarna.</h2></div></div>
    <div className="automation-subhead"><h3>Det här finns i CRM</h3><span className="automation-status implemented"><CheckMark/>Vid sparning</span></div>
    <p className="automation-description">Reglerna körs när ni sparar eller byter steg. De skapar uppgifter i CRM. Påminnelser via mejl och tidsstyrd eskalering är ännu inte aktiva.</p>
    <div className="automation-grid">{existing.map(({ icon: Icon, title, trigger, action }) => <article className="automation-card" key={title}><Icon size={21}/><h3>{title}</h3><div className="automation-flow"><p><span>När</span>{trigger}</p><ArrowRight size={17}/><p><span>Då</span>{action}</p></div></article>)}</div>
    <div className="automation-subhead proposed"><h3>Aktiva bevakningar i Min dag</h3><span className="automation-status implemented">Aktiva i arbetsytan</span></div>
    <p className="automation-description">Bevakningarna läser aktuella datum och statusar när arbetsytan öppnas eller uppdateras. De skapar inga dubbla notiser och skickar inga externa meddelanden.</p>
    <div className="automation-proposals">{proposed.map((rule, i) => <article key={rule.title}><span className="automation-priority">0{i + 1}</span><div><h3>{rule.title}</h3><p><b>När:</b> {rule.trigger}</p><p><b>Då:</b> {rule.action}</p><small>{rule.note}</small></div></article>)}</div>
  </section>;
}

function CheckMark() { return <span aria-hidden="true">✓</span>; }
