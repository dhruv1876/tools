document.addEventListener("DOMContentLoaded", function() {
  const checkApp = setInterval(() => {
    const maskEl = document.querySelector("pdf-edit-mask");
    if (maskEl && maskEl.__vue__ && typeof maskEl.__vue__.showLoginWin === "function") {
      clearInterval(checkApp);
      maskEl.__vue__.showLoginWin = function(url) {
        console.log("Bypass login triggered for:", url);
        const a = document.createElement("a");
        a.href = url;
        a.download = "";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
    }
  }, 500);
});

(function(){
  function downloadURL(url) {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', '');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      console.log('Triggered download:', url);
    } catch (e) {
      console.error('Download failed', e);
      window.open(url, '_blank');
    }
  }

  // Observe for direct downlink element appearing
  const mo = new MutationObserver((muts)=>{
    const d = document.querySelector('.download-file-link.downlink[href]');
    if (d && d.href) {
      console.log('Downlink detected:', d.href);
      downloadURL(d.href);
      mo.disconnect();
    }
  });
  mo.observe(document.body, {childList:true, subtree:true});

  // Patch Vue component method if available
  function tryPatchVueMask(){
    try {
      const mask = document.querySelector('pdf-edit-mask');
      if (mask && mask.__vue__ && typeof mask.__vue__.showLoginWin === 'function') {
        if (!mask.__vue__._orig_showLoginWin) mask.__vue__._orig_showLoginWin = mask.__vue__.showLoginWin;
        mask.__vue__.showLoginWin = function(url){
          console.log('Vue showLoginWin overridden. URL:', url);
          downloadURL(url);
        };
        return true;
      }
    } catch(e){ console.error(e); }
    return false;
  }

  // Patch element method (non-Vue) as fallback
  function tryPatchElemMask(){
    try {
      const mask = document.querySelector('pdf-edit-mask');
      if (mask && typeof mask.showLoginWin === 'function') {
        if (!mask._orig_showLoginWin) mask._orig_showLoginWin = mask.showLoginWin;
        mask.showLoginWin = function(url){
          console.log('Element showLoginWin overridden. URL:', url);
          downloadURL(url);
        };
        return true;
      }
    } catch(e){ console.error(e); }
    return false;
  }

  function tryPatchApowerUser(){
    try {
      if (window.apower && apower.user) {
        // Save originals
        if (!apower.user.__orig_getId) apower.user.__orig_getId = apower.user.getId;
        if (!apower.user.__orig_popupLoginWin) apower.user.__orig_popupLoginWin = apower.user.popupLoginWin;

        // Override getId to return truthy if it would have been falsy
        apower.user.getId = function(){
          try {
            const orig = apower.user.__orig_getId && apower.user.__orig_getId();
            if (orig) return orig;
          } catch(e){}
          return 'local-bypass';
        };

        // Override popupLoginWin to try to auto-download if we have url in mask
        apower.user.popupLoginWin = function(){
          console.log('apower.user.popupLoginWin overridden');
          // try download if masked downloadUrl available
          try {
            const mask = document.querySelector('pdf-edit-mask');
            const vue = mask && mask.__vue__;
            const url = (vue && vue.downloadUrl) || (mask && mask.downloadUrl);
            if (url) { downloadURL(url); return; }
            const d = document.querySelector('.download-file-link.downlink[href]');
            if (d && d.href) { downloadURL(d.href); return; }
          } catch(e){ console.error(e); }
          // fallback: do nothing (prevent popup)
        };
        return true;
      }
    } catch(e){ console.error(e); }
    return false;
  }

  // Try to patch repeatedly until success or timeout
  let attempts = 0;
  const iv = setInterval(()=>{
    attempts++;
    const patched = tryPatchVueMask() || tryPatchElemMask() || tryPatchApowerUser();
    if (patched) {
      console.log('Auto-download override applied.');
      clearInterval(iv);
    } else if (attempts > 40) {
      clearInterval(iv);
      console.warn('Could not patch components; will still attempt to auto-download via mutation observer.');
    }
  }, 500);
})();
