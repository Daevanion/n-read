import { createHash, createHmac } from "node:crypto";

export function sha256Hex(body: string | Buffer = ""): string {
  return createHash("sha256").update(body).digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

export function signingKey(
  secret: string,
  date: string,
  region: string,
  service = "s3",
): Buffer {
  const dateKey = hmac(`AWS4${secret}`, date);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  return hmac(serviceKey, "aws4_request");
}

export function encodeObjectKey(key: string): string {
  return key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function canonicalRequest(input: {
  method: string;
  path: string;
  query?: string;
  headers: Record<string, string>;
  payloadHash: string;
}): { canonical: string; signedHeaders: string } {
  const lower = new Map<string, string>();
  for (const [name, value] of Object.entries(input.headers)) {
    lower.set(name.toLowerCase(), value.trim().replace(/\s+/g, " "));
  }
  const names = [...lower.keys()].sort();
  const canonicalHeaders = names
    .map((name) => `${name}:${lower.get(name)}\n`)
    .join("");
  const signedHeaders = names.join(";");
  const canonical = [
    input.method.toUpperCase(),
    input.path,
    input.query ?? "",
    canonicalHeaders,
    signedHeaders,
    input.payloadHash,
  ].join("\n");
  return { canonical, signedHeaders };
}

export function authorizationHeader(input: {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  amzDate: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  payloadHash: string;
}): string {
  const { canonical, signedHeaders } = canonicalRequest({
    method: input.method,
    path: input.path,
    headers: input.headers,
    payloadHash: input.payloadHash,
  });
  const date = input.amzDate.slice(0, 8);
  const scope = `${date}/${input.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    input.amzDate,
    scope,
    sha256Hex(canonical),
  ].join("\n");
  const signature = createHmac(
    "sha256",
    signingKey(input.secretAccessKey, date, input.region),
  )
    .update(stringToSign)
    .digest("hex");
  return `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}
