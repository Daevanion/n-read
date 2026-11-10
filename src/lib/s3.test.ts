import assert from "node:assert/strict";
import { test } from "node:test";
import { authorizationHeader, sha256Hex } from "@/lib/s3";

test("matches the AWS signature version 4 GET example", () => {
  const payloadHash = sha256Hex("");
  assert.equal(
    payloadHash,
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
  const authorization = authorizationHeader({
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    region: "us-east-1",
    amzDate: "20130524T000000Z",
    method: "GET",
    path: "/test.txt",
    headers: {
      host: "examplebucket.s3.amazonaws.com",
      range: "bytes=0-9",
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": "20130524T000000Z",
    },
    payloadHash,
  });
  assert.equal(
    authorization,
    "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
  );
});
