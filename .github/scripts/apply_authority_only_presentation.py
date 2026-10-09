from pathlib import Path

p=Path('position-state-runtime.js')
s=p.read_text()
old="const triCount=v=>v==='yes'?1:v==='no'?0:null;"
new="const triCount=v=>v==='yes'?1:v==='no'?0:null;\nconst triAvailable=v=>v==='yes'?true:v==='no'?false:null;"
if old not in s:
    raise SystemExit('triCount target not found')
s=s.replace(old,new,1)
old="ep:triCount(obs.resources?.ep),sep:triCount(obs.resources?.sep),hand:expandRecognizedHand(obs.handRecognized),field:selfField,fieldLimit:5,evolveWindowOpen:null,superEvolveWindowOpen:null"
new="ep:triCount(obs.resources?.ep),sep:triCount(obs.resources?.sep),hand:expandRecognizedHand(obs.handRecognized),field:selfField,fieldLimit:5,evolveWindowOpen:triAvailable(obs.resources?.ep),superEvolveWindowOpen:triAvailable(obs.resources?.sep)"
if old not in s:
    raise SystemExit('evolution availability target not found')
s=s.replace(old,new,1)
p.write_text(s)
