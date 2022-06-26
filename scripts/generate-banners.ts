import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';

interface BaseImage {
  svg: (baseX: number, baseY: number, newWidth: number, newHeight: number) => string;
  width: number;
  height: number;
}

interface BannerImage {
  svgPath: string;
  pngPath: string;
}

const horizontalBaseImage: BaseImage = {
  svg: (baseX, baseY, newWidth, newHeight) => `
<svg viewBox="0 0 716 200" x="${baseX}" y="${baseY}" width="${newWidth}" height="${newHeight}">
  <rect width="100%" height="100%" fill="var(--background-color)" />
  <g>
    <circle cx="100" cy="100" r="100" fill="var(--icon-color)" />
    <!--
      Horizontal bar width = circle radius
      Horizontal bar height = circle radius / 4
    -->
    <rect x="50" y="87.5" width="100" height="25" fill="var(--icon-inner-color)" />
    <rect x="87.5" y="50" width="25" height="100" fill="var(--icon-inner-color)" />
  </g>
  <g>
    <!-- Horizontal centering is weird with 2 tspans in 1 text -->
    <text dominant-baseline="middle" text-anchor="middle" fill="var(--text-color)" font-family="Ubuntu" font-size="85px" font-weight="700">
      <tspan x="460" y="50%" dy="-0.6em">Competitive</tspan>
    </text>
    <text dominant-baseline="middle" text-anchor="middle" fill="var(--text-color)" font-family="Ubuntu" font-size="85px" font-weight="700">
      <tspan x="460" y="50%" dy="0.6em">Companion</tspan>
    </text>
  </g>
</svg>
  `,
  width: 716,
  height: 200,
};

const verticalBaseImage: BaseImage = {
  svg: (baseX, baseY, newWidth, newHeight) => `
<svg viewBox="0 0 420 380" x="${baseX}" y="${baseY}" width="${newWidth}" height="${newHeight}">
  <rect width="100%" height="100%" fill="var(--background-color)" />
  <g>
    <circle cx="210" cy="100" r="100" fill="var(--icon-color)" />
    <!--
      Horizontal bar width = circle radius
      Horizontal bar height = circle radius / 4
    -->
    <rect x="160" y="87.5" width="100" height="25" fill="var(--icon-inner-color)" />
    <rect x="197.5" y="50" width="25" height="100" fill="var(--icon-inner-color)" />
  </g>
  <g>
    <!-- Horizontal centering is weird with 2 tspans in 1 text -->
    <text dominant-baseline="middle" text-anchor="middle" fill="var(--text-color)" font-family="Ubuntu" font-size="70px" font-weight="700">
      <tspan x="50%" y="300" dy="-0.6em">Competitive</tspan>
    </text>
    <text dominant-baseline="middle" text-anchor="middle" fill="var(--text-color)" font-family="Ubuntu" font-size="70px" font-weight="700">
      <tspan x="50%" y="300" dy="0.6em">Companion</tspan>
    </text>
  </g>
</svg>
  `,
  width: 420,
  height: 380,
};

async function generateBanner(name: string, width: number, height: number): Promise<BannerImage> {
  const minMargin = Math.min(width, height) / 8;
  const availableWidth = width - minMargin * 2;
  const availableHeight = height - minMargin * 2;

  let bestImage: string = null;
  let bestTotalMargin: number = null;

  for (const baseImage of [horizontalBaseImage, verticalBaseImage]) {
    const baseRatio = Math.min(availableWidth / baseImage.width, availableHeight / baseImage.height);
    const newBaseWidth = baseImage.width * baseRatio;
    const newBaseHeight = baseImage.height * baseRatio;

    const baseX = (width - newBaseWidth) / 2;
    const baseY = (height - newBaseHeight) / 2;

    const totalMargin = baseX * 2 + baseY * 2;
    if (bestTotalMargin === null || totalMargin < bestTotalMargin) {
      bestImage = `
<!-- Generated by 'yarn generate-banners', do not edit manually -->
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <style>
    :root {
      --background-color: #303030;
      --text-color: #ffffff;
      --icon-color: #759b23;
      --icon-inner-color: var(--background-color);
    }
  </style>
  <rect width="${width}" height="${height}" fill="var(--background-color)" />
  ${baseImage.svg(baseX, baseY, newBaseWidth, newBaseHeight)}
</svg>
      `.trim();

      bestTotalMargin = totalMargin;
    }
  }

  const svgPath = path.resolve(__dirname, `../media/banners/${name}.svg`);
  const pngPath = path.resolve(__dirname, `../media/banners/${name}.png`);

  fs.writeFileSync(svgPath, bestImage.trim() + '\n');

  return { svgPath, pngPath };
}

(async () => {
  const requiredBanners: [string, number, number][] = [
    ['github-social-preview', 1280, 640],
    ['chrome-small-promo', 440, 280],
    ['chrome-large-promo', 920, 680],
    ['chrome-marquee-promo', 1400, 560],
  ];

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  for (const [name, width, height] of requiredBanners) {
    console.log(`Generating banner ${name} of size ${width}x${height}`);

    const banner = await generateBanner(name, width, height);

    await page.goto(`file://${banner.svgPath}`);
    await page.setViewport({ width, height });
    await page.screenshot({ path: banner.pngPath });
  }

  await browser.close();
})();
