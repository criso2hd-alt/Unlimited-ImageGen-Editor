const workspace = document.getElementById('workspace');
const sideLinks = [...document.querySelectorAll('.side-link')];

const catalog = {
  photos: {
    group:'CREATE', title:'Photos', subtitle:'Build a photograph with deliberate choices about subject, camera, light and finish.',
    promptTitle:'What is in the photograph?', promptHint:'A portrait of a chef in her kitchen, a vintage bicycle outside a café…',
    sections:[
      {id:'type',title:'Type of photograph',hint:'Start with the scene you want to capture.',options:[['Portrait','People and expression'],['Product','Objects worth noticing'],['Landscape','Places and atmosphere'],['Nature','Plants and natural details'],['Food','Texture and appetite'],['Architecture','Space and structure'],['Interior','Rooms and lived-in spaces'],['Street','Life as it happens']]},
      {id:'look',title:'Capture style',hint:'Choose how the photograph should feel.',options:[['Contemporary digital','Clean and precise'],['35mm color film','Fine grain and gentle color'],['Black & white','Tone and contrast'],['Editorial','Polished, human, intentional'],['Instant film','Soft color and character'],['Medium format','Rich detail and depth'],['Lifestyle','Natural everyday moments'],['Documentary','Honest observational feel'],['Fashion','Styled people and clothing'],['Fine art','Expressive gallery image'],['Cinematic still','A frame from a story'],['Macro','Small subjects, close detail'],['Long exposure','Motion and time rendered'],['High key','Bright, airy tones'],['Low key','Deep shadows and focus']]},
      {id:'process',title:'Era & process',hint:'Suggest a period or a photographic finish.',options:[['Silver gelatin','Classic monochrome print'],['1970s color','Warm archival character'],['1990s editorial','Magazine-era finish'],['Kodachrome','Historic rich slide color'],['Ektachrome','Crisp color reversal look'],['Portra-inspired','Gentle skin tones and latitude'],['Tri-X-inspired','Expressive black-and-white grain'],['Polaroid-style','Instant print and soft edges'],['Slide film','Vivid but natural color'],['Color negative','Soft latitude and grain'],['Cross processed','Unexpected color shifts'],['Cyanotype','Blue photographic print'],['Wet plate','Antique tonal texture'],['Contemporary','Present-day finish']]},
      {id:'light',title:'Light',hint:'Shape the mood before generating.',options:[['Window light','Soft and directional'],['Golden hour','Warm low sunlight'],['Overcast','Even and muted'],['Studio softbox','Controlled and polished'],['Hard sunlight','Bold shadows'],['Candlelight','Intimate and warm'],['Warm practical light','Lamps within the scene'],['Rembrandt light','Painterly triangle of light'],['Butterfly light','Centered beauty lighting'],['Loop light','Gentle cheek shadow'],['Split light','Half-lit dramatic face'],['Rim light','Bright edge separation'],['Backlit','Light behind the subject'],['Top light','Light falling from above'],['Clamshell light','Soft beauty portrait'],['Direct flash','Candid, punchy illumination'],['Blue hour','Cool twilight atmosphere']]},
      {id:'framing',title:'Framing',hint:'Decide where the viewer stands.',options:[['Close-up','Details and expression'],['Waist-up','Person and setting'],['Wide scene','Place and context'],['Top-down','Graphic overhead view'],['Low angle','Strong presence'],['Symmetrical','Calm, balanced frame'],['Environmental portrait','Subject in their surroundings'],['Extreme close-up','One intimate detail'],['Eye level','Direct and natural'],['Negative space','Room around the subject'],['Rule of thirds','Off-center balance'],['Dutch angle','Intentional tilt'],['Through foreground','Layered depth'],['Panorama','Expansive horizontal view']]}
    ]
  },
  art: {
    group:'CREATE',title:'Art & illustration',subtitle:'Turn a subject into a distinct artwork through medium, texture, palette and composition.',
    promptTitle:'What should the artwork show?',promptHint:'A quiet garden at dawn, a curious fox, an imaginary city…',
    sections:[
      {id:'medium',title:'Medium',hint:'Choose the material language of the piece.',options:[['Watercolor','Fluid color on paper'],['Oil painting','Layered pigment and depth'],['Ink drawing','Lines and restraint'],['Colored pencil','Tactile detail'],['Cut paper','Shaped, layered forms'],['Digital illustration','Crisp crafted finish'],['Gouache','Matte opaque paint'],['Charcoal','Soft dark gestures'],['Pastel','Powdery blended color'],['Linocut','Carved print texture'],['Woodcut','Bold carved marks'],['Etching','Fine engraved lines'],['Acrylic','Expressive opaque color'],['Pixel art','Intentional blocky pixels']]},
      {id:'character',title:'Visual character',hint:'Give the result a recognizable voice.',options:[['Botanical study','Observed natural detail'],['Storybook','Warm narrative feeling'],['Editorial','Conceptual and refined'],['Graphic folk','Simple bold forms'],['Surreal','Dreamlike combinations'],['Minimal','Space and restraint'],['Scientific plate','Precise labeled-study feel'],['Children’s book','Friendly readable forms'],['Fantasy','Imagined worlds and creatures'],['Concept art','Designed for a world'],['Retro comic','Printed narrative energy'],['Abstract','Shape, color and rhythm']]},
      {id:'palette',title:'Palette',hint:'Set a color direction.',options:[['Earth tones','Clay, moss, cream'],['Soft pastels','Quiet and airy'],['Monochrome','One color family'],['Rich jewel tones','Deep, saturated color'],['Natural color','True to the subject'],['Warm paper','Aged ivory and ink'],['Limited palette','A few deliberate colors'],['Complementary','Opposing hues in balance'],['Cool muted','Slate, blue and gray'],['Warm vibrant','Coral, ochre and red'],['Black & white','Pure tonal structure']]}
    ]
  },
  graphics: {
    group:'CREATE',title:'Graphics',subtitle:'Create bold visual assets, stickers, patterns and design elements with a clear purpose.',
    promptTitle:'What graphic do you need?',promptHint:'A set of fruit stickers, a geometric background, a friendly mascot…',
    sections:[
      {id:'asset',title:'Asset type',hint:'Choose the kind of graphic you are making.',options:[['Sticker','One playful isolated idea'],['Icon concept','Simple recognizable symbol'],['Pattern','Repeatable visual rhythm'],['Mascot','A character with personality'],['Background','Designed visual texture'],['Spot illustration','A small supporting visual'],['Badge','Compact emblem or mark'],['Packaging motif','Decoration for a product'],['Infographic element','Visual information piece'],['Social graphic','Shareable visual tile'],['Decorative border','Frame or divider'],['Isometric scene','Angled miniature world']]},
      {id:'language',title:'Visual language',hint:'Control shape and surface.',options:[['Flat shapes','Clean color fields'],['Paper cut','Tactile overlapping forms'],['Line art','Expressive outlines'],['Soft 3D','Rounded material depth'],['Screen print','Ink texture and layers'],['Hand drawn','Human imperfections'],['Geometric','Precise simple shapes'],['Organic','Flowing natural forms'],['Duotone','Two-tone treatment'],['Halftone','Printed dot texture'],['Clay-like','Soft sculpted material'],['Collage','Layered found shapes']]},
      {id:'palette',title:'Color direction',hint:'Keep the asset coherent.',options:[['Muted natural','Soft greens and warm neutrals'],['Bright playful','Joyful clear colors'],['Two color','Simple and focused'],['Black & cream','Timeless contrast'],['Pastel','Soft and inviting'],['Primary colors','Red, blue and yellow'],['Earthy warm','Ochre, terracotta, cream'],['Cool modern','Blue, gray and white'],['High contrast','Strong light and dark'],['Custom','Describe colors in your idea']]}
    ]
  },
  posters: {
    group:'CREATE',title:'Posters & text',subtitle:'Build covers, posters and signs where layout and exact wording matter.',
    promptTitle:'What is the poster for?',promptHint:'A summer farmers market, a jazz concert, an exhibition opening…',exactText:true,
    sections:[
      {id:'purpose',title:'Format',hint:'Give the model a concrete design brief.',options:[['Event poster','Date, place and energy'],['Album cover','A memorable square image'],['Book cover','Story and hierarchy'],['Advertisement','A clear product message'],['Invitation','Personal and considered'],['Sign','Short, readable wording'],['Film poster','Cinema storytelling'],['Magazine cover','Headline and cover image'],['Exhibition poster','Gallery announcement'],['Menu','Food and readable sections'],['Editorial spread','Facing-page composition'],['Product label','Compact packaging text']]},
      {id:'layout',title:'Layout direction',hint:'Choose the balance between image and words.',options:[['Image-led','Visual first'],['Type-led','Words carry the design'],['Editorial grid','Structured and precise'],['Minimal','Few elements, strong space'],['Collage','Layered visual energy'],['Centered','Simple and formal'],['Split layout','Two distinct zones'],['Asymmetrical','Deliberate imbalance'],['Full bleed','Image reaches the edges'],['Framed','Strong border and margins'],['Vertical type','Tall text arrangement'],['Modular','Blocks of content']]},
      {id:'finish',title:'Print character',hint:'Set the material feel.',options:[['Modern clean','Sharp and contemporary'],['Vintage print','Aged ink and paper'],['Risograph','Color overlap and grain'],['Fine art','Quiet gallery quality'],['Bold graphic','High-impact shapes'],['Photographic','A real-world focal point'],['Letterpress','Pressed ink texture'],['Screen print','Layered color inks'],['Newsprint','Rough paper and dots'],['Foil accent','Small metallic details'],['Uncoated paper','Soft matte surface']]}
    ]
  },
  transparent: {
    group:'CREATE',title:'Transparent assets',subtitle:'Design isolated subjects for reusable cutouts. Alpha export is still in development.',
    promptTitle:'What should appear on the transparent canvas?',promptHint:'A ceramic cup, a cartoon fox, a hand-drawn flower…',
    sections:[
      {id:'asset',title:'What are you making?',hint:'Choose an isolated subject. True transparent export is coming later.',options:[['Product cutout','A single polished object'],['Sticker','Expressive decorative asset'],['Character','A reusable subject'],['Decorative element','Flora, shapes or ornament'],['Lettering','A word or short phrase'],['Object collection','Several separated items'],['Food cutout','An isolated dish or ingredient'],['Botanical cutout','Leaf, bloom or branch'],['Fashion item','Clothing or accessory'],['Logo concept','A simple brand mark'],['UI ornament','Small interface decoration'],['Emoji-style object','A compact expressive symbol']]},
      {id:'edge',title:'Edge & finish',hint:'Think about where you will reuse the asset.',options:[['Clean cutout','Precise silhouette'],['Soft natural edge','Hair, fur, translucency'],['Illustrated edge','Designed outline'],['Paper texture','Tactile handmade finish'],['Shadow included','Grounded floating object'],['No shadow','Pure isolated element'],['Die-cut border','White sticker outline'],['Feathered edge','Gentle transition'],['Crisp vector-like','Sharp simplified contour'],['Hand-torn edge','Irregular paper edge']]}
    ]
  },
  references: {
    group:'COMPOSE',title:'Multiple references',subtitle:'Bring people, products or objects together using up to ten input images.',
    promptTitle:'How should the references be used?',promptHint:'Put the person from image 1 beside the bicycle from image 2 on a quiet street…',upload:true,
    sections:[
      {id:'goal',title:'Composition goal',hint:'Tell the model what matters most.',options:[['Keep identity','Preserve a person or character'],['Keep product detail','Preserve a product’s appearance'],['Combine subjects','Bring references together'],['Borrow a style','Use a reference for visual mood'],['New scene','Place subjects somewhere new'],['Reference layout','Follow a composition']]},
      {id:'composition',title:'Composition rules',hint:'Set the visual balance.',options:[['Asymmetrical','A lively off-center arrangement'],['Centered','Clear central focus'],['Rule of thirds','Measured placement'],['Layered depth','Near and far subjects'],['Open space','Room to breathe'],['Dynamic','Movement across the frame']]},
      {id:'output',title:'Output feel',hint:'Choose the resulting image type.',options:[['Photograph','A believable real-world scene'],['Illustration','A crafted art direction'],['Poster','Designed composition'],['Transparent asset','Reusable cutout or group']]}
    ]
  },
  storyboards: {
    group:'COMPOSE',title:'Panoramas & storyboards',subtitle:'Explore wider scenes or a sequence of related frames.',
    promptTitle:'What scene or sequence do you imagine?',promptHint:'A quiet coastal town at sunrise, seen in a wide panorama…',
    sections:[
      {id:'form',title:'Output form',hint:'Choose the structure of the image.',options:[['Panorama','One extended scene'],['Storyboard','A sequence of moments'],['Character views','Several views of one subject'],['Scene study','Different angles of one place']]},
      {id:'continuity',title:'Continuity focus',hint:'What should remain consistent?',options:[['Same location','The place anchors every view'],['Same character','Preserve appearance'],['Same product','Keep design details'],['Same lighting','One coherent atmosphere']]}
    ]
  },
  comics: {
    group:'COMPOSE',title:'Comics & panels',subtitle:'Build a visual sequence with panel rhythm, character direction and a clear story beat.',
    promptTitle:'What happens in the scene?',promptHint:'A detective finds a letter, then follows a clue through a rainy town…',
    sections:[
      {id:'format',title:'Panel format',hint:'Choose how the sequence reads.',options:[['Comic strip','A short horizontal beat'],['Comic page','Several arranged panels'],['Storyboard','A cinematic sequence'],['Single panel','One expressive moment']]},
      {id:'art',title:'Drawing style',hint:'Set the visual language.',options:[['Ink and wash','Expressive hand-drawn lines'],['Graphic novel','Bold contrast and atmosphere'],['Clear line','Precise outlines and color'],['Watercolor','Soft painted panels'],['Manga-inspired','Dynamic black and white'],['Digital color','Clean contemporary finish']]},
      {id:'story',title:'Story emphasis',hint:'What holds the sequence together?',options:[['Character action','Follow one character'],['Conversation','Expression and dialogue'],['Environment','Place and mood'],['Visual gag','A clear setup and payoff']]}
    ]
  }
};

