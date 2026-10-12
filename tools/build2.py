import json,re,html
d=json.load(open('data.json'))
src=open('varshini-ai-portfolio.html').read() if 'id="app-src"' in open('varshini-ai-portfolio.html').read() else open('base_head.html').read()
e=html.escape
# pieces
head_end=src.index('<style>')
style_start=src.index('<style>'); style_end=src.index('</style>')+8
fonts=src[:head_end]
style=src[style_start:style_end]
app=""
L=d['L']
ext=lambda u,t,c='': f'<a class="{c}" href="{e(u)}" target="_blank" rel="noopener noreferrer">{t}</a>'
css='''
<style>
#root .sf{max-width:72rem;margin:0 auto;padding:0 1rem}
#root .sf a{color:#00f3ff}
#root .sf-nav{position:sticky;top:0;z-index:5;background:rgba(2,6,23,.85);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.08)}
#root .sf-nav .sf{display:flex;align-items:center;justify-content:space-between;gap:1rem;height:3.5rem}
#root .sf-nav nav{display:flex;gap:1.1rem;font-size:.9rem;overflow-x:auto}
#root .sf-nav nav a{color:#cbd5e1;text-decoration:none;white-space:nowrap}
#root .sf-nav nav a:hover{color:#00f3ff}
#root .sf h1{font-size:clamp(2.4rem,7vw,4.5rem);font-weight:700;line-height:1.02;color:#fff;letter-spacing:-.02em}
#root .sf h2{font-size:clamp(1.6rem,4vw,2.4rem);font-weight:700;color:#fff;margin-bottom:.4rem}
#root .sf h3{font-size:1.15rem;font-weight:600;color:#fff}
#root .sf section{padding:4.5rem 0 1rem}
#root .sf-hero{padding:5rem 0 2rem}
#root .sf-role{margin-top:.75rem;font-size:clamp(1.2rem,3vw,1.7rem);font-weight:600;background:linear-gradient(90deg,#00f3ff,#8b5cf6);-webkit-background-clip:text;background-clip:text;color:transparent}
#root .sf p{color:#cbd5e1;line-height:1.65}
#root .sf-btns{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.5rem}
#root .sf-btn{display:inline-block;padding:.7rem 1.2rem;border-radius:.8rem;font-weight:600;text-decoration:none;border:1px solid rgba(255,255,255,.18);color:#fff!important}
#root .sf-btn.p{background:linear-gradient(90deg,#00f3ff,#8b5cf6);color:#020617!important;border:0}
#root .sf-grid{display:grid;gap:1rem;margin-top:1.5rem;grid-template-columns:repeat(auto-fill,minmax(17rem,1fr))}
#root .sf-card{padding:1.25rem;border-radius:1.1rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}
#root .sf-tag{display:inline-block;margin:.5rem .35rem 0 0;padding:.15rem .6rem;border-radius:999px;font-size:.75rem;color:#00f3ff;border:1px solid rgba(0,243,255,.35)}
#root .sf-stat{font-size:2.2rem;font-weight:700;color:#fff}
#root .sf-muted{color:#94a3b8!important;font-size:.9rem}
#root .sf-note{margin-top:1.25rem;padding:.7rem 1rem;border-radius:.8rem;background:rgba(139,92,246,.12);border:1px solid rgba(139,92,246,.35);color:#cbd5e1;font-size:.9rem}
#root .sf-foot{padding:3rem 0;color:#64748b;font-size:.85rem}
</style>
'''
nav=''.join(f'<a href="#{i}">{t}</a>' for i,t in [('sf-about','About'),('sf-skills','Skills'),('sf-projects','Projects'),('sf-exp','Experience'),('sf-contact','Contact')])
stats=''.join(f'<div class="sf-card"><div class="sf-stat">{s["to"]:.{s["decimals"]}f}{s["suffix"]}</div><div class="sf-muted">{e(s["label"])}</div></div>' for s in d['T'])
skills=''.join(f'<div class="sf-card"><h3>{e(g["name"])}</h3><p class="sf-muted">{e(g["blurb"])}</p>'+''.join(f'<span class="sf-tag" title="{e(s["note"])}">{e(s["n"])}</span>' for s in g['skills'])+'</div>' for g in d['S'])
projs=''
for p in sorted(d['P'],key=lambda p:not p['featured']):
    link=ext(p['repo'],'View GitHub source') if p['repo'] else ext(L['repos'],'Browse my repositories')
    projs+=f'<article class="sf-card"><p class="sf-muted">{e(p["sector"])} · {e(p["status"])}</p><h3>{e(p["name"])}</h3><p>{e(p["summary"])}</p><p class="sf-muted" style="margin-top:.5rem">{e(" → ".join(p["arch"]))}</p>'+''.join(f'<span class="sf-tag">{e(s)}</span>' for s in p['stack'])+f'<p style="margin-top:.9rem">{link}</p></article>'
