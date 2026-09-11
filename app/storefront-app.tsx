'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Copy,
  CreditCard,
  Download,
  Eye,
  Menu,
  Landmark,
  Minus,
  PackageCheck,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Shirt,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  categories,
  money,
  products as seededProducts,
  type Category,
  type Product,
} from '@/lib/catalog';
import { seedReviews, type Review } from '@/lib/reviews';
import { addBagSelection } from '@/lib/product-purchase';
import { ProductDetail } from './product-detail';
import { CustomerHelp } from './customer-help';
import { OrderTracking } from './order-tracking';
import { ProductDetailsEditor } from './product-details-editor';
import { VisitorDashboard, trackActivity, trackPurchase } from './visitor-activity';
import { PaymentSetup } from './payment-setup';
import { checkoutAttempt } from '@/lib/checkout-attempt';
import { defaultHomeCollectionCards, type HomeCollectionCard } from '@/lib/home-collection-cards';
import { CustomShirtBanner, CustomShirtStudio, CustomShirtAdmin, CustomItemDetails, CustomArtworkLinks } from './custom-shirt-studio';
import { PremiumFooter } from './premium-footer';
import type { CustomDetails } from '@/lib/custom-shirts';

type CartItem = { slug: string; size: string; color: string; qty: number };
type Order = {
  token: string;
  number: string;
  customer: { firstName: string; lastName: string; email: string; phone: string };
  delivery: { address: string; city: string; province: string; postal: string; note: string };
  items: Array<CartItem & { unitPrice: number; lineTotal: number; customDetails?: CustomDetails }>;
  subtotal: number;
  shipping: number;
  total: number;
  payment: string;
  paymentStatus?: string;
  status: string;
  createdAt: string;
};
type StoreSettings = {
  storeName: string;
  supportEmail: string;
  freeShippingThreshold: number;
  flatShipping: number;
  bankTransferInstructions: string;
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  whatsappUrl?: string;
  heroImage: string;
  heroEyebrow: string;
  heroHeading: string;
  heroCtaLabel: string;
  heroCtaHref: string;
};
type ContentSection = { key: string; label: string; sortOrder: number; enabled: boolean };
const defaultStoreSettings: StoreSettings = {
  storeName: 'ZYRA',
  supportEmail: 'info.zyra@gmail.com',
  freeShippingThreshold: 499900,
  flatShipping: 25000,
  bankTransferInstructions: 'Use your order number as the payment reference.',
  instagramUrl: 'https://instagram.com',
  facebookUrl: 'https://facebook.com',
  youtubeUrl: 'https://youtube.com',
  tiktokUrl: 'https://tiktok.com',
  whatsappUrl: 'https://wa.me/966595943013',
  heroImage: '/break-the-pattern-hero.jpeg',
  heroEyebrow: 'ZYRA / DROP 01',
  heroHeading: 'BREAK\nTHE\nPATTERN',
  heroCtaLabel: 'Shop the drop',
  heroCtaHref: '/collections/after-hours',
};
const announcements = [
  'Free shipping across Pakistan over Rs. 4,999',
  '7-day size exchange on unworn pieces',
  'Cash on delivery available nationwide',
];

