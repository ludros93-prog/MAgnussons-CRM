// Fast startdag för regressionssviten.
// Flera prov räknar mot oktober 2026 medan deras underlag utgår från "i dag".
// De kunde därför bara passera under oktober 2026. Här får sviten en fast
// startdag, 22 oktober 2026 kl. 10.00 svensk tid, och tiden går sedan som
// vanligt. Produktkoden påverkas inte. CRM_TEST_CLOCK=real kör mot verklig tid.
const RealDate=globalThis.Date,start='2026-10-22T08:00:00Z';
if(process.env.CRM_TEST_CLOCK!=='real'&&!globalThis.__crmTestClock){
 const offset=RealDate.parse(start)-RealDate.now();
 class TestDate extends RealDate{
  constructor(...args){if(args.length)super(...args);else super(RealDate.now()+offset);}
  static now(){return RealDate.now()+offset;}
  static [Symbol.hasInstance](value){return value instanceof RealDate;}
 }
 globalThis.Date=TestDate;globalThis.__crmTestClock=start;
 console.log('test clock: starts '+start+' (set CRM_TEST_CLOCK=real for the real date)');
}
