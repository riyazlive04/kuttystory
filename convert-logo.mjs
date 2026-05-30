import { pdf } from 'pdf-to-img';
import { writeFile } from 'fs/promises';
import { resolve } from 'path';

const pdfPath = resolve('..', 'Kutty Story Logo.pdf');
const outDir = resolve('apps', 'web', 'public', 'images');

async function convert() {
  const doc = await pdf(pdfPath, { scale: 3 });
  let pageNum = 0;
  for await (const image of doc) {
    pageNum++;
    const outPath = resolve(outDir, `logo.png`);
    await writeFile(outPath, image);
    console.log(`Page ${pageNum} saved to ${outPath}`);
  }
}

convert().catch(console.error);
