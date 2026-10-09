from pathlib import Path

p=Path('coach-integration.js')
s=p.read_text()
old="""function decorate(){if(typeof document==='undefined')return 0;ensureStyle();let count=0;for(const [windowId,row] of items){const host=findHost(windowId);if(!host)continue;host.querySelector('[data-comparison-coach=\"1\"]')?.remove();const authority=authorityPresentationForWindow(windowId,row?.runId||null);if(authority)applyAuthorityPresentation(host,authority);const card=createCard(row);if(!card){suppressLegacyCoach(host,false);continue}const oldCoach=host.querySelector('.reviewCoach');if(oldCoach)host.insertBefore(card,oldCoach);else host.appendChild(card);suppressLegacyCoach(host,true);count++}expose();return count}
"""
new="""function decorateAuthorityBindings(){if(typeof document==='undefined')return 0;const snap=W.RuntimeAuthorityBinding?.snapshot?.()||window.__wbRuntimeAuthorityBindingV1||null,runId=snap?.currentFreshRun?.runId||null,bindings=Array.isArray(snap?.windowAuthorityBindings)?snap.windowAuthorityBindings:[];if(!runId)return 0;let count=0;for(const binding of bindings){const windowId=text(binding?.windowId);if(!windowId||String(binding?.runId||'')!==String(runId)||binding?.complete!==true||binding?.anchorExact!==true||binding?.afterExact!==true||binding?.blocked===true)continue;const host=findHost(windowId);if(!host)continue;const authority=authorityPresentationForWindow(windowId,runId);if(authority&&applyAuthorityPresentation(host,authority))count++}return count}
function decorate(){if(typeof document==='undefined')return 0;ensureStyle();const authorityCount=decorateAuthorityBindings();let count=0;for(const [windowId,row] of items){const host=findHost(windowId);if(!host)continue;host.querySelector('[data-comparison-coach=\"1\"]')?.remove();const authority=authorityPresentationForWindow(windowId,row?.runId||null);if(authority)applyAuthorityPresentation(host,authority);const card=createCard(row);if(!card){suppressLegacyCoach(host,false);continue}const oldCoach=host.querySelector('.reviewCoach');if(oldCoach)host.insertBefore(card,oldCoach);else host.appendChild(card);suppressLegacyCoach(host,true);count++}expose();return count||authorityCount}
"""
if old not in s:
    raise SystemExit('decorate target not found')
s=s.replace(old,new,1)
old_export="""authorityPresentationForWindow,applyAuthorityPresentation,suppressLegacyCoach,createCard,decorate,snapshot,clear"""
new_export="""authorityPresentationForWindow,applyAuthorityPresentation,decorateAuthorityBindings,suppressLegacyCoach,createCard,decorate,snapshot,clear"""
if old_export not in s:
    raise SystemExit('export target not found')
s=s.replace(old_export,new_export,1)
p.write_text(s)