function useCountdown() {
  const [left, setLeft] = useState('');
  useEffect(() => {
    const tick = () => {
      const ms = new Date('2026-09-08T23:59:00+05:00').getTime() - Date.now();
      if (ms <= 0) {
        setLeft('');
        return;
      }
      const d = Math.floor(ms / 86400000),
        h = Math.floor(ms / 3600000) % 24,
        m = Math.floor(ms / 60000) % 60,
        s = Math.floor(ms / 1000) % 60;
      setLeft(
        `${d}D ${String(h).padStart(2, '0')}H ${String(m).padStart(2, '0')}M ${String(s).padStart(2, '0')}S`,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return left;
}

export default function StorefrontApp({
  path,
  initialCatalog,
  initialSettings,
  initialSections,
  initialCollections,
  initialHomeCollectionCards,
}: {
  path: string;
  initialCatalog?: Product[];
  initialSettings?: StoreSettings;
  initialSections?: ContentSection[];
  initialCollections?: Category[];
  initialHomeCollectionCards?: HomeCollectionCard[];
}) {
  const [cart, setCart] = useState<CartItem[]>([]),
    [catalog, setCatalog] = useState<Product[]>(initialCatalog?.length ? initialCatalog : seededProducts),
    [storeSettings, setStoreSettings] = useState<StoreSettings>(initialSettings || defaultStoreSettings),
    [homeSections, setHomeSections] = useState<ContentSection[]>(initialSections || []),
    [homeCollectionCards, setHomeCollectionCards] = useState<HomeCollectionCard[]>(initialHomeCollectionCards ?? defaultHomeCollectionCards),
    [ready, setReady] = useState(false),
    [menuOpen, setMenuOpen] = useState(false),
    [searchOpen, setSearchOpen] = useState(false),
    [cartOpen, setCartOpen] = useState(false),
    [notice, setNotice] = useState(0),
    [toast, setToast] = useState('');

  const [reviews, setReviews] = useState<Review[]>(seedReviews);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem('zyra-community-reviews') || 'null'); if (Array.isArray(saved)) setReviews(saved); } catch {}
  }, []);

  const addReview = (newReview: Review) => {
    setReviews((prev) => {
      const updated = [newReview, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('zyra-community-reviews', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const deleteReview = (id: string) => {
    setReviews((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('zyra-community-reviews', JSON.stringify(updated));
      }
      return updated;
    });
  };
  const [collectionsList, setCollectionsList] = useState<Category[]>(initialCollections?.length ? initialCollections : categories);

  const countdown = useCountdown();
  const [designsLoading, setDesignsLoading] = useState(false);
  useEffect(() => {
    try {
      const saved: CartItem[] = JSON.parse(localStorage.getItem('zyra-cart') || '[]');
      if (Array.isArray(saved)) {
        setCart(saved);
        const customSlugs = [...new Set(saved.filter(i => i.slug?.startsWith('custom-')).map(i=>i.slug))];
        if (customSlugs.length && !path.startsWith('/admin')) {
          setDesignsLoading(true);
          fetch('/api/custom-shirts/designs?' + customSlugs.map(s=>'slug='+encodeURIComponent(s)).join('&'))
            .then(async r => { if (!r.ok) throw new Error('Your saved designs could not load. Refresh before checking out.'); const p: Product[] = await r.json(); setCatalog(c=>[...c.filter(x=>!customSlugs.includes(x.slug)),...p]); if(p.length!==customSlugs.length) setToast('A custom design has expired. Remove it from your bag and save it again in the studio.'); })
            .catch(e=>setToast(e.message)).finally(()=>setDesignsLoading(false));
        }
      }
    } catch {}
    setReady(true);
    if (!initialCatalog?.length) {
      fetch('/api/products')
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((value: Product[]) => setCatalog(current => [...value, ...current.filter(p => p.slug.startsWith('custom-'))]))
        .catch(() => setToast('Live catalog is temporarily unavailable.'));
    }
    fetch('/api/store-config')
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((value: { settings: StoreSettings; sections: ContentSection[]; collections: Category[]; homeCollectionCards: HomeCollectionCard[] }) => {
        setStoreSettings(value.settings);
        setHomeSections(value.sections);
        if (value.collections?.length) setCollectionsList(value.collections);
        if (Array.isArray(value.homeCollectionCards)) setHomeCollectionCards(value.homeCollectionCards);
      })
      .catch(() => setToast('Store settings are temporarily unavailable.'));
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem('zyra-cart', JSON.stringify(cart));
  }, [cart, ready]);
  useEffect(() => {
    const id = setInterval(
      () => setNotice((n) => (n + 1) % announcements.length),
      5000,
    );
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setSearchOpen(false);
        setCartOpen(false);
      }
    };
    addEventListener('keydown', close);
    document.body.style.overflow =
      menuOpen || searchOpen || cartOpen ? 'hidden' : '';
    return () => {
      removeEventListener('keydown', close);
      document.body.style.overflow = '';
    };
  }, [menuOpen, searchOpen, cartOpen]);
  const add = (item: CartItem, buyNow = false) => {
    try {
      const product = catalog.find((entry) => entry.slug === item.slug);
      if (!product) throw new Error('This product is no longer available.');
      const next = addBagSelection(cart, item, product);
      // Persist selections before a full navigation to checkout can unmount React.
      localStorage.setItem('zyra-cart', JSON.stringify(next));
      setCart(next);
      trackActivity('add_to_bag', `/products/${item.slug}`);
      if (buyNow) { location.assign('/checkout'); return true; }
    } catch (error) {
      setToast(error instanceof Error && error.name !== 'QuotaExceededError' ? error.message : 'Your bag could not be saved. Please enable browser storage.');
      return false;
    }
    setCartOpen(true);
    setToast('Added to your bag');
    setTimeout(() => setToast(''), 2500);
    return true;
  };
  const update = (index: number, qty: number) =>
    setCart((current) =>
      qty < 1
        ? current.filter((_, i) => i !== index)
        : current.map((x, i) => (i === index ? { ...x, qty } : x)),
    );
  const count = cart.reduce((n, item) => n + item.qty, 0);
  const subtotal = cart.reduce(
    (sum, item) =>
      sum + (catalog.find((product) => product.slug === item.slug)?.price || 0) * item.qty,
    0,
  );
  const storefront = !path.startsWith('/admin') && path !== '/checkout';
  return (
    <>
      {storefront && (
        <>
          {countdown && (
            <div className="promo">
              <span>TREND-LED STYLE. QUALITY FABRICS.</span>
              <span aria-live="off">ENDS IN {countdown}</span>
            </div>
          )}
          <div className="announcement" onMouseEnter={() => {}}>
            <button
              aria-label="Previous announcement"
              onClick={() => setNotice((notice + 2) % 3)}
            >
              <ArrowLeft />
            </button>
            <span aria-live="polite">{announcements[notice]}</span>
            <button
              aria-label="Next announcement"
              onClick={() => setNotice((notice + 1) % 3)}
            >
              <ArrowRight />
            </button>
          </div>
          <Header
            count={count}
            onMenu={() => setMenuOpen(true)}
            onSearch={() => setSearchOpen(true)}
            onCart={() => setCartOpen(true)}
          />
        </>
      )}
      {path === '/' ? (
        <Home
          catalog={catalog.filter(p=>!p.slug.startsWith('custom-'))}
          sections={homeSections}
          settings={storeSettings}
          reviews={reviews}
          onAddReview={addReview}
          onDeleteReview={deleteReview}
          collections={collectionsList}
          homeCollectionCards={homeCollectionCards}
        />
      ) : path === '/customise-your-shirt' ? (
        <CustomShirtStudio onAdd={(product, size, colour) => {
          const next = [...cart, { slug: product.slug, size, color: colour, qty: 1 }];
          localStorage.setItem('zyra-cart', JSON.stringify(next));
          setCatalog(c=>[...c,product]); setCart(next); location.assign('/cart');
        }} />
      ) : path.startsWith('/products/') ? (
        <ProductView slug={path.split('/')[2]} add={add} catalog={catalog} settings={storeSettings} cart={cart} ready={ready} />
      ) : path === '/collections' ||
        path.startsWith('/collections/') ||
        path === '/search' ? (
        <CatalogView path={path} catalog={catalog.filter(p=>!p.slug.startsWith('custom-'))} collections={collectionsList} />
      ) : path === '/cart' ? (
        <CartView cart={cart} subtotal={subtotal} update={update} catalog={catalog} settings={storeSettings} />
      ) : path === '/checkout' ? (
        designsLoading ? <main className="checkout-page"><p role="status">Loading your saved designs…</p></main> : <CheckoutView
          cart={cart}
          subtotal={subtotal}
          catalog={catalog}
          settings={storeSettings}
          onComplete={() => setCart([])}
        />
      ) : path.startsWith('/order-confirmation/') ? (
        <ConfirmationView token={path.split('/')[2]} settings={storeSettings} catalog={catalog} />
      ) : path === '/track-order' ? (
        <OrderTracking catalog={catalog} />
      ) : path === '/account' ? (
        <AccountView />
      ) : path === '/admin/login' ? (
        <AdminLogin />
      ) : path.startsWith('/admin') ? (
        <AdminView
          catalog={catalog}
          onCatalogChange={setCatalog}
          reviews={reviews}
          onAddReview={addReview}
          onDeleteReview={deleteReview}
          collections={collectionsList}
          onCollectionsChange={setCollectionsList}
          homeCollectionCards={homeCollectionCards}
          onHomeCollectionCardsChange={setHomeCollectionCards}
        />
      ) : (
        <InfoPage path={path} settings={storeSettings} />
      )}
      {storefront && <PremiumFooter settings={storeSettings} collections={collectionsList} />}
      <Drawer open={menuOpen} close={() => setMenuOpen(false)} collections={collectionsList} />
      <SearchPanel open={searchOpen} close={() => setSearchOpen(false)} catalog={catalog} />
      <CartPanel
        open={cartOpen}
        close={() => setCartOpen(false)}
        cart={cart}
        subtotal={subtotal}
        catalog={catalog}
      />
      {toast && (
        <div className="toast" role="status">
          <Check /> {toast}
        </div>
      )}
    </>
  );
}

function Header({
  count,
  onMenu,
  onSearch,
  onCart,
}: {
  count: number;
  onMenu: () => void;
  onSearch: () => void;
  onCart: () => void;
}) {
  return (
    <header className="site-header">
      <div className="header-leading">
        <button className="header-menu-button" aria-label="Open menu" onClick={onMenu}>
          <Menu />
          <span>Menu</span>
        </button>
        <nav className="header-primary-nav" aria-label="Primary navigation">
          <a href="/collections">Shop</a>
          <a href="/collections/new-arrivals">New arrivals</a>
        </nav>
      </div>
      <a className="wordmark" href="/">
        ZYRA<span>®</span>
      </a>
      <nav className="header-actions" aria-label="Utility">
        <button className="header-tool" aria-label="Search" onClick={onSearch}>
          <Search />
          <span>Search</span>
        </button>
        <a
          className="header-tool hide-mobile"
          href="/account"
          aria-label="Account"
        >
          <CircleUserRound />
          <span>Account</span>
        </a>
        <button
          className="header-tool cart-link"
          aria-label={`Cart, ${count} items`}
          onClick={onCart}
        >
          <ShoppingBag />
          <span className="header-tool-label">Bag</span>
          <span className="cart-count" aria-hidden="true">{count}</span>
        </button>
      </nav>
    </header>
  );
}

function Drawer({
  open,
  close,
  collections = categories,
}: {
  open: boolean;
  close: () => void;
  collections?: Category[];
}) {
  const [shop, setShop] = useState(false);
  if (!open) return null;
  return (
    <div
      className="overlay"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <div className="panel-head">
          <b>{shop ? 'SHOP' : 'MENU'}</b>
          <button
            className="icon-button"
            onClick={shop ? () => setShop(false) : close}
            aria-label={shop ? 'Back' : 'Close'}
          >
            {shop ? <ArrowLeft /> : <X />}
          </button>
        </div>
        {shop ? (
          <nav className="drawer-links">
            {collections.map((c) => (
              <a href={`/collections/${c.slug}`} key={c.slug}>
                {c.name}
                <ChevronRight />
              </a>
            ))}
          </nav>
        ) : (
          <nav className="drawer-links">
            <button onClick={() => setShop(true)}>
              Shop <ChevronRight />
            </button>
            <a href="/collections/best-sellers">
              Best sellers <ChevronRight />
            </a>
            <a href="/collections/new-arrivals">
              New arrivals <ChevronRight />
            </a>
            <a href="/track-order">
              Track order <ChevronRight />
            </a>
            <a href="/pages/about">
              Our story <ChevronRight />
            </a>
          </nav>
        )}
        <div className="drawer-foot">
          <a href="mailto:info.zyra@gmail.com">info.zyra@gmail.com</a>
          <p>Instagram · TikTok · Karachi</p>
        </div>
      </aside>
    </div>
  );
}

function SearchPanel({
  open,
  close,
  catalog,
}: {
  open: boolean;
  close: () => void;
  catalog: Product[];
}) {
  const [query, setQuery] = useState('');
  const found = query.trim()
    ? catalog
        .filter((p) =>
          (p.name + p.category).toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 5)
    : catalog.slice(0, 4);
  if (!open) return null;
  return (
    <div className="overlay search-overlay">
      <section
        className="search-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Search products"
      >
        <div className="search-field">
          <Search />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, categories…"
            aria-label="Search products"
          />
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close search"
          >
            <X />
          </button>
        </div>
        <p className="eyebrow">
          {query ? `${found.length} suggestions` : 'Trending now'}
        </p>
        <div className="search-results">
          {found.length ? (
            found.map((p) => (
              <a href={`/products/${p.slug}`} key={p.slug}>
                <img src={p.image} alt="" />
                <span>
                  <b>{p.name}</b>
                  <small>{p.category}</small>
                </span>
                <strong>{money(p.price)}</strong>
              </a>
            ))
          ) : (
            <div className="empty-mini">
              No pieces matched “{query}”. Try hoodie or tee.
            </div>
          )}
        </div>
        {query && (
          <a
            className="text-link"
            href={`/search?q=${encodeURIComponent(query)}`}
          >
            View all results <ArrowRight />
          </a>
        )}
      </section>
    </div>
  );
}

function CartPanel({
  open,
  close,
  cart,
  subtotal,
  catalog,
}: {
  open: boolean;
  close: () => void;
  cart: CartItem[];
  subtotal: number;
  catalog: Product[];
}) {
  if (!open) return null;
  return (
    <div
      className="overlay cart-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <aside
        className="drawer cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
      >
        <div className="panel-head">
          <b>YOUR BAG / {cart.reduce((n, x) => n + x.qty, 0)}</b>
          <button className="icon-button" onClick={close}>
            <X />
          </button>
        </div>
        {cart.length ? (
          <>
            <div className="mini-cart">
              {cart.map((item, i) => {
                const p = catalog.find((product) => product.slug === item.slug);
                if (!p) return null;
                return (
                  <div key={`${item.slug}${i}`}>
                    <img src={p.image} alt="" />
                    <span>
                      <b>{p.name}</b>
                      <small>
                        {item.color} / {item.size} · Qty {item.qty}
                      </small>
                      <CustomItemDetails details={p.customDetails} />
                      <strong>{money(p.price * item.qty)}</strong>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="panel-total">
              <span>Subtotal</span>
              <b>{money(subtotal)}</b>
            </div>
            <a className="dark-button" href="/checkout">
              Checkout <ArrowRight />
            </a>
            <a className="outline-button" href="/cart">
              View bag
            </a>
          </>
        ) : (
          <div className="empty-state">
            <ShoppingBag />
            <h2>Your bag is empty</h2>
            <p>Build a rotation that works after dark.</p>
            <a className="dark-button" href="/collections">
              Shop all pieces
            </a>
          </div>
        )}
      </aside>
    </div>
  );
}

function getProductImages(product: Product) {
  const gallery = product.images?.filter(Boolean) || [];
  return gallery.length ? gallery : [product.image, product.alternate].filter(Boolean);
}

function ProductCard({ product }: { product: Product }) {
  const gallery = [...new Set(getProductImages(product))];
  const track = useRef<HTMLDivElement>(null);
  const [activeImage, setActiveImage] = useState(0);
  const onSale = Boolean(product.compareAt && product.compareAt > product.price);
  const discount = onSale && product.compareAt
    ? Math.round((1 - product.price / product.compareAt) * 100)
    : 0;
  const showImage = (index: number) => {
    const element = track.current;
    if (!element) return;
    element.scrollTo({
      left: index * element.clientWidth,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };
  return (
    <article className="product-card">
        <div className="product-image product-card-media">
          <div className="product-card-track" ref={track}
            onScroll={(event) => {
              const element = event.currentTarget;
              setActiveImage(Math.round(element.scrollLeft / element.clientWidth));
            }}>
            {gallery.map((src, index) => (
              <a href={`/products/${product.slug}`} key={src} tabIndex={index === activeImage ? 0 : -1}
                aria-label={`View ${product.name}, photo ${index + 1} of ${gallery.length}`}>
                <img src={src} alt={`${product.name} — view ${index + 1}`} loading="lazy" decoding="async" />
              </a>
            ))}
          </div>
          {product.stock === 0 ? (
            <span className="product-badge">Sold out</span>
          ) : discount ? (
            <span className="product-badge sale">Save {discount}%</span>
          ) : product.newArrival ? (
            <span className="product-badge">New arrival</span>
          ) : null}
          {gallery.length > 1 && (
            <div className="product-card-gallery-nav" aria-label={`${product.name} photos`}>
              <button type="button" aria-label={`Previous photo of ${product.name}`} disabled={activeImage === 0}
                onClick={() => showImage(activeImage - 1)}><ArrowLeft aria-hidden="true" /></button>
              <div className="product-card-dots">
                {gallery.map((src, index) => (
                  <button type="button" key={src} aria-label={`Show photo ${index + 1} of ${product.name}`}
                    aria-pressed={index === activeImage} onClick={() => showImage(index)}><span /></button>
                ))}
              </div>
              <button type="button" aria-label={`Next photo of ${product.name}`} disabled={activeImage === gallery.length - 1}
                onClick={() => showImage(activeImage + 1)}><ArrowRight aria-hidden="true" /></button>
            </div>
          )}
        </div>
        <div className="product-meta">
          <p>{product.category}</p>
          <h3><a href={`/products/${product.slug}`}>{product.name}</a></h3>
          <div className="product-card-price">
            <strong>{money(product.price)}</strong>
            {onSale && <del><span className="sr-only">Original price </span>{money(product.compareAt!)}</del>}
          </div>
          <p className="product-card-options">
            <span title={product.sizes.join(' / ')}>{product.sizes.length ? product.sizes.slice(0, 4).join(' / ') : 'See sizing'}{product.sizes.length > 4 ? ` +${product.sizes.length - 4}` : ''}</span>
            {product.colors.length > 0 && <span>{product.colors.length} {product.colors.length === 1 ? 'colour' : 'colours'}</span>}
          </p>
          <a className="product-card-link" href={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
            {product.stock === 0 ? 'View details' : 'View product'} <ArrowRight aria-hidden="true" />
          </a>
        </div>
    </article>
  );
}

function Rail({
  title,
  label,
  list,
  description,
}: {
  title: string;
  label: string;
  list: Product[];
  description?: string;
}) {
  if (!list.length) return null;
  return (
    <section className="section-shell product-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{label}</p>
          <h2>{title}</h2>
        </div>
        {description && <p className="product-section-intro">{description}</p>}
      </div>
      <div className="product-grid">
        {list.slice(0, 4).map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
      <div className="section-view-all">
        <a className="outline-button" href="/collections">
          View all <span>↗</span>
        </a>
      </div>
    </section>
  );
}

function CommunityReviews({
  reviews,
  onAddReview,
  onDeleteReview,
  isAdmin = false,
  catalog = [],
}: {
  reviews: Review[];
  onAddReview: (review: Review) => void;
  onDeleteReview: (id: string) => void;
  isAdmin?: boolean;
  catalog?: Product[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, number>>({});
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  // Modals
  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [congratsModalOpen, setCongratsModalOpen] = useState(false);
  const [adminAddModalOpen, setAdminAddModalOpen] = useState(false);

  // Visitor review form
  const [userForm, setUserForm] = useState({
    author: '',
    purchasedSize: 'Size M',
    productName: catalog[0]?.name || 'Heavyweight Boxy Tee (280GSM)',
    rating: 5,
    quote: '',
    stats: "5'10\" · 75kg",
    fitRating: 'True to size',
    category: 'tees',
  });

  // Admin add review form
  const [adminForm, setAdminForm] = useState({
    author: '',
    purchasedSize: 'Size L',
    productName: catalog[0]?.name || 'Heavyweight Boxy Tee (280GSM)',
    productSlug: catalog[0]?.slug || 'concrete-box-tee',
    rating: 5,
    quote: '',
    stats: "6'0\" · 80kg",
    fitRating: 'True to size',
    category: 'tees',
    verified: true,
  });

  const categoriesList = [
    { label: 'ALL', value: 'ALL', count: reviews.length },
    { label: 'TEES', value: 'tees', count: reviews.filter((r) => r.category === 'tees').length },
    { label: 'HOODIES', value: 'hoodies', count: reviews.filter((r) => r.category === 'hoodies').length },
    { label: 'CARGO', value: 'cargo', count: reviews.filter((r) => r.category === 'cargo').length },
    { label: 'FIT PICS', value: 'fit-pics', count: reviews.filter((r) => r.category === 'fit-pics').length },
  ];

  const filteredReviews = useMemo(() => {
    if (selectedCategory === 'ALL') return reviews;
    return reviews.filter((r) => r.category === selectedCategory);
  }, [reviews, selectedCategory]);

  const visibleReviews = showAll ? filteredReviews : filteredReviews.slice(0, 3);

  const toggleHelpful = (id: string, initialCount: number) => {
    if (votedIds.has(id)) return;
    setVotedIds((prev) => new Set(prev).add(id));
    setHelpfulVotes((prev) => ({
      ...prev,
      [id]: (prev[id] ?? initialCount) + 1,
    }));
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWriteModalOpen(false);
    setCongratsModalOpen(true);
    setUserForm({
      author: '',
      purchasedSize: 'Size M',
      productName: catalog[0]?.name || 'Heavyweight Boxy Tee (280GSM)',
      rating: 5,
      quote: '',
      stats: "5'10\" · 75kg",
      fitRating: 'True to size',
      category: 'tees',
    });
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const initials = adminForm.author
      ? adminForm.author
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'ZY';
    const newRev: Review = {
      id: `rev-${Date.now()}`,
      author: adminForm.author || 'Verified Customer',
      initials,
      verified: adminForm.verified,
      purchasedSize: adminForm.purchasedSize,
      productSlug: adminForm.productSlug,
      productName: adminForm.productName,
      rating: Number(adminForm.rating),
      quote: adminForm.quote || '“Outstanding quality and silhouette.”',
      stats: adminForm.stats,
      fitRating: adminForm.fitRating,
      dateAgo: 'Just now',
      helpfulCount: 0,
      category: adminForm.category,
    };
    onAddReview(newRev);
    setAdminAddModalOpen(false);
  };

  return (
    <section
      className="community-reviews section-shell"
      id="reviews"
      style={{
        background: '#E8E6DF',
        padding: '36px 4vw',
        borderTop: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <header className="community-reviews-head" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          className="reviews-meta-banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#716F6A',
            fontWeight: 600,
          }}
        >
          <span>The ZYRA community</span>
          <span
            className="index-pill"
            style={{
              padding: '3px 10px',
              borderRadius: '9999px',
              background: 'rgba(0, 0, 0, 0.06)',
              color: 'var(--ink)',
              fontWeight: 500,
            }}
          >
            Style & fit
          </span>
        </div>
        <div
          className="reviews-title-block"
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 48px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              textTransform: 'uppercase',
              lineHeight: 1.05,
              color: '#111',
              margin: 0,
            }}
          >
            How you
            <br />
            <span className="highlight-sub" style={{ color: '#8C8980', fontWeight: 500 }}>
              wear ZYRA.
            </span>
          </h2>
          {isAdmin && (
            <button
              className="dark-button admin-add-btn"
              onClick={() => setAdminAddModalOpen(true)}
              style={{ fontSize: '11px', padding: '8px 16px' }}
            >
              <Plus /> Admin: Add Review
            </button>
          )}
        </div>

        <div
          className="reviews-stats-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '12px',
            paddingBottom: '14px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div className="score-group" style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span className="score-num" style={{ fontSize: '38px', fontWeight: 800, letterSpacing: '-0.04em', color: '#111', lineHeight: 1 }}>
              {reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : '—'}
            </span>
            <div className="score-details" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div className="stars-row" style={{ color: '#111', fontSize: '13px', letterSpacing: '2px' }}>
                ★★★★★
              </div>
              <span
                className="wear-count"
                style={{
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontSize: '10px',
                  color: '#716F6A',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {reviews.length} reviews
              </span>
            </div>
          </div>
          <div
            className="fit-accuracy-tag"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: '10px',
              fontWeight: 600,
              color: '#111',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <span
              className="pulse-dot"
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
              }}
            />
            <span>Fit notes & reviews</span>
          </div>
        </div>
      </header>

      {/* Category Filter Chips Bar */}
      <nav
        className="reviews-filter-chips"
        aria-label="Review categories"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          padding: '4px 0',
        }}
      >
        {categoriesList.map((cat) => {
          const isActive = selectedCategory === cat.value;
          return (
            <button
              key={cat.value}
              className={`filter-chip ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.value)}
              style={{
                padding: '7px 14px',
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: '11px',
                fontWeight: 500,
                borderRadius: '9999px',
                border: isActive ? '1px solid #111' : '1px solid rgba(0, 0, 0, 0.15)',
                background: isActive ? '#111' : 'rgba(255, 255, 255, 0.65)',
                color: isActive ? '#ffffff' : '#111',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              {cat.label} ({cat.count})
            </button>
          );
        })}
      </nav>

      {/* Review Cards Feed */}
      <div
        className="review-cards-feed"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
          marginTop: '10px',
        }}
      >
        {visibleReviews.length === 0 ? (
          <div className="empty-reviews-state" style={{ padding: '30px', textAlign: 'center', color: '#716F6A' }}>
            <p>No community reports found in this category yet.</p>
          </div>
        ) : (
          visibleReviews.map((rev) => {
            const currentHelpful = helpfulVotes[rev.id] ?? rev.helpfulCount;
            const hasVoted = votedIds.has(rev.id);
            return (
              <article
                key={rev.id}
                className="community-review-card"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.12)',
                  borderRadius: '16px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div
                  className="card-top-row"
                  style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}
                >
                  <div className="author-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      className="author-avatar"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#111',
                        color: '#fff',
                        fontFamily: 'var(--font-geist-mono), monospace',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {rev.initials}
                    </div>
                    <div className="author-text" style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <div className="name-verified-row" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="author-name" style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>
                          {rev.author}
                        </span>
                        {rev.verified && !seedReviews.some((seed) => seed.id === rev.id && seed.quote === rev.quote) && (
                          <span
                            className="verified-badge"
                            style={{
                              fontFamily: 'var(--font-geist-mono), monospace',
                              fontSize: '8px',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              background: 'rgba(0, 0, 0, 0.05)',
                              color: '#666',
                              textTransform: 'uppercase',
                              fontWeight: 700,
                              border: '1px solid rgba(0, 0, 0, 0.08)',
                            }}
                          >
                            VERIFIED
                          </span>
                        )}
                      </div>
                      <span
                        className="purchased-size"
                        style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '10px', color: '#716F6A' }}
                      >
                        Purchased {rev.purchasedSize}
                      </span>
                    </div>
                  </div>
                  <div className="card-top-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      className="date-ago"
                      style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '10px', color: '#8C8980' }}
                    >
                      {rev.dateAgo}
                    </span>
                    {isAdmin && (
                      <button
                        className="delete-review-btn"
                        title="Delete Review"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '4px',
                        }}
                        onClick={() => {
                          if (confirm(`Delete review from ${rev.author}?`)) {
                            onDeleteReview(rev.id);
                          }
                        }}
                      >
                        <Trash2 />
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className="review-product-bar"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(0, 0, 0, 0.04)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                  }}
                >
                  <span className="product-title" style={{ fontSize: '12px', fontWeight: 700, color: '#111' }}>
                    {rev.productName}
                  </span>
                  <span className="star-rating" style={{ fontSize: '11px', color: '#111', letterSpacing: '1px' }}>
                    {'★'.repeat(rev.rating)}
                  </span>
                </div>

                <p
                  className="review-quote-body"
                  style={{ fontSize: '13px', lineHeight: 1.5, color: '#222', margin: 0, fontWeight: 400 }}
                >
                  {rev.quote}
                </p>

                <div
                  className="card-bottom-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                    marginTop: 'auto',
                    gap: '8px',
                  }}
                >
                  <div className="fit-tags-group" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span
                      className="fit-stats-tag"
                      style={{
                        fontFamily: 'var(--font-geist-mono), monospace',
                        fontSize: '10px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(0, 0, 0, 0.04)',
                        color: '#555',
                        fontWeight: 500,
                      }}
                    >
                      {rev.stats}
                    </span>
                    <span
                      className="fit-feeling-tag"
                      style={{
                        fontFamily: 'var(--font-geist-mono), monospace',
                        fontSize: '10px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        color: '#065f46',
                        fontWeight: 600,
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                      }}
                    >
                      {rev.fitRating}
                    </span>
                  </div>
                  <button
                    className={`helpful-vote-btn ${hasVoted ? 'voted' : ''}`}
                    onClick={() => toggleHelpful(rev.id, rev.helpfulCount)}
                    style={{
                      fontFamily: 'var(--font-geist-mono), monospace',
                      fontSize: '10px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: hasVoted ? '#111' : '#ffffff',
                      border: '1px solid rgba(0, 0, 0, 0.15)',
                      color: hasVoted ? '#ffffff' : '#555',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>Helpful</span>
                    <span className="helpful-count" style={{ fontWeight: 700 }}>
                      ({currentHelpful})
                    </span>
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      <footer
        className="community-reviews-footer"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'center',
          paddingTop: '16px',
        }}
      >
        <button
          className="dark-button fit-check-cta"
          onClick={() => setWriteModalOpen(true)}
          style={{
            width: '100%',
            maxWidth: '420px',
            textAlign: 'center',
            padding: '14px 20px',
            borderRadius: '9999px',
            background: '#111',
            color: '#fff',
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Share your experience
        </button>

        {filteredReviews.length > 3 && (
          <button
            className="outline-button load-more-cta"
            onClick={() => setShowAll(!showAll)}
            style={{
              width: '100%',
              maxWidth: '420px',
              textAlign: 'center',
              padding: '14px 20px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.7)',
              color: '#111',
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              border: '1px solid rgba(0, 0, 0, 0.2)',
              cursor: 'pointer',
            }}
          >
            {showAll ? 'Show fewer reviews' : `Read more reviews (${filteredReviews.length - 3})`}
          </button>
        )}

        <div
          className="post-purchase-note"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: '10px',
            color: '#716F6A',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          <span className="small-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#8C8980' }} />
          <p style={{ margin: 0 }}>Read about the fit, feel and everyday wear.</p>
        </div>
      </footer>

      {/* User Fit Check Modal */}
      {writeModalOpen && (
        <div className="overlay modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setWriteModalOpen(false)}>
          <aside className="modal review-form-modal">
            <div className="panel-head">
              <b>Share your experience</b>
              <button className="icon-button" onClick={() => setWriteModalOpen(false)}>
                <X />
              </button>
            </div>
            <form onSubmit={handleUserSubmit} className="write-review-form">
              <label>
                Your Full Name
                <input
                  required
                  type="text"
                  placeholder="e.g. Amaan Khan"
                  value={userForm.author}
                  onChange={(e) => setUserForm({ ...userForm, author: e.target.value })}
                />
              </label>

              <div className="form-grid-2">
                <label>
                  Purchased Piece
                  <select
                    value={userForm.productName}
                    onChange={(e) => setUserForm({ ...userForm, productName: e.target.value })}
                  >
                    {catalog.map((p) => (
                      <option key={p.slug} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Size Worn
                  <select
                    value={userForm.purchasedSize}
                    onChange={(e) => setUserForm({ ...userForm, purchasedSize: e.target.value })}
                  >
                    <option value="Size S">Size S</option>
                    <option value="Size M">Size M</option>
                    <option value="Size L">Size L</option>
                    <option value="Size XL">Size XL</option>
                  </select>
                </label>
              </div>

              <div className="form-grid-2">
                <label>
                  Rating
                  <select
                    value={userForm.rating}
                    onChange={(e) => setUserForm({ ...userForm, rating: Number(e.target.value) })}
                  >
                    <option value={5}>★★★★★ (5/5)</option>
                    <option value={4}>★★★★☆ (4/5)</option>
                    <option value={3}>★★★☆☆ (3/5)</option>
                  </select>
                </label>

                <label>
                  Fit Feedback
                  <select
                    value={userForm.fitRating}
                    onChange={(e) => setUserForm({ ...userForm, fitRating: e.target.value })}
                  >
                    <option value="True to size">True to size</option>
                    <option value="Relaxed drape">Relaxed drape</option>
                    <option value="Boxy crop fit">Boxy crop fit</option>
                    <option value="Overly structured">Overly structured</option>
                  </select>
                </label>
              </div>

              <label>
                Height & Weight (Fit Specs)
                <input
                  type="text"
                  placeholder="e.g. 5'11&quot; · 78kg"
                  value={userForm.stats}
                  onChange={(e) => setUserForm({ ...userForm, stats: e.target.value })}
                />
              </label>

              <label>
                Your Honest Review / Fit Notes
                <textarea
                  required
                  rows={4}
                  placeholder="Tell us about fabric weight, collar structure, drape, wash durability..."
                  value={userForm.quote}
                  onChange={(e) => setUserForm({ ...userForm, quote: e.target.value })}
                />
              </label>

              <button type="submit" className="dark-button full-width">
                Submit Fit Check
              </button>
            </form>
          </aside>
        </div>
      )}

      {/* Non-Admin Fake Submit Confirmation Modal */}
      {congratsModalOpen && (
        <div className="overlay modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setCongratsModalOpen(false)}>
          <aside className="modal congrats-modal-box">
            <div className="congrats-icon-wrapper">
              <CheckCircle2 />
            </div>
            <h3>CONGRATULATIONS!</h3>
            <h4>Thank you for sharing your experience</h4>
            <p>
              Thank you for sharing your fit feedback! Your submission has been received and is queued for post-purchase community verification.
            </p>
            <span className="congrats-badge">VERIFICATION INDEX #2026-CHECK</span>
            <button className="dark-button full-width" onClick={() => setCongratsModalOpen(false)}>
              Back to reviews
            </button>
          </aside>
        </div>
      )}

      {/* Admin Add Review Modal */}
      {adminAddModalOpen && (
        <div className="overlay modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setAdminAddModalOpen(false)}>
          <aside className="modal review-form-modal">
            <div className="panel-head">
              <b>ADMIN: ADD COMMUNITY REVIEW</b>
              <button className="icon-button" onClick={() => setAdminAddModalOpen(false)}>
                <X />
              </button>
            </div>
            <form onSubmit={handleAdminSubmit} className="write-review-form">
              <label>
                Customer / Author Name
                <input
                  required
                  type="text"
                  placeholder="e.g. Amaan K."
                  value={adminForm.author}
                  onChange={(e) => setAdminForm({ ...adminForm, author: e.target.value })}
                />
              </label>

              <div className="form-grid-2">
                <label>
                  Product Name
                  <select
                    value={adminForm.productName}
                    onChange={(e) => {
                      const p = catalog.find((c) => c.name === e.target.value);
                      setAdminForm({
                        ...adminForm,
                        productName: e.target.value,
                        productSlug: p?.slug || 'concrete-box-tee',
                      });
                    }}
                  >
                    {catalog.map((p) => (
                      <option key={p.slug} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Purchased Size
                  <select
                    value={adminForm.purchasedSize}
                    onChange={(e) => setAdminForm({ ...adminForm, purchasedSize: e.target.value })}
                  >
                    <option value="Size S">Size S</option>
                    <option value="Size M">Size M</option>
                    <option value="Size L">Size L</option>
                    <option value="Size XL">Size XL</option>
                  </select>
                </label>
              </div>

              <div className="form-grid-2">
                <label>
                  Rating
                  <select
                    value={adminForm.rating}
                    onChange={(e) => setAdminForm({ ...adminForm, rating: Number(e.target.value) })}
                  >
                    <option value={5}>5 Stars (★★★★★)</option>
                    <option value={4}>4 Stars (★★★★☆)</option>
                    <option value={3}>3 Stars (★★★☆☆)</option>
                  </select>
                </label>

                <label>
                  Category Filter
                  <select
                    value={adminForm.category}
                    onChange={(e) => setAdminForm({ ...adminForm, category: e.target.value })}
                  >
                    <option value="tees">tees</option>
                    <option value="hoodies">hoodies</option>
                    <option value="cargo">cargo</option>
                    <option value="fit-pics">fit-pics</option>
                  </select>
                </label>
              </div>

              <div className="form-grid-2">
                <label>
                  Height & Weight
                  <input
                    type="text"
                    value={adminForm.stats}
                    onChange={(e) => setAdminForm({ ...adminForm, stats: e.target.value })}
                  />
                </label>

                <label>
                  Fit Assessment
                  <input
                    type="text"
                    value={adminForm.fitRating}
                    onChange={(e) => setAdminForm({ ...adminForm, fitRating: e.target.value })}
                  />
                </label>
              </div>

              <label>
                Review Quote / Feedback
                <textarea
                  required
                  rows={3}
                  value={adminForm.quote}
                  onChange={(e) => setAdminForm({ ...adminForm, quote: e.target.value })}
                />
              </label>

              <button type="submit" className="dark-button full-width">
                Publish Review to Live Site
              </button>
            </form>
          </aside>
        </div>
      )}
    </section>
  );
}

function Home({
  catalog,
  sections,
  settings,
  reviews,
  onAddReview,
  onDeleteReview,
  isAdmin = false,
  collections = categories,
  homeCollectionCards = defaultHomeCollectionCards,
}: {
  catalog: Product[];
  sections: ContentSection[];
  settings: StoreSettings;
  reviews: Review[];
  onAddReview: (r: Review) => void;
  onDeleteReview: (id: string) => void;
  isAdmin?: boolean;
  collections?: Category[];
  homeCollectionCards?: HomeCollectionCard[];
}) {
  const enabled = (key: string) => !sections.length || sections.some((section) => section.key === key && section.enabled);
  const media = (url: string) => {
    const marker = '/storage/v1/object/public/product-images/';
    const at = url.indexOf(marker);
    return at < 0 ? url : `/api/store-media?path=${encodeURIComponent(url.slice(at + marker.length))}`;
  };
  return (
    <main className="home-page">
      {enabled('campaign-hero') && (
      <section className="hero">
        <img
          src={media(settings.heroImage || defaultStoreSettings.heroImage)}
          alt="ZYRA campaign banner"
          onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = defaultStoreSettings.heroImage; }}
        />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p>ZYRA · Trend-led streetwear</p>
          <h1>{(settings.heroHeading || defaultStoreSettings.heroHeading).split('\n').map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</h1>
          <a className="light-button" href={settings.heroCtaHref || defaultStoreSettings.heroCtaHref}>
            {settings.heroCtaLabel || defaultStoreSettings.heroCtaLabel} <ArrowUpRight aria-hidden="true" />
          </a>
        </div>
        <p className="hero-caption">The looks you want. The quality you feel.</p>
      </section>
      )}
      <div className="shopping-assurances" aria-label="Shopping at ZYRA">
        <div><i className="assurance-icon"><CreditCard aria-hidden="true" /></i><span><strong>Cash on delivery</strong><small>Pay when it arrives</small></span></div>
        <div><i className="assurance-icon"><PackageOpen aria-hidden="true" /></i><span><strong>Allowed to open</strong><small>Check your parcel</small></span></div>
        <a href="/track-order"><i className="assurance-icon"><PackageCheck aria-hidden="true" /></i><span><strong>Track your order</strong><small>Check order status <ChevronRight aria-hidden="true" /></small></span></a>
      </div>
      {enabled('best-sellers') && <Rail title="Find your next favourite" label="Shop ZYRA" description="The styles you’re looking for, with quality fabrics that feel as good as they look." list={catalog} />}
      {enabled('brand-manifesto') && (
      <section className="manifesto section-shell">
        <div className="manifesto-minimal">
          <div>
            <p className="eyebrow">ZYRA / EST. 2023</p>
            <h2>All the trends.<br />One destination.</h2>
            <p className="manifesto-copy">Your next look. Quality you can feel.</p>
        </div>
        <div className="manifesto-minimal-badges" aria-label="Store assurances">
          <span><i className="manifesto-icon-wrap"><CheckCircle2 aria-hidden="true" /></i> Quality fabrics</span>
          <span><i className="manifesto-icon-wrap"><PackageCheck /></i> 7-day exchange</span>
        </div>
      </div>
      </section>
      )}
      {enabled('core-forms') && (
      <Rail
        title="Make it your own"
        label="Graphics & everyday wear"
        description="Go bold with a graphic tee or keep it simple. Wear what feels like you."
        list={catalog.slice(4)}
      />
      )}
      <section className="editorial-grid">
        {homeCollectionCards
          .filter((card) => card.enabled)
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((card) => (
            <a href={`/collections/${card.collectionSlug}`} key={card.key}>
              <img src={media(card.image)} alt={`${card.title} collection`} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/collection-studio.jpg'; }} />
              <div>
                <p className="eyebrow">{card.eyebrow}</p>
                <h2>{card.title}</h2>
                <span>Explore collection ↗</span>
              </div>
            </a>
          ))}
      </section>
      <Rail
        title="Complete your look"
        label="Bottoms"
        description="Find the right pair to go with your favourite tee."
        list={catalog.filter(
          (p) => p.category === 'Bottoms' || p.category === 'Essentials',
        )}
      />
      <CustomShirtBanner />
      {enabled('collection-grid') && <section className="section-shell collection-discovery" id="collections">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Shop by mood</p>
            <h2>Pick your lane.</h2>
          </div>
          <p className="collection-intro">Four edits. Zero guesswork.<br />Start with what feels like you.</p>
        </div>
        <div className="collection-grid">
          {collections.map((c, index) => (
            <a href={`/collections/${c.slug}`} key={c.slug} className="collection-card">
              <div className="collection-visual">
                <img src={media(c.image)} alt="" loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/collection-store.jpg'; }} />
                <div className="collection-index" aria-hidden="true">
                  <span>EDIT {String(index + 1).padStart(2, '0')}</span>
                  <strong>ZYRA SELECT</strong>
                </div>
                <div className="collection-caption">
                  <div>
                    <span className="collection-card-kicker">Made for your rotation</span>
                    <h3>{c.name}</h3>
                  </div>
                  <div className="collection-arrow" aria-hidden="true"><ArrowRight /></div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>}
      {enabled('customer-reviews') && (
        <CommunityReviews
          reviews={reviews}
          onAddReview={onAddReview}
          onDeleteReview={onDeleteReview}
          isAdmin={isAdmin}
          catalog={catalog}
        />
      )}
      <section className="trust-section" aria-label="Brand guarantees and trust signals">
        <header className="trust-heading">
          <p className="eyebrow">Why shop ZYRA</p>
          <h2>Why ZYRA</h2>
          <span className="trust-live">Quality. Comfort. Care.</span>
        </header>
        <div className="trust-strip">
        <div className="trust-card">
          <div className="trust-card-main">
            <div className="trust-icon-box">
              <Shirt className="trust-icon" aria-hidden="true" />
            </div>
            <div>
              <h3 className="trust-title">Quality fabrics</h3>
              <p className="trust-desc">Made to feel good.</p>
            </div>
          </div>
          <span className="trust-pill trust-pill-ssl">Fabric first</span>
        </div>

        <div className="trust-card">
          <div className="trust-card-main">
            <div className="trust-icon-box">
              <Truck className="trust-icon" />
            </div>
            <div>
              <h3 className="trust-title">Track your order</h3>
              <p className="trust-desc">Updates online.</p>
            </div>
          </div>
          <span className="trust-pill">Order updates</span>
        </div>

        <div className="trust-card">
          <div className="trust-card-main">
            <div className="trust-icon-box">
              <CreditCard className="trust-icon" />
            </div>
            <div>
              <h3 className="trust-title">Pay your way</h3>
              <p className="trust-desc">COD or bank transfer.</p>
            </div>
          </div>
          <span className="trust-pill trust-pill-black">Your choice</span>
        </div>

        <div className="trust-card">
          <div className="trust-card-main">
            <div className="trust-icon-box">
              <PackageCheck className="trust-icon" />
            </div>
            <div>
              <h3 className="trust-title">7-day exchange</h3>
              <p className="trust-desc">Unworn items only.</p>
            </div>
          </div>
          <span className="trust-pill">See exchange policy</span>
        </div>
        </div>
      </section>
    </main>
  );
}

function collectionPageStory(name: string) {
  const stories: Record<string, { eyebrow: string; heading: string; copy: string; points: Array<[string, string]> }> = {
    'oversized tees': {
      eyebrow: 'The heavyweight edit',
      heading: 'Room to move. Built to stay.',
      copy: 'Heavy feel. Loose fit. Zero overthinking. The tee you reach for when the outfit needs one strong move.',
      points: [['Relaxed shape', 'An easy drop through the shoulder.'], ['Quality feel', 'Fabric with weight, not stiffness.'], ['Repeat ready', 'Made for everyday wear.']],
    },
    hoodies: {
      eyebrow: 'Layers, sorted',
      heading: 'Soft weight. Clean shape.',
      copy: 'Soft where it matters, structured where it shows. Throw one on and the fit is handled.',
      points: [['Easy layer', 'Room to wear it your way.'], ['Soft inside', 'Comfort where it counts.'], ['Shape that lasts', 'A clean silhouette in rotation.']],
    },
    outerwear: {
      eyebrow: 'Finish the fit',
      heading: 'The layer that changes everything.',
      copy: 'One good layer can carry the whole look. Clean shape, useful detail and no extra noise.',
      points: [['Layer friendly', 'Built to sit over everyday fits.'], ['Useful details', 'Function without the noise.'], ['Street ready', 'A confident final layer.']],
    },
    essentials: {
      eyebrow: 'Core rotation',
      heading: 'Simple pieces. Better standards.',
      copy: 'The no-fail part of your wardrobe. Easy colours, better fabric and a fit that works on repeat.',
      points: [['Easy pairing', 'Works with what you own.'], ['Clean finish', 'No unnecessary detail.'], ['Daily comfort', 'Made for long wear.']],
    },
    bottoms: {
      eyebrow: 'Built from the ground up',
      heading: 'The right fall changes the fit.',
      copy: 'The pair that makes everything above it look better. Relaxed, clean and ready for the daily rotation.',
      points: [['Relaxed movement', 'Comfort without losing shape.'], ['Easy colours', 'Made to pair across the wardrobe.'], ['Clean line', 'A sharper everyday silhouette.']],
    },
    sweatshirts: {
      eyebrow: 'Everyday layers',
      heading: 'Comfort, with a cleaner edge.',
      copy: 'All-day comfort without the lazy fit. Soft feel, clean shape and easy energy.',
      points: [['Soft handle', 'Comfort from the first wear.'], ['Easy weight', 'Useful across changing weather.'], ['Low effort', 'Throw it on and go.']],
    },
    'new arrivals': {
      eyebrow: 'Just landed',
      heading: 'Fresh pieces. First pick.',
      copy: 'New graphics, fresh shapes and limited runs. Get there before your size disappears.',
      points: [['New drops', 'The latest pieces in one place.'], ['Limited runs', 'Selected quantities only.'], ['Easy checkout', 'COD and bank transfer available.']],
    },
    'best sellers': {
      eyebrow: 'Most wanted',
      heading: 'The pieces people come back for.',
      copy: 'The fits that keep making it into carts. Easy to wear, hard to leave behind.',
      points: [['Crowd picks', 'The most-loved ZYRA styles.'], ['Easy choices', 'Reliable fits and colours.'], ['7-day exchange', 'Try the fit with confidence.']],
    },
    'all collections': {
      eyebrow: 'The full ZYRA edit',
      heading: 'Every mood. One wardrobe.',
      copy: 'Loud graphics, clean basics and everything between. Pick the version of you showing up today.',
      points: [['Quality first', 'Fabric you notice immediately.'], ['Fits with intent', 'Every silhouette has a purpose.'], ['Made for rotation', 'Pieces designed for repeat wear.']],
    },
  };
  return stories[name.toLowerCase()] || {
    eyebrow: 'The ZYRA edit',
    heading: `${name}, done the ZYRA way.`,
    copy: 'A clean fit, a quality feel and no unnecessary noise. Made to stay in your rotation.',
    points: [['Quality feel', 'Fabric chosen for repeat wear.'], ['Easy fit', 'Comfort with a clean shape.'], ['7-day exchange', 'A simpler way to find your fit.']] as Array<[string, string]>,
  };
}

function CatalogView({
  path,
  catalog,
  collections = categories,
}: {
  path: string;
  catalog: Product[];
  collections?: Category[];
}) {
  const pathSlug = path.split('/')[2];
  const category = collections.find((c) => c.slug === pathSlug);
  const defaultCategory = categories.find((c) => c.slug === pathSlug);
  const activeCategory = category || defaultCategory;
  const query =
    typeof window !== 'undefined'
      ? new URLSearchParams(location.search).get('q') || ''
      : '';
  const isNewArrivals = path === '/collections/new-arrivals';
  const isBestSellers = path === '/collections/best-sellers';
  const pageName = path === '/search'
    ? (query ? `Search: ${query}` : 'Search')
    : isNewArrivals
      ? 'New arrivals'
      : isBestSellers
        ? 'Best sellers'
        : activeCategory?.name || pathSlug?.replaceAll('-', ' ') || 'All collections';
  const story = collectionPageStory(pageName);
  const filtered = useMemo(
    () =>
      catalog.filter(
        (p) =>
          (!isNewArrivals || p.newArrival === true) &&
          (!isBestSellers || p.featured === true) &&
          (!activeCategory ||
            p.category === activeCategory.name ||
            p.collection === activeCategory.name) &&
          (query === '' ||
            (p.name + p.category).toLowerCase().includes(query.toLowerCase())),
      ),
    [activeCategory, isNewArrivals, isBestSellers, query, catalog],
  );
  const heroImage = activeCategory?.image || collections[0]?.image || '/collection-store.jpg';
  const categoryPosition = Math.max(0, collections.findIndex((item) => item.slug === activeCategory?.slug));
  const relatedCollections = collections.filter((item) => item.slug !== pathSlug).slice(0, 3);
  return (
    <main className="catalog-page">
      <div className="catalog-hero">
        {path !== '/search' ? <div className="catalog-hero-visual">
          <img src={heroImage} alt={`${pageName} collection`} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/collection-store.jpg'; }} />
          <div className="catalog-visual-topline">
            <span>COLLECTION / {String(categoryPosition + 1).padStart(2, '0')}</span>
            <span>ZYRA EDIT</span>
          </div>
          <div className="catalog-hero-copy">
            <p className="eyebrow">ZYRA / {story.eyebrow}</p>
            <h1>{pageName}</h1>
            <p>{story.copy}</p>
          </div>
          <div className="catalog-visual-footer"><span>MADE FOR YOUR ROTATION</span><span>{filtered.length} PIECES</span></div>
        </div> : <div className="catalog-hero-copy catalog-search-copy">
          <p className="eyebrow">ZYRA / Shop the edit</p><h1>{pageName}</h1><p>{story.copy}</p>
        </div>}
      </div>
      <div className="catalog-count">
        <span>{filtered.length} pieces</span>
        <span>Designed for your rotation</span>
      </div>
      {filtered.length ? (
        <div className="catalog-grid">
          {filtered.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      ) : (
        <div className="empty-state catalog-empty">
          <Search />
          <h2>No pieces found</h2>
          <p>Explore the complete archive or check back for upcoming drops.</p>
        </div>
      )}
      {path !== '/search' && <>
        <section className="catalog-story" aria-labelledby="catalog-story-title">
          <div className="catalog-story-copy">
            <p className="eyebrow">{story.eyebrow}</p>
            <h2 id="catalog-story-title">{story.heading}</h2>
            <p>{story.copy}</p>
          </div>
          <div className="catalog-story-points">
            {story.points.map(([title, copy], index) => <article key={title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div><h3>{title}</h3><p>{copy}</p></div>
            </article>)}
          </div>
        </section>
        {relatedCollections.length > 0 && <section className="catalog-related" aria-labelledby="related-edits-title">
          <header>
            <div><p className="eyebrow">More to explore</p><h2 id="related-edits-title">Switch the mood.</h2></div>
            <a href="/collections">Shop all <ArrowRight /></a>
          </header>
          <div className="catalog-related-grid">
            {relatedCollections.map((item, index) => <a href={`/collections/${item.slug}`} key={item.slug}>
              <img src={item.image} alt="" loading="lazy" />
              <span>EDIT {String(index + 1).padStart(2, '0')}</span>
              <div><h3>{item.name}</h3><ArrowRight /></div>
            </a>)}
          </div>
        </section>}
      </>}
    </main>
  );
}

function ProductView({ slug, add, catalog, settings, cart, ready }: {
  slug: string; add: (item: CartItem, buyNow?: boolean) => boolean;
  catalog: Product[]; settings: StoreSettings; cart: CartItem[]; ready: boolean;
}) {
  const product = catalog.find((entry) => entry.slug === slug);
  if (!product) return <main className="empty-state"><h1>Product unavailable</h1><p>This piece is no longer available.</p><a className="outline-button" href="/collections">Explore the collection</a></main>;
  const recommendations = catalog.filter((entry) => entry.slug !== slug && entry.active !== false)
    .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category) || Number(b.collection === product.collection) - Number(a.collection === product.collection));
  return <ProductDetail key={product.slug} product={product} settings={settings} cart={cart} add={add} ready={ready}
    related={<Rail title="You may also like" label="Complete your look" list={recommendations.slice(0, 4)} />} />;
}

function CartView({
  cart,
  subtotal,
  update,
  catalog,
  settings,
}: {
  cart: CartItem[];
  subtotal: number;
  update: (index: number, qty: number) => void;
  catalog: Product[];
  settings: StoreSettings;
}) {
  const shipping = subtotal >= settings.freeShippingThreshold ? 0 : settings.flatShipping;
  return (
    <main className="bag-page">
      <header>
        <p className="eyebrow">Order build</p>
        <h1>Your bag</h1>
        <span>{cart.reduce((n, x) => n + x.qty, 0)} items</span>
      </header>
      {cart.length ? (
        <div className="bag-layout">
          <section className="bag-lines">
            {cart.map((item, i) => {
              const p = catalog.find((product) => product.slug === item.slug);
              if (!p) return <article key={item.slug}><div><h2>Saved item unavailable</h2><p>Your design may have expired. Save it again in the studio.</p><button className="remove" onClick={()=>update(i,0)}>Remove item</button></div></article>;
              return (
                <article key={`${item.slug}${i}`}>
                  <img src={p.image} alt={p.name} />
                  <div>
                    <p className="eyebrow">{p.category}</p>
                    <h2>
                      <a href={p.customDetails ? '/customise-your-shirt' : `/products/${p.slug}`}>{p.name}</a>
                    </h2>
                    <small>
                      {item.color} / {item.size}
                    </small>
                    <CustomItemDetails details={p.customDetails} />
                    <div className="quantity">
                      <button onClick={() => update(i, item.qty - 1)}>
                        <Minus />
                      </button>
                      <span>{item.qty}</span>
                      <button onClick={() => update(i, item.qty + 1)}>+</button>
                    </div>
                    <button className="remove" onClick={() => update(i, 0)}>
                      Remove
                    </button>
                  </div>
                  <strong>{money(p.price * item.qty)}</strong>
                </article>
              );
            })}
          </section>
          <aside className="summary-card">
            <h2>Order summary</h2>
            <dl>
              <div>
                <dt>Subtotal</dt>
                <dd>{money(subtotal)}</dd>
              </div>
              <div>
                <dt>Shipping estimate</dt>
                <dd>{shipping ? money(shipping) : 'Free'}</dd>
              </div>
              <div className="total">
                <dt>Estimated total</dt>
                <dd>{money(subtotal + shipping)}</dd>
              </div>
            </dl>
            <a className="dark-button" href="/checkout">
              Continue to checkout <ArrowRight />
            </a>
            <a className="text-link" href="/collections">
              <ArrowLeft /> Continue shopping
            </a>
          </aside>
        </div>
      ) : (
        <div className="empty-state bag-empty">
          <ShoppingBag />
          <h2>Nothing here yet</h2>
          <p>Your rotation is waiting.</p>
          <a className="dark-button" href="/collections">
            Explore all pieces
          </a>
        </div>
      )}
    </main>
  );
}

function CheckoutView({
  cart,
  subtotal,
  catalog,
  settings,
  onComplete,
}: {
  cart: CartItem[];
  subtotal: number;
  catalog: Product[];
  settings: StoreSettings;
  onComplete: () => void;
}) {
  const [payment, setPayment] = useState('cod'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [card, setCard] = useState({ available: false, environment: 'sandbox' });
  const requestKey = useRef<{ payload: string; key: string } | null>(null);
  const [savedCardOrder, setSavedCardOrder] = useState('');
  useEffect(() => { fetch('/api/payments/safepay').then(r => r.json()).then(setCard).catch(() => {}); }, []);
  useEffect(() => { try { const pending = sessionStorage.getItem('zyra-pending-card-order'); if (pending && /^[a-zA-Z0-9_-]{20,100}$/.test(pending)) setSavedCardOrder(pending); } catch {} }, []);
  const shipping = subtotal >= settings.freeShippingThreshold ? 0 : settings.flatShipping,
    total = subtotal + shipping;
  const hasUnavailableItems = cart.some(item => !catalog.some(product => product.slug === item.slug));
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    if (!cart.length) {
      setError('Your bag is empty.');
      return;
    }
    if (cart.some(i=>!catalog.some(p=>p.slug===i.slug))) { setError('An item is unavailable. Return to your bag to remove it or save your custom design again.'); return; }
    setBusy(true);
    setError('');
    const data = new FormData(e.currentTarget);
    try {
      if (savedCardOrder) { location.href = `/payment-return?order=${encodeURIComponent(savedCardOrder)}`; return; }
      const payload = JSON.stringify({ items: cart, email: data.get('email'), phone: data.get('phone'), firstName: data.get('firstName'), lastName: data.get('lastName'), address: data.get('address'), city: data.get('city'), province: data.get('province'), postal: data.get('postal'), note: data.get('note'), payment });
      if (requestKey.current?.payload !== payload) {
        const attempt = await checkoutAttempt(sessionStorage, payload);
        requestKey.current = { payload, key: attempt.key };
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': requestKey.current.key,
        },
        body: JSON.stringify({
          items: cart,
          email: data.get('email'),
          phone: data.get('phone'),
          firstName: data.get('firstName'),
          lastName: data.get('lastName'),
          address: data.get('address'),
          city: data.get('city'),
          province: data.get('province'),
          postal: data.get('postal'),
          note: data.get('note'),
          payment,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Order could not be created');
      const order = result as Order;
      if (payment === 'safepay') {
        setSavedCardOrder(order.token);
        sessionStorage.setItem('zyra-pending-card-order', order.token);
        const session = await fetch('/api/payments/safepay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: order.token }) });
        const paymentResult = await session.json();
        if (!session.ok) throw new Error(paymentResult.error || 'Payment could not be opened.');
        location.assign(paymentResult.url);
        return;
      }
      sessionStorage.removeItem('zyra-checkout-attempt');
      trackPurchase(order);
      onComplete();
      location.href = `/order-confirmation/${order.token}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };
  if (savedCardOrder) return <main className="checkout-page"><section className="checkout-recovery"><p className="eyebrow">ZYRA / Saved order</p><h1>Finish your payment.</h1><p>Your order has been saved. Check its payment status or reopen the same Safepay session to continue.</p>{error && <p role="alert">{error}</p>}<a className="dark-button" href={`/payment-return?order=${encodeURIComponent(savedCardOrder)}`}>Continue with saved order <ArrowRight /></a><a className="inline-link" href="/pages/contact">Need help? Contact us</a></section></main>;
  if (!cart.length)
    return (
      <main className="checkout-page">
        <div className="empty-state bag-empty">
          <h1>Your bag is empty</h1>
          <a className="dark-button" href="/collections">
            Return to shop
          </a>
        </div>
      </main>
    );
  return (
    <main className="checkout-page">
      <header>
        <a className="wordmark" href="/">
          ZYRA<span>®</span>
        </a>
        <p>Secure checkout</p>
      </header>
      <form onSubmit={submit} className="checkout-layout">
        <section>
          <a className="inline-link" href="/collections">← Continue shopping</a>
          <h1>Make it yours.</h1>
          <p className="checkout-intro">Checkout as a guest. Your order, delivery and payment—all in one place.</p>
          {hasUnavailableItems && <p className="form-error" role="alert">Some saved items could not load, so this total is incomplete. <a href="/cart">Review your bag</a> before placing an order.</p>}
          <div className="checkout-mobile-total"><span>Order total · {cart.reduce((n, item) => n + item.qty, 0)} items</span><strong>{money(total)}</strong><a href="#checkout-summary">View details ↓</a></div>
          <p className="eyebrow form-section">01 / Contact</p>
          <div className="form-grid">
            <label className="wide">
              Email
              <input
                required
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <label className="wide">
              Mobile phone
              <input
                required
                type="tel"
                name="phone"
                autoComplete="tel"
                placeholder="03XX XXX XXXX"
              />
            </label>
          </div>
          <p className="eyebrow form-section">02 / Delivery</p>
          <div className="form-grid">
            <label>
              First name
              <input required name="firstName" autoComplete="given-name" />
            </label>
            <label>
              Last name
              <input required name="lastName" autoComplete="family-name" />
            </label>
            <label className="wide">
              Address
              <input required name="address" autoComplete="street-address" placeholder="House / flat, street and area" />
            </label>
            <label>
              City
              <input required name="city" autoComplete="address-level2" placeholder="Type your city" />
            </label>
            <label>
              Province
              <select name="province" required defaultValue="" autoComplete="address-level1">
                <option value="" disabled>Choose province / region</option>
                <option>Punjab</option>
                <option>Sindh</option>
                <option>Khyber Pakhtunkhwa</option>
                <option>Balochistan</option>
                <option>Islamabad Capital Territory</option>
                <option>Azad Jammu and Kashmir</option>
                <option>Gilgit-Baltistan</option>
              </select>
            </label>
            <label>
              Postal code (optional)
              <input
                name="postal"
                inputMode="numeric"
                autoComplete="postal-code"
              />
            </label>
            <label className="wide">
              Delivery note (optional)
              <textarea name="note" rows={2} placeholder="Landmark or anything that helps us find you" />
            </label>
          </div>
          <p className="eyebrow form-section">03 / Shipping</p>
          <label className="choice selected">
            <input type="radio" checked readOnly />
            <span>
              <b>Tracked standard delivery</b>
              <small>Estimated 2–5 working days</small>
            </span>
            <strong>{shipping ? money(shipping) : 'FREE'}</strong>
          </label>
          <p className="eyebrow form-section">04 / Billing & payment</p>
          {!card.available && <div className="choice payment-unavailable" aria-label="Advance card payment unavailable"><CreditCard aria-hidden="true" /><span><b>Advance card payment · Safepay</b><small>Currently unavailable. You can choose cash on delivery or a manual bank transfer below.</small></span></div>}
          {card.available && <label className={`choice ${payment === 'safepay' ? 'selected' : ''}`}><input type="radio" name="payment" checked={payment === 'safepay'} onChange={() => setPayment('safepay')} /><span><b>Debit / credit card · Safepay{card.environment === 'sandbox' ? ' (test mode)' : ''}</b><small>Pay {money(total)} securely on Safepay. Your card details stay with the payment provider.</small></span><CreditCard aria-hidden="true" /></label>}
          <label className={`choice ${payment === 'cod' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="payment"
              checked={payment === 'cod'}
              onChange={() => setPayment('cod')}
            />
            <span>
              <b>Cash on delivery</b>
              <small>Pay when your order arrives</small>
            </span>
          </label>
          <label className={`choice ${payment === 'bank' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="payment"
              checked={payment === 'bank'}
              onChange={() => setPayment('bank')}
            />
            <span>
              <b>Manual bank transfer</b>
              <small>Instructions appear after placing order</small>
            </span>
          </label>
          <p className="checkout-payment-note">{payment === 'safepay' ? 'Next: Safepay’s secure payment page. The full order total is payable in advance.' : payment === 'cod' ? 'Nothing to pay online. Pay your order total when your parcel arrives.' : 'Your order stays pending until your bank transfer is verified.'}</p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="dark-button place-order" disabled={busy || hasUnavailableItems}>
            {busy ? 'Please wait…' : savedCardOrder ? 'Check saved order' : `${payment === 'safepay' ? 'Continue to secure payment' : payment === 'cod' ? 'Place cash-on-delivery order' : 'Place order'} · ${money(total)}`}{' '}
            <ArrowRight />
          </button>
          <p className="checkout-note">
            <ShieldCheck /> Review your total before you order. <a href="/pages/shipping">Delivery</a> · <a href="/pages/returns">Exchanges</a> · <a href="/pages/privacy">Privacy</a>
          </p>
        </section>
        <OrderSummary cart={cart} subtotal={subtotal} shipping={shipping} catalog={catalog} />
      </form>
    </main>
  );
}

function OrderSummary({
  cart,
  subtotal,
  shipping,
  catalog,
}: {
  cart: CartItem[];
  subtotal: number;
  shipping: number;
  catalog: Product[];
}) {
  return (
    <aside className="checkout-summary" id="checkout-summary">
      <h2>Order summary</h2>
      {cart.map((item, i) => {
        const p = catalog.find((product) => product.slug === item.slug);
        if (!p) return null;
        return (
          <div className="checkout-line" key={`${item.slug}${i}`}>
            <div>
              <img src={p.image} alt={p.name} />
              <span>{item.qty}</span>
            </div>
            <p>
              <b>{p.name}</b>
              <small>
                {item.color} / {item.size}
              </small>
              <CustomItemDetails details={p.customDetails} />
            </p>
            <strong>{money(p.price * item.qty)}</strong>
          </div>
        );
      })}
      <dl>
        <div>
          <dt>Subtotal</dt>
          <dd>{money(subtotal)}</dd>
        </div>
        <div>
          <dt>Shipping</dt>
          <dd>{shipping ? money(shipping) : 'Free'}</dd>
        </div>
        <div className="total">
          <dt>Total</dt>
          <dd>{money(subtotal + shipping)}</dd>
        </div>
      </dl>
    </aside>
  );
}

function ConfirmationView({ token, settings, catalog }: { token: string; settings: StoreSettings; catalog: Product[] }) {
  const [order, setOrder] = useState<Order | null>(null),
    [loading, setLoading] = useState(true),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    fetch(`/api/orders?token=${encodeURIComponent(token)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((value: Order) => setOrder(value))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [token]);
  if (loading)
    return <main className="confirmation"><p className="eyebrow">Order lookup</p><h1>Loading confirmation…</h1></main>;
  if (!order)
    return (
      <main className="confirmation">
        <p className="eyebrow">Order lookup</p>
        <h1>Confirmation unavailable</h1>
        <p>That confirmation link is invalid or no longer available.</p>
        <a className="dark-button" href="/track-order">
          Track an order
        </a>
      </main>
    );
  const paymentLabel = order.payment === 'safepay'
    ? `Safepay · ${order.paymentStatus === 'PAID' ? 'Paid' : order.paymentStatus === 'PAID_REVIEW_REQUIRED' ? 'Paid — contact support' : 'Awaiting confirmation'}`
    : order.payment === 'bank' ? 'Bank transfer' : 'Cash on delivery';
  const copyTrackingId = async () => {
    try {
      await navigator.clipboard.writeText(order.number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      const field = document.createElement('textarea');
      field.value = order.number;
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };
  return (
    <main className="order-success-page">
      <section className="order-success-hero">
        <div className="order-success-mark"><Check /></div>
        <p className="eyebrow">{order.items.some(i => i.customDetails) ? 'Custom order confirmed' : 'Order confirmed'}</p>
        <h1>It’s officially yours.</h1>
        <p className="order-success-intro">We’ve got the order. Keep this page close while we get your pieces ready.</p>
        <div className="tracking-id-card">
          <div><span>Your tracking ID</span><strong>{order.number}</strong></div>
          <button type="button" onClick={() => void copyTrackingId()} aria-live="polite">
            {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy ID'}
          </button>
        </div>
        <div className="order-hero-actions">
          <a className="dark-button" href={`/track-order?order=${encodeURIComponent(order.number)}`}>Track the order <ArrowRight /></a>
          <a className="text-link" href="/collections">Keep shopping</a>
        </div>
      </section>

      <section className="order-slip-section" aria-labelledby="order-slip-title">
        <header>
          <div><p className="eyebrow">Your order slip</p><h2 id="order-slip-title">Everything in one place.</h2></div>
          <p>Save it now. You’ll also use the tracking ID if you contact us about this order.</p>
        </header>
        <div className="order-slip-layout">
          <article className="order-slip" aria-label={`Order slip ${order.number}`}>
            <div className="order-slip-brand"><strong>ZYRA<sup>®</sup></strong><span>ORDER / CONFIRMED</span></div>
            <div className="order-slip-code">
              <span>TRACKING ID</span>
              <strong>{order.number}</strong>
              <small>{new Date(order.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</small>
            </div>
            <div className="order-slip-status">
              <div><span>Status</span><strong>{order.status.toLowerCase().replaceAll('_', ' ')}</strong></div>
              <div><span>Payment</span><strong>{paymentLabel}</strong></div>
            </div>
            <div className="order-slip-items">
              {order.items.map((item, index) => {
                const product = catalog.find((entry) => entry.slug === item.slug);
                return <div className="order-slip-item" key={`${item.slug}-${index}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{item.customDetails ? 'Your custom shirt' : product?.name || item.slug.replaceAll('-', ' ')}</strong><small>{item.color} / {item.size} · Qty {item.qty}</small></div>
                  <b>{money(item.lineTotal)}</b>
                </div>;
              })}
            </div>
            <dl className="order-slip-totals">
              <div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
              <div><dt>Delivery</dt><dd>{order.shipping ? money(order.shipping) : 'Free'}</dd></div>
              <div><dt>Total</dt><dd>{money(order.total)}</dd></div>
            </dl>
            <div className="order-slip-delivery">
              <span>Deliver to</span>
              <strong>{order.customer.firstName} {order.customer.lastName}</strong>
              <p>{order.delivery.address}, {order.delivery.city}, {order.delivery.province}{order.delivery.postal ? ` ${order.delivery.postal}` : ''}</p>
            </div>
            <footer><span>ZYRA / KARACHI, PK</span><span>KEEP THIS SLIP</span></footer>
          </article>

          <aside className="order-slip-guide">
            <p className="eyebrow">Save your copy</p>
            <h3>Your slip is ready.</h3>
            <p>Tap below, then choose <b>Save as PDF</b> in the print window. On mobile, use the share or PDF option.</p>
            <button className="order-download-button" type="button" onClick={() => window.print()}><Download /> Save / print slip</button>
            <div className="download-mini-guide">
              <div><span>01</span><p><b>Tap save</b><small>The print window will open.</small></p></div>
              <div><span>02</span><p><b>Choose PDF</b><small>Select “Save as PDF”.</small></p></div>
              <div><span>03</span><p><b>Keep the ID</b><small>Use it to track or get help.</small></p></div>
            </div>
            {order.payment === 'bank' && <div className="order-payment-note"><b>Bank transfer needed</b><p>{settings.bankTransferInstructions} Use <strong>{order.number}</strong> as the payment reference.</p></div>}
            {order.payment === 'safepay' && order.paymentStatus !== 'PAID' && <a className="outline-button" href={`/payment-return?order=${encodeURIComponent(token)}`}>Check payment status</a>}
          </aside>
        </div>
      </section>

      {order.items.some(i => i.customDetails) && <section className="order-custom-section">
        <div><p className="eyebrow">Made for you</p><h2>Your artwork is with us.</h2><p>We’ll use the files and placement choices saved with your order.</p></div>
        <div>{order.items.filter(i => i.customDetails).map(i => <div className="cs-confirm-design" key={i.slug}><img src={i.customDetails?.image} alt="Your uploaded print" width="100"/><div><b>Your custom shirt</b><p>{i.color} / {i.size} · Qty {i.qty}</p><CustomItemDetails details={i.customDetails}/></div></div>)}</div>
      </section>}

      <section className="order-next-steps" aria-labelledby="next-steps-title">
        <header><p className="eyebrow">What happens next</p><h2 id="next-steps-title">From us to you.</h2></header>
        <div>
          <article className="active"><span><Check /></span><small>01</small><h3>Order received</h3><p>Your order is safely in our system.</p></article>
          <article><span><PackageCheck /></span><small>02</small><h3>Quality checked</h3><p>We inspect and pack every piece.</p></article>
          <article><span><Truck /></span><small>03</small><h3>On the move</h3><p>Your tracking updates when the courier scans it.</p></article>
          <article><span><PackageOpen /></span><small>04</small><h3>At your door</h3><p>Receive it, try the fit and make it yours.</p></article>
        </div>
      </section>

      <section className="order-help-strip">
        <div><p className="eyebrow">Need anything?</p><h2>We’re here after checkout too.</h2></div>
        <nav aria-label="Order help">
          <a href="/track-order"><span>Track order</span><ArrowRight /></a>
          <a href="/pages/shipping"><span>Delivery guide</span><ArrowRight /></a>
          <a href="/pages/returns"><span>7-day exchange</span><ArrowRight /></a>
          <a href="/pages/contact"><span>Customer help</span><ArrowRight /></a>
        </nav>
      </section>
    </main>
  );
}


function AccountView() {
  const [mode, setMode] = useState<'login' | 'register'>('login'),
    [message, setMessage] = useState('');
  return (
    <main className="simple-page account-page">
      <div>
        <p className="eyebrow">Customer account</p>
        <h1>{mode === 'login' ? 'Welcome back.' : 'Join the archive.'}</h1>
        <div className="tab-buttons">
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            Sign in
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>
        <form
          className="stack-form"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(
              mode === 'login'
                ? 'Demo session started.'
                : 'Demo account created.',
            );
          }}
        >
          {mode === 'register' && (
            <label>
              Name
              <input required autoComplete="name" />
            </label>
          )}
          <label>
            Email
            <input required type="email" autoComplete="email" />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              minLength={8}
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
            />
          </label>
          <button className="dark-button">
            {mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight />
          </button>
        </form>
        {message && (
          <p className="success-card">
            <Check /> {message} Account data is not sent anywhere.
          </p>
        )}
      </div>
    </main>
  );
}

function AdminLogin() {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <main className="admin-login">
      <a className="wordmark" href="/">
        ZYRA<span>®</span>
      </a>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          const f = new FormData(e.currentTarget);
          try {
            const response = await fetch('/api/admin/session', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ email: f.get('email'), password: f.get('password') }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Login failed.');
            location.href = '/admin';
          } catch (loginError) {
            setError(loginError instanceof Error ? loginError.message : 'Login failed.');
            setBusy(false);
          }
        }}
      >
        <p className="eyebrow">Operations / Secure</p>
        <h1>Admin access</h1>
        <p>
          Sign in to manage products, inventory, orders and storefront settings.
          Credentials remain server-side.
        </p>
        <label>
          Email
          <input name="email" required type="email" />
        </label>
        <label>
          Password
          <input name="password" required type="password" minLength={8} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="dark-button" disabled={busy}>
          {busy ? 'Starting session…' : 'Enter operations'} <ArrowRight />
        </button>
      </form>
    </main>
  );
}

function AdminView({
  catalog,
  onCatalogChange,
  reviews,
  onAddReview,
  onDeleteReview,
  collections,
  onCollectionsChange,
  homeCollectionCards,
  onHomeCollectionCardsChange,
}: {
  catalog: Product[];
  onCatalogChange: (products: Product[]) => void;
  reviews: Review[];
  onAddReview: (review: Review) => void;
  onDeleteReview: (id: string) => void;
  collections: Category[];
  onCollectionsChange: (collections: Category[]) => void;
  homeCollectionCards: HomeCollectionCard[];
  onHomeCollectionCardsChange: (cards: HomeCollectionCard[]) => void;
}) {
  const [allowed, setAllowed] = useState<boolean | null>(null),
    [tab, setTab] = useState('dashboard'),
    [adminCatalog, setAdminCatalog] = useState<Product[]>(catalog),
    [orders, setOrders] = useState<Order[]>([]),
    [editing, setEditing] = useState<Product | null>(null),
    [productFormOpen, setProductFormOpen] = useState(false),
    [productActionBusy, setProductActionBusy] = useState(false),
    [showRemovedProducts, setShowRemovedProducts] = useState(false),
    [orderActionBusy, setOrderActionBusy] = useState(false),
    [selectedOrder, setSelectedOrder] = useState<Order | null>(null),
    [settings, setSettings] = useState<StoreSettings>(defaultStoreSettings),
    [sections, setSections] = useState<ContentSection[]>([]),
    [saved, setSaved] = useState(''),
    [adminError, setAdminError] = useState('');

  const loadAdminData = async () => {
    try {
      const [productResponse, publicResponse, orderResponse, settingsResponse, contentResponse, collectionResponse, homeCardResponse] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/products'),
        fetch('/api/admin/orders'),
        fetch('/api/admin/settings'),
        fetch('/api/admin/content'),
        fetch('/api/admin/collections'),
        fetch('/api/admin/home-collection-cards'),
      ]);
      if (productResponse.status === 401 || orderResponse.status === 401) {
        sessionStorage.removeItem('zyra-admin-demo');
        setAllowed(false);
        return;
      }
      if (!productResponse.ok || !publicResponse.ok || !orderResponse.ok || !settingsResponse.ok || !contentResponse.ok || !collectionResponse.ok || !homeCardResponse.ok) {
        throw new Error('Admin data could not be loaded.');
      }
      setAdminCatalog(await productResponse.json());
      onCatalogChange(await publicResponse.json());
      setOrders(await orderResponse.json());
      setSettings(await settingsResponse.json());
      setSections(await contentResponse.json());
      onCollectionsChange(await collectionResponse.json());
      onHomeCollectionCardsChange(await homeCardResponse.json());
    } catch (loadError) {
      setAdminError(loadError instanceof Error ? loadError.message : 'Admin data could not be loaded.');
    }
  };

  useEffect(() => {
    fetch('/api/admin/session')
      .then((response) => response.json())
      .then((session: { authenticated: boolean }) => {
        setAllowed(session.authenticated);
        if (session.authenticated) void loadAdminData();
      })
      .catch(() => setAllowed(false));
  }, []);
  if (allowed === null) return <main className="admin-login"><form><h1>Loading</h1><p>Verifying secure admin session…</p></form></main>;
  if (!allowed)
    return (
      <main className="admin-login">
        <form>
          <h1>Protected area</h1>
          <p>Sign in with your admin credentials to view operations.</p>
          <a className="dark-button" href="/admin/login">
            Go to admin login
          </a>
        </form>
      </main>
    );
  const low = adminCatalog.filter((product) => product.active !== false && product.stock < 5).length;
  const openOrders = orders.filter((order) => !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.status));
  const revenue = orders.filter((order) => order.status !== 'CANCELLED').reduce((sum, order) => sum + order.total, 0);

  const updateStock = async (product: Product, stock: number) => {
    setAdminError('');
    try {
    const response = await fetch('/api/admin/products', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: product.slug, stock: Math.max(0, stock) }),
    });
    if (!response.ok) {
      const result = await response.json();
      setAdminError(result.error || 'Inventory could not be updated.');
      return;
    }
    await loadAdminData();
    setSaved(`${product.name} inventory updated.`);
    } catch {
      setAdminError('Inventory could not be updated. Check your connection and try again.');
    }
  };

  const archiveProduct = async (product: Product) => {
    if (productActionBusy) return;
    if (product.active !== false && !window.confirm(`Delete ${product.name} from the store? It will be hidden from shoppers. Existing orders stay safe, and you can restore it from Removed products.`)) return;
    setProductActionBusy(true);
    setAdminError('');
    try {
    const response = await fetch('/api/admin/products', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: product.slug, active: product.active === false }),
    });
    if (!response.ok) {
      const result = await response.json();
      setAdminError(result.error || 'Product could not be updated.');
      return;
    }
    await loadAdminData();
    setSaved(product.active === false ? `${product.name} restored.` : `${product.name} removed from the store. You can restore it from Removed products.`);
    } catch {
      setAdminError('Connection interrupted. Refresh to check the product before trying again.');
    } finally {
      setProductActionBusy(false);
    }
  };

  const updateOrder = async (order: Order, status: string) => {
    if (orderActionBusy) return;
    setOrderActionBusy(true);
    setAdminError('');
    try {
    const response = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ number: order.number, status }),
    });
    const result = await response.json();
    if (!response.ok) {
      setAdminError(result.error || 'Order status could not be updated.');
      return;
    }
    setOrders((current) => current.map((entry) => (entry.number === order.number ? result : entry)));
    setSelectedOrder((current) => (current?.number === order.number ? result : current));
    setSaved(`${order.number} moved to ${status.toLowerCase()}.`);
    } catch {
      setAdminError('Order update could not be confirmed. Refresh before trying again.');
    } finally {
      setOrderActionBusy(false);
    }
  };
  return (
    <main className="admin-shell">
      <aside>
        <a className="wordmark" href="/">
          ZYRA<span>®</span>
        </a>
        <p className="eyebrow">Commerce OS</p>
        {['dashboard', 'payments', 'visitors', 'products', 'custom shirts', 'orders', 'reviews', 'content', 'settings'].map((x) => (
          <button
            key={x}
            className={tab === x ? 'active' : ''}
            onClick={() => setTab(x)}
          >
            {x}
          </button>
        ))}
        <button
          className="logout"
          onClick={async () => {
            await fetch('/api/admin/session', { method: 'DELETE' });
            location.href = '/admin/login';
          }}
        >
          Sign out
        </button>
      </aside>
      <section className="admin-main">
        <header>
          <div>
            <p className="eyebrow">Admin / {tab}</p>
            <h1>{tab}</h1>
          </div>
          <a className="outline-button" href="/" target="_blank">
            View store ↗
          </a>
        </header>
        {tab === 'visitors' && <VisitorDashboard />}
        {tab === 'payments' && <PaymentSetup />}
        {tab === 'custom shirts' && <CustomShirtAdmin viewOrders={()=>setTab('custom orders')} />}
        {tab === 'custom orders' && <><button className="outline-button" onClick={()=>setTab('custom shirts')}>Back to shirt studio</button><AdminOrders orders={orders.filter(o=>o.items.some(i=>i.customDetails))} onStatus={updateOrder} onSelect={setSelectedOrder}/></>}
        {tab === 'dashboard' && (
          <>
            <div className="stat-grid">
              <div>
                <small>Recorded revenue</small>
                <b>{money(revenue)}</b>
                <span>{orders.length} total database orders</span>
              </div>
              <div>
                <small>Open orders</small>
                <b>{openOrders.length}</b>
                <span>Needs fulfilment</span>
              </div>
              <div>
                <small>Low stock SKUs</small>
                <b>{low}</b>
                <span>Needs attention</span>
              </div>
              <div>
                <small>Active products</small>
                <b>{adminCatalog.filter((product) => product.active !== false).length}</b>
                <span>{adminCatalog.filter((product) => product.active === false).length} archived</span>
              </div>
            </div>
            <AdminOrders orders={orders.slice(0, 5)} onStatus={updateOrder} onSelect={setSelectedOrder} />
          </>
        )}
        {tab === 'products' && (
          <section className="admin-products-section">
            <HomeCollectionCardsEditor
              cards={homeCollectionCards}
              collections={collections}
              onSaved={(nextCards, message) => {
                onHomeCollectionCardsChange(nextCards);
                setSaved(message);
              }}
              onError={setAdminError}
            />
            <CollectionNameEditor
              collections={collections}
              onSaved={async (nextCollections, message) => {
                onCollectionsChange(nextCollections);
                await loadAdminData();
                setSaved(message);
              }}
              onError={setAdminError}
            />
            <div className="admin-section-head">
              <div><h2>Product catalog</h2><p>Add products, edit details, control visibility and adjust stock.</p></div>
              <button className="dark-button" onClick={() => { setEditing(null); setProductFormOpen(true); }}><Plus /> Add product</button>
            </div>
            {productFormOpen && (
              <AdminProductDialog onClose={() => { setEditing(null); setProductFormOpen(false); }}>
              <ProductEditor
                key={editing?.slug || 'new'}
                product={editing}
                collections={collections}
                products={adminCatalog}
                onCancel={() => { setEditing(null); setProductFormOpen(false); }}
                onSaved={async (message) => { await loadAdminData(); setSaved(message); setEditing(null); setProductFormOpen(false); }}
              />
              </AdminProductDialog>
            )}
            <label className="admin-removed-toggle"><input type="checkbox" checked={showRemovedProducts} onChange={event => setShowRemovedProducts(event.target.checked)} /> Removed products ({adminCatalog.filter(p => p.active === false).length})</label>
            <div className="admin-table">
            <div className="table-head">
              <b>Product</b>
              <b>SKU</b>
              <b>Status</b>
              <b>Inventory</b>
              <b>Actions</b>
            </div>
            {adminCatalog.filter(p => showRemovedProducts ? p.active === false : p.active !== false).map((p, i) => (
              <div key={p.slug}>
                <span>
                  <img src={p.image} alt="" />
                  <b>{p.name}</b>
                </span>
                <code>ZY-{String(i + 1).padStart(3, '0')}</code>
                <span className="status">
                  {p.active === false ? 'Archived' : p.stock === 0 ? 'Sold out' : 'Active'}
                </span>
                <span className="inventory">
                  <button
                    aria-label={`Decrease ${p.name} inventory`}
                    onClick={() => void updateStock(p, p.stock - 1)}
                  >
                    −
                  </button>
                  <b>{p.stock}</b>
                  <button
                    onClick={() =>
                      void updateStock(p, p.stock + 1)
                    }
                    aria-label={`Increase ${p.name} inventory`}
                  >
                    +
                  </button>
                </span>
                <span className="admin-actions">
                  <button onClick={() => { setEditing(p); setProductFormOpen(true); }}><Pencil /> Edit</button>
                  <button disabled={productActionBusy} className={p.active === false ? '' : 'admin-delete-button'} onClick={() => void archiveProduct(p)}>{p.active === false ? 'Restore' : <><Trash2 /> Delete</>}</button>
                </span>
              </div>
            ))}
            </div>
          </section>
        )}
        {tab === 'orders' && <AdminOrders orders={orders} onStatus={updateOrder} onSelect={setSelectedOrder} />}
        {tab === 'reviews' && (
          <section className="admin-products-section">
            <div className="admin-section-head">
              <div>
                <h2>Community Reviews</h2>
                <p>Manage customer reviews, add new verified fit checks, or remove reports.</p>
              </div>
            </div>
            <CommunityReviews
              reviews={reviews}
              onAddReview={onAddReview}
              onDeleteReview={onDeleteReview}
              isAdmin={true}
              catalog={catalog}
            />
          </section>
        )}
        {tab === 'content' && (
          <form
            className="admin-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setAdminError('');
              const [contentResponse, settingsResponse] = await Promise.all([
                fetch('/api/admin/content', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sections }) }),
                fetch('/api/admin/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(settings) }),
              ]);
              const [contentResult, settingsResult] = await Promise.all([contentResponse.json(), settingsResponse.json()]);
              if (!contentResponse.ok || !settingsResponse.ok) {
                setAdminError(contentResult.error || settingsResult.error || 'Homepage content could not be saved.');
                return;
              }
              setSections(contentResult);
              setSettings(settingsResult);
              setSaved('Homepage content saved to Supabase.');
            }}
          >
            <h2>Homepage content</h2>
            <div className="admin-banner-editor">
              <div className="admin-section-head">
                <div>
                  <h3>Campaign banner</h3>
                  <p>Change the homepage hero image, overlay copy and destination.</p>
                </div>
              </div>
              <ImageUploader
                label="Banner image"
                value={settings.heroImage}
                onChange={(heroImage) => setSettings({ ...settings, heroImage })}
                onError={setAdminError}
                scope="collection"
              />
              <label>
                Eyebrow text
                <input maxLength={80} value={settings.heroEyebrow} onChange={(event) => setSettings({ ...settings, heroEyebrow: event.target.value })} />
              </label>
              <label>
                Banner heading
                <textarea maxLength={120} rows={3} value={settings.heroHeading} onChange={(event) => setSettings({ ...settings, heroHeading: event.target.value })} />
                <small>Use a new line to control each heading line.</small>
              </label>
              <div className="admin-field-pair">
                <label>
                  CTA label
                  <input maxLength={40} value={settings.heroCtaLabel} onChange={(event) => setSettings({ ...settings, heroCtaLabel: event.target.value })} />
                </label>
                <label>
                  CTA link
                  <input value={settings.heroCtaHref} onChange={(event) => setSettings({ ...settings, heroCtaHref: event.target.value })} />
                </label>
              </div>
            </div>
            {sections.map((section, i) => (
              <label className="toggle-row" key={section.key}>
                <span>
                  <b>{section.label}</b>
                  <small>Section {String(i + 1).padStart(2, '0')}</small>
                </span>
                <input type="checkbox" checked={section.enabled} onChange={(event) => setSections((current) => current.map((item) => item.key === section.key ? { ...item, enabled: event.target.checked } : item))} />
              </label>
            ))}
            <button className="dark-button">Save homepage content</button>
            {saved && <p className="success">{saved}</p>}
          </form>
        )}
        {tab === 'settings' && (
          <form
            className="admin-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const response = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(settings) });
              const result = await response.json();
              if (!response.ok) { setAdminError(result.error || 'Settings could not be saved.'); return; }
              setSettings(result); setSaved('Store settings saved to Supabase.');
            }}
          >
            <h2>Store settings</h2>
            <label>
              Store name
              <input value={settings.storeName} onChange={(event) => setSettings({ ...settings, storeName: event.target.value })} />
            </label>
            <label>
              Support email
              <input type="email" value={settings.supportEmail} onChange={(event) => setSettings({ ...settings, supportEmail: event.target.value })} />
            </label>
            <label>
              Free shipping threshold
              <input value={settings.freeShippingThreshold / 100} inputMode="numeric" onChange={(event) => setSettings({ ...settings, freeShippingThreshold: Math.max(0, Math.round(Number(event.target.value) * 100)) })} />
            </label>
            <label>
              Standard delivery fee (PKR)
              <input type="number" min="0" step="1" required value={settings.flatShipping / 100} onChange={event => setSettings({ ...settings, flatShipping: Math.max(0, Math.round(Number(event.target.value) * 100)) })} />
            </label>
            <label>
              Bank transfer instructions
              <textarea value={settings.bankTransferInstructions} onChange={(event) => setSettings({ ...settings, bankTransferInstructions: event.target.value })} />
            </label>
            <h3 style={{ marginTop: '20px', marginBottom: '8px', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Social Media Links (Footer Icons)
            </h3>
            <label>
              Instagram URL
              <input
                type="url"
                placeholder="https://instagram.com/zyrastore"
                value={settings.instagramUrl || ''}
                onChange={(event) => setSettings({ ...settings, instagramUrl: event.target.value })}
              />
            </label>
            <label>
              Facebook URL
              <input
                type="url"
                placeholder="https://facebook.com/zyrastore"
                value={settings.facebookUrl || ''}
                onChange={(event) => setSettings({ ...settings, facebookUrl: event.target.value })}
              />
            </label>
            <label>
              YouTube URL
              <input
                type="url"
                placeholder="https://youtube.com/@zyrastore"
                value={settings.youtubeUrl || ''}
                onChange={(event) => setSettings({ ...settings, youtubeUrl: event.target.value })}
              />
            </label>
            <label>
              TikTok URL
              <input
                type="url"
                placeholder="https://tiktok.com/@zyrastore"
                value={settings.tiktokUrl || ''}
                onChange={(event) => setSettings({ ...settings, tiktokUrl: event.target.value })}
              />
            </label>
            <label>
              WhatsApp Link / Number
              <input
                type="text"
                placeholder="https://wa.me/966595943013"
                value={settings.whatsappUrl || ''}
                onChange={(event) => setSettings({ ...settings, whatsappUrl: event.target.value })}
              />
            </label>
            <div className="admin-form-actions"><button type="button" className="outline-button" onClick={() => { if (window.confirm('Discard unsaved settings and reload the saved values?')) void loadAdminData(); }}>Discard changes</button><button className="dark-button">Save settings</button></div>
            {saved && <p className="success">{saved}</p>}
          </form>
        )}
        {(saved || adminError || orderActionBusy) && <div role={adminError ? 'alert' : 'status'} className={`admin-toast ${adminError ? 'error' : ''}`}>{orderActionBusy ? 'Updating order…' : adminError || saved}</div>}
      </section>
      {selectedOrder && <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} onStatus={updateOrder} catalog={adminCatalog} />}
    </main>
  );
}

