export async function optimizeScreenshot(
  inputPath: string,
  outputPath: string,
  width = 320,
  height = 200
): Promise<void> {
  try {
    // Dynamic import to make sharp optional
    const sharpModule = await import('sharp');
    const sharp = sharpModule.default;

    await sharp(inputPath)
      .resize(width, height, {
        fit: 'cover',
        position: 'top',
      })
      .webp({ quality: 80 })
      .toFile(outputPath);
  } catch {
    // If sharp isn't available, just copy the file
    const fs = await import('node:fs');
    fs.copyFileSync(inputPath, outputPath.replace('.webp', '.png'));
    console.warn('  Warning: sharp not available, using raw screenshot');
  }
}
