/** Shared UK company identity for docs.autlantic.com footers and API metadata. */

export const COMPANY_LEGAL_NAME = "Autlantic Limited";
export const COMPANY_ABOUT_URL = "https://autlantic.com/about";
export const COMPANY_LEGAL_HUB_URL = "https://autlantic.com/legal";
export const COMPANY_TERMS_URL = "https://autlantic.com/terms";
export const COMPANY_PRIVACY_URL = "https://autlantic.com/privacy";
export const COMPANY_REFUNDS_URL = "https://autlantic.com/refunds";
export const PORTAL_TERMS_URL = "https://portal.autlantic.com/terms";
export const SUPPORT_EMAIL = "support@autlantic.com";

export const DOCS_FOOTER_COPYRIGHT = `Copyright © ${COMPANY_LEGAL_NAME}`;

export const DOCS_FOOTER_MESSAGE = [
  `<a href="${COMPANY_ABOUT_URL}">About</a>`,
  `<a href="${COMPANY_LEGAL_HUB_URL}">Legal</a>`,
  `<a href="${COMPANY_TERMS_URL}">Terms</a>`,
  `<a href="${COMPANY_PRIVACY_URL}">Privacy</a>`,
  `<a href="${COMPANY_REFUNDS_URL}">Refunds</a>`,
  `<a href="${PORTAL_TERMS_URL}">Billing Terms</a>`,
  `<a href="https://portal.autlantic.com">Merchant portal</a>`,
].join(" · ");
