(()=>{
  const PATCH='4.4.1-bootstrap-20260914-19';
  if(window.__wb441Loading||window.__wb441Loaded)return;
  window.__wb441Loading=true;
  const s=document.createElement('script');
  s.src='./fix-v4.4.1.js?v=4.4.1-20260914-19';
  s.dataset.wbLatest='441';
  s.onload=()=>{window.__wb441Loaded=true;try{log('patch-v441-bootstrap-loaded',{patch:PATCH})}catch{}};
  s.onerror=()=>{window.__wb441Loading=false;try{log('patch-v441-bootstrap-error',{patch:PATCH})}catch{}};
  document.head.appendChild(s);
  try{log('patch-v441-bootstrap',{patch:PATCH})}catch{}
})();