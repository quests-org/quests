/* eslint-disable no-console */
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outputSizes = [192, 512];
const faviconSizes = [16, 32, 48];

async function convertSvgToPng(
  inputPath: string,
  outputDir: string,
  backgroundColor = "#ffffff",
  iconColor = "#ffffff",
) {
  try {
    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });

    const svgBuffer = await readFile(inputPath);
    const baseName = path.basename(inputPath, path.extname(inputPath));

    // Convert SVG content to string and handle currentColor
    let svgContent = svgBuffer.toString();

    // Replace currentColor with the specified icon color (default white)
    svgContent = svgContent.replaceAll("currentColor", iconColor);

    // If the SVG doesn't have a fill or stroke attribute, add white as default
    if (
      !svgContent.includes("fill=") &&
      !svgContent.includes("stroke=") &&
      !svgContent.includes("style=")
    ) {
      svgContent = svgContent.replace("<svg", `<svg fill="${iconColor}"`);
    }

    // Helper function to create rounded corners
    const createRoundedCornerMask = (size: number, radius: number) => {
      const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/>
        </svg>
      `;
      return Buffer.from(svg);
    };

    await Promise.all([
      // Generate PWA icons
      ...outputSizes.map(async (size) => {
        const cornerRadius = Math.round(size * 0.1); // 10% corner radius

        // Generate regular icon
        const outputPath = path.join(outputDir, `${baseName}-${size}.png`);
        const iconBuffer = await sharp(Buffer.from(svgContent))
          .resize(size, size)
          .flatten({ background: backgroundColor })
          .png()
          .toBuffer();

        // Apply rounded corners
        await sharp(iconBuffer)
          .composite([
            {
              blend: "dest-in",
              input: createRoundedCornerMask(size, cornerRadius),
            },
          ])
          .png()
          .toFile(outputPath);
        console.log(
          `✅ Created ${outputPath} with background ${backgroundColor} and icon color ${iconColor}`,
        );

        // Generate maskable icon (icon scaled to 60% safe zone with opaque background for better circular masking)
        const maskableOutputPath = path.join(
          outputDir,
          `${baseName}-${size}-maskable.png`,
        );
        const safeZoneSize = Math.round(size * 0.6); // 60% safe zone for better circular masking of square icons
        const padding = Math.round((size - safeZoneSize) / 2);

        // Create a solid background and composite the SVG on top
        const maskableBuffer = await sharp({
          create: {
            background: backgroundColor,
            channels: 4,
            height: size,
            width: size,
          },
        })
          .composite([
            {
              input: await sharp(Buffer.from(svgContent))
                .resize(safeZoneSize, safeZoneSize)
                .png()
                .toBuffer(),
              left: padding,
              top: padding,
            },
          ])
          .png()
          .toBuffer();

        // Apply rounded corners to maskable version
        await sharp(maskableBuffer)
          .composite([
            {
              blend: "dest-in",
              input: createRoundedCornerMask(size, cornerRadius),
            },
          ])
          .png()
          .toFile(maskableOutputPath);
        console.log(
          `✅ Created maskable ${maskableOutputPath} with ${safeZoneSize}x${safeZoneSize} safe zone (60% for better circular masking)`,
        );
      }),

      // Generate favicon PNG files
      ...faviconSizes.map(async (size) => {
        const cornerRadius = Math.round(size * 0.15); // 15% corner radius for smaller favicons
        const faviconPath = path.join(outputDir, `favicon-${size}.png`);

        const faviconBuffer = await sharp(Buffer.from(svgContent))
          .resize(size, size)
          .flatten({ background: backgroundColor })
          .png()
          .toBuffer();

        // Apply rounded corners
        await sharp(faviconBuffer)
          .composite([
            {
              blend: "dest-in",
              input: createRoundedCornerMask(size, cornerRadius),
            },
          ])
          .png()
          .toFile(faviconPath);
        console.log(`✅ Created favicon ${faviconPath} (${size}x${size})`);
      }),
    ]);

    generateManifestIconsSection(baseName);
  } catch (error) {
    console.error("❌ Error during conversion:", error);
    // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
    process.exit(1);
  }
}

function generateManifestIconsSection(baseName: string) {
  const icons = [
    // Regular PWA icons
    ...outputSizes.map((size) => ({
      sizes: `${size}x${size}`,
      src: `${baseName}-${size}.png`,
      type: "image/png",
    })),
    // Maskable PWA icons
    ...outputSizes.map((size) => ({
      purpose: "maskable",
      sizes: `${size}x${size}`,
      src: `${baseName}-${size}-maskable.png`,
      type: "image/png",
    })),
    // Favicon icons
    ...faviconSizes.map((size) => ({
      sizes: `${size}x${size}`,
      src: `favicon-${size}.png`,
      type: "image/png",
    })),
  ];

  console.log("\n📋 Add this to your web app manifest.json:");
  console.log("```json");
  console.log(JSON.stringify({ icons }, null, 2));
  console.log("```");
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error(
    "Usage: tsx pwa-icons.ts <input-icon-path> <output-directory> [background-color] [icon-color]",
  );
  console.error("Example: tsx pwa-icons.ts icon.svg ./icons");
  console.error(
    "Example: tsx pwa-icons.ts icon.svg ./icons '#000000' '#ffffff'",
  );
  console.error("Example: tsx pwa-icons.ts icon.svg ./icons 'blue' 'white'");
  console.error("");
  console.error("This will generate both regular and maskable versions:");
  console.error("- Regular: icon-192.png, icon-512.png");
  console.error("- Maskable: icon-192-maskable.png, icon-512-maskable.png");
  // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
  process.exit(1);
}

const [inputPath, outputDir, backgroundColor, iconColor] = args as [
  string,
  string,
  string?,
  string?,
];
const resolvedInputPath = path.resolve(inputPath);
const resolvedOutputDir = path.resolve(outputDir);

await convertSvgToPng(
  resolvedInputPath,
  resolvedOutputDir,
  backgroundColor,
  iconColor,
);
/* eslint-enable no-console */
