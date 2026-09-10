'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, ArrowLeft, Check, ChevronDown, Upload, Shirt, Layers, Leaf, X, Plus } from 'lucide-react';
import { money, type Product } from '@/lib/catalog';
import { customQuote, customSizes, type CustomConfig, type CustomDetails, type CustomOption } from '@/lib/custom-shirts';

export function CustomShirtBanner() {
  const [image,setImage]=useState('/street-wear.jpeg');
  useEffect(()=>{fetch('/api/custom-shirts').then(r=>r.ok?r.json():null).then(d=>{if(d?.settings?.custom_banner_image)setImage(d.settings.custom_banner_image);}).catch(()=>{});},[]);
  return <a className="zs-banner" href="/customise-your-shirt">
    <img src={image} alt="Custom shirt design service" className="zs-banner-photo" loading="lazy"/>
    <div className="zs-banner-copy"><span>ZYRA / CUSTOM STUDIO</span><h2>Your design.<br/>Your shirt.</h2><p>Pick your colour. Add your art. Make it yours.</p><span className="zs-banner-link">Create my shirt <ArrowUpRight size={22} aria-hidden="true"/></span><div className="zs-banner-steps" aria-hidden="true"><span>01 / Choose</span><span>02 / Create</span><span>03 / Wear</span></div></div>
    <span className="zs-banner-corner" aria-hidden="true">YOUR IDEA. OUR CANVAS.</span>
  </a>;
}
export function CustomItemDetails({ details }: { details?: CustomDetails }) {
  if (!details) return null;
  return <span className="cs-item-details"><span>{details.fabric} · {details.print}</span>{(details.frontPosition||details.backPosition)&&<span>Placement: {[details.frontPosition,details.backPosition].filter(Boolean).join(' · ')}</span>}{details.instructions && <span>Notes: {details.instructions}</span>}</span>;
}
export function CustomArtworkLinks({ details }: { details?: CustomDetails }) {
  if (!details) return null;
  return <span className="cs-artwork-links">{details.frontImage&&<a href={details.frontImage} target="_blank" rel="noreferrer">Front artwork ↗</a>}{details.backImage&&<a href={details.backImage} target="_blank" rel="noreferrer">Back artwork ↗</a>}{!details.frontImage&&!details.backImage&&details.image&&<a href={details.image} target="_blank" rel="noreferrer">Artwork ↗</a>}</span>;
}

