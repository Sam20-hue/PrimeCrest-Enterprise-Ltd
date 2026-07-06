const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
    image.src = src;
  });

export const applyWatermarkToImage = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/')) return file;

  // Always apply watermark so uploaded images visibly carry the Primecrest mark.

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;

    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Prefer a small visible Primecrest watermark logo in public/primecrest-watermark.svg
    // fallback to favicon.png if not present.
    const logo = await loadImage('/primecrest-watermark.svg').catch(() => loadImage('/favicon.png').catch(() => null));
    if (logo) {
      const paddingX = Math.max(16, Math.round(canvas.width * 0.04));
      const paddingY = Math.max(16, Math.round(canvas.height * 0.04));
      const logoWidth = Math.max(48, Math.round(Math.min(canvas.width, canvas.height) * 0.16));
      const logoHeight = Math.round((logo.naturalHeight / logo.naturalWidth) * logoWidth);

      context.globalAlpha = 0.22;
      context.drawImage(
        logo,
        canvas.width - logoWidth - paddingX,
        canvas.height - logoHeight - paddingY,
        logoWidth,
        logoHeight
      );
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, file.type || 'image/png', 0.85);
    });

    if (!blob) return file;

    const extension = blob.type.includes('png') ? 'png' : file.name.split('.').pop() || 'png';
    const fileName = `${file.name.replace(/\.[^.]+$/, '')}-watermarked.${extension}`;
    return new File([blob], fileName, { type: blob.type || file.type, lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