exp=''.join(f'<div class="sf-card"><p class="sf-muted">{e(x["when"])}</p><h3>{e(x["title"])}</h3><p class="sf-muted">{e(x["org"])}</p><p>{e(x["body"])}</p></div>' for x in d['E'])
fallback=f'''<div id="root">
<div class="sf-wrap">
<header class="sf-nav"><div class="sf"><strong style="color:#fff">Varshini M C</strong><nav>{nav}</nav></div></header>
<main class="sf">
<div class="sf-hero"><p class="sf-muted" style="letter-spacing:.14em;text-transform:uppercase">Bengaluru, India · Open to Java roles</p>
<h1>Varshini M C</h1><div class="sf-role">Aspiring Java Developer</div>
<p style="max-width:42rem;margin-top:1rem;font-size:1.1rem">Java full stack developer in training. I build Servlet, JSP, JDBC and MySQL applications, and machine learning projects that ship inside working apps.</p>
<div class="sf-btns">{ext(L['github'],'GitHub','sf-btn p')}{ext(L['linkedin'],'LinkedIn','sf-btn')}{ext(L['repos'],'All repositories','sf-btn')}<a class="sf-btn" href="mailto:{L['email']}">Email me</a></div>
<p id="boot-msg" class="sf-note">Loading the interactive version with the 3D AI host. Everything below already works.</p></div>
<section id="sf-about"><h2>About</h2><p style="max-width:46rem">Final year Information Science student at Vivekananda Institute of Engineering with a 9.24 CGPA, currently interning as a Java Full Stack Developer at Dhee Coding Lab. I like clean data models, readable code, and shipping features end to end.</p><div class="sf-grid">{stats}</div></section>
<section id="sf-skills"><h2>Skills</h2><div class="sf-grid">{skills}</div></section>
<section id="sf-projects"><h2>Projects</h2><p class="sf-muted">Every link opens the real GitHub repository.</p><div class="sf-grid">{projs}</div></section>
<section id="sf-exp"><h2>Experience and education</h2><div class="sf-grid">{exp}</div></section>
<section id="sf-contact"><h2>Contact</h2><p>{L['email']} · {L['phone']}</p><div class="sf-btns">{ext(L['linkedin'],'Connect on LinkedIn','sf-btn p')}{ext(L['github'],'See my GitHub','sf-btn')}</div></section>
<div class="sf-foot">© Varshini M C</div>
</main></div></div>
'''

def js(p): return open(p).read().replace('</script','<\\/script')
tw=open('tw.css').read()
guard="""<script>
setTimeout(function(){var n=document.getElementById('boot-msg');if(n)n.textContent='The interactive 3D version could not start in this browser. The full portfolio below works.';},3500);
</script>"""
import base64
photo='<script>window.HOST_PHOTO="data:image/jpeg;base64,'+base64.b64encode(open('host.jpg','rb').read()).decode()+'";</script>'
out=fonts+style+'<style>'+tw+'</style>'+css+fallback+photo+'<script>'+js('vendor.min.js')+'</script>\n<script>'+js('app.min.js')+'</script>\n'+guard
open('varshini-ai-portfolio.html','w').write(out)
print(len(out))
