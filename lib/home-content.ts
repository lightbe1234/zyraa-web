export type HomeContent = Record<string, string>;

export type HomeContentField = {
  key: string;
  label: string;
  group: string;
  kind?: 'text' | 'textarea' | 'link' | 'collection';
};

export const defaultHomeContent: HomeContent = {
  promoText: 'TREND-LED STYLE. QUALITY FABRICS.',
  announcementOne: 'Free shipping across Pakistan over Rs. 4,999',
  announcementTwo: '7-day size exchange on unworn pieces',
  announcementThree: 'Cash on delivery available nationwide',
  headerMenu: 'Menu', headerShop: 'Shop', headerNewArrivals: 'New arrivals', headerSearch: 'Search', headerAccount: 'Account', headerBag: 'Bag',
  heroCaption: 'Graphic tees. Everyday essentials.',
  assuranceOneTitle: 'Cash on delivery', assuranceOneCopy: 'Pay when it arrives',
  assuranceTwoTitle: 'Allowed to open', assuranceTwoCopy: 'Check your parcel',
  assuranceThreeTitle: 'Track your order', assuranceThreeCopy: 'Check order status', assuranceThreeLink: '/track-order',
  railOneLabel: 'Shop ZYRA', railOneTitle: 'Find your fit', railOneCopy: 'Tees, shirts and trousers. Pick your favourites.', railOneCollection: 'all', railOneCta: 'View all',
  storyEyebrow: 'ZYRA / EST. 2023', storyTitle: 'All the trends.\nOne destination.', storyCopy: 'From graphic tees to everyday essentials, all in one place.', storyBadgeOne: 'Quality fabrics', storyBadgeTwo: '7-day exchange',
  railTwoLabel: 'Graphics & everyday wear', railTwoTitle: 'Keep it casual', railTwoCopy: 'Graphic or plain. Find your kind of tee.', railTwoCollection: 'oversized-tees', railTwoCta: 'View all',
  editorialCta: 'Explore collection ↗',
  railThreeLabel: 'Bottoms', railThreeTitle: 'Complete your look', railThreeCopy: 'Trousers to pair with your tees and shirts.', railThreeCollection: 'bottoms', railThreeCta: 'View all',
  customEyebrow: 'ZYRA / CUSTOM SHIRTS', customTitle: 'Your design.\nYour shirt.', customCopy: 'Choose a shirt. Upload the print you want.', customCta: 'Create my shirt', customLink: '/customise-your-shirt', customStepOne: '01 / Choose', customStepTwo: '02 / Upload', customStepThree: '03 / Order', customCorner: 'YOUR IDEA. OUR CANVAS.',
  collectionEyebrow: 'Shop by collection', collectionTitle: 'The ZYRA collections', collectionCopy: 'From graphic tees to trousers and layers. Find what you’re looking for, all in one place.', collectionCta: 'Shop collection →',
  reviewsEyebrow: 'The ZYRA community', reviewsTag: 'Style & fit', reviewsTitle: 'How you\nwear ZYRA.', reviewsBadge: 'Fit notes & reviews', reviewsCta: 'Share your experience',
  trustEyebrow: 'Here to help', trustTitle: 'Before you order', trustCopy: 'A few useful details.',
  trustOneTitle: 'Choosing a size?', trustOneCopy: 'Check the size guide on the product page.', trustOneTag: 'Fabric first',
  trustTwoTitle: 'Delivery questions?', trustTwoCopy: 'Read delivery information →', trustTwoTag: 'Order updates', trustTwoLink: '/pages/shipping',
  trustThreeTitle: 'Need a hand?', trustThreeCopy: 'Chat with us on WhatsApp →', trustThreeTag: 'Your choice',
  trustFourTitle: 'Exchanging an item?', trustFourCopy: 'Check exchange eligibility →', trustFourTag: 'See exchange policy', trustFourLink: '/pages/returns',
  footerLocation: 'Karachi / Est. 2023', footerEyebrow: 'Streetwear, done with intent', footerTitle: 'Wear what\nhits different.', footerCopy: 'Trend-led pieces. Quality fabric. Fits made for the version of you showing up today.',
  footerFeedEyebrow: 'The ZYRA feed', footerFeedTitle: 'New drops. No noise.', footerFeedCopy: 'Fresh pieces, fit ideas and first looks—straight from our Instagram.', footerFeedCta: 'Follow ZYRA',
  footerShopTitle: 'Shop collections', footerHelpTitle: 'Customer help', footerPoliciesTitle: 'Policies',
  footerShopAll: 'Shop all', footerTrackOrder: 'Track your order', footerDelivery: 'Delivery information', footerReturns: 'Returns & size exchanges', footerFaq: 'Sizing & shopping FAQs', footerCare: 'Fabric & care guide', footerContact: 'Contact ZYRA', footerTerms: 'Terms of sale', footerPrivacy: 'Privacy policy', footerWebsiteTerms: 'Website terms',
  footerSocialEyebrow: 'Stay in the loop', footerSocialTitle: 'New arrivals, outfit ideas and more.', footerBackToTop: 'Back to top', footerCopyright: '© 2023 ZYRA · Karachi, PK', footerRights: 'All rights reserved.',
};

const field = (group: string, key: string, label: string, kind: HomeContentField['kind'] = 'text'): HomeContentField => ({ group, key, label, kind });

