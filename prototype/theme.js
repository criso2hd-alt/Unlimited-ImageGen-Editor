/* Shared by the studio and the setup screen so both follow the theme saved in Settings. */
const themes={
  slate:{name:'Night Slate',background:'#30343a',panel:'#252a30',sidebar:'#1d2228',header:'#22272d',card:'#373d44',accent:'#bed0dc'},
  graphite:{name:'Graphite',background:'#303030',panel:'#262626',sidebar:'#1d1d1d',header:'#222222',card:'#3a3a3a',accent:'#d3cec4'},
  umber:{name:'Deep Umber',background:'#342f2c',panel:'#2a2523',sidebar:'#211c1b',header:'#282321',card:'#403834',accent:'#ddc2a8'},
  forest:{name:'Shadow Forest',background:'#2e3431',panel:'#252b28',sidebar:'#1d2421',header:'#222925',card:'#39413b',accent:'#bed2bd'}
};
function shade(hex,amount){const n=parseInt(hex.slice(1),16);return '#'+[16,8,0].map(shift=>Math.max(0,Math.min(255,((n>>shift)&255)+amount)).toString(16).padStart(2,'0')).join('');}
function applyTheme(p){
  const root=document.documentElement;
  const t=p.theme==='custom'?{background:p.customBackground,panel:p.customPanel,sidebar:shade(p.customPanel,-9),header:shade(p.customPanel,-4),card:shade(p.customPanel,15),accent:p.customAccent}:(themes[p.theme]||themes.slate);
  for(const [name,value] of Object.entries({matte:t.background,panel:t.panel,sidebar:t.sidebar,header:t.header,card:t.card,accent:t.accent,'accent-soft':`${t.accent}33`}))root.style.setProperty(`--studio-${name}`,value);
}
function savedTheme(){try{return {theme:'slate',customBackground:'#30343a',customPanel:'#252a30',customAccent:'#bed0dc',...(JSON.parse(localStorage.getItem('unlimited-studio-v3')||'{}').preferences||{})};}catch{return {theme:'slate'};}}
