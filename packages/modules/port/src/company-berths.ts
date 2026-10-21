export interface CompanyBerthEdition {
 id:string;ticker:'PHP';observed_on:string;published_at:string;
 entries:CompanyBerthFact[];
}
export interface CompanyBerthFact {
 asset_code:'tan_vu'|'chua_ve'|'hoang_dieu'|'htit';name:string;
 relationship:'branch'|'via_member_company'|'joint_venture';operator:string;
 alias:string;effective_from:null;effective_to:null;
 source_url:string;source_sha256:string;source_note:string;
}
// Match reviewed source labels only. Similar names must remain unresolved.
export function matchCompanyBerth(label:string,entries:CompanyBerthFact[]){
 const normalized=label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').trim().replace(/\s+/g,' ').toUpperCase();
 return entries.find(e=>e.alias===normalized)?.asset_code??null;
}
