import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_EDGE = 600;
const ALLOWED_IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/gif', 'gif'],
]);

async function resizeImageIfNeeded(file: File, buffer: Buffer): Promise<Buffer> {
  if (file.type === 'image/gif') {
    return buffer;
  }

  const image = sharp(buffer, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (Math.max(width, height) <= MAX_IMAGE_EDGE) {
    return buffer;
  }

  return image
    .resize({
      width: MAX_IMAGE_EDGE,
      height: MAX_IMAGE_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toBuffer();
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ message: '画像ファイルが必要です' }, { status: 400 });
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { message: 'JPEG、PNG、GIFのみアップロードできます' },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { message: '画像サイズは 5MB 以下にしてください' },
      { status: 400 }
    );
  }

  const extension = ALLOWED_IMAGE_TYPES.get(file.type);
  if (!extension) {
    return NextResponse.json({ message: '不正な画像形式です' }, { status: 400 });
  }

  const uploadDirectory = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadDirectory, { recursive: true });

  const fileName = `${randomUUID()}.${extension}`;
  const filePath = path.join(uploadDirectory, fileName);
  const bytes = await file.arrayBuffer();
  const originalBuffer = Buffer.from(bytes);
  const outputBuffer = await resizeImageIfNeeded(file, originalBuffer);

  await writeFile(filePath, outputBuffer);

  return NextResponse.json({ url: `/uploads/${fileName}` }, { status: 201 });
}