function HomeCollectionCardsEditor({
  cards,
  collections,
  onSaved,
  onError,
}: {
  cards: HomeCollectionCard[];
  collections: Category[];
  onSaved: (cards: HomeCollectionCard[], message: string) => void;
  onError: (message: string) => void;
}) {
  const [drafts, setDrafts] = useState<HomeCollectionCard[]>(cards);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => setDrafts(cards), [cards]);

  const updateDraft = (key: string, patch: Partial<HomeCollectionCard>) => {
    setDrafts((current) => current.map((card) => card.key === key ? { ...card, ...patch } : card));
  };

  const save = async (card: HomeCollectionCard) => {
    if (!card.title.trim() || !card.eyebrow.trim() || !card.image || !card.collectionSlug) {
      onError('Card name, label, image and destination collection are required.');
      return;
    }
    setSavingKey(card.key);
    onError('');
    try {
      const response = await fetch('/api/admin/home-collection-cards', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(card),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Homepage collection card could not be saved.');
      onSaved(result, `${card.title.trim()} homepage card updated.`);
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : 'Homepage collection card could not be saved.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="admin-collection-manager admin-home-collection-manager">
      <div className="admin-section-head">
        <div>
          <p className="eyebrow">Homepage / Featured cards</p>
          <h2>Homepage collection cards</h2>
          <p>These editorial cards are separate from product categories. Change their display name, photo and where they open.</p>
        </div>
      </div>
      <div className="admin-home-card-list">
        {[...drafts].sort((left, right) => left.sortOrder - right.sortOrder).map((card) => (
          <form className="admin-home-card" key={card.key} onSubmit={(event) => { event.preventDefault(); void save(card); }}>
            <div className="admin-home-card-preview">
              <img src={card.image} alt="" />
              <span><small>{card.eyebrow}</small><b>{card.title}</b></span>
            </div>
            <div className="admin-home-card-fields">
              <label>
                Display name
                <input maxLength={80} value={card.title} onChange={(event) => updateDraft(card.key, { title: event.target.value })} />
              </label>
              <label>
                Small label
                <input maxLength={80} value={card.eyebrow} onChange={(event) => updateDraft(card.key, { eyebrow: event.target.value })} />
              </label>
              <label>
                Opens collection
                <select value={card.collectionSlug} onChange={(event) => updateDraft(card.key, { collectionSlug: event.target.value })}>
                  {collections.map((collection) => <option value={collection.slug} key={collection.slug}>{collection.name}</option>)}
                </select>
              </label>
              <label className="admin-home-card-toggle">
                <input type="checkbox" checked={card.enabled} onChange={(event) => updateDraft(card.key, { enabled: event.target.checked })} />
                Show on homepage
              </label>
            </div>
            <ImageUploader
              label="Card image"
              value={card.image}
              onChange={(image) => updateDraft(card.key, { image })}
              onError={onError}
              scope="collection"
            />
            <button className="dark-button" disabled={savingKey === card.key}>
              {savingKey === card.key ? 'Saving…' : 'Save homepage card'}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}

function CollectionNameEditor({
  collections,
  onSaved,
  onError,
}: {
  collections: Category[];
  onSaved: (collections: Category[], message: string) => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newImage, setNewImage] = useState('');
  const [busy, setBusy] = useState(false);

  const startEditing = (collection: Category) => {
    setEditingSlug(collection.slug);
    setName(collection.name);
    setImage(collection.image);
    onError('');
  };

  const save = async (collection: Category) => {
    const nextName = name.trim();
    if (!nextName || !image) {
      onError('Collection name and cover image are required.');
      return;
    }
    if (nextName === collection.name && image === collection.image) {
      setEditingSlug(null);
      return;
    }
    setBusy(true);
    onError('');
    try {
      const response = await fetch('/api/admin/collections', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: collection.slug, name: nextName, image }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Collection could not be renamed.');
      await onSaved(result, `${nextName} collection updated.`);
      setEditingSlug(null);
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : 'Collection could not be renamed.');
    } finally {
      setBusy(false);
    }
  };

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = newName.trim();
    const nextSlug = newSlug.trim().toLowerCase();
    if (!nextName || !nextSlug || !newImage) {
      onError('Collection name, URL slug and cover image are required.');
      return;
    }
    setBusy(true);
    onError('');
    try {
      const response = await fetch('/api/admin/collections', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: nextSlug, name: nextName, image: newImage }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Collection could not be created.');
      await onSaved(result, `${nextName} collection added.`);
      setCreateOpen(false); setNewName(''); setNewSlug(''); setNewImage('');
    } catch (createError) {
      onError(createError instanceof Error ? createError.message : 'Collection could not be created.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (collection: Category) => {
    const message = `Delete “${collection.name}” from the storefront? Its products and past orders will be kept, but linked homepage cards will be hidden.`;
    if (!window.confirm(message)) return;
    setBusy(true);
    onError('');
    try {
      const response = await fetch('/api/admin/collections', {
        method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug: collection.slug }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Collection could not be deleted.');
      await onSaved(result, `${collection.name} removed from the storefront.`);
    } catch (removeError) {
      onError(removeError instanceof Error ? removeError.message : 'Collection could not be deleted.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-collection-manager">
      <div className="admin-section-head">
        <div>
          <h2>Store collections</h2>
          <p>Create, update or remove a storefront collection. Removing a collection keeps its products and order history safe.</p>
        </div>
        <button type="button" className="dark-button" onClick={() => { setCreateOpen(true); onError(''); }}><Plus /> Add collection</button>
      </div>
      {createOpen && <form className="admin-collection-create" onSubmit={create}>
        <div className="form-grid">
          <label>Collection name<input required maxLength={80} value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Summer staples" /></label>
          <label>URL slug<input required pattern="[a-z0-9-]+" value={newSlug} onChange={(event) => setNewSlug(event.target.value.toLowerCase())} placeholder="summer-staples" /></label>
          <ImageUploader label="Collection cover image" value={newImage} onChange={setNewImage} onError={onError} scope="collection" />
        </div>
        <div className="admin-form-actions"><button type="button" className="outline-button" disabled={busy} onClick={() => setCreateOpen(false)}>Cancel</button><button className="dark-button" disabled={busy}>{busy ? 'Adding…' : 'Add collection'}</button></div>
      </form>}
      <div className="admin-collection-list">
        {collections.map((collection) => (
          <div className={`admin-collection-row ${editingSlug === collection.slug ? 'editing' : ''}`} key={collection.slug}>
            <img src={collection.image} alt="" />
            <span>
              <small>/{collection.slug}</small>
              {editingSlug === collection.slug ? (
                <input
                  maxLength={80}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void save(collection);
                    }
                    if (event.key === 'Escape') setEditingSlug(null);
                  }}
                  aria-label={`New name for ${collection.name}`}
                />
              ) : (
                <b>{collection.name}</b>
              )}
            </span>
            {editingSlug === collection.slug ? (
              <span className="admin-actions">
                <button disabled={busy} onClick={() => void save(collection)}>{busy ? 'Saving…' : 'Save'}</button>
                <button disabled={busy} onClick={() => setEditingSlug(null)}>Cancel</button>
              </span>
            ) : (
              <span className="admin-actions">
                <button className="outline-button" onClick={() => startEditing(collection)}><Pencil /> Edit</button>
                <button className="admin-danger-button" disabled={busy} onClick={() => void remove(collection)}><Trash2 /> Delete</button>
              </span>
            )}
            {editingSlug === collection.slug && <ImageUploader label="Collection cover image" value={image} onChange={setImage} onError={onError} scope="collection" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductEditor({
  product,
  collections,
  products,
  onCancel,
  onSaved,
}: {
  product: Product | null;
  collections: Category[];
  products: Product[];
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [productImages, setProductImages] = useState(() => [...(product ? getProductImages(product) : []), '', '', ''].slice(0, 4));
  const categoryOptions = Array.from(new Set([...products.map((entry) => entry.category), ...collections.map((entry) => entry.name)].filter(Boolean))).sort();
  const collectionOptions = Array.from(new Set([product?.collection, ...collections.map((entry) => entry.name)].filter((name): name is string => Boolean(name)))).sort();
  return (
    <form className="admin-product-form" onSubmit={async (event) => {
      event.preventDefault();
      const images = productImages.filter(Boolean);
      if (images.length < 1 || images.length > 4) {
        setError('Upload at least 1 and up to 4 product images.');
        return;
      }
      setBusy(true);
      setError('');
      const data = new FormData(event.currentTarget);
      const rupees = Number(data.get('price'));
      const compareRupees = Number(data.get('compareAt'));
      const body = {
        originalSlug: product?.slug,
        name: String(data.get('name') || '').trim(),
        slug: String(data.get('slug') || '').trim().toLowerCase(),
        category: String(data.get('category') || ''),
        collection: String(data.get('collection') || ''),
        price: Math.round(rupees * 100),
        compareAt: compareRupees > 0 ? Math.round(compareRupees * 100) : undefined,
        stock: Number(data.get('stock')),
        colors: String(data.get('colors') || '').split(',').map((value) => value.trim()).filter(Boolean),
        sizes: String(data.get('sizes') || '').split(',').map((value) => value.trim()).filter(Boolean),
        image: images[0],
        alternate: images[1] || images[0],
        images,
        description: String(data.get('description') || ''),
        featured: data.get('featured') === 'on',
        newArrival: data.get('newArrival') === 'on',
        rating: product?.rating || 0,
        reviews: product?.reviews || 0,
      };
      try {
        const response = await fetch('/api/admin/products', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Product could not be saved.');
        onSaved(`${body.name} ${product ? 'updated' : 'added'} successfully.`);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Product could not be saved.');
        setBusy(false);
      }
    }}>
      <div className="admin-section-head"><div><p className="eyebrow">{product ? 'Edit product' : 'New product'}</p><h2>{product?.name || 'Create a storefront item'}</h2></div><button type="button" className="icon-button" onClick={onCancel} aria-label="Close product form"><X /></button></div>
      <div className="form-grid">
        <label>Name<input name="name" required defaultValue={product?.name} /></label>
        <label>URL slug<input name="slug" required pattern="[a-z0-9-]+" defaultValue={product?.slug} placeholder="midnight-tee" /></label>
        <label>Category<select name="category" required defaultValue={product?.category || categoryOptions[0]}><option value="" disabled>Select a category</option>{categoryOptions.map((name) => <option value={name} key={name}>{name}</option>)}</select><small>Available categories come from your current product catalog.</small></label>
        <label>Collection<select name="collection" required defaultValue={product?.collection || ''}><option value="" disabled>Select a collection</option>{collectionOptions.map((name) => <option value={name} key={name}>{name}{!collections.some(entry => entry.name === name) ? ' (current)' : ''}</option>)}</select><small>Choose a store collection. Existing assignments are preserved.</small></label>
        <label>Price (PKR)<input name="price" required type="number" min="0" step="1" defaultValue={product ? product.price / 100 : ''} /></label>
        <label>Compare price (PKR)<input name="compareAt" type="number" min="0" step="1" defaultValue={product?.compareAt ? product.compareAt / 100 : ''} /></label>
        <label>Stock<input name="stock" required type="number" min="0" step="1" defaultValue={product?.stock ?? 0} /></label>
        <label>Sizes, comma separated<input name="sizes" required defaultValue={product?.sizes.join(', ') || 'S, M, L, XL'} /></label>
        <label className="wide">Colors, comma separated<input name="colors" required defaultValue={product?.colors.join(', ') || 'Obsidian, Bone'} /></label>
        {productImages.map((productImage, index) => (
          <ImageUploader
            key={index}
            label={`Product photo ${index + 1}${index === 0 ? ' (required)' : ' (optional)'}`}
            value={productImage}
            onChange={(value) => setProductImages((current) => current.map((entry, entryIndex) => entryIndex === index ? value : entry))}
            onError={setError}
          />
        ))}
        <label className="wide">Description<textarea name="description" required rows={4} defaultValue={product?.description} /></label>
      </div>
      {product && <ProductDetailsEditor slug={product.slug} sizes={product.sizes} />}
      <div className="admin-checks"><label><input type="checkbox" name="featured" defaultChecked={product?.featured} /> Featured</label><label><input type="checkbox" name="newArrival" defaultChecked={product?.newArrival ?? true} /> New arrival</label></div>
      {error && <p className="form-error">{error}</p>}
      <div className="admin-form-actions"><button type="button" className="outline-button" onClick={onCancel}>Cancel</button><button className="dark-button" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button></div>
    </form>
  );
}

function ImageUploader({
  label,
  value,
  onChange,
  onError,
  scope = 'product',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onError: (value: string) => void;
  scope?: 'product' | 'collection';
}) {
  const [uploading, setUploading] = useState(false);
  return (
    <div className="admin-image-upload">
      <span>{label}</span>
      {value && (
        <div className="admin-image-preview">
          <img src={value} alt={`${label} preview`} />
          <button type="button" className="outline-button" onClick={() => onChange('')}>Remove</button>
        </div>
      )}
      <label className="admin-file-button">
        {uploading ? 'Uploading…' : value ? 'Replace photo' : 'Choose photo'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={uploading}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setUploading(true);
            onError('');
            try {
              const form = new FormData();
              form.append('file', file);
              form.append('scope', scope);
              const response = await fetch('/api/admin/uploads', { method: 'POST', body: form });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error || 'Image could not be uploaded.');
              onChange(result.url);
            } catch (uploadError) {
              onError(uploadError instanceof Error ? uploadError.message : 'Image could not be uploaded.');
            } finally {
              setUploading(false);
              event.target.value = '';
            }
          }}
        />
      </label>
      <small>JPG, PNG, WebP or AVIF · maximum 4 MB</small>
    </div>
  );
}

const statusFlow: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['PROCESSING', 'CANCELLED'], PROCESSING: ['PACKED', 'CANCELLED'], PACKED: ['SHIPPED', 'CANCELLED'], SHIPPED: ['DELIVERED', 'RETURN_REQUESTED'], DELIVERED: ['RETURN_REQUESTED'], RETURN_REQUESTED: ['RETURNED'], CANCELLED: [], RETURNED: [],
};

function AdminProductDialog({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    dialog.current?.showModal();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  return <dialog ref={dialog} className="admin-product-dialog" aria-label="Product editor" onCancel={onClose} onClose={onClose}>{children}</dialog>;
}

function AdminOrders({ orders, onStatus, onSelect }: { orders: Order[]; onStatus: (order: Order, status: string) => void; onSelect: (order: Order) => void }) {
  return (
    <section className="admin-orders">
      <div className="admin-section-head"><div><h2>Orders</h2><p>Customer, contact, payment and fulfilment information in one place.</p></div><span className="status">{orders.length} records</span></div>
      {orders.length === 0 ? <div className="admin-empty"><PackageCheck /><h3>No orders yet</h3><p>Place a test order through the storefront; it will appear here instantly.</p></div> : orders.map((order) => (
        <div key={order.number}>
          <button className="order-link" onClick={() => onSelect(order)}><b>{order.number}</b><small>{new Date(order.createdAt).toLocaleString('en-PK')}</small></button>
          <span><b>{order.customer.firstName} {order.customer.lastName}</b><small>{order.customer.email}<br />{order.customer.phone}</small></span>
          <span><b>{money(order.total)}</b><small>{order.payment === 'safepay' ? `Safepay · ${order.paymentStatus || 'UNPAID'}` : order.payment === 'cod' ? 'Cash on delivery' : 'Bank transfer'}</small></span>
          <span className="status">{order.status.replaceAll('_', ' ')}</span>
          <select aria-label={`Update ${order.number} status`} value={order.status} onChange={(event) => onStatus(order, event.target.value)}>
            <option value={order.status}>{order.status.replaceAll('_', ' ')}</option>
            {statusFlow[order.status].map((status) => <option value={status} key={status}>{status.replaceAll('_', ' ')}</option>)}
          </select>
          <button className="icon-button" onClick={() => onSelect(order)} aria-label={`View ${order.number}`}><Eye /></button>
        </div>
      ))}
    </section>
  );
}

function OrderDetail({ order, onClose, onStatus, catalog }: { order: Order; onClose: () => void; onStatus: (order: Order, status: string) => void; catalog: Product[] }) {
  return <div className="overlay order-detail-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="order-detail" role="dialog" aria-modal="true" aria-label={`Order ${order.number}`}>
    <div className="panel-head"><div><p className="eyebrow">Order detail</p><b>{order.number}</b></div><button className="icon-button" onClick={onClose} aria-label="Close order details"><X /></button></div>
    <div className="order-detail-status"><span className="status">{order.status.replaceAll('_', ' ')}</span><select value={order.status} onChange={(event) => onStatus(order, event.target.value)}><option value={order.status}>{order.status.replaceAll('_', ' ')}</option>{statusFlow[order.status].map((status) => <option value={status} key={status}>{status.replaceAll('_', ' ')}</option>)}</select></div>
    <section><p className="eyebrow">Customer</p><h3>{order.customer.firstName} {order.customer.lastName}</h3><a href={`mailto:${order.customer.email}`}>{order.customer.email}</a><a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a></section>
    <section><p className="eyebrow">Deliver to</p><p>{order.delivery.address}<br />{order.delivery.city}, {order.delivery.province} {order.delivery.postal}</p>{order.delivery.note && <small>Note: {order.delivery.note}</small>}</section>
    <section><p className="eyebrow">{order.items.some(i=>i.customDetails)?'Custom order · design details':'Items'}</p>{order.items.map((item, index) => { const product = catalog.find((entry) => entry.slug === item.slug); return <div className="order-detail-line" key={`${item.slug}-${index}`}><img src={item.customDetails?.image || product?.image || '/product-tee.jpg'} alt={item.customDetails?'Customer artwork':''} /><span><b>{item.customDetails?'Custom shirt':product?.name || item.slug}</b><small>{item.color} / {item.size} · Qty {item.qty}</small><CustomItemDetails details={item.customDetails}/><CustomArtworkLinks details={item.customDetails}/></span><strong>{money(item.lineTotal)}</strong></div>; })}</section>
    <dl><div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div><div><dt>Shipping</dt><dd>{order.shipping ? money(order.shipping) : 'Free'}</dd></div><div className="total"><dt>Total</dt><dd>{money(order.total)}</dd></div></dl>
  </aside></div>;
}

function InfoPage({ path, settings }: { path: string; settings: StoreSettings }) {
  return <CustomerHelp path={path} settings={settings} />;
}

function Footer({ settings, collections = categories }: { settings?: StoreSettings; collections?: Category[] }) {
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleAccordion = (key: string) => {
    setActiveAccordion((prev) => (prev === key ? null : key));
  };

  const instagram = settings?.instagramUrl || 'https://instagram.com';
  const facebook = settings?.facebookUrl || 'https://facebook.com';
  const youtube = settings?.youtubeUrl || 'https://youtube.com';
  const tiktok = settings?.tiktokUrl || 'https://tiktok.com';
  const whatsapp = settings?.whatsappUrl || 'https://wa.me/966595943013';

  const shopLinks: Array<{ label: string; href: string; highlight?: boolean }> = [
    ...collections.map((collection) => ({ label: collection.name, href: `/collections/${collection.slug}` })),
    { label: 'Shop all', href: '/collections', highlight: true },
  ];

  const infoLinks = [
    { label: 'Track your order', href: '/track-order' },
    { label: 'Delivery information', href: '/pages/shipping' },
    { label: 'Returns & size exchanges', href: '/pages/returns' },
    { label: 'Sizing & shopping FAQs', href: '/pages/faq' },
    { label: 'Fabric & care guide', href: '/pages/fabric-care' },
    { label: 'Contact ZYRA', href: '/pages/contact' },
  ];

  const legalLinks = [
    { label: 'Terms of sale', href: '/pages/terms' },
    { label: 'Privacy Policy', href: '/pages/privacy' },
    { label: 'Website terms', href: '/pages/website-terms' },
  ];

  return (
    <footer
      style={{
        width: '100%',
        backgroundColor: '#070707',
        color: '#eae8e3',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        paddingTop: '48px',
        paddingBottom: '32px',
        overflow: 'hidden',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      data-purpose="main-brand-footer"
    >
      <div
        style={{
          maxWidth: isDesktop ? '1140px' : '480px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
      >
        {/* Brand Manifesto & Statement */}
        <section
          style={{
            marginBottom: '48px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '16px',
            }}
          >
            <span style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#d4d4d4', fontWeight: 500 }}>
              ZYRA · Streetwear
            </span>
          </div>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 38px)',
              lineHeight: 1.05,
              fontWeight: 900,
              letterSpacing: '-0.04em',
              color: '#ffffff',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            ALL THE TRENDS.
            <br />
            <span style={{ color: '#a3a3a3' }}>ONE DESTINATION.</span>
          </h2>
          <p
            style={{
              fontSize: '12px',
              lineHeight: 1.6,
              color: '#a3a3a3',
              fontWeight: 400,
              maxWidth: '360px',
              margin: '0 auto',
            }}
          >
            Trend-led streetwear with high-quality fabrics. From the graphic tee you’ve been looking for to the essentials you wear on repeat—find it at ZYRA.
          </p>
        </section>

        <section className="zyra-stay-connected" data-purpose="newsletter-dispatch">
          <p className="eyebrow">Keep up with ZYRA</p>
          <h3>Your next favourite is on the way.</h3>
          <p>See new arrivals, outfit ideas and what’s next on our Instagram.</p>
          <a href={instagram} target="_blank" rel="noreferrer">Follow ZYRA <ArrowRight aria-hidden="true" /></a>
        </section>

        {/* Quick Links: Accordion on Mobile / Separate Columns on Desktop */}
        <section
          style={{
            marginBottom: '48px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: isDesktop ? '32px' : '0',
          }}
          data-purpose="links-section"
        >
          {isDesktop ? (
            /* Desktop View: 3 Separate Columns Side-by-Side (Left-Aligned) */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '48px',
                textAlign: 'left',
              }}
            >
              {/* Column 1: SHOP */}
              <div>
                <h3
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#ffffff',
                    marginBottom: '16px',
                    marginTop: 0,
                  }}
                >
                  Shop Collections
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {shopLinks.map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        style={{
                          fontSize: '12px',
                          color: item.highlight ? '#ffffff' : '#a3a3a3',
                          fontWeight: item.highlight ? 700 : 400,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          textDecoration: 'none',
                          transition: 'color 0.15s ease',
                        }}
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 2: CLIENT SERVICES */}
              <div>
                <h3
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#ffffff',
                    marginBottom: '16px',
                    marginTop: 0,
                  }}
                >
                  Customer help
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {infoLinks.map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        style={{
                          fontSize: '12px',
                          color: '#a3a3a3',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          textDecoration: 'none',
                          transition: 'color 0.15s ease',
                        }}
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 3: POLICIES & VERIFICATION */}
              <div>
                <h3
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#ffffff',
                    marginBottom: '16px',
                    marginTop: 0,
                  }}
                >
                  Policies
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {legalLinks.map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        style={{
                          fontSize: '12px',
                          color: '#a3a3a3',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          textDecoration: 'none',
                          transition: 'color 0.15s ease',
                        }}
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            /* Mobile View: Centered Accordions */
            <div style={{ textAlign: 'center' }}>
              {/* Accordion 1: SHOP */}
              <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <button
                  type="button"
                  onClick={() => toggleAccordion('shop')}
                  style={{
                    width: '100%',
                    padding: '16px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#e5e5e5',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#e5e5e5' }}>
                    Shop Collections
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 300, color: '#a3a3a3', transition: 'transform 0.3s ease', transform: activeAccordion === 'shop' ? 'rotate(45deg)' : 'none' }}>
                    +
                  </span>
                </button>
                {activeAccordion === 'shop' && (
                  <div style={{ paddingBottom: '16px' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                      {shopLinks.map((item) => (
                        <li key={item.label}>
                          <a
                            href={item.href}
                            style={{
                              fontSize: '12px',
                              color: item.highlight ? '#ffffff' : '#a3a3a3',
                              fontWeight: item.highlight ? 700 : 400,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              textDecoration: 'none',
                            }}
                          >
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Accordion 2: CLIENT CARE */}
              <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <button
                  type="button"
                  onClick={() => toggleAccordion('info')}
                  style={{
                    width: '100%',
                    padding: '16px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#e5e5e5',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#e5e5e5' }}>
                    Customer help
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 300, color: '#a3a3a3', transition: 'transform 0.3s ease', transform: activeAccordion === 'info' ? 'rotate(45deg)' : 'none' }}>
                    +
                  </span>
                </button>
                {activeAccordion === 'info' && (
                  <div style={{ paddingBottom: '16px' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                      {infoLinks.map((item) => (
                        <li key={item.label}>
                          <a
                            href={item.href}
                            style={{
                              fontSize: '12px',
                              color: '#a3a3a3',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              textDecoration: 'none',
                            }}
                          >
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Accordion 3: LEGAL & POLICIES */}
              <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <button
                  type="button"
                  onClick={() => toggleAccordion('legal')}
                  style={{
                    width: '100%',
                    padding: '16px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#e5e5e5',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#e5e5e5' }}>
                    Policies
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 300, color: '#a3a3a3', transition: 'transform 0.3s ease', transform: activeAccordion === 'legal' ? 'rotate(45deg)' : 'none' }}>
                    +
                  </span>
                </button>
                {activeAccordion === 'legal' && (
                  <div style={{ paddingBottom: '16px' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                      {legalLinks.map((item) => (
                        <li key={item.label}>
                          <a
                            href={item.href}
                            style={{
                              fontSize: '12px',
                              color: '#a3a3a3',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              textDecoration: 'none',
                            }}
                          >
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Social Media Links Section */}
        <section style={{ marginBottom: '40px', textAlign: 'center' }} data-purpose="social-links">
          <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a3a3a3', marginBottom: '20px', fontWeight: 700 }}>
            Connect With The Subculture
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', color: '#d4d4d4' }}>
            {instagram && (
              <a
                aria-label="Instagram"
                href={instagram}
                target="_blank"
                rel="noreferrer"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  textDecoration: 'none',
                }}
              >
                <svg style={{ width: '18px', height: '18px' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            )}
            {facebook && (
              <a
                aria-label="Facebook"
                href={facebook}
                target="_blank"
                rel="noreferrer"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  textDecoration: 'none',
                }}
              >
                <svg style={{ width: '18px', height: '18px' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            )}
            {youtube && (
              <a
                aria-label="YouTube"
                href={youtube}
                target="_blank"
                rel="noreferrer"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  textDecoration: 'none',
                }}
              >
                <svg style={{ width: '18px', height: '18px' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            )}
            {tiktok && (
              <a
                aria-label="TikTok"
                href={tiktok}
                target="_blank"
                rel="noreferrer"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  textDecoration: 'none',
                }}
              >
                <svg style={{ width: '18px', height: '18px' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68 6.34 6.34 0 0 0 9.34 22a6.34 6.34 0 0 0 6.34-6.34V9.05a8.27 8.27 0 0 0 4.67 1.43V7.03a4.85 4.85 0 0 1-.76-.34z" />
                </svg>
              </a>
            )}
            {whatsapp && (
              <a
                aria-label="WhatsApp"
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  textDecoration: 'none',
                }}
              >
                <svg style={{ width: '18px', height: '18px' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.461c-1.776 0-3.517-.476-5.044-1.38l-.362-.215-3.748.983.999-3.655-.236-.375a10.024 10.024 0 0 1-1.536-5.385c0-5.556 4.52-10.076 10.078-10.076 2.69 0 5.219 1.047 7.121 2.95 1.902 1.903 2.948 4.433 2.947 7.124 0 5.558-4.522 10.078-10.079 10.078" />
                </svg>
              </a>
            )}
          </div>
        </section>

        <section className="footer-service-icons" aria-label="Payment and customer support" data-purpose="payment-guarantees">
          <div><i><CreditCard aria-hidden="true" /></i><span>Cash on delivery</span></div>
          <div><i><Landmark aria-hidden="true" /></i><span>Bank transfer</span></div>
          <a href="/track-order"><i><Truck aria-hidden="true" /></i><span>Track your order</span></a>
          <a href="/pages/returns"><i><PackageCheck aria-hidden="true" /></i><span>7-day exchange</span></a>
          <a href="/pages/contact"><i><CircleUserRound aria-hidden="true" /></i><span>Customer help</span></a>
        </section>

        {/* Back to Top Button */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{
              fontSize: '10px',
              letterSpacing: '0.15em',
              color: '#a3a3a3',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <span>Back to Top</span>
            <span style={{ fontSize: '12px' }}>↑</span>
          </button>
        </div>

        {/* Sub-footer Legal Meta Bar */}
        <section
          style={{
            paddingTop: '24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: isDesktop ? 'row' : 'column',
            justifyContent: isDesktop ? 'space-between' : 'center',
            alignItems: 'center',
            gap: '8px',
            textAlign: isDesktop ? 'left' : 'center',
          }}
          data-purpose="legal-bottom-bar"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
            <span>© {new Date().getFullYear()} ZYRA</span>
            <span>•</span>
            <span>Karachi, PK</span>
          </div>
          <p style={{ fontSize: '9px', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#737373', margin: 0, fontWeight: 400 }}>
            All rights reserved.
          </p>
        </section>
      </div>
    </footer>
  );
}
