import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import JSZip from 'jszip';
import { parse } from 'csv-parse/sync';
import path from 'path';
import fs from 'fs/promises';
import { ImageResponse } from 'next/og';

// Font cache
let fontData: ArrayBuffer | null = null;

async function getFontData() {
    if (fontData) return fontData;
    // Use a reliable CDN for the font
    const response = await fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.15/files/inter-latin-700-normal.woff');
    if (!response.ok) throw new Error('Failed to load font');
    fontData = await response.arrayBuffer();
    return fontData;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const csvFile = formData.get('csv') as File | null;
        const templateFile = formData.get('template') as File | null;

        // Design parameters
        const width = parseFloat(formData.get('width') as string) || 800;
        const height = parseFloat(formData.get('height') as string) || 600;
        const backgroundColor = (formData.get('backgroundColor') as string) || '#ffffff';
        const backgroundImage = formData.get('backgroundImage') as string | null;
        const fontSize = parseFloat(formData.get('fontSize') as string);
        const color = formData.get('color') as string;
        const x = parseFloat(formData.get('x') as string);
        const y = parseFloat(formData.get('y') as string);
        const textPattern = (formData.get('textPattern') as string) || '{name}';

        if (!csvFile) {
            return NextResponse.json({ error: 'Missing CSV file' }, { status: 400 });
        }

        const csvText = await csvFile.text();
        let templateBuffer: Buffer;

        if (templateFile && templateFile.size > 0) {
            templateBuffer = Buffer.from(await templateFile.arrayBuffer());
        } else if (backgroundImage && backgroundImage !== 'undefined' && backgroundImage !== 'null' && backgroundImage !== '') {
            const templatePath = path.join(process.cwd(), 'public', 'templates', backgroundImage);
            try {
                templateBuffer = await fs.readFile(templatePath);
            } catch (err) {
                console.error(`Failed to load template ${backgroundImage}:`, err);
                templateBuffer = await sharp({
                    create: {
                        width: Math.round(width),
                        height: Math.round(height),
                        channels: 4,
                        background: backgroundColor
                    }
                }).png().toBuffer();
            }
        } else {
            templateBuffer = await sharp({
                create: {
                    width: Math.round(width),
                    height: Math.round(height),
                    channels: 4,
                    background: backgroundColor
                }
            }).png().toBuffer();
        }

        const records = parse(csvText, {
            skip_empty_lines: true,
            relax_column_count: true,
            trim: true,
        });

        console.log(`Parsed ${records.length} records from CSV`);

        const zip = new JSZip();
        const metadata = await sharp(templateBuffer).metadata();
        const imgWidth = metadata.width || width;
        const imgHeight = metadata.height || height;

        // Load font once
        const font = await getFontData();

        for (const record of records) {
            const name = Array.isArray(record) ? record[0] : Object.values(record)[0];
            if (!name) continue;

            const textToPrint = textPattern.replace('{name}', name as string);
            console.log(`Processing record: ${name}, Text: ${textToPrint}`);

            // Generate text image using ImageResponse (satori)
            // We create a transparent image with the text positioned exactly as in the design
            const textImageResponse = new ImageResponse(
                (
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            position: 'relative',
                            backgroundColor: 'transparent',
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                left: `${x}px`,
                                top: `${y}px`,
                                color: color,
                                fontSize: `${fontSize}px`,
                                transform: 'translate(0, -100%)',
                                whiteSpace: 'nowrap',
                                fontFamily: 'Inter',
                                fontWeight: 700,
                            }}
                        >
                            {textToPrint}
                        </div>
                    </div>
                ),
                {
                    width: imgWidth,
                    height: imgHeight,
                    fonts: [
                        {
                            name: 'Inter',
                            data: font,
                            style: 'normal',
                            weight: 700,
                        },
                    ],
                }
            );

            const textBuffer = await textImageResponse.arrayBuffer();

            const imageBuffer = await sharp(templateBuffer)
                .composite([{ input: Buffer.from(textBuffer) }])
                .png()
                .toBuffer();

            const safeName = (name as string).replace(/[^a-z0-9]/gi, '_');
            zip.file(`invitation_${safeName}.png`, imageBuffer);
        }

        const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

        return new NextResponse(zipContent as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename=cards.zip',
            },
        });

    } catch (error: any) {
        console.error('Error generating cards:', error);
        return NextResponse.json(
            { error: 'Internal Server Error: ' + error.message },
            { status: 500 }
        );
    }
}
