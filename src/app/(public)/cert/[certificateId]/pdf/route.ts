import { NextResponse } from "next/server";
import { getPublicCertificate } from "@/server/certificates/queries";
import { getVerificationUrl } from "@/server/certificates/utils";

export const runtime = "nodejs";

type PdfObject = {
  id: number;
  body: string;
};

function pdfEscape(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");
}

function buildPdf(lines: string[]) {
  const content = [
    "BT",
    "/F1 24 Tf",
    "72 760 Td",
    `(nowa school Verified Skills Certificate) Tj`,
    "/F1 12 Tf",
    ...lines.flatMap((line) => [
      "0 -24 Td",
      `(${pdfEscape(line)}) Tj`,
    ]),
    "ET",
  ].join("\n");

  const objects: PdfObject[] = [
    {
      id: 1,
      body: "<< /Type /Catalog /Pages 2 0 R >>",
    },
    {
      id: 2,
      body: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    },
    {
      id: 3,
      body:
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    },
    {
      id: 4,
      body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    },
    {
      id: 5,
      body: `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    },
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets[object.id] = Buffer.byteLength(pdf);
    pdf += `${object.id} 0 obj\n${object.body}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ certificateId: string }> },
) {
  const { certificateId } = await params;
  const certificate = await getPublicCertificate(certificateId);

  if (!certificate) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  const verificationUrl = getVerificationUrl(certificate.certificateId);
  const pdf = buildPdf([
    `Credential ID: ${certificate.certificateId}`,
    `Status: ${certificate.status}`,
    `Type: ${certificate.typeLabel}`,
    `Student: ${certificate.student.name}`,
    `Course: ${certificate.course.title}`,
    `Author: ${certificate.author.name}`,
    `Score: ${certificate.score}`,
    `Level: ${certificate.level}`,
    `Issued: ${certificate.issuedAt.toISOString().slice(0, 10)}`,
    `Verify: ${verificationUrl}`,
    "Public verification page is the source of truth.",
  ]);

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${certificate.certificateId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
