import type {Role} from './operations';

export const salesPrimaryViews=['today','customers','deals','calendar','overview'] as const;

const departmentPrimaryViews:Partial<Record<Role,readonly string[]>>={
 production:['production','notices'],
 print:['print','notices'],
 warehouse:['warehouse','notices']
};

export function primaryViewsForRole(role:Role|undefined):readonly string[]{
 if(!role)return [];
 return departmentPrimaryViews[role]??salesPrimaryViews;
}

export const canSeeAdminNavigation=(role:Role|undefined)=>role==='admin';
