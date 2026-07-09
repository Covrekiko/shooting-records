const PDF_MIME_TYPE = 'application/pdf';

export function getLoadTestPdfFileName(test) {
  const safeName = String(test?.name || 'load-test')
    .trim()
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'load-test';
  return `load-test-${safeName}.pdf`;
}

export function createLoadTestPdfBlob(doc) {
  if (!doc || typeof doc.output !== 'function') {
    throw new Error('PDF document was not generated.');
  }

  const blob = doc.output('blob');
  if (!(blob instanceof Blob)) {
    throw new Error('PDF generation did not produce a file.');
  }

  if (blob.size <= 0) {
    throw new Error('PDF file is empty.');
  }

  return blob;
}

export function createLoadTestPdfPreview(doc) {
  const blob = createLoadTestPdfBlob(doc);
  const url = URL.createObjectURL(blob);
  return { blob, url };
}

export function isShareCancellationError(error) {
  const name = String(error?.name || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();

  return name === 'aborterror'
    || code === 'aborterror'
    || message.includes('abort')
    || message.includes('cancelled')
    || message.includes('canceled')
    || message.includes('user cancel');
}

export async function saveLoadTestPdf(doc, fileName) {
  const blob = createLoadTestPdfBlob(doc);
  const safeFileName = fileName || 'load-test.pdf';

  if (typeof File !== 'undefined' && typeof navigator !== 'undefined' && navigator.share) {
    const file = new File([blob], safeFileName, { type: PDF_MIME_TYPE });
    if (!navigator.canShare || navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: safeFileName,
          text: 'Load development PDF',
        });
        return 'shared';
      } catch (error) {
        if (isShareCancellationError(error)) return 'share_cancelled';
        throw error;
      }
    }
  }

  if (typeof document === 'undefined' || !document.createElement || !document.body) {
    throw new Error('PDF saving is not supported in this environment.');
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeFileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  return 'save_initiated';
}

export function revokeLoadTestPdfPreview(preview) {
  if (preview?.url) URL.revokeObjectURL(preview.url);
}