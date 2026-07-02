/* Security lifecycle: ไม่เก็บรหัสผ่าน ไฟล์ หรือ file handle แบบถาวร */
(() => {
  'use strict';

  const clearSecrets = () => {
    document.querySelectorAll('input[type="password"], input.pass, input.confirm').forEach(input => {
      input.value = '';
      input.type = 'password';
    });
    document.querySelectorAll('.eye').forEach(button => { button.textContent = '👁'; });
  };

  const clearPreview = () => {
    document.querySelectorAll('.preview video, .preview audio, .preview img').forEach(media => {
      const source = media.currentSrc || media.src;
      try { media.pause?.(); } catch (_) {}
      media.removeAttribute('src');
      media.load?.();
      if (source?.startsWith('blob:')) URL.revokeObjectURL(source);
    });
    const preview = document.querySelector('.preview');
    if (preview) preview.replaceChildren();
  };

  window.addEventListener('pagehide', () => {
    clearSecrets();
    clearPreview();
  }, { capture: true });

  window.addEventListener('beforeunload', clearSecrets, { capture: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') clearSecrets();
  });

  // ป้องกัน browser/password manager จำค่ารหัสผ่านของแอปนี้
  const securePasswordFields = () => {
    document.querySelectorAll('input.pass, input.confirm').forEach(input => {
      input.autocomplete = 'new-password';
      input.autocapitalize = 'none';
      input.spellcheck = false;
    });
  };
  securePasswordFields();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
  }
})();