const sheet = {
  portrait:'0% 0%', product:'33.333% 0%', coast:'66.667% 0%', architecture:'100% 0%',
  food:'0% 50%', street:'33.333% 50%', botanical:'66.667% 50%', fox:'100% 50%',
  abstract:'0% 100%', poster:'33.333% 100%', citrus:'66.667% 100%', comic:'100% 100%'
};
const sheet2 = {
  monochrome:'0% 0%', macro:'33.333% 0%', fashion:'66.667% 0%', car:'100% 0%',
  mountain:'0% 50%', cafe:'33.333% 50%', oil:'66.667% 50%', bird:'100% 50%',
  pattern:'0% 100%', cover:'33.333% 100%', mascot:'66.667% 100%', comic2:'100% 100%'
};
const inspiration = [
  {title:'Window light portrait',art:'portrait',mode:'photos',idea:'A thoughtful portrait in soft window light'},
  {title:'Ceramic still life',art:'product',mode:'photos',idea:'A minimal ceramic still life with warm natural texture'},
  {title:'Coastal film',art:'coast',mode:'photos',idea:'A misty coastal landscape photographed on color film'},
  {title:'Quiet architecture',art:'architecture',mode:'photos',idea:'A serene architectural interior with natural light'},
  {title:'Food story',art:'food',mode:'photos',idea:'A rustic food photograph with bread, fruit and natural texture'},
  {title:'City morning',art:'street',mode:'photos',idea:'A candid street photograph on an overcast morning'},
  {title:'Botanical plate',art:'botanical',mode:'art',idea:'A detailed botanical illustration on warm ivory paper'},
  {title:'Storybook fox',art:'fox',mode:'art',idea:'A fox in a warm storybook illustration'},
  {title:'Abstract forms',art:'abstract',mode:'art',idea:'A minimal abstract artwork with organic shapes'},
  {title:'Gallery poster',art:'poster',mode:'posters',idea:'A refined abstract gallery poster'},
  {title:'Citrus sticker',art:'citrus',mode:'graphics',idea:'A playful illustrated citrus sticker'},
  {title:'Four moments',art:'comic',mode:'comics',idea:'A four-panel comic showing a quiet character moment'},
  {title:'Monochrome portrait',art:'monochrome',sheet:2,mode:'photos',idea:'A dramatic black and white portrait with rich texture'},
  {title:'Nature close-up',art:'macro',sheet:2,mode:'photos',idea:'A macro photograph of a leaf with water droplets'},
  {title:'Editorial fashion',art:'fashion',sheet:2,mode:'photos',idea:'A quiet editorial fashion portrait with natural styling'},
  {title:'Classic car',art:'car',sheet:2,mode:'photos',idea:'A vintage car photographed in soft daylight'},
  {title:'Mountain air',art:'mountain',sheet:2,mode:'photos',idea:'A natural mountain landscape beside a clear lake'},
  {title:'Evening cafe',art:'cafe',sheet:2,mode:'photos',idea:'A warm cafe interior at night lit by small lamps'},
  {title:'Wildflowers in oil',art:'oil',sheet:2,mode:'art',idea:'A textured oil painting of wildflowers'},
  {title:'Bird in ink',art:'bird',sheet:2,mode:'art',idea:'A delicate ink drawing of a small bird'},
  {title:'Geometric rhythm',art:'pattern',sheet:2,mode:'graphics',idea:'A playful geometric pattern in warm colors'},
  {title:'Abstract cover',art:'cover',sheet:2,mode:'posters',idea:'A sophisticated editorial cover using abstract forms'},
  {title:'Soft character',art:'mascot',sheet:2,mode:'graphics',idea:'A soft 3D mascot character on a neutral background'},
  {title:'Mountain comic',art:'comic2',sheet:2,mode:'comics',idea:'A short comic sequence about two travelers in the mountains'},
  {title:'Instant-film portrait',mode:'photos'},
  {title:'Seventies family snapshot',mode:'photos'},
  {title:'Silver-gelatin portrait',mode:'photos'},
  {title:'Color-slide travel',mode:'photos'},
  {title:'Direct-flash party',mode:'photos'},
  {title:'Formal seated portrait',mode:'photos'},
  {title:'Walking portrait',mode:'photos'},
  {title:'Environmental portrait',mode:'photos'},
  {title:'Motion-blur dancer',mode:'photos'},
  {title:'Panning cyclist',mode:'photos'},
  {title:'Night crowd',mode:'photos'},
  {title:'Long-exposure crowd',mode:'photos'},
  {title:'Shallow-focus portrait',mode:'photos'},
  {title:'Deep-focus street',mode:'photos'},
  {title:'Cool cinematic color',mode:'photos'},
  {title:'Warm editorial color',mode:'photos'}
];
const photoTypes = [
  ['Portrait','People and expression','Window light portrait'],['Product','Objects worth noticing','Ceramic still life'],
  ['Landscape','Places and atmosphere','Coastal film'],['Nature','Plants and natural details','Nature close-up'],
  ['Architecture','Space and structure','Quiet architecture'],['Interior','Rooms and lived-in spaces','Evening cafe'],
  ['Food','Texture and appetite','Food story'],['Street','Life as it happens','City morning']
];
const optionPreviews = visualAssets.options;
const optionGuides = {
  'photos:look:35mm color film':{
    meaning:'35mm describes the film format, not one fixed color palette. The stock, exposure and processing decide how saturated, grainy or soft the image feels.',
    try:'Ask for a specific subject and light, then add “35mm color negative, natural skin tones, fine visible grain.” Avoid stacking several film stocks in one prompt.',
    background:'Color negative films vary: some emphasize fine grain and latitude; others produce more saturated color. The physical frame and grain contribute to the familiar film look.',
    source:['Kodak film reference','https://www.kodak.com/en/still-film/product/consumer/kodacolor-200-film/']
  },
  'photos:light:Rembrandt light':{
    meaning:'A portrait lighting pattern with one side of the face brighter and a small illuminated triangle beneath the eye on the shadow side.',
    try:'Use a three-quarter face angle and ask for a single key light above and to one side. Keep the shadow-side triangle visible rather than making the face almost black.',
    background:'The name refers to the painterly light associated with Rembrandt portraits. In studio photography, the triangle under the eye is the practical cue.',
    source:['Nikon photography glossary','https://www.nikonusa.com/learn-and-explore/photography-glossary']
  },
  'art:medium:Watercolor':{
    meaning:'Pigment suspended in water creates translucent washes. The paper and earlier layers often remain visible through later brushwork.',
    try:'For stronger color, specify “layered saturated washes, medium-value pigments, visible brush edges” instead of only “delicate watercolor.”',
    background:'Watercolor artists build color through washes on absorbent paper. Wet and dry paper produce different edges and textures.',
    source:['Winsor & Newton watercolor guide','https://uk.winsornewton.com/blogs/how-tos/john-singer-sargent-watercolour-how-to-guide']
  },
  'graphics:language:Paper cut':{
    meaning:'Shapes read as separate pieces of cut paper. Clear silhouettes, overlaps and subtle edge shadows give the design its material feel.',
    try:'Describe the number of layers, paper colors and whether the edges should feel crisp or hand-cut. Keep the subject simple enough for the silhouettes to read.',
    background:'Cut-paper composition has a long art history. Henri Matisse arranged shapes cut from painted sheets into bold compositions.',
    source:['The Met: Matisse cut-outs','https://www.metmuseum.org/art/collection/search/353770']
  }
};
const guideDock=document.getElementById('knowledge-dock');
function closeGuide(){guideDock.classList.remove('open');guideDock.setAttribute('aria-hidden','true');guideDock.inert=true;}
function openGuide(mode,sectionId,title,description){
  const section=catalog[mode]?.sections.find(item=>item.id===sectionId);
  const key=`${mode}:${sectionId}:${title}`,guide=optionGuides[key],preview=optionPreviews[key];
  const meaning=guide?.meaning||description;
  const cue=promptLanguage.words[mode]?.[sectionId]?.[title];
  const tryText=guide?.try||(cue?`This choice adds: “${cue.replace(/\.$/,'')}.” Describe the subject and any details that must stay consistent in “Your idea.”`:`Start with a clear subject, then choose ${title.toLowerCase()} here. Add details in “Your idea” when you want to control the result more closely.`);
  document.getElementById('guide-content').innerHTML=`<div class="guide-kicker">${esc(catalog[mode]?.title||'Create')} / ${esc(section?.title||'Choice')}</div><h2>${esc(title)}</h2>${preview?`<img class="guide-hero" src="${preview}" alt="Generated example of ${esc(title)}">`:`<div class="guide-no-preview">Visual example coming soon</div>`}<div class="guide-block"><h3>What it means</h3><p>${esc(meaning)}</p></div><div class="guide-block"><h3>Try it in a prompt</h3><p>${esc(tryText)}</p></div>${guide?.background?`<div class="guide-block"><h3>A little background</h3><p>${esc(guide.background)}</p>${guide.source?`<a href="${guide.source[1]}" target="_blank" rel="noopener noreferrer">${esc(guide.source[0])} ↗</a>`:''}</div>`:''}<p class="guide-foot">Generated examples show a direction, not a guaranteed result.</p>`;
  guideDock.inert=false;guideDock.setAttribute('aria-hidden','false');guideDock.classList.add('open');document.getElementById('guide-close').focus();
}
document.getElementById('guide-close').addEventListener('click',closeGuide);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&guideDock.classList.contains('open'))closeGuide()});
const librarySamples=[
  ['Window light portrait','Photo · soft light','portrait'],['Olive & ceramic','Photo · still life','product'],
  ['Overcast coast','Photo · 35mm film','coast'],['Garden study','Art · botanical','botanical'],
  ['Quiet geometry','Poster · minimal','poster'],['Citrus day','Graphic · fresh','citrus']
];
const state={mode:'inspiration',drafts:{},steps:{},ratings:{},references:[null],preferences:{theme:'slate',customBackground:'#30343a',customPanel:'#252a30',customAccent:'#bed0dc'}};
try {
  const saved=JSON.parse(localStorage.getItem('unlimited-studio-v3')||'{}');
  if(saved&&typeof saved==='object'){
    state.drafts=saved.drafts||{};state.steps=saved.steps||{};state.ratings=saved.ratings||{};
    state.preferences={...state.preferences,...(saved.preferences||{})};
  }
} catch {}
function save(){localStorage.setItem('unlimited-studio-v3',JSON.stringify({drafts:state.drafts,steps:state.steps,ratings:state.ratings,preferences:state.preferences}));}
function applyPreferences(){applyTheme(state.preferences);}
function draft(mode){const d=state.drafts[mode]||(state.drafts[mode]={idea:'',exact:'',avoid:'',ratio:'1:1',outputKind:'screen',printSize:'',choices:{}});d.choices ||= {};if(catalog[mode]&&choiceLogic.reconcile(catalog,mode,d.choices).length)save();return d;}
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
let toastTimer;
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.remove('has-action');el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2900);}
let viewerRecord=null,viewerScale=0;
const viewer=document.getElementById('image-viewer'),viewerImage=document.getElementById('viewer-image');
function setViewerScale(scale){viewerScale=scale;viewerImage.classList.toggle('fit',scale===0);viewerImage.style.width=scale?`${Math.round(viewerImage.naturalWidth*scale)}px`:'';document.getElementById('viewer-zoom').textContent=scale?`${Math.round(scale*100)}%`:'Fit';}
async function openImageViewer(item){
  viewerRecord=item;if(!viewer.open)viewer.showModal();setViewerScale(0);
  document.getElementById('viewer-loading').hidden=false;viewerImage.hidden=true;
  document.getElementById('viewer-title').textContent=item.prompt?.slice(0,85)||'Generated image';
  document.getElementById('viewer-meta').textContent=`${item.width||'?'} × ${item.height||'?'} · ${item.steps||'?'} steps · ${item.backend||'Local model'}`;
  document.getElementById('viewer-prompt').textContent=item.prompt||'';
  const select=document.getElementById('viewer-gallery');select.replaceChildren(new Option('No gallery',''));
  if(window.portable?.listGalleries){for(const gallery of await window.portable.listGalleries())select.add(new Option(gallery.name,gallery.id));select.value=item.galleryIds?.[0]||'';}
  const source=item.imageDataUrl||await window.portable?.imageDataUrl(item.id);
  viewerImage.onload=()=>{document.getElementById('viewer-loading').hidden=true;viewerImage.hidden=false;};
  viewerImage.src=source||'';viewerImage.alt=item.prompt||'Generated image';
  const save=document.getElementById('viewer-save');save.href=source||'#';save.download=`unlimited-${item.id||'image'}.png`;
}
document.getElementById('viewer-close').addEventListener('click',()=>viewer.close());
document.getElementById('viewer-delete').addEventListener('click',()=>{const id=viewerRecord?.id;if(id&&requestDelete([id])!==false)viewer.close();});
viewer.addEventListener('click',e=>{if(e.target===viewer)viewer.close()});
document.getElementById('viewer-fit').addEventListener('click',()=>setViewerScale(0));
document.getElementById('viewer-plus').addEventListener('click',()=>setViewerScale(viewerScale?Math.min(4,viewerScale*1.25):1));
document.getElementById('viewer-minus').addEventListener('click',()=>setViewerScale(viewerScale?Math.max(.1,viewerScale/1.25):.5));
document.getElementById('viewer-fullscreen').addEventListener('click',()=>{const action=document.fullscreenElement===viewer?document.exitFullscreen():viewer.requestFullscreen?.();action?.catch(error=>toast(error.message));});
document.addEventListener('fullscreenchange',()=>{document.getElementById('viewer-fullscreen').textContent=document.fullscreenElement===viewer?'Exit full screen':'Full screen';});
viewer.addEventListener('close',()=>{if(document.fullscreenElement===viewer)document.exitFullscreen()});
document.getElementById('viewer-gallery').addEventListener('change',async e=>{if(!viewerRecord?.id||!window.portable?.assignImageGalleries)return;const select=e.target,spinner=document.createElement('span');spinner.className='busy-spinner';select.after(spinner);select.disabled=true;try{viewerRecord.galleryIds=select.value?[select.value]:[];await window.portable.assignImageGalleries(viewerRecord.id,viewerRecord.galleryIds);toast('Gallery updated.');if(state.mode==='library')renderLibrary();}catch(error){toast(error.message);}finally{spinner.remove();select.disabled=false;}});
document.getElementById('global-render-cancel').addEventListener('click',()=>{const running=queueState.jobs.find(job=>job.status==='running');if(!running)return;cancellingId=running.id;const button=document.getElementById('global-render-cancel');button.disabled=true;button.textContent='Cancelling…';window.portable?.cancelGeneration();});
document.getElementById('global-render-dismiss').addEventListener('click',()=>{idleNotice=null;paintQueue();});
document.getElementById('global-render-view').addEventListener('click',()=>openJobImage(idleNotice?.lastDone));
function generationControls(){
  const size=Number(state.preferences.renderSize)||768,steps=Number(state.preferences.renderSteps)||20,count=Number(state.preferences.renderCount)||1;
  return `<div class="render-controls"><label>Image size <select id="render-size">${[[512,'Draft · 512 px'],[768,'Standard · 768 px'],[1024,'Quality · 1024 px'],[2048,'Native 2K · about 4 MP']].map(([value,label])=>`<option value="${value}" ${size===value?'selected':''}>${label}</option>`).join('')}</select></label><label>Detail <select id="render-steps">${[[12,'Fast · 12 steps'],[20,'Balanced · 20 steps'],[28,'Fine · 28 steps']].map(([value,label])=>`<option value="${value}" ${steps===value?'selected':''}>${label}</option>`).join('')}</select></label><label>Images <select id="render-count">${[[1,'1 image'],[2,'2 variations'],[4,'4 variations'],[8,'8 variations']].map(([value,label])=>`<option value="${value}" ${count===value?'selected':''}>${label}</option>`).join('')}</select></label><span id="size-note" class="size-note" ${size===2048?'':'hidden'}>Native 2K uses considerably more memory and takes longer. Some GPUs may fall back to CPU.</span></div>`;
}
function generationPrompt(mode){
  const d=draft(mode),base=promptLanguage.build(catalog,mode,d),cue=activeInspirationCue(d);
  return cue?`${base} ${cue}`:base;
}
function activeInspirationCue(d){
  const recipe=d.inspiration&&inspirationRecipes[d.inspiration];
  return recipe?.cue&&Object.entries(recipe.choices).every(([key,value])=>d.choices[key]===value)?recipe.cue:'';
}
function wireGenerate(mode){
  const button=document.getElementById('generate'),size=document.getElementById('render-size'),steps=document.getElementById('render-steps'),count=document.getElementById('render-count');
  size.addEventListener('change',()=>{state.preferences.renderSize=Number(size.value);document.getElementById('size-note').hidden=Number(size.value)!==2048;save();});
  steps.addEventListener('change',()=>{state.preferences.renderSteps=Number(steps.value);save();});
  count.addEventListener('change',()=>{state.preferences.renderCount=Number(count.value);save();});
  button.addEventListener('click',()=>startGeneration(mode));
  refreshGenerateButton();
}
const isPending=job=>job.status==='waiting'||job.status==='running';
function refreshGenerateButton(){
  const button=document.getElementById('generate');if(!button)return;
  button.innerHTML=`${queueState.jobs.some(isPending)?'Add to queue':'Generate image'} <span>→</span>`;
}
async function startGeneration(mode){
  if(!window.portable?.generate){toast('Open the desktop app to render locally.');return;}
  if(mode==='references'&&state.references.some(Boolean)){toast('Reference image generation is not connected yet.');return;}
  if(draft(mode).inspiration&&!draft(mode).idea?.trim()){
    setStep(mode,stepsFor(mode).findIndex(step=>step.kind==='brief'));
    document.getElementById('idea-field')?.focus();toast('Add your own idea to this inspiration direction first.');return;
  }
  const prompt=generationPrompt(mode);
  if(!prompt.trim()){toast('Describe the image or choose a direction first.');return;}
  const d=draft(mode),button=document.getElementById('generate');
  const count=Number(document.getElementById('render-count').value)||1;
  // The queue keeps its own copy of every setting, so you can keep editing and queue something different straight away.
  const request={prompt,negativePrompt:d.avoid||'',ratio:d.ratio||'1:1',longSide:Number(document.getElementById('render-size').value),steps:Number(document.getElementById('render-steps').value),mode};
  const ahead=queueState.jobs.filter(isPending).length,what=count>1?`${count} images`:'Image';
  button.disabled=true;
  try{
    applyQueueState(await window.portable.generate(request,count));
    toast(ahead?`${what} added to the queue · ${ahead} ahead`:`${what} started`);
  }catch(error){toast(friendlyRenderError(error));}
  finally{if(button.isConnected)button.disabled=false;}
}

