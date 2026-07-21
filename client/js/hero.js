(function() {
  function init() {
    var container = document.getElementById('hero');
    if (!container) return;
    container.innerHTML = '<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
      '<linearGradient id="hg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00f5d4" stop-opacity="0.7"/><stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.7"/></linearGradient>' +
      '<linearGradient id="hg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.6"/><stop offset="100%" stop-color="#ec4899" stop-opacity="0.6"/></linearGradient>' +
      '<filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '</defs>' +
      '<rect x="40" y="70" width="90" height="130" rx="12" fill="none" stroke="url(#hg2)" stroke-width="2" filter="url(#glow)">' +
      '<animate attributeName="y" values="70;60;70" dur="3s" repeatCount="indefinite"/></rect>' +
      '<rect x="55" y="85" width="60" height="90" rx="4" fill="url(#hg2)" opacity="0.15"/>' +
      '<rect x="270" y="50" width="110" height="80" rx="8" fill="none" stroke="url(#hg1)" stroke-width="2" filter="url(#glow)">' +
      '<animate attributeName="y" values="50;58;50" dur="3.5s" repeatCount="indefinite"/></rect>' +
      '<rect x="285" y="62" width="80" height="56" rx="4" fill="url(#hg1)" opacity="0.15"/>' +
      '<rect x="300" y="130" width="50" height="6" rx="3" fill="url(#hg1)" opacity="0.3"/>' +
      '<line x1="130" y1="120" x2="270" y2="95" stroke="url(#hg1)" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.4">' +
      '<animate attributeName="stroke-dashoffset" values="0;20" dur="2s" repeatCount="indefinite"/></line>' +
      '<circle r="4" fill="#00f5d4" filter="url(#glow)"><animateMotion dur="2.5s" repeatCount="indefinite" path="M130,120 Q200,80 270,95"/></circle>' +
      '<circle r="3" fill="#8b5cf6" filter="url(#glow)"><animateMotion dur="3s" repeatCount="indefinite" path="M130,120 Q200,140 270,95"/></circle>' +
      '<circle r="3" fill="#ec4899" filter="url(#glow)"><animateMotion dur="2s" repeatCount="indefinite" path="M130,120 Q200,100 270,95"/></circle>' +
      '</svg>';
  }

  window.addEventListener('DOMContentLoaded', init);
})();