export const homeContentFields: HomeContentField[] = [
  field('Announcement & header', 'promoText', 'Promo text'), field('Announcement & header', 'announcementOne', 'Announcement 1'), field('Announcement & header', 'announcementTwo', 'Announcement 2'), field('Announcement & header', 'announcementThree', 'Announcement 3'),
  field('Announcement & header', 'headerMenu', 'Menu label'), field('Announcement & header', 'headerShop', 'Shop label'), field('Announcement & header', 'headerNewArrivals', 'New arrivals label'), field('Announcement & header', 'headerSearch', 'Search label'), field('Announcement & header', 'headerAccount', 'Account label'), field('Announcement & header', 'headerBag', 'Bag label'),
  field('Campaign hero', 'heroCaption', 'Image caption'),
  field('Shopping assurances', 'assuranceOneTitle', 'Card 1 title'), field('Shopping assurances', 'assuranceOneCopy', 'Card 1 description'), field('Shopping assurances', 'assuranceTwoTitle', 'Card 2 title'), field('Shopping assurances', 'assuranceTwoCopy', 'Card 2 description'), field('Shopping assurances', 'assuranceThreeTitle', 'Card 3 title'), field('Shopping assurances', 'assuranceThreeCopy', 'Card 3 description'), field('Shopping assurances', 'assuranceThreeLink', 'Card 3 link', 'link'),
  ...(['One', 'Two', 'Three'] as const).flatMap((n, i) => { const p = `rail${n}`; return [field(`Product row ${i + 1}`, `${p}Label`, 'Eyebrow'), field(`Product row ${i + 1}`, `${p}Title`, 'Heading'), field(`Product row ${i + 1}`, `${p}Copy`, 'Description', 'textarea'), field(`Product row ${i + 1}`, `${p}Collection`, 'Products from', 'collection'), field(`Product row ${i + 1}`, `${p}Cta`, 'View-all label')]; }),
  field('Brand story', 'storyEyebrow', 'Eyebrow'), field('Brand story', 'storyTitle', 'Heading', 'textarea'), field('Brand story', 'storyCopy', 'Description', 'textarea'), field('Brand story', 'storyBadgeOne', 'Badge 1'), field('Brand story', 'storyBadgeTwo', 'Badge 2'),
  field('Featured collection cards', 'editorialCta', 'Card link label'),
  field('Custom shirt banner', 'customEyebrow', 'Eyebrow'), field('Custom shirt banner', 'customTitle', 'Heading', 'textarea'), field('Custom shirt banner', 'customCopy', 'Description', 'textarea'), field('Custom shirt banner', 'customCta', 'CTA label'), field('Custom shirt banner', 'customLink', 'CTA destination', 'link'), field('Custom shirt banner', 'customStepOne', 'Step 1'), field('Custom shirt banner', 'customStepTwo', 'Step 2'), field('Custom shirt banner', 'customStepThree', 'Step 3'), field('Custom shirt banner', 'customCorner', 'Corner text'),
  field('Collection directory', 'collectionEyebrow', 'Eyebrow'), field('Collection directory', 'collectionTitle', 'Heading'), field('Collection directory', 'collectionCopy', 'Description', 'textarea'), field('Collection directory', 'collectionCta', 'Card link label'),
  field('Reviews', 'reviewsEyebrow', 'Eyebrow'), field('Reviews', 'reviewsTag', 'Tag'), field('Reviews', 'reviewsTitle', 'Heading', 'textarea'), field('Reviews', 'reviewsBadge', 'Badge'), field('Reviews', 'reviewsCta', 'CTA label'),
  field('Customer help', 'trustEyebrow', 'Eyebrow'), field('Customer help', 'trustTitle', 'Heading'), field('Customer help', 'trustCopy', 'Description'),
  ...([1,2,3,4] as const).flatMap((n) => { const p = `trust${['One','Two','Three','Four'][n-1]}`; const result = [field('Customer help', `${p}Title`, `Card ${n} title`), field('Customer help', `${p}Copy`, `Card ${n} description`), field('Customer help', `${p}Tag`, `Card ${n} tag`)]; if (n === 2 || n === 4) result.push(field('Customer help', `${p}Link`, `Card ${n} link`, 'link')); return result; }),
  field('Footer', 'footerLocation', 'Location line'), field('Footer', 'footerEyebrow', 'Brand eyebrow'), field('Footer', 'footerTitle', 'Brand heading', 'textarea'), field('Footer', 'footerCopy', 'Brand description', 'textarea'), field('Footer', 'footerFeedEyebrow', 'Feed eyebrow'), field('Footer', 'footerFeedTitle', 'Feed heading'), field('Footer', 'footerFeedCopy', 'Feed description', 'textarea'), field('Footer', 'footerFeedCta', 'Feed CTA'), field('Footer', 'footerShopTitle', 'Shop column title'), field('Footer', 'footerHelpTitle', 'Help column title'), field('Footer', 'footerPoliciesTitle', 'Policies column title'), field('Footer', 'footerShopAll', 'Shop all link'), field('Footer', 'footerTrackOrder', 'Track order link'), field('Footer', 'footerDelivery', 'Delivery link'), field('Footer', 'footerReturns', 'Returns link'), field('Footer', 'footerFaq', 'FAQ link'), field('Footer', 'footerCare', 'Care guide link'), field('Footer', 'footerContact', 'Contact link'), field('Footer', 'footerTerms', 'Terms link'), field('Footer', 'footerPrivacy', 'Privacy link'), field('Footer', 'footerWebsiteTerms', 'Website terms link'), field('Footer', 'footerSocialEyebrow', 'Social eyebrow'), field('Footer', 'footerSocialTitle', 'Social heading'), field('Footer', 'footerBackToTop', 'Back-to-top label'), field('Footer', 'footerCopyright', 'Copyright line'), field('Footer', 'footerRights', 'Rights line'),
];

export function normalizeHomeContent(value?: Record<string, unknown> | null): HomeContent {
  const result = { ...defaultHomeContent };
  if (!value) return result;
  for (const key of Object.keys(defaultHomeContent)) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) result[key] = candidate.trim();
  }
  return result;
}