/* ---- Render queue ---- */
const RENDER_STAGES=['preparing','rendering','decoding','saving'];
let queueState={jobs:[],paused:false},feedback={jobId:null,marks:[]},activeIds=new Set(),idleNotice=null,cancellingId='';
const thumbCache=new Map();
async function thumbFor(id){
  if(thumbCache.has(id))return thumbCache.get(id);
  const url=await window.portable.imageDataUrl(id,true);
  thumbCache.set(id,url);if(thumbCache.size>400)thumbCache.delete(thumbCache.keys().next().value);
  return url;
}
const clock=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
function friendlyRenderError(error){
  const text=error?.message||String(error);
  if(/cancelled/i.test(text))return 'Cancelled. Nothing was saved.';
  return text.replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/,'');
}
function applyQueueState(next){
  if(next.revision<(queueState.revision||0))return;// an older snapshot that arrived after a newer event
  const before=new Map(queueState.jobs.map(job=>[job.id,job.status]));
  queueState=next;
  for(const job of next.jobs)if(isPending(job))activeIds.add(job.id);
  if(next.jobs.some(isPending))idleNotice=null;
  else if(activeIds.size){
    const finished=next.jobs.filter(job=>activeIds.has(job.id)),done=finished.filter(job=>job.status==='done'),failed=finished.filter(job=>job.status==='failed');
    idleNotice={done:done.length,failed:failed.length,lastDone:done.at(-1)||null,error:failed.at(-1)?.error||''};
    activeIds.clear();
  }
  if(next.jobs.some(job=>job.status==='done'&&before.has(job.id)&&before.get(job.id)!=='done'))libraryApi?.refresh();
  paintQueue();
}
function updateRenderFeedback(update){
  if(update.jobId&&update.jobId!==feedback.jobId)feedback={jobId:update.jobId,marks:[]};
  if(update.step&&update.steps&&update.step!==feedback.step)feedback.marks.push(Date.now());
  const {error,...progress}=update;// a backend that falls back mid-run reports an error string, but the render is still going
  Object.assign(feedback,progress);paintRenderFeedback();
}
async function openJobImage(job){
  if(!job?.imageId||job.imageDeleted)return;
  let item=null;
  try{item=(await window.portable.listImages()).find(entry=>entry.id===job.imageId);}catch{}
  openImageViewer(item||{id:job.imageId,prompt:job.prompt,width:job.width,height:job.height,steps:job.steps,backend:job.backend}).catch(error=>toast(error.message));
}
function paintQueue(){
  const pending=queueState.jobs.filter(isPending).length,button=document.getElementById('queue-button');
  if(button){document.getElementById('queue-count').textContent=pending||'';button.classList.toggle('busy',pending>0);}
  refreshGenerateButton();paintRenderFeedback();
  if(queuePanel.classList.contains('open'))renderQueuePanel();
}
function paintRenderFeedback(){
  const strip=document.getElementById('generation-strip');if(!strip)return;
  const running=queueState.jobs.find(job=>job.status==='running'),waiting=queueState.jobs.filter(job=>job.status==='waiting').length;
  const el=id=>document.getElementById(id),track=strip.querySelector('.generation-track');
  const show=({label,count='',percent=0,spinner=false,working=false,error=false,cancel=false,view=false,resume=false,dismiss=false})=>{
    strip.hidden=false;strip.classList.toggle('error',error);
    el('global-render-label').textContent=label;el('global-render-label').title=label;
    el('global-render-fill').style.width=`${percent}%`;track.classList.toggle('working',working);
    el('global-render-count').textContent=count;el('global-render-spinner').hidden=!spinner;
    el('global-render-cancel').hidden=!cancel;el('global-render-view').hidden=!view;el('global-render-resume').hidden=!resume;el('global-render-dismiss').hidden=!dismiss;
  };
  if(running){
    const f=feedback.jobId===running.id?feedback:{stage:'preparing',message:'Starting…',percent:1,marks:[]};
    const elapsed=Math.round((Date.now()-(running.startedAt||Date.now()))/1000),stageIndex=RENDER_STAGES.indexOf(f.stage);
    let eta='';
    if(f.stage==='rendering'&&f.marks.length>=3){
      const per=(f.marks.at(-1)-f.marks[0])/(f.marks.length-1),left=Math.max(0,Math.round(per*(f.steps-f.step)/1000));
      eta=left>0?` · about ${left}s of rendering left`:'';
    }
    const cancelButton=el('global-render-cancel');
    if(cancellingId!==running.id){cancelButton.disabled=false;cancelButton.textContent='Cancel';}
    show({label:`${stageIndex>=0?`${stageIndex+1}/${RENDER_STAGES.length} · `:''}${f.message||'Rendering'}${f.backend?` · ${f.backend}`:''}`,
      count:`${f.step&&f.steps?`${f.step} / ${f.steps} · `:''}${clock(elapsed)}${eta}${waiting?` · ${waiting} waiting`:''}`,
      percent:Math.max(0,Math.min(100,Number(f.percent)||0)),spinner:true,working:f.stage!=='rendering',cancel:true});
    // The open queue panel shows the same live progress on its running row without rebuilding the list.
    if(queuePanel.classList.contains('open')){
      const row=document.querySelector(`.queue-row[data-job="${running.id}"]`);
      if(row){row.querySelector('.queue-status').textContent=f.message||'Starting…';const fill=row.querySelector('.queue-bar i');if(fill)fill.style.width=`${Math.max(0,Math.min(100,Number(f.percent)||0))}%`;}
    }
  }else if(queueState.paused&&waiting)show({label:`Queue paused · ${waiting} waiting`,resume:true});
  else if(idleNotice){
    const {done,failed,lastDone,error}=idleNotice;
    const parts=[done?`${done} image${done===1?'':'s'} ready`:'',failed?`${failed} failed`:''].filter(Boolean);
    show({label:parts.length?`${parts.join(' · ')}${failed&&error?` · ${error}`:''}`:'Cancelled. Nothing was saved.',percent:done?100:0,error:failed>0&&!done,view:!!lastDone,dismiss:true});
  }else strip.hidden=true;
}
function estimateSeconds(job){
  const done=queueState.jobs.filter(item=>item.status==='done'&&item.durationMs);
  const same=done.filter(item=>item.longSide===job.longSide&&item.steps===job.steps&&item.ratio===job.ratio).slice(-5);
  const pool=same.length?same:done.filter(item=>item.longSide===job.longSide).slice(-5);
  return pool.length?pool.reduce((sum,item)=>sum+item.durationMs,0)/pool.length/1000:null;
}
function queueEta(){
  let total=0;
  for(const job of queueState.jobs.filter(isPending)){
    const estimate=estimateSeconds(job);if(estimate===null)return null;
    total+=job.status==='running'?Math.max(3,estimate-(Date.now()-job.startedAt)/1000):estimate;
  }
  return total;
}
const queuePanel=document.getElementById('queue-panel'),queueButton=document.getElementById('queue-button');
function openQueue(){queuePanel.inert=false;queuePanel.setAttribute('aria-hidden','false');queuePanel.classList.add('open');queueButton.setAttribute('aria-expanded','true');renderQueuePanel();document.getElementById('queue-close').focus();}
function closeQueue(){queuePanel.classList.remove('open');queuePanel.setAttribute('aria-hidden','true');queuePanel.inert=true;queueButton.setAttribute('aria-expanded','false');}
function renderQueuePanel(){
  const jobs=queueState.jobs,pending=jobs.filter(isPending),running=jobs.find(job=>job.status==='running'),waiting=jobs.filter(job=>job.status==='waiting');
  const eta=queueEta(),summary=[running?'1 rendering':'',waiting.length?`${waiting.length} waiting`:'',eta?`about ${eta<90?`${Math.max(1,Math.round(eta))} sec`:`${Math.round(eta/60)} min`} left`:''].filter(Boolean).join(' · ');
  document.getElementById('queue-summary').textContent=summary||(jobs.length?'Nothing waiting.':'Add images with Generate and they line up here.');
  const banner=document.getElementById('queue-banner');
  banner.hidden=!(queueState.paused&&waiting.length);
  if(!banner.hidden)banner.querySelector('span').textContent=running?'The queue is paused. The current image will finish first.':`The queue is paused with ${waiting.length} image${waiting.length===1?'':'s'} waiting.`;
  document.getElementById('queue-pause').textContent=queueState.paused?'Resume':'Pause';
  document.getElementById('queue-pause').hidden=!banner.hidden;// the banner already offers Resume
  document.getElementById('queue-pause').disabled=!pending.length&&!queueState.paused;
  document.getElementById('queue-cancel-all').disabled=!pending.length;
  document.getElementById('queue-clear').disabled=!jobs.some(job=>!isPending(job));
  const list=document.getElementById('queue-list');
  const batchIndex=new Map(),batchSize=new Map();
  for(const job of jobs)if(job.batch){batchSize.set(job.batch,(batchSize.get(job.batch)||0)+1);batchIndex.set(job.id,batchSize.get(job.batch));}
  const ordered=[...jobs.filter(job=>job.status==='running'),...waiting,...jobs.filter(job=>!isPending(job)).reverse()];
  list.replaceChildren(...ordered.map(job=>{
    const li=document.createElement('li');li.className=`queue-row status-${job.status}`;li.dataset.job=job.id;
    const thumb=document.createElement('div');thumb.className='queue-thumb';
    if(job.status==='done'&&job.imageId&&!job.imageDeleted){
      const img=document.createElement('img');img.alt='';const cached=thumbCache.get(job.imageId);
      if(cached)img.src=cached;else thumbFor(job.imageId).then(url=>{if(img.isConnected)img.src=url;}).catch(()=>{});
      thumb.append(img);
    }else thumb.textContent={running:'◔',waiting:String(waiting.indexOf(job)+1),failed:'!',cancelled:'–',done:'✓'}[job.status];
    const body=document.createElement('div');body.className='queue-body';
    const title=document.createElement('strong');title.textContent=job.prompt;title.title=job.prompt;
    const meta=document.createElement('small');
    meta.textContent=`${job.width} × ${job.height} · ${job.steps} steps${job.batch?` · ${batchIndex.get(job.id)} of ${batchSize.get(job.batch)}`:''}`;
    const status=document.createElement('span');status.className='queue-status';
    status.textContent=job.status==='running'?(feedback.jobId===job.id&&feedback.message?feedback.message:'Starting…'):
      job.status==='waiting'?(queueState.paused?'Paused':`Waiting · #${waiting.indexOf(job)+1}`):
      job.status==='done'?(job.imageDeleted?'Image deleted':`Done in ${clock(job.durationMs/1000)}`):
      job.status==='failed'?job.error:'Cancelled';
    if(job.status==='failed')status.title=job.error;
    body.append(title,meta,status);
    if(job.status==='running'){const bar=document.createElement('div');bar.className='queue-bar';const fill=document.createElement('i');fill.style.width=`${feedback.jobId===job.id?Math.max(0,Math.min(100,Number(feedback.percent)||0)):1}%`;bar.append(fill);body.append(bar);}
    const actions=document.createElement('div');actions.className='queue-actions';
    const add=(text,action,label,disabled=false)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.dataset.action=action;b.dataset.job=job.id;b.setAttribute('aria-label',label);b.title=label;b.disabled=disabled;actions.append(b);};
    if(job.status==='waiting'){const at=waiting.indexOf(job);add('↑','up','Move earlier',at===0);add('↓','down','Move later',at===waiting.length-1);add('✕','cancel','Remove from the queue');}
    else if(job.status==='running')add('Cancel','cancel','Cancel this image');
    else{if(job.status==='done'&&!job.imageDeleted)add('Open','open','Open image');add('✕','remove','Clear from list');}
    li.append(thumb,body,actions);return li;
  }));
}
document.getElementById('queue-list').addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action]');
  if(button){
    const {action,job:id}=button.dataset;
    try{
      if(action==='open')return openJobImage(queueState.jobs.find(job=>job.id===id));
      if(action==='cancel'){if(queueState.jobs.find(job=>job.id===id)?.status==='running'){cancellingId=id;button.disabled=true;button.textContent='Cancelling…';}applyQueueState(await window.portable.cancelJob(id));}
      else if(action==='remove')applyQueueState(await window.portable.removeJob(id));
      else applyQueueState(await window.portable.moveJob(id,action==='up'?-1:1));
    }catch(error){toast(friendlyRenderError(error));}
    return;
  }
  const row=event.target.closest('.queue-row.status-done');
  if(row&&!event.target.closest('.queue-actions'))openJobImage(queueState.jobs.find(job=>job.id===row.dataset.job));
});
const queueAct=(promise)=>promise.then(applyQueueState).catch(error=>toast(friendlyRenderError(error)));
queueButton.addEventListener('click',()=>queuePanel.classList.contains('open')?closeQueue():openQueue());
document.getElementById('queue-close').addEventListener('click',closeQueue);
document.getElementById('queue-pause').addEventListener('click',()=>queueAct(window.portable.pauseQueue(!queueState.paused)));
document.getElementById('queue-resume').addEventListener('click',()=>queueAct(window.portable.pauseQueue(false)));
document.getElementById('queue-cancel-all').addEventListener('click',()=>{if(confirm('Cancel the running image and remove everything waiting?'))queueAct(window.portable.cancelAllJobs());});
document.getElementById('queue-clear').addEventListener('click',()=>queueAct(window.portable.clearFinishedJobs()));
document.getElementById('queue-discard').addEventListener('click',()=>queueAct(window.portable.cancelAllJobs()));
document.getElementById('global-render-resume').addEventListener('click',()=>queueAct(window.portable.pauseQueue(false)));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&queuePanel.classList.contains('open')&&!viewer.open)closeQueue();});
window.portable?.onGenerationProgress(updateRenderFeedback);
window.portable?.onQueueUpdate(applyQueueState);
window.portable?.queueState?.().then(applyQueueState).catch(()=>{});
setInterval(()=>{if(queueState.jobs.some(job=>job.status==='running'))paintRenderFeedback();},1000);
function head(group,title,subtitle){return `<div class="page-head"><div><span class="eyebrow">${group}</span><h1>${title}</h1><p>${subtitle}</p></div></div>`;}
function promptHelpButton(){return '<button class="ai-help-button" id="ai-help-button" type="button" disabled aria-disabled="true" title="Coming soon: a local assistant will suggest wording that you can review before using.">✦ Refine with AI · soon</button>';}
function promptHelpPanel(){return '<div class="ai-help-panel" id="ai-help-panel" hidden><strong>AI prompt help · planned</strong><p>The local assistant will use your idea and selected directions to draft a clearer prompt. You will see the suggestion beside your original and choose whether to use it. Nothing will replace your words automatically.</p></div>';}
function wirePromptHelp(){
  const button=document.getElementById('ai-help-button'),panel=document.getElementById('ai-help-panel');if(!button||!panel)return;
  button.setAttribute('aria-expanded','false');
  button.addEventListener('click',()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));});
}
function setMode(mode){
  state.mode=mode;sideLinks.forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  document.querySelector('.sidebar').classList.remove('open');
  const conf=catalog[mode],group=conf?.group||(mode==='library'?'YOUR SPACE':mode==='settings'?'PREFERENCES':mode==='editor'?'EDIT':'DISCOVER');
  const title=conf?.title||({inspiration:'Inspiration',freeform:'Freeform',library:'Library',settings:'Settings',editor:'Image editor'}[mode]);
  document.getElementById('breadcrumb').textContent=`${group} / ${title.toUpperCase()}`;render();workspace.scrollTop=0;
}
const mosaicShapes=['tall','square','wide','square','wide','tall','square','square','square','tall','square','wide','tall','square','tall','wide','wide','square','square','tall','wide','square','square','wide'];
function artCard(item,index){
  const source=visualAssets.inspiration[item.title];
  return `<button class="inspiration-card ${mosaicShapes[index%mosaicShapes.length]}" data-inspiration="${esc(item.title)}" aria-label="Use ${esc(item.title)} as inspiration"><span class="inspiration-art" style="background-image:url('${source}');background-size:cover;background-position:center"></span><span class="inspiration-card-copy"><strong>${esc(item.title)}</strong><span>Use this direction →</span></span></button>`;
}
function renderInspiration(){
  workspace.innerHTML=`<div class="inspiration-wall" aria-label="Visual inspiration">${inspiration.map(artCard).join('')}</div>`;
  workspace.querySelectorAll('[data-inspiration]').forEach(b=>b.addEventListener('click',()=>{
    const item=inspiration.find(x=>x.title===b.dataset.inspiration),recipe=inspirationRecipes[item.title],d=draft(item.mode);
    d.idea='';d.exact='';d.avoid='';d.alpha=false;d.outputKind='screen';d.printSize='';
    d.choices={...recipe.choices};d.ratio=recipe.ratio;d.inspiration=item.title;
    choiceLogic.reconcile(catalog,item.mode,d.choices);
    state.steps[item.mode]=stepsFor(item.mode).findIndex(step=>step.kind==='brief');save();setMode(item.mode);
    document.getElementById('idea-field')?.focus();
    toast(`${item.title} is ready for your idea.`);
  }));
}
function renderFreeform(){
  const d=draft('freeform');
  workspace.innerHTML=`<div class="workspace-inner">${head('DISCOVER','Freeform','A clear space for your own idea. No preset or visual example required.')}
    <div class="brief-panel freeform-panel"><div class="panel-kicker">YOUR PROMPT</div><div class="prompt-label-row"><h2>Describe the image you want</h2>${promptHelpButton()}</div><p>Write naturally. You can use the focused sections when you want more guidance.</p><textarea id="idea-field" placeholder="A small wooden cabin beside a lake at sunrise…"></textarea>${promptHelpPanel()}<label class="toggle-row"><input type="checkbox" id="freeform-alpha"> Transparent background</label></div>
    <div class="control-panel freeform-panel"><div class="panel-kicker">OUTPUT</div><h2>Aspect ratio</h2><div class="ratio-row" id="ratio-row"></div></div>
    ${generationControls().replace('class="render-controls"','class="render-controls freeform-panel"')}<div class="builder-footer freeform-panel"><div><strong>Prompt preview</strong><p id="prompt-summary"></p></div><button class="primary-button" id="generate">Generate image <span>→</span></button></div></div>`;
  document.getElementById('idea-field').value=d.idea||'';
  document.getElementById('freeform-alpha').checked=!!d.alpha;
  document.getElementById('idea-field').addEventListener('input',e=>{d.idea=e.target.value;save();updateSummary();});
  document.getElementById('freeform-alpha').addEventListener('change',e=>{d.alpha=e.target.checked;save();updateSummary();});
  renderRatios(d);wirePromptHelp();wireGenerate('freeform');updateSummary();
}
function renderRatios(d){
  const row=document.getElementById('ratio-row');if(!row)return;row.replaceChildren();
  ['1:1','4:3','3:4','3:2','2:3','16:9','9:16'].forEach(r=>{
    const b=document.createElement('button');b.className=`ratio-button${(d.ratio||'1:1')===r?' selected':''}`;
    b.textContent=r;b.setAttribute('aria-pressed',String((d.ratio||'1:1')===r));
    b.addEventListener('click',()=>{d.ratio=r;save();renderRatios(d);updateSummary();});row.append(b);
  });
}
function stepsFor(mode){
  const c=catalog[mode],steps=[];
  if(c.upload)steps.push({id:'references',title:'References',kind:'references'});
  c.sections.forEach(s=>steps.push({id:s.id,title:s.title,kind:'choice',section:s}));
  steps.push({id:'brief',title:'Your idea',kind:'brief'});
  steps.push({id:'canvas',title:'Canvas',kind:'canvas'});
  steps.push({id:'review',title:'Review',kind:'review'});
  return steps;
}
function setStep(mode,index){
  const steps=stepsFor(mode);state.steps[mode]=Math.max(0,Math.min(index,steps.length-1));save();renderCurrentStep(mode);
}
function stepTrail(steps,current,d){
  return `<div class="step-trail" role="navigation" aria-label="Creation steps">${steps.map((s,i)=>{
    const done=s.kind==='choice'?!!d.choices?.[s.id]:s.kind==='brief'?!!d.idea?.trim():s.kind==='references'?state.references.some(Boolean):s.kind==='canvas'?!!d.ratio:false;
    const short=s.title==='Type of photograph'?'Photo type':s.title;
    return `<button class="step-node ${i===current?'current':''} ${done?'done':''}" data-step="${i}" aria-label="Step ${i+1}: ${esc(s.title)}" aria-current="${i===current?'step':'false'}"><span class="step-circle">${done?'✓':String(i+1).padStart(2,'0')}</span><span class="step-name">${esc(short)}</span></button>`;
  }).join('<span class="step-line" aria-hidden="true"></span>')}</div>`;
}
function renderBuilder(mode){
  const c=catalog[mode];
  workspace.innerHTML=`<div class="workspace-inner guided-builder"><div class="guided-head"><span class="guided-kicker">${c.group} / ${c.title.toUpperCase()}</span><p>${c.subtitle}</p><button class="quiet-button start-over" id="start-over" type="button" title="Clear every choice and your idea for this section">Start over</button></div>
    <div id="step-trail-wrap"></div><div id="step-content"></div>
    ${generationControls()}<div class="builder-footer"><div><strong>Your ${c.title.toLowerCase()} prompt</strong><p id="prompt-summary"></p></div><button class="primary-button" id="generate">Generate image <span>→</span></button></div></div>`;
  wireGenerate(mode);
  document.getElementById('start-over').addEventListener('click',()=>{
    if(!confirm(`Clear every choice and your idea in ${c.title}?`))return;
    delete state.drafts[mode];state.steps[mode]=0;save();renderBuilder(mode);toast('Started over.');
  });
  renderCurrentStep(mode);
}
function stepFrame(step,i,total,body,context=[],ideaRequired=false){
  return `<section class="step-stage"><div class="step-heading"><div><span class="panel-kicker">STEP ${String(i+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}</span><h1>${esc(step.title)}</h1><p>${step.kind==='choice'?esc(step.section.hint):''}${context.length?` <span class="choice-context">· Tailored to ${esc(context.join(' + '))}</span>`:''}</p></div><span class="optional-label">${ideaRequired?'Add your idea':'Everything is optional'}</span></div>${body}
    <div class="step-actions"><button class="quiet-button" id="step-back" ${i===0?'disabled':''}>← Back</button><span>Jump to any step above</span><div><button class="quiet-button" id="step-skip" ${i===total-1?'hidden':''}>Skip</button><button class="next-button" id="step-next">${i===total-1?'Ready to generate':'Next →'}</button></div></div></section>`;
}
function renderCurrentStep(mode){
  closeGuide();
  const c=catalog[mode],d=draft(mode),steps=stepsFor(mode),i=Math.min(state.steps[mode]||0,steps.length-1),step=steps[i];
  document.getElementById('step-trail-wrap').innerHTML=stepTrail(steps,i,d);
  let body='';
  if(step.kind==='choice'){
    if(mode==='photos'&&step.id==='type')body=`<div class="photo-picker"><div class="photo-search-row"><label class="search-wrap"><span>⌕</span><input id="photo-search" type="search" placeholder="Search photograph types" aria-label="Search photograph types"></label><div><button class="carousel-arrow" id="photo-prev" aria-label="Scroll photo types left">←</button><button class="carousel-arrow" id="photo-next" aria-label="Scroll photo types right">→</button></div></div><div class="photo-carousel" id="photo-carousel">${photoTypes.map(([title,description,sourceTitle])=>`<button class="photo-type ${d.choices?.type===title?'selected':''}" data-section="type" data-choice="${esc(title)}" data-search="${(title+' '+description).toLowerCase()}"><span class="photo-type-art" style="background-image:url('${visualAssets.inspiration[sourceTitle]}');background-size:cover;background-position:center"></span><span class="photo-type-copy"><strong>${title}</strong><small>${description}</small></span></button>`).join('')}</div></div>`;
    else body=`<div class="choice-picker"><label class="search-wrap choice-search"><span>⌕</span><input id="choice-search" type="search" placeholder="Search ${esc(step.title.toLowerCase())}" aria-label="Search ${esc(step.title)}"></label><div class="step-options">${choiceLogic.available(catalog,mode,step.id,d.choices).map(([title,description])=>{const preview=optionPreviews[`${mode}:${step.id}:${title}`];return `<div class="choice-item ${preview?'has-preview':''}" data-search="${esc((title+' '+description).toLowerCase())}"><button class="option-card ${d.choices?.[step.id]===title?'selected':''}" data-section="${step.id}" data-choice="${esc(title)}"><span class="choice-copy"><strong>${esc(title)}</strong><span>${esc(description)}</span></span>${preview?`<span class="choice-visual"><img src="${preview}" alt=""></span>`:''}</button><button class="choice-help" type="button" data-help-mode="${mode}" data-help-section="${step.id}" data-help-choice="${esc(title)}" data-help-description="${esc(description)}" aria-label="Learn about ${esc(title)}">?</button></div>`}).join('')}</div><p class="choice-empty" hidden>No matching choices.</p></div>`;
  } else if(step.kind==='references'){
    body=`<p class="stage-note">Add one image to start. The next numbered square appears when you need it. You can use up to ten.</p><div id="reference-row" class="reference-row"></div><input id="reference-input" type="file" accept="image/*" hidden>`;
  } else if(step.kind==='brief'){
    const cue=activeInspirationCue(d);
    const recipe=d.inspiration?`<div class="inspiration-recipe"><strong>Inspired by ${esc(d.inspiration)}</strong><p>The style is ready. Describe your own subject below, or use the steps above to change any choice.</p><div>${c.sections.filter(s=>d.choices[s.id]).map(s=>`<span><small>${esc(s.title)}</small>${esc(d.choices[s.id])}</span>`).join('')}${cue?`<span><small>Visual direction</small>${esc(cue)}</span>`:''}<span><small>Canvas</small>${esc(d.ratio)}</span></div></div>`:'';
    body=`${recipe}<div class="brief-panel step-brief"><div class="prompt-label-row"><label for="idea-field">${c.promptTitle}</label>${promptHelpButton()}</div><textarea id="idea-field" placeholder="${d.inspiration?'Describe your own subject or scene…':esc(c.promptHint)}"></textarea>${promptHelpPanel()}${c.exactText?'<label for="exact-field">Exact words to show</label><input id="exact-field" placeholder="Type the exact text here">':''}</div>`;
  } else if(step.kind==='canvas'){
    body=`<div class="canvas-tabs"><button data-output="screen" class="${d.outputKind!=='print'?'active':''}">Screen ratios</button><button data-output="print" class="${d.outputKind==='print'?'active':''}">Print formats</button></div><div id="canvas-choice"></div>`;
  } else if(step.kind==='review'){
    body=`<div class="review-panel"><div class="review-summary"><span class="panel-kicker">PROMPT DIRECTION</span><p id="review-summary"></p></div><label for="avoid-field">Avoid <span>optional</span></label><textarea id="avoid-field" placeholder="For example: distracting background, extra objects…"></textarea><p class="stage-note">Negative conditioning is available in the candidate runtime; we will validate its effect with Qwen-Image-2.1 before calling it a finished feature.</p></div>`;
  }
  document.getElementById('step-content').innerHTML=stepFrame(step,i,steps.length,body,step.kind==='choice'?choiceLogic.context(mode,step.id,d.choices):[],step.kind==='brief'&&!!d.inspiration);
  const choiceSearch=document.getElementById('choice-search');
  if(choiceSearch)choiceSearch.addEventListener('input',()=>{const query=choiceSearch.value.trim().toLowerCase();let visible=0;document.querySelectorAll('.choice-item').forEach(item=>{const match=item.dataset.search.includes(query);item.hidden=!match;if(match)visible++});document.querySelector('.choice-empty').hidden=visible>0});
  document.querySelectorAll('.choice-help').forEach(button=>button.addEventListener('click',()=>openGuide(button.dataset.helpMode,button.dataset.helpSection,button.dataset.helpChoice,button.dataset.helpDescription)));
  document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>setStep(mode,Number(b.dataset.step))));
  document.getElementById('step-back').addEventListener('click',()=>setStep(mode,i-1));
  const skip=document.getElementById('step-skip');if(skip)skip.addEventListener('click',()=>setStep(mode,i+1));
  document.getElementById('step-next').addEventListener('click',()=>i===steps.length-1?startGeneration(mode):setStep(mode,i+1));
  document.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>{
    d.choices ||= {};const same=d.choices[b.dataset.section]===b.dataset.choice;
    if(same)delete d.choices[b.dataset.section];else d.choices[b.dataset.section]=b.dataset.choice;
    choiceLogic.reconcile(catalog,mode,d.choices);
    save();updateSummary();
    if(!same)setStep(mode,i+1);else renderCurrentStep(mode);
  }));
  if(step.kind==='choice'&&mode==='photos'&&step.id==='type'){
    const search=document.getElementById('photo-search'),carousel=document.getElementById('photo-carousel');
    search.addEventListener('input',()=>{const q=search.value.toLowerCase().trim();carousel.querySelectorAll('.photo-type').forEach(b=>b.hidden=!b.dataset.search.includes(q));});
    document.getElementById('photo-prev').addEventListener('click',()=>carousel.scrollBy({left:-360,behavior:'smooth'}));
    document.getElementById('photo-next').addEventListener('click',()=>carousel.scrollBy({left:360,behavior:'smooth'}));
  }
  if(step.kind==='references')renderReferences(mode);
  if(step.kind==='brief'){
    const idea=document.getElementById('idea-field');idea.value=d.idea||'';
    idea.addEventListener('input',e=>{d.idea=e.target.value;save();updateSummary();});
    wirePromptHelp();
    if(c.exactText){const exact=document.getElementById('exact-field');exact.value=d.exact||'';exact.addEventListener('input',e=>{d.exact=e.target.value;save();updateSummary();});}
  }
  if(step.kind==='canvas'){
    document.querySelectorAll('[data-output]').forEach(b=>b.addEventListener('click',()=>{d.outputKind=b.dataset.output;save();renderCurrentStep(mode);}));
    renderCanvas(mode);
  }
  if(step.kind==='review'){
    const avoid=document.getElementById('avoid-field');avoid.value=d.avoid||'';
    avoid.addEventListener('input',e=>{d.avoid=e.target.value;save();updateSummary();});
  }
  updateSummary();
}
function renderReferences(mode){
  const row=document.getElementById('reference-row'),input=document.getElementById('reference-input');
  row.replaceChildren();
  state.references.forEach((ref,index)=>{
    const card=document.createElement('div');card.className='reference-card';
    const pick=document.createElement('button');pick.className='reference-pick';
    pick.setAttribute('aria-label',`Choose reference image ${index+1}`);
    if(ref?.url){const img=document.createElement('img');img.src=ref.url;img.alt='';pick.append(img);}
    else {const plus=document.createElement('span');plus.className='reference-plus';plus.textContent='+';pick.append(plus);}
    const number=document.createElement('span');number.className='reference-number';number.textContent=String(index+1).padStart(2,'0');pick.append(number);
    pick.addEventListener('click',()=>{input.dataset.slot=String(index);input.click();});
    const label=document.createElement('div');label.className='reference-caption';
    const name=document.createElement('span');name.textContent=ref?.name||`Image ${String(index+1).padStart(2,'0')}`;
    label.append(name);
    if(index>0){const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label',`Remove image ${index+1}`);remove.addEventListener('click',()=>{if(ref?.url)URL.revokeObjectURL(ref.url);state.references.splice(index,1);renderReferences(mode);updateSummary();});label.append(remove);}
    card.append(pick,label);row.append(card);
  });
  if(state.references.length<10){const add=document.createElement('button');add.className='reference-add';add.innerHTML='<span>+</span><small>Add another</small>';add.addEventListener('click',()=>{state.references.push(null);renderReferences(mode);});row.append(add);}
  input.onchange=()=>{const file=input.files?.[0];if(!file)return;const index=Number(input.dataset.slot),old=state.references[index];if(old?.url)URL.revokeObjectURL(old.url);state.references[index]={name:file.name,url:URL.createObjectURL(file)};input.value='';renderReferences(mode);updateSummary();};
}
function renderCanvas(mode){
  const d=draft(mode),target=document.getElementById('canvas-choice');
  if(d.outputKind==='print'){
    target.innerHTML=`<p class="stage-note">Choose a layout target. Print sharpness and final DPI will depend on the generated pixels and export workflow.</p><div class="print-grid">${[['US Letter','8.5 × 11 in'],['A4','210 × 297 mm'],['11 × 14','11 × 14 in'],['A3','297 × 420 mm']].map(([name,size])=>`<button class="print-card ${d.printSize===name?'selected':''}" data-print="${name}"><span class="paper-shape"></span><strong>${name}</strong><small>${size}</small></button>`).join('')}</div>`;
    target.querySelectorAll('[data-print]').forEach(b=>b.addEventListener('click',()=>{d.printSize=b.dataset.print;save();renderCanvas(mode);updateSummary();}));
  } else {
    target.innerHTML='<p class="stage-note">Choose the shape of the image.</p><div class="ratio-row" id="ratio-row"></div>';
    renderRatios(d);
  }
}
function updateSummary(){
  const d=draft(state.mode),conf=catalog[state.mode],parts=[];
  if(state.mode==='transparent'||d.alpha)parts.push('RGBA image with transparent background');
  if(d.idea?.trim())parts.push(d.idea.trim());
  if(d.exact?.trim())parts.push(`Exact text: “${d.exact.trim()}”`);
  if(conf)for(const s of conf.sections)if(d.choices?.[s.id])parts.push(d.choices[s.id]);
  if(state.mode==='references'&&state.references.some(Boolean))parts.push(`${state.references.filter(Boolean).length} reference image(s)`);
  parts.push(d.outputKind==='print'&&d.printSize?d.printSize:(d.ratio||'1:1'));
  const summary=parts.join(' · ');
  const target=document.getElementById('prompt-summary');if(target)target.textContent=(summary||'Choose a direction or describe your idea.')+(d.avoid?.trim()?`  |  Avoid: ${d.avoid.trim()}`:'');
  const review=document.getElementById('review-summary');if(review)review.textContent=summary;
}
function renderEditor(){workspace.innerHTML=`<div class="workspace-inner">${head('EDIT','Image editor','The editing workspace is part of the app map. Its controls come after we settle creation and inference.')}
  <div class="editor-panel" style="padding:21px"><div class="panel-kicker">NEXT PHASE</div><h2>Open an image to refine it</h2><p>This design pass establishes where editing belongs. No editing actions are active yet.</p><div class="upload-zone"><strong>Your canvas will begin here</strong><span>Import an image or open one from your library.</span><br><button id="editor-import">＋ Open image</button></div>
  <div class="capability-list"><div class="capability-item"><strong>Instruction edits</strong><span>Describe what should change while retaining the original scene.</span></div><div class="capability-item"><strong>Local edits</strong><span>Guide a change with a circle, annotation or mask.</span></div><div class="capability-item"><strong>Background & subject</strong><span>Extract a subject or work with transparent images.</span></div><div class="capability-item"><strong>Multiple images</strong><span>Bring references into an edit when needed.</span></div></div></div></div>`;document.getElementById('editor-import').addEventListener('click',()=>toast('Editing is reserved for a later pass.'));}
let libraryApi=null;
const pendingDeletes=new Set();
function toastAction(message,label,onClick,ms=6500){
  const el=document.getElementById('toast');el.replaceChildren(document.createTextNode(`${message} `));
  const button=document.createElement('button');button.type='button';button.textContent=label;
  button.addEventListener('click',()=>{el.classList.remove('visible','has-action');onClick();});
  el.append(button);el.classList.add('visible','has-action');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible','has-action'),ms);
}
// Deleting hides the images at once and only touches the files after the Undo window, so closing the app in that time deletes nothing.
function requestDelete(ids){
  ids=[...new Set(ids)].filter(id=>id&&!pendingDeletes.has(id));if(!ids.length)return false;
  if(!window.portable?.deleteImages){toast('Deleting images works in the desktop app.');return false;}
  const noun=ids.length===1?'this image':`these ${ids.length} images`;
  if(!confirm(`Delete ${noun}?\n\nThe files move to the Windows Recycle Bin, so you can still restore them there. Large 2K images keep using disk space until the Recycle Bin is emptied.`))return false;
  ids.forEach(id=>pendingDeletes.add(id));libraryApi?.hide(ids);
  let undone=false;
  const commit=async()=>{
    if(undone)return;
    try{
      const {deleted,failed}=await window.portable.deleteImages(ids);
      ids.forEach(id=>pendingDeletes.delete(id));
      deleted.forEach(id=>thumbCache.delete(id));libraryApi?.remove(deleted);
      if(failed.length){libraryApi?.show(failed.map(item=>item.id));toast(`Could not delete ${failed.length} image${failed.length===1?'':'s'}: ${failed[0].error}`);}
    }catch(error){ids.forEach(id=>pendingDeletes.delete(id));libraryApi?.show(ids);toast(friendlyRenderError(error));}
  };
  const timer=setTimeout(commit,6500);
  toastAction(`${ids.length===1?'Image':`${ids.length} images`} deleted.`,'Undo',()=>{undone=true;clearTimeout(timer);ids.forEach(id=>pendingDeletes.delete(id));libraryApi?.show(ids);});
  return true;
}
function renderLibrary(){
  workspace.innerHTML=`<div class="workspace-inner">${head('YOUR SPACE','Library','Open images large, rate them, and organize them into galleries.')}
  <div class="library-tools"><input class="search-input" id="library-search" placeholder="Search images or prompts…"><button class="filter-button active" data-filter="all">All</button><button class="filter-button" data-filter="favorites">Favorites</button><button class="filter-button" id="library-select" type="button" aria-pressed="false">Select</button></div>
  <div class="library-bulk" id="library-bulk" hidden><strong id="bulk-count">0 selected</strong><button id="bulk-all" type="button">Select all shown</button><button id="bulk-none" type="button">Clear</button><select id="bulk-gallery" aria-label="Move selected images to a gallery"></select><button id="bulk-delete" type="button" class="danger">Delete</button></div>
  <div class="library-gallery-row"><label for="library-gallery-filter">Gallery</label><select id="library-gallery-filter"><option value="">All galleries</option></select><button id="new-gallery" type="button">＋ New gallery</button><button id="rename-gallery" type="button" hidden>Rename</button><button id="delete-gallery" type="button" hidden>Delete gallery</button></div>
  <form id="gallery-create" class="gallery-create" hidden><input id="gallery-name" maxlength="60" placeholder="Gallery name" required aria-label="Gallery name"><button type="submit" id="gallery-submit">Create gallery</button><button type="button" id="gallery-cancel">Cancel</button></form>
  <div class="library-grid" id="library-grid"></div><p class="section-note" id="library-note"></p></div>`;
  let filter='all',items=[],galleries=[],selectedGallery=state.libraryGallery||'',loading=!!window.portable?.listImages,selecting=false;
  const selected=new Set(),cards=new Map();
  const input=document.getElementById('library-search'),grid=document.getElementById('library-grid'),note=document.getElementById('library-note');
  const galleryFilter=document.getElementById('library-gallery-filter'),form=document.getElementById('gallery-create'),galleryName=document.getElementById('gallery-name');
  const bulk=document.getElementById('library-bulk'),bulkGallery=document.getElementById('bulk-gallery');
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);loadThumb(entry.target);}},{root:workspace,rootMargin:'400px'});
  function markLoaded(img){img.classList.add('loaded');img.alt=img.dataset.alt;}
  function loadThumb(img){
    thumbFor(img.dataset.imageId).then(url=>{if(!img.isConnected)return;img.onload=()=>markLoaded(img);img.src=url;}).catch(()=>{img.closest('.library-image-button')?.classList.add('failed');});
  }
  function fillPicker(picker,item){
    picker.replaceChildren(new Option('No gallery',''));for(const gallery of galleries)picker.add(new Option(gallery.name,gallery.id));
    picker.value=item.galleryIds?.[0]||'';
  }
  function paintStars(entry){entry.stars.forEach((star,index)=>star.classList.toggle('active',index<(entry.item.rating||0)));}
  function buildCard(item){
    const card=document.createElement('article');card.className='library-card generated';card.dataset.id=item.id;
    const open=document.createElement('button');open.className='library-image-button';open.type='button';
    open.style.setProperty('--ar',`${item.width||1} / ${item.height||1}`);open.setAttribute('aria-label',`Open image large: ${item.prompt||'Generated image'}`);
    const image=document.createElement('img');image.dataset.imageId=item.id;image.dataset.alt=item.prompt||'Generated image';image.alt='';image.decoding='async';
    const check=document.createElement('span');check.className='library-check';check.setAttribute('aria-hidden','true');check.textContent='✓';
    open.append(image,check);
    open.addEventListener('click',()=>selecting?toggleSelect(item.id):openImageViewer(entry.item).catch(error=>toast(error.message)));
    const copy=document.createElement('div');copy.className='library-copy';const name=document.createElement('strong');name.textContent=item.prompt||'Generated image';
    const detail=document.createElement('p');detail.textContent=`${item.width||'?'} × ${item.height||'?'} · ${item.backend||'Local model'}`;
    const rating=document.createElement('div');rating.className='rating';const stars=[];
    for(let i=1;i<=5;i++){
      const star=document.createElement('button');star.textContent='★';star.setAttribute('aria-label',`Rate image ${i} stars`);
      star.addEventListener('click',async()=>{try{await window.portable.rateImage(item.id,i);entry.item.rating=i;paintStars(entry);if(filter==='favorites')applyFilters();}catch(error){toast(error.message);}});
      rating.append(star);stars.push(star);
    }
    const picker=document.createElement('select');picker.className='library-gallery-picker';picker.setAttribute('aria-label','Gallery for this image');fillPicker(picker,item);
    picker.addEventListener('change',async()=>{
      const spinner=document.createElement('span');spinner.className='busy-spinner';picker.after(spinner);picker.disabled=true;
      try{entry.item.galleryIds=picker.value?[picker.value]:[];await window.portable.assignImageGalleries(item.id,entry.item.galleryIds);if(selectedGallery)applyFilters();else toast('Gallery updated.');}
      catch(error){toast(error.message);}finally{spinner.remove();picker.disabled=false;}
    });
    copy.append(name,detail,rating,picker);card.append(open,copy);
    const entry={item,el:card,img:image,stars,picker};cards.set(item.id,entry);paintStars(entry);
    const cached=thumbCache.get(item.id);
    if(cached){image.onload=()=>markLoaded(image);image.src=cached;}else observer.observe(image);
    return card;
  }
  function counts(){return [...cards.keys()].filter(id=>!pendingDeletes.has(id)).length;}
  function applyFilters(){
    const query=input.value.toLowerCase();let shown=0;
    for(const [id,entry] of cards){
      const item=entry.item;
      const match=!pendingDeletes.has(id)&&`${item.prompt} ${item.mode} ${item.backend}`.toLowerCase().includes(query)&&(filter==='all'||item.rating>=4)&&(!selectedGallery||item.galleryIds?.includes(selectedGallery));
      entry.el.hidden=!match;if(match)shown++;
    }
    grid.classList.toggle('real-library-grid',cards.size>0);
    let empty=grid.querySelector('.library-empty');
    if(loading){note.innerHTML='<span class="busy-spinner" aria-hidden="true"></span> Loading your images…';return;}
    if(!cards.size){renderSamples();return;}
    grid.querySelectorAll('.library-sample').forEach(node=>node.remove());
    if(!shown){if(!empty){empty=document.createElement('p');empty.className='section-note library-empty';grid.append(empty);}empty.textContent='No images match this view.';}
    else empty?.remove();
    const total=counts();note.textContent=`${total} local image${total===1?'':'s'} · Originals stay in data/library beside this EXE.`;
  }
  function renderSamples(){
    note.textContent='Sample images for preview. Your generated images appear here after rendering.';
    grid.querySelectorAll('.library-sample').forEach(node=>node.remove());
    if(selectedGallery)return;
    for(const [title,desc,art] of librarySamples.filter(([t,d])=>`${t} ${d}`.toLowerCase().includes(input.value.toLowerCase())).filter(([title])=>filter==='all'||(state.ratings[title]||0)>=4)){
      const card=document.createElement('article');card.className='library-card library-sample';const image=document.createElement('div');image.className='library-art';image.style.backgroundPosition=sheet[art];
      const copy=document.createElement('div');copy.className='library-copy';const name=document.createElement('strong');name.textContent=title;const detail=document.createElement('p');detail.textContent=desc;
      copy.append(name,detail);card.append(image,copy);grid.append(card);
    }
  }
  function addItems(list,atStart=false){
    const fresh=list.filter(item=>!cards.has(item.id));
    if(atStart)fresh.reverse().forEach(item=>grid.prepend(buildCard(item)));else fresh.forEach(item=>grid.append(buildCard(item)));
    items=items.concat(fresh);
  }
  function galleryOptions(){
    galleryFilter.replaceChildren(new Option('All galleries',''));for(const gallery of galleries)galleryFilter.add(new Option(gallery.name,gallery.id));
    if(!galleries.some(g=>g.id===selectedGallery))selectedGallery='';galleryFilter.value=selectedGallery;
    document.getElementById('rename-gallery').hidden=!selectedGallery;document.getElementById('delete-gallery').hidden=!selectedGallery;
    bulkGallery.replaceChildren(new Option('Move to gallery…','__'),new Option('No gallery',''));for(const gallery of galleries)bulkGallery.add(new Option(gallery.name,gallery.id));bulkGallery.value='__';
    for(const entry of cards.values())fillPicker(entry.picker,entry.item);
  }
  function updateBulk(){
    document.getElementById('bulk-count').textContent=`${selected.size} selected`;
    document.getElementById('bulk-delete').disabled=!selected.size;bulkGallery.disabled=!selected.size;document.getElementById('bulk-none').disabled=!selected.size;
  }
  function toggleSelect(id){
    const entry=cards.get(id);if(!entry)return;
    if(selected.has(id))selected.delete(id);else selected.add(id);
    entry.el.classList.toggle('selected',selected.has(id));updateBulk();
  }
  function setSelecting(value){
    selecting=value;grid.classList.toggle('selecting',selecting);bulk.hidden=!selecting;
    const button=document.getElementById('library-select');button.classList.toggle('active',selecting);button.setAttribute('aria-pressed',String(selecting));button.textContent=selecting?'Done':'Select';
    if(!selecting){selected.forEach(id=>cards.get(id)?.el.classList.remove('selected'));selected.clear();}
    updateBulk();
  }
  async function refresh(){
    if(!window.portable?.listImages)return;
    try{const list=await window.portable.listImages();if(grid.isConnected){addItems(list,true);applyFilters();}}catch(error){toast(error.message);}
  }
  libraryApi={
    hide(ids){ids.forEach(id=>{selected.delete(id);cards.get(id)?.el.classList.remove('selected');});applyFilters();updateBulk();},
    show(){applyFilters();},
    remove(ids){for(const id of ids){const entry=cards.get(id);if(entry){observer.unobserve(entry.img);entry.el.remove();cards.delete(id);}selected.delete(id);}items=items.filter(item=>!ids.includes(item.id));applyFilters();updateBulk();},
    refresh
  };
  input.addEventListener('input',applyFilters);
  workspace.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;workspace.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));applyFilters();}));
  document.getElementById('library-select').addEventListener('click',()=>setSelecting(!selecting));
  document.getElementById('bulk-all').addEventListener('click',()=>{for(const [id,entry] of cards)if(!entry.el.hidden&&!selected.has(id))toggleSelect(id);});
  document.getElementById('bulk-none').addEventListener('click',()=>{selected.forEach(id=>cards.get(id)?.el.classList.remove('selected'));selected.clear();updateBulk();});
  document.getElementById('bulk-delete').addEventListener('click',()=>{const ids=[...selected];requestDelete(ids);});
  bulkGallery.addEventListener('change',async()=>{
    if(bulkGallery.value==='__'||!selected.size)return;
    const target=bulkGallery.value,ids=[...selected];bulkGallery.disabled=true;
    try{
      for(const id of ids){const entry=cards.get(id);if(!entry)continue;entry.item.galleryIds=target?[target]:[];await window.portable.assignImageGalleries(id,entry.item.galleryIds);fillPicker(entry.picker,entry.item);}
      toast(`${ids.length} image${ids.length===1?'':'s'} moved.`);applyFilters();
    }catch(error){toast(error.message);}finally{bulkGallery.value='__';updateBulk();}
  });
  galleryFilter.addEventListener('change',()=>{selectedGallery=galleryFilter.value;state.libraryGallery=selectedGallery;galleryOptions();applyFilters();});
  document.getElementById('new-gallery').addEventListener('click',()=>{form.hidden=false;galleryName.value='';document.getElementById('gallery-submit').textContent='Create gallery';form.dataset.edit='';galleryName.focus();});
  document.getElementById('rename-gallery').addEventListener('click',()=>{const gallery=galleries.find(g=>g.id===selectedGallery);if(!gallery)return;form.hidden=false;form.dataset.edit=gallery.id;galleryName.value=gallery.name;document.getElementById('gallery-submit').textContent='Save name';galleryName.focus();});
  document.getElementById('gallery-cancel').addEventListener('click',()=>form.hidden=true);
  form.addEventListener('submit',async e=>{e.preventDefault();const button=document.getElementById('gallery-submit'),editing=!!form.dataset.edit;button.disabled=true;button.innerHTML='<span class="busy-spinner" aria-hidden="true"></span> Saving…';try{const item=editing?await window.portable.renameGallery(form.dataset.edit,galleryName.value):await window.portable.createGallery(galleryName.value);galleries=await window.portable.listGalleries();selectedGallery=editing?item.id:'';state.libraryGallery=selectedGallery;form.hidden=true;galleryOptions();applyFilters();}catch(error){toast(error.message);}finally{button.disabled=false;button.textContent=editing?'Save name':'Create gallery';}});
  document.getElementById('delete-gallery').addEventListener('click',async()=>{if(!selectedGallery||!confirm('Delete this gallery? Images will remain in All galleries.'))return;try{await window.portable.deleteGallery(selectedGallery);galleries=await window.portable.listGalleries();cards.forEach(entry=>{entry.item.galleryIds=(entry.item.galleryIds||[]).filter(id=>id!==selectedGallery);});selectedGallery='';state.libraryGallery='';galleryOptions();applyFilters();}catch(error){toast(error.message);}});
  updateBulk();galleryOptions();applyFilters();
  if(window.portable?.listImages)Promise.all([window.portable.listImages(),window.portable.listGalleries()]).then(([list,groups])=>{if(grid.isConnected){loading=false;galleries=groups;addItems(list);galleryOptions();applyFilters();}}).catch(error=>{loading=false;applyFilters();toast(error.message);});
  else loading=false,applyFilters();
}
function renderSettings(){
  workspace.innerHTML=`<div class="workspace-inner">${head('PREFERENCES','Settings','Adjust your studio workspace and review model, storage and support details.')}
  <div class="settings-grid"><article class="setting-panel appearance-panel"><h2>Appearance</h2><p>Choose a quieter workspace. Colors are saved on this device.</p>
    <div class="appearance-controls"><div><span class="appearance-label">Studio themes</span><div class="theme-options">${Object.entries(themes).map(([id,t])=>`<button type="button" class="theme-option ${state.preferences.theme===id?'selected':''}" data-theme="${id}" aria-pressed="${state.preferences.theme===id}"><span class="theme-swatch" style="background:${t.background}"><i style="background:${t.panel}"></i><b style="background:${t.accent}"></b></span><strong>${t.name}</strong></button>`).join('')}</div></div>
    <div><span class="appearance-label">Your colors</span><div class="custom-colors">${[['customBackground','Workspace'],['customPanel','Panels'],['customAccent','Accent']].map(([key,label])=>`<label>${label}<input type="color" data-custom-color="${key}" value="${esc(state.preferences[key])}"></label>`).join('')}</div><small>Changing a color switches to your custom theme.</small></div></div>
  </article><article class="setting-panel"><h2>Image model</h2><p>Qwen-Image-2.1 weights stay beside the portable EXE. Choose a lighter compatible weight for speed or reduced memory use.</p><button class="quiet-button" id="change-model" ${window.portable?'':'disabled'}>Change model or GPU</button></article><article class="setting-panel"><h2>Local hardware</h2><p>Live CPU, RAM, GPU and VRAM appear in the slim bar above the workspace. CPU rendering can take much longer.</p><span>Local monitoring</span></article><article class="setting-panel"><h2>Library & storage</h2><p>PNG originals and prompt details stay in the portable data/library folder.</p><span>Local-first</span></article><article class="setting-panel"><h2>Support the project</h2><p>Unlimited is free. A coffee is optional and never needed to unlock generation.</p><a href="https://buymeacoffee.com/criso2hdj" target="_blank" rel="noopener noreferrer">Buy me a coffee ↗</a></article></div></div>`;
  document.getElementById('change-model').addEventListener('click',()=>window.portable?.openSetup());
  workspace.querySelectorAll('[data-theme]').forEach(b=>b.addEventListener('click',()=>{const theme=themes[b.dataset.theme];state.preferences.theme=b.dataset.theme;state.preferences.customBackground=theme.background;state.preferences.customPanel=theme.panel;state.preferences.customAccent=theme.accent;save();applyPreferences();renderSettings();}));
  workspace.querySelectorAll('[data-custom-color]').forEach(input=>input.addEventListener('input',()=>{state.preferences[input.dataset.customColor]=input.value;state.preferences.theme='custom';save();applyPreferences();workspace.querySelectorAll('[data-theme]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false')});}));
}
function render(){libraryApi=null;if(state.mode==='inspiration')renderInspiration();else if(state.mode==='freeform')renderFreeform();else if(state.mode==='editor')renderEditor();else if(state.mode==='library')renderLibrary();else if(state.mode==='settings')renderSettings();else renderBuilder(state.mode);}
sideLinks.forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
document.getElementById('mobile-menu').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('open'));
const support=document.getElementById('support-note');if(localStorage.getItem('unlimited-support-dismissed')==='yes')support.classList.add('hidden');
document.getElementById('dismiss-support').addEventListener('click',()=>{localStorage.setItem('unlimited-support-dismissed','yes');support.classList.add('hidden');});
applyPreferences();
if(window.portable){document.querySelector('.prototype-badge').textContent='EARLY BUILD';document.querySelector('.statusbar span:last-child').textContent='Qwen-Image-2.1 · local generation';}
if(window.portable?.systemStatus){
  const strip=document.getElementById('system-strip');
  const meter=(label,value,detail='')=>{const percent=Number.isFinite(value)?Math.max(0,Math.min(100,Math.round(value))):null;return `<span class="system-metric" title="${esc(detail)}"><em>${esc(label)}</em><span class="system-meter" aria-hidden="true"><i style="--fill:${percent??0}%"></i></span><b>${percent===null?'—':percent+'%'}</b></span>`};
  const readSystem=async()=>{try{
    const status=await window.portable.systemStatus();
    const ram=Math.round(status.memory.used/status.memory.total*100);
    const gpu=status.gpu,metrics=status.gpuMetrics;
    strip.innerHTML=`<span><i class="system-dot"></i><b>LOCAL</b></span>${meter('CPU',status.cpuPercent)}${meter('RAM',ram,`${(status.memory.used/2**30).toFixed(1)} of ${(status.memory.total/2**30).toFixed(1)} GB used`)}<span class="system-detail">${(status.memory.used/2**30).toFixed(1)} / ${(status.memory.total/2**30).toFixed(1)} GB</span><span class="system-detail">${esc(gpu?.name||'CPU rendering')}</span>${metrics?`${meter('GPU',metrics.utilization)}${meter('VRAM',metrics.usedMiB/metrics.totalMiB*100,`${(metrics.usedMiB/1024).toFixed(1)} of ${(metrics.totalMiB/1024).toFixed(1)} GB used`)}<span class="system-detail">${(metrics.usedMiB/1024).toFixed(1)} / ${(metrics.totalMiB/1024).toFixed(1)} GB</span>`:''}<span class="system-model">Qwen <b>${esc(status.modelQuant)}</b></span>`;
  }catch{strip.textContent='Local system · metrics unavailable';}};
  readSystem();setInterval(readSystem,3000);
}else document.getElementById('system-strip').textContent='LOCAL STUDIO · system information appears in the desktop app';
setMode('inspiration');