type Artwork = {path:string;url:string;name:string};
function ArtworkUpload({side,art,busy,onUpload,onRemove}:{side:'front'|'back';art:Artwork|null;busy:boolean;onUpload:(file?:File)=>void;onRemove:()=>void}) {
  const input=useRef<HTMLInputElement>(null);
  return <div className={'zs-upload '+(art?'has-art':'')} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!busy)onUpload(e.dataTransfer.files[0]);}}>
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" aria-label={'Upload '+side+' print'} disabled={busy} onChange={e=>{onUpload(e.target.files?.[0]);e.target.value='';}}/>
    <span className="zs-upload-label">{side} print</span>
    {art?<><img src={art.url} alt={side+' artwork'}/><div className="zs-upload-file"><span>{art.name}</span><button type="button" aria-label={'Remove '+side+' artwork'} onClick={onRemove} disabled={busy}><X size={16}/></button></div><button className="zs-text-button" type="button" onClick={()=>input.current?.click()} disabled={busy}>Replace image</button></>:<button className="zs-upload-trigger" type="button" onClick={()=>input.current?.click()} disabled={busy}><span><Upload size={28}/></span><b>{busy?'Uploading…':'Add your image'}</b><small>Choose a file or drag it here</small></button>}
  </div>;
}
const steps=['Colour','Fabric','Size & print','Your artwork'];
function PositionPicker({title,options,value,onPick}:{title:string;options:CustomOption[];value:string;onPick:(id:string)=>void}) {
  return <div className="zs-position-picker"><h4>{title}</h4><div role="group" aria-label={title}>{options.map(option=><button type="button" key={option.id} aria-pressed={value===option.id} className={value===option.id?'selected':''} onClick={()=>onPick(option.id)}><span><b>{option.name}</b><small>{option.description}</small></span><strong>+ {money(option.price)}</strong>{value===option.id&&<Check size={15}/>}</button>)}</div></div>;
}
export function CustomShirtStudio({onAdd}:{onAdd:(product:Product,size:string,colour:string)=>void}) {
  const [config,setConfig]=useState<CustomConfig|null>(null);
  const [error,setError]=useState('');
  const [colour,setColour]=useState(''); const [fabric,setFabric]=useState(''); const [print,setPrint]=useState(''); const [frontPosition,setFrontPosition]=useState(''); const [backPosition,setBackPosition]=useState(''); const [size,setSize]=useState('');
  const [frontArt,setFrontArt]=useState<Artwork|null>(null); const [backArt,setBackArt]=useState<Artwork|null>(null);
  const [notes,setNotes]=useState(''); const [consent,setConsent]=useState(false);
  const [stage,setStage]=useState(0); const [busy,setBusy]=useState(false); const [uploading,setUploading]=useState(false);
  const uploadLock=useRef(false);
  const panel=useRef<HTMLElement>(null);
  useEffect(()=>{let active=true;fetch('/api/custom-shirts').then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(active)setConfig(d);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
  const chosen=(id:string)=>config?.options.find(o=>o.id===id);
  const needsFront=print==='front'||print==='both';
  const needsBack=print==='back'||print==='both';
  const artReady=!!print&&(!needsFront||!!frontArt)&&(!needsBack||!!backArt);
  const positionsReady=(!needsFront||!!frontPosition)&&(!needsBack||!!backPosition);
  const complete=[!!colour,!!fabric,!!size&&!!print&&positionsReady,artReady];
  const total=config?.options.filter(o=>[colour,fabric,print,frontPosition,backPosition].includes(o.id)).reduce((sum,o)=>sum+o.price,0)||0;
  const captions=[chosen(colour)?.name,chosen(fabric)?.name,size&&chosen(print)?size+' · '+chosen(print)?.name:'',artReady?'Images added':''];
  const canVisit=(i:number)=>complete.slice(0,i).every(Boolean);
  function move(i:number){if(!canVisit(i))return;setStage(i);setError('');requestAnimationFrame(()=>{panel.current?.focus({preventScroll:true});panel.current?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});}
  async function upload(side:'front'|'back',file?:File){
    if(!file||uploadLock.current)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024){setError('Choose a PNG, JPG or WebP under 8 MB.');return;}
    uploadLock.current=true;setUploading(true);setError('');
    try{const form=new FormData();form.set('file',file);const r=await fetch('/api/custom-shirts/upload',{method:'POST',body:form});const data=await r.json();if(!r.ok)throw Error(data.error);(side==='front'?setFrontArt:setBackArt)({...data,name:file.name});}
    catch(e){setError(e instanceof Error?e.message:'Upload failed. Please try again.');}
    finally{uploadLock.current=false;setUploading(false);}
  }
  async function save(e:React.FormEvent){
    e.preventDefault();if(busy||uploading)return;
    if(stage!==3){if(complete[stage])move(stage+1);return;}
    if(!complete.every(Boolean)||!consent){setError('Add the selected print images and confirm that you can use them.');return;}
    setBusy(true);setError('');
    try{
      customQuote(config!.options,{colour,fabric,print,frontPosition,backPosition});
      const r=await fetch('/api/custom-shirts/designs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({colour,fabric,print,frontPosition,backPosition,size,instructions:notes,frontArtwork:needsFront?frontArt!.path:'',backArtwork:needsBack?backArt!.path:''})});
      const product=await r.json();if(!r.ok)throw Error(product.error);
      onAdd(product,size,chosen(colour)!.name);
    }catch(e){setError(e instanceof Error?e.message:'Could not save your shirt. Please try again.');}finally{setBusy(false);}
  }
  return <main className="zs-studio">
    <nav className="zs-breadcrumb"><a href="/">Home</a><span>/</span>Custom shirts</nav>
    <header className="zs-heading"><span>ZYRA / MADE TO ORDER</span><h1>Customise<br/><em>your shirt.</em></h1><p>A colour you like. A print you chose.</p></header>
    {!config?<p className="zs-loading" role="status">{error||'Loading shirt options…'}{error&&<button type="button" onClick={()=>location.reload()}>Try again</button>}</p>:!config.settings.enabled?<p className="zs-loading">Custom orders are paused. <a href="/pages/contact">Contact us</a></p>:<>
      <div className="zs-price-pin" role="status" aria-live="polite" aria-label="Current shirt total"><span>Shirt total</span><strong key={total}>{colour||fabric||print?money(total):'Rs. —'}</strong></div>
      <nav className="zs-milestones" aria-label="Shirt customisation steps">{steps.map((label,i)=><button key={label} type="button" className={(stage===i?'current ':'')+(complete[i]?'complete':'')} aria-current={stage===i?'step':undefined} disabled={!canVisit(i)||busy||uploading} onClick={()=>move(i)}><span className="zs-step-number">{complete[i]?<Check size={16}/>:String(i+1).padStart(2,'0')}</span><span><b>{label}</b><small>{captions[i]||'Choose '+(i===2?'size & placement':i===3?'your image':label.toLowerCase())}</small></span></button>)}</nav>
      <form onSubmit={save} className="zs-form">
        <section className="zs-panel" ref={panel} tabIndex={-1} aria-label={steps[stage]}>
          <div className="zs-panel-inner" key={stage}>
            <div className="zs-panel-heading"><span>0{stage+1} / 04</span><h2>{['Which colour?','How should it feel?','Your size. Your print.','Add your artwork.'][stage]}</h2><p>{['Pick a shirt to start.','Choose the fabric you want to wear.','Select a size and where the artwork goes.','Separate images for each side.'][stage]}</p></div>
            {stage===0&&<div className="zs-colours" role="group" aria-label="Shirt colour">{config.options.filter(o=>o.kind==='colour').map(o=><button type="button" key={o.id} aria-pressed={colour===o.id} className={colour===o.id?'selected':''} onClick={()=>setColour(o.id)}><span className="zs-colour-photo">{o.image?<img src={o.image} alt={o.name+' shirt'}/>:<Shirt size={70}/>}<span className="zs-choice-tick"><Check size={16}/></span></span><span className="zs-colour-name"><b>{o.name}</b><small>{o.price?'+ '+money(o.price):'Included'}</small></span></button>)}</div>}
            {stage===1&&<div className="zs-fabrics" role="group" aria-label="Fabric">{config.options.filter(o=>o.kind==='fabric').map((o,i)=>{const Icon=[Leaf,Layers,Shirt][i%3];return <button key={o.id} type="button" aria-pressed={fabric===o.id} className={fabric===o.id?'selected':''} onClick={()=>setFabric(o.id)}><span className={'zs-fabric-texture texture-'+i%3}>{o.image?<img src={o.image} alt=""/>:<Icon size={35}/>}<span className="zs-choice-tick"><Check size={16}/></span></span><span className="zs-fabric-copy"><b>{o.name}</b><small>{o.description}</small><strong>{money(o.price)}</strong></span></button>;})}</div>}
            {stage===2&&<div className="zs-fit"><div><div className="zs-field-heading"><h3>Size</h3><a href="/pages/faq">Size help <ArrowUpRight size={13}/></a></div><div className="zs-sizes" role="group" aria-label="Shirt size">{customSizes.map(s=><button type="button" key={s} aria-pressed={size===s} onClick={()=>setSize(s)}>{s}</button>)}</div></div><div><h3>Which side?</h3><div className="zs-placements" role="group" aria-label="Printed sides">{config.options.filter(o=>o.kind==='print').map(o=><button type="button" key={o.id} aria-pressed={print===o.id} className={print===o.id?'selected':''} onClick={()=>{setPrint(o.id);if(o.id==='front')setBackPosition('');if(o.id==='back')setFrontPosition('');}}><span className="zs-placement-icon"><Shirt size={42}/><span className="zs-print-mark">{o.id==='both'?'F+B':o.id==='back'?'B':'F'}</span></span><b>{o.name}</b><small>{o.price?'+ '+money(o.price):'Choose placement'}</small><span className="zs-choice-tick"><Check size={16}/></span></button>)}</div>{needsFront&&<PositionPicker title="Front placement" options={config.options.filter(o=>o.kind==='front-position')} value={frontPosition} onPick={setFrontPosition}/>} {needsBack&&<PositionPicker title="Back placement" options={config.options.filter(o=>o.kind==='back-position')} value={backPosition} onPick={setBackPosition}/>}</div></div>}
            {stage===3&&<><div className="zs-upload-grid">{needsFront&&<ArtworkUpload side="front" art={frontArt} busy={uploading||busy} onUpload={f=>void upload('front',f)} onRemove={()=>setFrontArt(null)}/>} {needsBack&&<ArtworkUpload side="back" art={backArt} busy={uploading||busy} onUpload={f=>void upload('back',f)} onRemove={()=>setBackArt(null)}/>}</div><p className="zs-file-hint">PNG, JPG or WebP · Up to 8 MB each</p><label className="zs-notes-label" htmlFor="zs-notes">Print instructions <span>Optional</span></label><textarea id="zs-notes" rows={2} maxLength={1200} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="e.g. Front: small print on the left chest. Back: centred."/><label className="zs-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I own these images or have permission to print them.</span></label></>}
          </div>
          {error&&<p className="zs-error" role="alert">{error}</p>}
          <div className="zs-actions">{stage>0?<button type="button" className="zs-back" onClick={()=>move(stage-1)} disabled={busy||uploading}><ArrowLeft size={17}/> Back</button>:<span className="zs-action-hint">{colour?'Colour selected':'Select a colour to continue'}</span>}{stage<3?<button type="button" className="zs-next" disabled={!complete[stage]} onClick={()=>move(stage+1)}>Continue to {steps[stage+1].toLowerCase()} <ArrowRight size={18}/></button>:<button type="submit" className="zs-next" disabled={busy||uploading||!artReady||!consent}>{busy?'Adding your shirt…':config.settings.button_label||'Add my shirt to bag'}<ArrowRight size={18}/></button>}</div>
          {stage===3&&<p className="zs-checkout-note">Delivery calculated at checkout. Your images and notes stay with the order.</p>}
        </section>
      </form>
    </>}
    <section className="zs-faq"><div><span>BEFORE YOU ORDER</span><h2>A few details.</h2><a href="/pages/contact">Ask us a question <ArrowUpRight size={17}/></a></div><div>{[
      ['Which images can I upload?','Use a clear PNG, JPG or WebP, up to 8 MB per file. A transparent PNG works well if you do not want a background.'],
      ['Can the front and back be different?','Yes. Select Front + back and upload one image for each side. Add placement or print-size notes below the uploads.'],
      ['When will it arrive?','Contact us with your design and delivery city for the current preparation and delivery estimate.'],
      ['Can I change my design later?','Contact us with your order number as soon as possible. Changes depend on whether printing has started.'],
      ['What about exchanges?','Please confirm custom-order eligibility with us before ordering. If your shirt arrives wrong or damaged, contact us for help.']
    ].map(([q,a])=><details key={q}><summary>{q}<Plus size={17}/></summary><p>{a}</p></details>)}</div></section>
  </main>;
}

export function CustomShirtAdmin({ viewOrders }: { viewOrders: () => void }) {
  const [config,setConfig]=useState<CustomConfig|null>(null);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [editing,setEditing]=useState<CustomOption|null>(null);
  useEffect(()=>{fetch('/api/admin/custom-shirts').then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setConfig(d);}).catch(e=>setMessage(e.message));},[]);
  async function save(body: unknown){setBusy(true);setMessage('');try{const r=await fetch('/api/admin/custom-shirts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error);setConfig(d);setEditing(null);setMessage('Studio updated.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to save.');}finally{setBusy(false);}}
  async function image(file?:File){if(!file||!editing)return;setBusy(true);try{const body=new FormData();body.set('file',file);const r=await fetch('/api/admin/uploads',{method:'POST',body});const d=await r.json();if(!r.ok)throw new Error(d.error);setEditing({...editing,image:d.url});}catch(e){setMessage(e instanceof Error?e.message:'Upload failed.');}finally{setBusy(false);}}
  async function bannerImage(file?:File){if(!file||!config)return;setBusy(true);try{const body=new FormData();body.set('file',file);const r=await fetch('/api/admin/uploads',{method:'POST',body});const d=await r.json();if(!r.ok)throw new Error(d.error);setConfig({...config,settings:{...config.settings,custom_banner_image:d.url}});}catch(e){setMessage(e instanceof Error?e.message:'Upload failed.');}finally{setBusy(false);}}
  if(!config)return <p role="status">{message||'Loading shirt studio…'}</p>;
  const groups: Array<[CustomOption['kind'],string]>=[['colour','Shirt colours & photos'],['fabric','Fabrics & prices'],['print','Printed sides · base fee'],['front-position','Front placements & prices'],['back-position','Back placements & prices']];
  return <section className="cs-admin"><header><div><p className="eyebrow">Made personal</p><h2>Custom shirt studio</h2><p>Manage the options customers see. Prices are in Pakistani rupees.</p></div><button className="outline-button" onClick={viewOrders}>View custom orders <ArrowUpRight size={18}/></button></header>{message&&<p role="status">{message}</p>}<form className="cs-admin-settings" onSubmit={e=>{e.preventDefault();void save({settings:config.settings});}}><label>Page heading<input maxLength={100} required value={config.settings.heading} onChange={e=>setConfig({...config,settings:{...config.settings,heading:e.target.value}})}/></label><label>Introduction<textarea maxLength={300} value={config.settings.intro} onChange={e=>setConfig({...config,settings:{...config.settings,intro:e.target.value}})}/></label><label>Order button name<input maxLength={60} required value={config.settings.button_label} onChange={e=>setConfig({...config,settings:{...config.settings,button_label:e.target.value}})}/></label><label>Custom-section image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={e=>void bannerImage(e.target.files?.[0])}/>{config.settings.custom_banner_image&&<img className="cs-banner-admin-preview" src={config.settings.custom_banner_image} alt="Custom-section preview"/>}</label><label className="cs-consent"><input type="checkbox" checked={config.settings.enabled} onChange={e=>setConfig({...config,settings:{...config.settings,enabled:e.target.checked}})}/>Studio open</label><button className="dark-button" disabled={busy}>Save studio settings</button></form>{groups.map(([kind,title])=><section key={kind}><header><h3>{title}</h3><button onClick={()=>setEditing({id:`${kind}-${crypto.randomUUID().slice(0,8)}`,kind,name:'',description:'',image:'',price:0,active:true,sort_order:config.options.length+1})}><Plus size={16}/> Add option</button></header><div className="cs-admin-options">{config.options.filter(o=>o.kind===kind).map(o=><article key={o.id}>{o.image?<img src={o.image} alt={o.name}/>:<Shirt size={28}/>}<div><b>{o.name}</b><small>{money(o.price)} · {o.active?'Visible':'Hidden'}</small></div><button disabled={busy} onClick={()=>setEditing(o)}>Edit</button><button disabled={busy} onClick={()=>void save({option:{...o,active:!o.active}})}>{o.active?'Remove':'Restore'}</button></article>)}</div></section>)}{editing&&<div className="cs-admin-edit" role="dialog" aria-modal="true" aria-label="Edit studio option"><form onSubmit={e=>{e.preventDefault();void save({option:editing});}}><header><h3>{editing.kind} option</h3><button type="button" aria-label="Close editor" onClick={()=>setEditing(null)}><X/></button></header><label>Name<input required maxLength={80} value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label><label>Description<textarea maxLength={300} value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})}/></label><label>Price (Rs.)<input type="number" required min="0" max="100000" step="1" value={editing.price/100} onChange={e=>setEditing({...editing,price:Math.round(Number(e.target.value)*100)})}/></label><label>Card image / icon<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={e=>void image(e.target.files?.[0])}/></label>{editing.image&&<><img src={editing.image} alt="Option preview"/><button type="button" onClick={()=>setEditing({...editing,image:''})}>Remove image</button></>}<button className="dark-button" disabled={busy}>{busy?'Saving…':'Save option'}</button><small>Removed options stay on past orders. Saved designs keep their quoted price for 24 hours.</small></form></div>}</section>;
}
