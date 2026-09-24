import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  categorize,
  looksLikeSpam,
  parseAddress,
  replySubject,
  snippetOf,
  threadSubject,
  verifyWebhookSignature,
} from "../lib/domains/inbox/rules";

const SECRET = `whsec_${Buffer.from("sweetoh-test-secret-32-bytes!!!!").toString("base64")}`;

function sign(id: string, ts: string, body: string) {
  const key = Buffer.from(SECRET.replace(/^whsec_/, ""), "base64");
  return `v1,${createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64")}`;
}

test("webhook signature: accepts Resend's Svix signature, rejects tampering and replays", () => {
  const body = JSON.stringify({ type: "email.received", data: { email_id: "abc" } });
  const ts = "1790000000";
  const good = { secret: SECRET, id: "msg_1", timestamp: ts, body, nowSeconds: 1790000030 };
  assert.equal(verifyWebhookSignature({ ...good, signature: sign("msg_1", ts, body) }), true);
  // Several signatures in the header (key rotation): any valid one passes.
  assert.equal(verifyWebhookSignature({ ...good, signature: `v1,AAAA ${sign("msg_1", ts, body)}` }), true);
  assert.equal(verifyWebhookSignature({ ...good, body: body.replace("abc", "xyz"), signature: sign("msg_1", ts, body) }), false);
  assert.equal(verifyWebhookSignature({ ...good, signature: sign("msg_2", ts, body) }), false);
  assert.equal(verifyWebhookSignature({ ...good, nowSeconds: 1790000000 + 600, signature: sign("msg_1", ts, body) }), false);
  assert.equal(verifyWebhookSignature({ ...good, signature: null }), false);
});

test("addresses: display names and bare emails", () => {
  assert.deepEqual(parseAddress(`"Maria Cruz" <Maria@Example.com>`), { name: "Maria Cruz", email: "maria@example.com" });
  assert.deepEqual(parseAddress("Tony <tony@x.fm>"), { name: "Tony", email: "tony@x.fm" });
  assert.deepEqual(parseAddress("plain@x.com"), { name: null, email: "plain@x.com" });
});

test("shelves: known customers, services, order questions, strangers", () => {
  const base = { subject: "Hello", text: "", knownCustomer: false, customerHasOrders: false };
  assert.equal(categorize({ ...base, fromEmail: "maria@gmail.com", knownCustomer: true }), "customers");
  assert.equal(
    categorize({ ...base, fromEmail: "maria@gmail.com", knownCustomer: true, customerHasOrders: true, subject: "Where is my order?" }),
    "orders",
  );
  assert.equal(categorize({ ...base, fromEmail: "receipts@stripe.com" }), "services");
  assert.equal(categorize({ ...base, fromEmail: "news@mail.printify.com" }), "services");
  assert.equal(categorize({ ...base, fromEmail: "no-reply@somewhere.io" }), "services");
  assert.equal(categorize({ ...base, fromEmail: "someone@yahoo.com", subject: "Tracking for my package" }), "orders");
  assert.equal(categorize({ ...base, fromEmail: "someone@yahoo.com", subject: "Family reunion shirts?" }), "customers");
});

test("spam: failed DMARC, or failed SPF and DKIM together", () => {
  assert.equal(looksLikeSpam({ spf: "pass", dkim: "pass", dmarc: "pass" }), false);
  assert.equal(looksLikeSpam({ spf: "fail", dkim: "pass", dmarc: "gray" }), false);
  assert.equal(looksLikeSpam({ spf: "fail", dkim: "fail", dmarc: "gray" }), true);
  assert.equal(looksLikeSpam({ dmarc: "fail" }), true);
  assert.equal(looksLikeSpam(null), false);
});

test("threads: subjects match through Re:/Fwd:, replies never stack Re:", () => {
  assert.equal(threadSubject("RE: Fwd: re: Reunion shirts"), "reunion shirts");
  assert.equal(threadSubject("Reunion shirts"), "reunion shirts");
  assert.equal(replySubject("Reunion shirts"), "Re: Reunion shirts");
  assert.equal(replySubject("Re: Reunion shirts"), "Re: Reunion shirts");
});

test("snippets: readable, no quoted history, no tags", () => {
  assert.equal(snippetOf("Hi! Can you do 20 shirts?\n\nOn Tue, Sep 24, 2026 Sweet'Oh wrote:\n> old"), "Hi! Can you do 20 shirts?");
  assert.equal(snippetOf(null, "<style>p{}</style><p>Hello&nbsp;<b>there</b></p>"), "Hello there");
  assert.ok(snippetOf("x".repeat(400)).length <= 160);
});
