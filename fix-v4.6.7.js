(()=>{
  const PATCH='4.6.7-20260915-02';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};

  function enhance(){
    const panel=$q('#publicInfoPanel466');
    const btn=$q('#piAdd466');
    const input=$q('#piText466');
    if(!panel||!btn||!input)return false;
    if(btn.dataset.wb467==='1')return true;
    btn.dataset.wb467='1';

    const firstHelp=panel.querySelector('p.help');
    if(firstHelp&&!$q('#piGuide467')){
      const guide=document.createElement('div');
      guide.id='piGuide467';
      guide.style.cssText='margin:10px 0 14px;padding:10px 12px;border:1px solid #334155;border-radius:8px;background:rgba(30,41,59,.35);font-size:13px;line-height:1.6';
      guide.innerHTML='<b>使い方</b><br>① 動画を「その情報が分かった場面」に合わせる<br>② ターン・誰の情報・種類・確度を選ぶ<br>③ 「分かったこと」に内容を書く<br>④ 「この情報を記録」を押す';
      firstHelp.insertAdjacentElement('afterend',guide);
    }

    input.placeholder='例：アージュドールでリリムを除去し、バットが相手手札に加わった';
    input.style.minHeight='44px';
    btn.textContent='この情報を記録';
    const fill=$q('#piFill466');if(fill)fill.textContent='動画位置からターン入力';

    let st=$q('#piActionStatus467');
    if(!st){
      st=document.createElement('p');st.id='piActionStatus467';st.className='help';st.style.marginTop='8px';
      btn.closest('.buttons')?.insertAdjacentElement('afterend',st);
    }

    const original=btn.onclick;
    btn.onclick=e=>{
      const text=input.value.trim();
      if(!text){
        st.textContent='「分かったこと」を入力してから記録してください。';
        st.style.color='#fca5a5';
        input.focus();
        safeLog('public-info-empty-blocked-v467');
        return;
      }
      const turn=$q('#piTurn466')?.value||'?';
      const side=$q('#piSide466')?.value||'';
      const certainty=$q('#piStatus466')?.selectedOptions?.[0]?.textContent||'';
      const vid=typeof video!=='undefined'?video:$q('#video');
      const t=Number.isFinite(vid?.currentTime)?vid.currentTime.toFixed(1):'?';
      try{original?.call(btn,e)}catch(err){st.textContent='記録に失敗しました：'+(err?.message||String(err));st.style.color='#fca5a5';return}
      setTimeout(()=>{
        st.textContent=`記録しました：${turn}T・${side}・${certainty}（動画 ${t}秒）`;
        st.style.color='#86efac';
      },0);
    };

    const fillOriginal=fill?.onclick;
    if(fill){
      fill.onclick=e=>{
        try{fillOriginal?.call(fill,e)}catch{}
        const turn=$q('#piTurn466')?.value||'?';
        const side=$q('#piSide466')?.value||'';
        st.textContent=`動画位置から ${turn}T・${side} を入力しました。次に「分かったこと」を書いて記録してください。`;
        st.style.color='#cbd5e1';
      };
    }

    const header=$q('header h1'),sub=$q('header p');
    if(header)header.textContent='シャドバWB リプレイ診断 v4.6.7';
    if(sub)sub.textContent='Build 2026.09.15-02 / 公開情報トラッカー UI改善';
    safeLog('patch-v467-active',{feature:'public-info-tracker-ux-feedback'});
    return true;
  }

  let tries=0;const tm=setInterval(()=>{tries++;if(enhance()||tries>160)clearInterval(tm)},120);
})();