import { source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound, redirect } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';

// All valid documentation routes are enumerated at build time.
export const dynamicParams = false;

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = source.getPage(slug ?? []);
  if (!page) {
    // Match public/_redirects in development and on other static hosts too.
    if (!slug?.length) redirect('/behavioral/01-production-server-down/');
    notFound();
  }

  const MDX = page.data.body;
  return (
    <DocsPage toc={page.data.toc} full={false}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  const params = source.generateParams().map(({ slug }) => ({ slug }));
  // Optional catch-all routes also need an explicit root entry with output: export.
  if (!params.some(({ slug }) => slug.length === 0)) {
    params.unshift({ slug: [] });
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug ?? []);
  if (!page) return {};
  return {
    title: page.data.title,
    description: page.data.description,
  };
}
