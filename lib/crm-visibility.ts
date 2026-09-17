import {isDepartmentRole,receivesNotice} from './operations';
import {type State,CustomerSchema,DealSchema,OrderSchema} from './crm';
export function visibleState(state:State,viewer:NonNullable<State['viewer']>):State{
 const st=structuredClone(state);st.viewer=viewer;st.notices=st.notices.filter(n=>receivesNotice(viewer.role,n.audience,viewer.owner,n.owner));
 if(!isDepartmentRole(viewer.role))return st;
 st.orders=st.orders.filter(o=>o.production.status!=='draft').map(o=>OrderSchema.parse({...o,pendingAmendment:null,revisions:[],commercialValue:null,invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:'',productionHistory:o.productionHistory.map(p=>({...p,lines:p.lines.map(l=>({...l,unitPrice:0,unitCost:null}))})),production:{...o.production,lines:o.production.lines.map(l=>({...l,unitPrice:0,unitCost:null}))}}));
 const ids=new Set(st.orders.map(o=>o.customerId)),dealIds=new Set(st.orders.map(o=>o.dealId));st.customers=st.customers.filter(c=>ids.has(c.id)).map(c=>CustomerSchema.parse({id:c.id,name:c.name,contact:c.contact,phone:c.phone,email:c.email,owner:c.owner,deliveryAddress:c.deliveryAddress,status:c.status}));
 st.deals=st.deals.filter(d=>dealIds.has(d.id)).map(d=>DealSchema.parse({id:d.id,customerId:d.customerId,owner:d.owner,title:d.title,stage:d.stage}));st.tasks=[];st.meetings=[];st.events=st.events.filter(e=>ids.has(e.customerId)&&e.kind==='production');st.articles=[];st.leads=[];st.companyEvents=[];st.settings={...st.settings,budgets:{},annualBudgets:{},sellerGoals:{},sellerAnnualGoals:{}};return st;
}
