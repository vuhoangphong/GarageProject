export const siteConfig = {
  siteName: '合同会社 大繁',
  siteUrl: 'https://garage-project-rose.vercel.app',
  defaultTitle: '合同会社 大繁 - 自動車修理・車検・塗装サービス',
  defaultDescription: '合同会社 大繁は車検、鈑金、塗装などの自動車修理サービスを提供しています。豊富な経験と確かな技術でお客様の大切なお車をサポートします。',
  defaultKeywords: '車検, 鈑金, 塗装, 自動車修理, メンテナンス, 合同会社大繁',
  businessPhone: '012-345-6789',
  businessAddress: 'Kamitoba Nishiuracho, Kyoto, Japan',
  socialPreviewImage: '/social-preview.jpg'
};

export function generatePageTitle(pageTitle, includeCompany = true) {
  if (!includeCompany) return pageTitle;
  return pageTitle ? `${pageTitle} | ${siteConfig.siteName}` : siteConfig.defaultTitle;
}

export function generateCanonicalUrl(path = '') {
  return `${siteConfig.siteUrl}${path}`;
}