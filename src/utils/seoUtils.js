export const siteConfig = {
  siteName: '京都のフォンカー',
  siteUrl: 'https://garage-project-rose.vercel.app',
  defaultTitle: '京都のフォンカー (Phuong Car of Kyoto) - 自動車板金塗装・修理・車検',
  defaultDescription: '京都のフォンカー（Phuong Car of Kyoto）は、京都の自動車板金塗装・修理・車検専門店です。経験豊富なプロの技術で愛車を美しく修復・サポートいたします。',
  defaultKeywords: '京都, フォンカー, Phuong Car, 鈑金, 塗装, 車検, 自動車修理, 板金塗装, 同 sơn',
  businessPhone: '+81 90-8234-3176',
  businessAddress: '〒601-8212 京都府京都市南区久世上久世町411-2',
  socialPreviewImage: '/social-preview.jpg'
};

export function generatePageTitle(pageTitle, includeCompany = true) {
  if (!includeCompany) return pageTitle;
  return pageTitle ? `${pageTitle} | ${siteConfig.siteName}` : siteConfig.defaultTitle;
}

export function generateCanonicalUrl(path = '') {
  return `${siteConfig.siteUrl}${path}`;
}