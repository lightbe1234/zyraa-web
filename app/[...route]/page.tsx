import StorefrontApp from '../storefront-app';
export default async function CatchAll({
  params,
}: {
  params: Promise<{ route: string[] }>;
}) {
  const { route } = await params;
  return <StorefrontApp path={`/${route.join('/')}`} />;
}
