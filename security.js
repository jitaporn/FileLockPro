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

  const clearTemporaryFiles = async () => {
    const names = window.fileLockTempNames || [];
    window.fileLockTempNames = [];
    if (!names.length || !navigator.storage?.getDirectory) return;
    try {
      const root = await navigator.storage.getDirectory();
      await Promise.all(names.map(name => root.removeEntry(name).catch(() => {})));
    } catch (_) {}
  };

  window.addEventListener('pagehide', () => {
    clearSecrets();
    clearPreview();
    clearTemporaryFiles();
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

  const clearAllButton = document.querySelector('.clear-all');
  clearAllButton?.addEventListener('click', async () => {
    const accepted = window.confirm(
      'ล้างรายการไฟล์ รหัสผ่าน ตัวอย่างสื่อ ไฟล์ชั่วคราว และ cache ของ FileLock Pro ใช่หรือไม่?\n\nไฟล์ต้นฉบับและไฟล์ที่บันทึกไว้จะไม่ถูกลบ'
    );
    if (!accepted) return;

    clearAllButton.disabled = true;
    clearSecrets();
    clearPreview();
    await clearTemporaryFiles();

    if (navigator.storage?.getDirectory) {
      try {
        const root = await navigator.storage.getDirectory();
        for await (const [name] of root.entries()) {
          if (name.startsWith('filelock-preview-')) await root.removeEntry(name).catch(() => {});
        }
      } catch (_) {}
    }

    if ('caches' in window) {
      try {
        await Promise.all((await caches.keys())
          .filter(name => name.startsWith('filelock-pro-'))
          .map(name => caches.delete(name)));
      } catch (_) {}
    }

    window.dispatchEvent(new Event('filelock-clear-all'));
    clearAllButton.disabled = false;
  });

  // เก็บกวาดไฟล์ preview ที่อาจค้างจากการปิดแท็บหรือ browser crash ครั้งก่อน
  if (navigator.storage?.getDirectory) {
    navigator.storage.getDirectory().then(async root => {
      for await (const [name] of root.entries()) {
        if (name.startsWith('filelock-preview-')) await root.removeEntry(name).catch(() => {});
      }
    }).catch(() => {});
  }

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
  }
})();
