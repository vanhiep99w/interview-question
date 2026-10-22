import { expect, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const route = '/security/01-encoding-vs-encryption/';
const lesson = 'content/docs/security/01-encoding-vs-encryption.mdx';
const execute = promisify(execFile);

// Compile and execute the code published in the lesson, not a second implementation.
// Requires a JDK 17+ with javac and java on PATH.
test('published Java demos compile for Java 17 and reject invalid GCM data', async () => {
  const source = await readFile(lesson, 'utf8');
  const directory = await mkdtemp(path.join(os.tmpdir(), 'encoding-encryption-doc-'));
  try {
    const demos = [
      { name: 'EncodingDemo', output: ['Y3VzdG9tZXItMTIz', 'customer-123', 'true'] },
      {
        name: 'EncryptionDemo',
        output: [
          'Round-trip: demo@example.com',
          'Changed ciphertext: rejected',
          'Changed AAD: rejected',
          'Wrong key: rejected',
        ],
      },
    ];
    for (const demo of demos) {
      const code = source.match(new RegExp(
        '```java title="' + demo.name + '\\.java"\\n([\\s\\S]*?)\\n```',
      ))?.[1];
      expect(code, `${demo.name} source fence`).toBeTruthy();
      const filename = path.join(directory, `${demo.name}.java`);
      await writeFile(filename, code!);
      await execute('javac', ['--release', '17', '-encoding', 'UTF-8', '-d', directory, filename]);
      const { stdout, stderr } = await execute('java', ['-cp', directory, demo.name]);
      expect(stderr).toBe('');
      expect(stdout.trim().split(/\r?\n/)).toEqual(demo.output);
    }

    const edgeCases = `
import java.util.Arrays;
import java.util.Base64;
import javax.crypto.SecretKey;

public class GcmEdgeCases {
    public static void main(String[] args) throws Exception {
        SecretKey key = EncryptionDemo.newKey();
        byte[] aad = new byte[0];
        byte[] plaintext = new byte[0];
        EncryptionDemo.Payload payload = EncryptionDemo.encrypt(plaintext, aad, key);
        if (!Arrays.equals(plaintext, EncryptionDemo.decrypt(payload, aad, key))) {
            throw new AssertionError("Empty plaintext round-trip failed");
        }
        byte[] nonce = Base64.getUrlDecoder().decode(payload.nonce());
        nonce[0] ^= 1;
        EncryptionDemo.expectRejected("Changed nonce", new EncryptionDemo.Payload(
            Base64.getUrlEncoder().withoutPadding().encodeToString(nonce),
            payload.ciphertextAndTag()), aad, key);

        byte[] tag = Base64.getUrlDecoder().decode(payload.ciphertextAndTag());
        tag[tag.length - 1] ^= 1;
        EncryptionDemo.expectRejected("Changed tag", new EncryptionDemo.Payload(
            payload.nonce(), Base64.getUrlEncoder().withoutPadding().encodeToString(tag)),
            aad, key);
        for (EncryptionDemo.Payload invalid : new EncryptionDemo.Payload[] {
            new EncryptionDemo.Payload("", payload.ciphertextAndTag()),
            new EncryptionDemo.Payload(payload.nonce(), ""),
            new EncryptionDemo.Payload("!", payload.ciphertextAndTag())
        }) {
            try {
                EncryptionDemo.decrypt(invalid, aad, key);
                throw new AssertionError("Invalid format was accepted");
            } catch (IllegalArgumentException expected) {
                // A format error is distinct from an authentication-tag failure.
            }
        }
        System.out.println("Format checks: passed");
    }
}
`;
    const edgeFile = path.join(directory, 'GcmEdgeCases.java');
    await writeFile(edgeFile, edgeCases);
    await execute('javac', ['--release', '17', '-cp', directory, '-d', directory, edgeFile]);
    const { stdout } = await execute('java', ['-cp', directory, 'GcmEdgeCases']);
    expect(stdout.trim().split(/\r?\n/)).toEqual([
      'Changed nonce: rejected', 'Changed tag: rejected', 'Format checks: passed',
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('encoding lesson replaces Q&A with a complete explainer, TOC and copyable demos', async ({
  page, context, request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(route);
  await expect(page.locator('#nd-page h1')).toHaveCount(1);
  await expect(page.locator('#nd-page h1')).toHaveText(
    'Encoding, Encryption và Hashing: hiểu đúng để bảo vệ dữ liệu',
  );
  await expect(page.getByRole('heading', {
    name: /^(Câu hỏi|Câu trả lời mẫu|Dành cho level|Trả lời|Câu hỏi follow-up)(?:$| Copy Anchor Link)/,
  })).toHaveCount(0);
  await expect(page.locator('#nd-page')).not.toContainText('Interviewer expect');
  await expect(page.locator('#nd-page')).not.toContainText('Trong production tôi từng');

  const navigation = await page.evaluate(() => {
    const toc = document.getElementById('mục-lục')?.nextElementSibling;
    return {
      links: [...(toc?.querySelectorAll('a') ?? [])]
        .map((link) => decodeURIComponent(link.hash.slice(1))),
      headings: [...document.querySelectorAll('#nd-page h2[id], #nd-page h3[id]')]
        .map((heading) => heading.id).filter((id) => id !== 'mục-lục'),
      broken: [...document.querySelectorAll<HTMLAnchorElement>('#nd-page a[href^="#"]')]
        .map((link) => decodeURIComponent(link.hash.slice(1)))
        .filter((id) => id && !document.getElementById(id)),
    };
  });
  expect(navigation.links.length).toBeGreaterThan(30);
  expect(navigation.links).toEqual(navigation.headings);
  expect(navigation.broken).toEqual([]);

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const demo = page.locator('figure').filter({
    has: page.locator('pre', { hasText: 'public class EncryptionDemo' }),
  });
  await demo.getByRole('button', { name: 'Copy Text', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('cipher.updateAAD(aad);');
  expect(await page.evaluate(() => navigator.clipboard.readText()))
    .toContain('expectRejected("Wrong key", payload, aad, newKey());');

  for (const href of [
    '/security/02-ssl-tls/',
    '/database/04-fuzzy-search-encrypted-column/',
  ]) {
    expect((await request.get(href)).ok(), href).toBeTruthy();
  }
  expect(errors).toEqual([]);
});

test('encoding lesson has static light and dark diagrams without remote assets', async ({ page }) => {
  await page.goto(route);
  const diagrams = page.locator('.d2-diagram');
  await expect(diagrams).toHaveCount(2);
  await expect(page.locator('.d2-interactive')).toHaveCount(0);
  for (const diagram of await diagrams.all()) {
    await expect(diagram.locator('.d2-diagram-light > svg')).toBeVisible();
    await expect(diagram.locator('.d2-diagram-dark > svg')).toBeHidden();
    await expect(diagram.locator('image')).toHaveCount(0);
  }
  await page.evaluate(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  });
  for (const diagram of await diagrams.all()) {
    await expect(diagram.locator('.d2-diagram-dark > svg')).toBeVisible();
    await expect(diagram.locator('.d2-diagram-light > svg')).toBeHidden();
  }
});

test('encoding lesson remains readable on mobile without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto(route);
    await expect(page.getByRole('heading', { name: /^Thực hành AES-GCM bằng Java/, level: 2 }))
      .toBeVisible();
    const diagrams = page.locator('.d2-diagram-light > svg');
    await expect(diagrams).toHaveCount(2);
    for (const diagram of await diagrams.all()) await expect(diagram).toBeVisible();
    await expect(diagrams.nth(0)).toContainText('AES-GCM encrypt');
    await expect(diagrams.nth(1)).toContainText('Library verify');
    await expect(page.locator('pre').filter({ hasText: 'public class EncryptionDemo' }))
      .toContainText('cipher.updateAAD(aad);');
    await expect(page.locator('#nd-page')).toContainText('Nonce không phải một password thứ hai');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      .toBeTruthy();
  } finally {
    await context.close();
  }
});
