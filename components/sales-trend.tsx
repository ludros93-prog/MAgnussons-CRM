'use client';
import {useId,useState} from 'react';
import {Area,CartesianGrid,ComposedChart,Line,ReferenceLine,XAxis,YAxis} from 'recharts';
import {ChartContainer,ChartTooltip,ChartTooltipContent} from '@/components/ui/chart';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {type State,day} from '@/lib/crm';
import {salesYearSeries} from '@/lib/sales-dashboard';
import {money} from './business-ui';
const config={actual:{label:'Fakturerat',color:'#078575'},goal:{label:'Mål',color:'#8a9aaf'}};
const compactMoney=(value:number)=>new Intl.NumberFormat('sv-SE',{notation:'compact',maximumFractionDigits:1}).format(value)+' kr';
export function SalesTrend({st,owner,month,onMonth}:{st:State;owner:string;month:string;onMonth:(month:string)=>void}){
 const [presentation,setPresentation]=useState('monthly'),gradient=useId().replace(/:/g,''),year=month.slice(0,4);
 const series=salesYearSeries(st,year,owner),cumulative=presentation==='cumulative',currentMonth=day().slice(0,7),selected=series.find(row=>row.month===month)!;
 const data=series.map(row=>({...row,actual:row.month>currentMonth&&!row.invoices?null:cumulative?row.cumulativeRevenue:row.revenue,goal:cumulative?row.cumulativeTarget:row.target}));
 const missingTargets=series.filter(row=>row.target===null).length;
 return <section className="panel result-trend" aria-label={'Försäljning under '+year}>
  <div className="result-panel-heading"><div><span className="result-kicker">UTVECKLING UNDER ÅRET</span><h2>Försäljning {year}</h2></div><Tabs value={presentation} onValueChange={setPresentation}><TabsList aria-label="Visa försäljningen"><TabsTrigger value="monthly">Per månad</TabsTrigger><TabsTrigger value="cumulative">Ackumulerat</TabsTrigger></TabsList></Tabs></div>
  <div className="result-chart-legend"><span><i/>Fakturerat</span><span><i className="goal"/>Mål</span><small>Tryck på en månad för att visa den.</small></div>
  <ChartContainer config={config} className="result-chart" aria-label={cumulative?'Ackumulerad fakturerad försäljning och satta mål':'Fakturerad försäljning och satta mål per månad'}><ComposedChart accessibilityLayer data={data} margin={{top:14,right:12,bottom:4,left:0}} onClick={event=>{if(event.activeTooltipIndex!=null){const row=series[Number(event.activeTooltipIndex)];if(row)onMonth(row.month)}}}>
   <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#078575" stopOpacity={.22}/><stop offset="100%" stopColor="#078575" stopOpacity={.01}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#e6edf3" strokeDasharray="4 4"/><XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={12} minTickGap={8}/><YAxis tickLine={false} axisLine={false} width={66} tickFormatter={compactMoney}/><ReferenceLine x={selected.label} stroke="#93c8be" strokeDasharray="4 4"/>
   <ChartTooltip cursor={{stroke:'#a6b7c8',strokeDasharray:'4 4'}} content={<ChartTooltipContent labelFormatter={(_,payload)=>{const row=payload[0]?.payload;return row?.month?new Date(row.month+'-01T12:00:00').toLocaleDateString('sv-SE',{month:'long',year:'numeric'}):''}} formatter={(value,name)=><div className="result-tooltip-value"><span>{name==='actual'?'Fakturerat':'Mål'}</span><b>{money(Number(value))}</b></div>}/>}/><Area type="linear" dataKey="actual" stroke="var(--color-actual)" strokeWidth={3} fill={`url(#${gradient})`} connectNulls={false} isAnimationActive={false} activeDot={{r:5}}/><Line type="linear" dataKey="goal" stroke="var(--color-goal)" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} isAnimationActive={false}/>
  </ComposedChart></ChartContainer>
  <div className="result-chart-reading"><div><span>{cumulative?'Till och med ':''}{new Date(month+'-01T12:00:00').toLocaleDateString('sv-SE',{month:'long'})}</span><b>{money(cumulative?selected.cumulativeRevenue:selected.revenue)}</b></div><div><span>{cumulative?'Ackumulerat mål':'Månadsmål'}</span><b>{(cumulative?selected.cumulativeTarget:selected.target)===null?'Ej satt':money(cumulative?selected.cumulativeTarget:selected.target)}</b></div><div><span>Fakturor {cumulative?'till och med månaden':'denna månad'}</span><b>{cumulative?series.filter(row=>row.month<=month).reduce((sum,row)=>sum+row.invoices,0):selected.invoices}</b></div></div>
  {missingTargets>0&&<p className="result-chart-note">{cumulative?'Ackumulerat mål visas bara när alla föregående månadsmål finns.':'Saknade månadsmål visas som luckor.'} Årsmålet delas inte automatiskt upp.</p>}
  <details className="result-data-table"><summary>Visa månadsbelopp</summary><div><table><caption>Registrerad försäljning {year}, exklusive moms</caption><thead><tr><th>Månad</th><th>Fakturerat</th><th>Mål</th><th>Fakturor</th></tr></thead><tbody>{series.map(row=><tr key={row.month}><th scope="row"><button onClick={()=>onMonth(row.month)} aria-current={month===row.month?'date':undefined}>{row.label}</button></th><td>{row.month>currentMonth&&!row.invoices?'—':money(row.revenue)}</td><td>{row.target===null?'Ej satt':money(row.target)}</td><td>{row.invoices}</td></tr>)}</tbody></table></div></details>
 </section>;
}
