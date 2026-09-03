'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  Eye,
  Heart,
  Menu,
  Minus,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from 'lucide-react';
import {
  categories,
  money,
  products as seededProducts,
  type Product,
} from '@/lib/catalog';

type CartItem = { slug: string; size: string; color: string; qty: number };
type Order = {
  token: string;
  number: string;
  customer: { firstName: string; lastName: string; email: string; phone: string };
  delivery: { address: string; city: string; province: string; postal: string; note: string };
  items: Array<CartItem & { unitPrice: number; lineTotal: number }>;
  subtotal: number;
  shipping: number;
  total: number;
  payment: string;
  status: string;
  createdAt: string;
};
type StoreSettings = {
  storeName: string;
  supportEmail: string;
  freeShippingThreshold: number;
  flatShipping: number;
  bankTransferInstructions: string;
};
type ContentSection = { key: string; label: string; sortOrder: number; enabled: boolean };
const announcements = [
  'Free shipping across Pakistan over Rs. 4,999',
  '14-day size exchange on unworn pieces',
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

export default function StorefrontApp({ path }: { path: string }) {
  const [cart, setCart] = useState<CartItem[]>([]),
    [catalog, setCatalog] = useState<Product[]>(seededProducts),
    [ready, setReady] = useState(false),
    [menuOpen, setMenuOpen] = useState(false),
    [searchOpen, setSearchOpen] = useState(false),
    [cartOpen, setCartOpen] = useState(false),
    [notice, setNotice] = useState(0),
    [toast, setToast] = useState('');
  const countdown = useCountdown();
  useEffect(() => {
    try {
      setCart(JSON.parse(localStorage.getItem('zyra-cart') || '[]'));
    } catch {}
    setReady(true);
    fetch('/api/products')
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((value: Product[]) => setCatalog(value))
      .catch(() => {});
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
  const add = (item: CartItem) => {
    setCart((current) => {
      const found = current.find(
        (x) =>
          x.slug === item.slug &&
          x.size === item.size &&
          x.color === item.color,
      );
      return found
        ? current.map((x) =>
            x === found ? { ...x, qty: x.qty + item.qty } : x,
          )
        : [...current, item];
    });
    setCartOpen(true);
    setToast('Added to your bag');
    setTimeout(() => setToast(''), 2500);
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
              <span>PRIVATE SALE • UP TO 30% OFF</span>
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
        <Home catalog={catalog} />
      ) : path.startsWith('/products/') ? (
        <ProductView slug={path.split('/')[2]} add={add} catalog={catalog} />
      ) : path === '/collections' ||
        path.startsWith('/collections/') ||
        path === '/search' ? (
        <CatalogView path={path} catalog={catalog} />
      ) : path === '/cart' ? (
        <CartView cart={cart} subtotal={subtotal} update={update} catalog={catalog} />
      ) : path === '/checkout' ? (
        <CheckoutView
          cart={cart}
          subtotal={subtotal}
          catalog={catalog}
          onComplete={() => setCart([])}
        />
      ) : path.startsWith('/order-confirmation/') ? (
        <ConfirmationView token={path.split('/')[2]} />
      ) : path === '/track-order' ? (
        <TrackOrder />
      ) : path === '/account' ? (
        <AccountView />
      ) : path === '/admin/login' ? (
        <AdminLogin />
      ) : path.startsWith('/admin') ? (
        <AdminView catalog={catalog} onCatalogChange={setCatalog} />
      ) : (
        <InfoPage path={path} />
      )}
      {storefront && <Footer />}
      <Drawer open={menuOpen} close={() => setMenuOpen(false)} />
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
      <button className="icon-button" aria-label="Open menu" onClick={onMenu}>
        <Menu />
      </button>
      <a className="wordmark" href="/">
        ZYRA<span>®</span>
      </a>
      <nav className="header-actions" aria-label="Utility">
        <button className="icon-button" aria-label="Search" onClick={onSearch}>
          <Search />
        </button>
        <a
          className="icon-button hide-mobile"
          href="/account"
          aria-label="Account"
        >
          <CircleUserRound />
        </a>
        <button
          className="icon-button cart-link"
          aria-label={`Cart, ${count} items`}
          onClick={onCart}
        >
          <ShoppingBag />
          <span>{count}</span>
        </button>
      </nav>
    </header>
  );
}

function Drawer({ open, close }: { open: boolean; close: () => void }) {
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
            {categories.map((c) => (
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
          <a href="mailto:hello@zyra.store">hello@zyra.store</a>
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

function ProductCard({ product }: { product: Product }) {
  const discount = product.compareAt
    ? Math.round((1 - product.price / product.compareAt) * 100)
    : 0;
  return (
    <article className="product-card">
      <a href={`/products/${product.slug}`}>
        <div className="product-image">
          <img
            className="primary"
            src={product.image}
            alt={product.name}
            loading="lazy"
          />
          <img
            className="alternate"
            src={product.alternate}
            alt=""
            loading="lazy"
          />
          {product.stock === 0 ? (
            <span className="product-badge">Sold out</span>
          ) : discount ? (
            <span className="product-badge sale">-{discount}%</span>
          ) : product.stock < 5 ? (
            <span className="product-badge">Low stock</span>
          ) : null}
          <button
            className="heart"
            aria-label={`Save ${product.name}`}
            onClick={(e) => {
              e.preventDefault();
              e.currentTarget.classList.toggle('saved');
            }}
          >
            <Heart />
          </button>
        </div>
        <div className="product-meta">
          <p>{product.category}</p>
          <h3>{product.name}</h3>
          {product.reviews > 0 && (
            <small className="rating">
              ★★★★★{' '}
              <span>
                {product.rating} ({product.reviews} demo)
              </span>
            </small>
          )}
          <div>
            <strong>{money(product.price)}</strong>
            {product.compareAt && <del>{money(product.compareAt)}</del>}
          </div>
        </div>
      </a>
    </article>
  );
}

function Rail({
  title,
  label,
  list,
}: {
  title: string;
  label: string;
  list: Product[];
}) {
  return (
    <section className="section-shell product-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{label}</p>
          <h2>{title}</h2>
        </div>
        <a href="/collections">
          View all <span>↗</span>
        </a>
      </div>
      <div className="product-grid">
        {list.slice(0, 4).map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </section>
  );
}

function Home({ catalog }: { catalog: Product[] }) {
  return (
    <main>
      <section className="hero">
        <img
          src="/hero.jpg"
          alt="Model wearing a monochrome streetwear look in an urban setting"
        />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p>Drop 01 / 2026</p>
          <h1>
            Built for
            <br />
            after hours.
          </h1>
          <a className="light-button" href="/collections/after-hours">
            Shop the drop <span>↗</span>
          </a>
        </div>
        <p className="hero-caption">Karachi / 24°51′N 67°00′E</p>
      </section>
      <Rail title="Best sellers" label="Most wanted" list={catalog} />
      <section className="manifesto section-shell">
        <p className="eyebrow">ZYRA / EST. 2026</p>
        <h2>
          Uniforms for the people
          <br />
          who make their own hours.
        </h2>
      </section>
      <Rail
        title="Core forms"
        label="Wardrobe architecture"
        list={catalog.slice(6)}
      />
      <section className="editorial-grid">
        <a href={`/products/${(catalog[10] || catalog[0]).slug}`}>
          <img
            src="/campaign.jpg"
            alt="Editorial monochrome fashion portrait"
          />
          <div>
            <p className="eyebrow">Focus / 011</p>
            <h2>The Nocturne Hoodie</h2>
            <span>Shop the piece ↗</span>
          </div>
        </a>
        <a href="/collections/city-utility">
          <img src="/collection-store.jpg" alt="Minimal fashion studio" />
          <div>
            <p className="eyebrow">Collection / 003</p>
            <h2>City Utility</h2>
            <span>Explore collection ↗</span>
          </div>
        </a>
      </section>
      <Rail
        title="Lower division"
        label="Movement pieces"
        list={catalog.filter(
          (p) => p.category === 'Bottoms' || p.category === 'Essentials',
        )}
      />
      <section className="campaign-banner">
        <img
          src="/collection-studio.jpg"
          alt="Independent clothing studio interior"
        />
        <div>
          <p className="eyebrow">Essentials / Series 02</p>
          <h2>
            Nothing extra.
            <br />
            Everything considered.
          </h2>
          <a className="light-button" href="/collections/essentials">
            Shop essentials <span>↗</span>
          </a>
        </div>
      </section>
      <section className="section-shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Find your form</p>
            <h2>Collections</h2>
          </div>
        </div>
        <div className="collection-grid">
          {categories.map((c) => (
            <a href={`/collections/${c.slug}`} key={c.slug}>
              <img src={c.image} alt="" />
              <span>
                {c.name} <ArrowRight />
              </span>
            </a>
          ))}
        </div>
      </section>
      <section className="reviews section-shell">
        <div>
          <p className="eyebrow">Field reports / seeded demo reviews</p>
          <h2>
            Worn hard.
            <br />
            Rated honestly.
          </h2>
          <p className="review-score">
            4.8 <span>★★★★★</span>
          </p>
        </div>
        <div className="review-cards">
          <blockquote>
            “The weight is exactly right and the shoulder line sits clean.
            Already ordered a second color.”
            <cite>— Amaan K. / Verified demo order</cite>
          </blockquote>
          <blockquote>
            “Packaging, fit, and fabric all feel considered. The cargo has
            become my default.”<cite>— Noor R. / Verified demo order</cite>
          </blockquote>
        </div>
      </section>
      <section className="trust-strip">
        <div>
          <ShieldCheck />
          <span>
            Secure checkout<small>Protected order flow</small>
          </span>
        </div>
        <div>
          <Truck />
          <span>
            Fast dispatch<small>2–5 working days</small>
          </span>
        </div>
        <div>
          <CreditCard />
          <span>
            Flexible payment<small>COD or bank transfer</small>
          </span>
        </div>
        <div>
          <PackageCheck />
          <span>
            Easy exchange<small>14-day size exchange</small>
          </span>
        </div>
      </section>
    </main>
  );
}

function CatalogView({ path, catalog }: { path: string; catalog: Product[] }) {
  const pathSlug = path.split('/')[2];
  const category = categories.find((c) => c.slug === pathSlug);
  const [availability, setAvailability] = useState('all'),
    [sort, setSort] = useState('featured'),
    [selected, setSelected] = useState(category?.name || 'all'),
    [max, setMax] = useState(500000);
  const query =
    typeof window !== 'undefined'
      ? new URLSearchParams(location.search).get('q') || ''
      : '';
  const filtered = useMemo(
    () =>
      catalog
        .filter(
          (p) =>
            (selected === 'all' || p.category === selected) &&
            (availability === 'all' ||
              (availability === 'in' && p.stock > 0) ||
              (availability === 'out' && p.stock === 0)) &&
            p.price <= max &&
            (query === '' ||
              (p.name + p.category)
                .toLowerCase()
                .includes(query.toLowerCase())),
        )
        .sort((a, b) =>
          sort === 'low'
            ? a.price - b.price
            : sort === 'high'
              ? b.price - a.price
              : sort === 'name'
                ? a.name.localeCompare(b.name)
                : sort === 'new'
                  ? Number(b.newArrival) - Number(a.newArrival)
                  : Number(b.featured) - Number(a.featured),
        ),
    [availability, sort, selected, max, query, catalog],
  );
  return (
    <main className="catalog-page">
      <div className="catalog-hero">
        <p className="eyebrow">Archive / 2026</p>
        <h1>
          {path === '/search'
            ? query
              ? `Search: ${query}`
              : 'Search'
            : category?.name ||
              pathSlug?.replaceAll('-', ' ') ||
              'All collections'}
        </h1>
        <p>
          {category
            ? 'A focused edit of weight, proportion and everyday utility.'
            : 'Twenty-four original pieces across six core categories.'}
        </p>
      </div>
      <div className="catalog-tools">
        <div className="filter-row">
          <label>
            Category
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.slug}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            Availability
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            >
              <option value="all">All stock</option>
              <option value="in">In stock</option>
              <option value="out">Sold out</option>
            </select>
          </label>
          <label>
            Max price
            <select
              value={max}
              onChange={(e) => setMax(Number(e.target.value))}
            >
              <option value="500000">Up to Rs. 5,000</option>
              <option value="350000">Up to Rs. 3,500</option>
              <option value="250000">Up to Rs. 2,500</option>
            </select>
          </label>
        </div>
        <label>
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">Featured</option>
            <option value="new">Newest</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>
      <div className="catalog-count">
        {filtered.length} pieces{' '}
        <button
          onClick={() => {
            setSelected('all');
            setAvailability('all');
            setMax(500000);
          }}
        >
          Clear filters
        </button>
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
          <p>Clear a filter or explore the complete archive.</p>
          <button
            className="dark-button"
            onClick={() => {
              setSelected('all');
              setAvailability('all');
              setMax(500000);
            }}
          >
            Reset filters
          </button>
        </div>
      )}
    </main>
  );
}

function ProductView({
  slug,
  add,
  catalog,
}: {
  slug: string;
  add: (item: CartItem) => void;
  catalog: Product[];
}) {
  const product = catalog.find((entry) => entry.slug === slug) || catalog[0];
  const [size, setSize] = useState(''),
    [color, setColor] = useState(product.colors[0]),
    [qty, setQty] = useState(1),
    [image, setImage] = useState(product.image),
    [error, setError] = useState(''),
    [chart, setChart] = useState(false);
  useEffect(() => {
    setSize('');
    setColor(product.colors[0]);
    setQty(1);
    setImage(product.image);
    setError('');
  }, [product.slug]);
  const submit = (buy = false) => {
    if (!size) {
      setError('Choose a size before adding this piece.');
      return;
    }
    add({ slug: product.slug, size, color, qty });
    if (buy) location.href = '/checkout';
  };
  return (
    <main className="product-page">
      <div className="product-gallery">
        <div className="thumbs">
          <button onClick={() => setImage(product.image)}>
            <img src={product.image} alt="Front view" />
          </button>
          <button onClick={() => setImage(product.alternate)}>
            <img src={product.alternate} alt="Alternate view" />
          </button>
        </div>
        <button
          className="main-media"
          onClick={() =>
            setImage(
              image === product.image ? product.alternate : product.image,
            )
          }
          aria-label="Show alternate product image"
        >
          <img src={image} alt={product.name} />
          <span>Click to view alternate</span>
        </button>
      </div>
      <section className="product-info">
        <p className="eyebrow">
          {product.category} / {product.collection}
        </p>
        <h1>{product.name}</h1>
        {product.reviews ? (
          <a className="rating-link" href="#reviews">
            ★★★★★ {product.rating} · {product.reviews} demo reviews
          </a>
        ) : (
          <span className="rating-link">New release · no reviews yet</span>
        )}
        <div className="product-price">
          <strong>{money(product.price)}</strong>
          {product.compareAt && <del>{money(product.compareAt)}</del>}
        </div>
        <p>{product.description}</p>
        <fieldset>
          <legend>
            Color — <b>{color}</b>
          </legend>
          <div className="option-row">
            {product.colors.map((c) => (
              <button
                className={color === c ? 'selected' : ''}
                onClick={() => setColor(c)}
                key={c}
              >
                {c}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>
            Size <button onClick={() => setChart(true)}>Size guide</button>
          </legend>
          <div className="size-row">
            {product.sizes.map((s) => (
              <button
                className={size === s ? 'selected' : ''}
                onClick={() => {
                  setSize(s);
                  setError('');
                }}
                key={s}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="buy-row">
          <div className="quantity">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              aria-label="Decrease quantity"
            >
              <Minus />
            </button>
            <span>{qty}</span>
            <button
              onClick={() => setQty(qty + 1)}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <button
            className="dark-button"
            disabled={product.stock === 0}
            onClick={() => submit()}
          >
            {product.stock === 0 ? 'Sold out' : 'Add to bag'} <ShoppingBag />
          </button>
        </div>
        <button
          className="outline-button full"
          disabled={product.stock === 0}
          onClick={() => submit(true)}
        >
          Buy now
        </button>
        <p className={`stock ${product.stock < 5 ? 'low' : ''}`}>
          {product.stock === 0
            ? 'Currently unavailable'
            : product.stock < 5
              ? `Only ${product.stock} left in this release`
              : 'In stock · dispatches in 1–2 working days'}
        </p>
        <details open>
          <summary>
            Description <ChevronDown />
          </summary>
          <p>{product.description}</p>
        </details>
        <details>
          <summary>
            Composition & care <ChevronDown />
          </summary>
          <p>
            100% combed cotton. Cold wash inside out. Do not tumble dry or iron
            artwork.
          </p>
        </details>
        <details>
          <summary>
            Delivery & exchange <ChevronDown />
          </summary>
          <p>
            Tracked nationwide delivery. One complimentary size exchange within
            14 days.
          </p>
        </details>
      </section>
      {chart && (
        <div className="overlay modal-overlay">
          <section className="modal">
            <div className="panel-head">
              <b>SIZE GUIDE / CM</b>
              <button className="icon-button" onClick={() => setChart(false)}>
                <X />
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Chest</th>
                  <th>Length</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['S', '54', '69'],
                  ['M', '57', '72'],
                  ['L', '60', '75'],
                  ['XL', '63', '78'],
                ].map((r) => (
                  <tr key={r[0]}>
                    {r.map((c) => (
                      <td key={c}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
      <section id="reviews" className="related">
        <Rail
          title="Complete the rotation"
          label="Related pieces"
          list={catalog.filter((p) => p.slug !== product.slug).slice(0, 4)}
        />
      </section>
    </main>
  );
}

function CartView({
  cart,
  subtotal,
  update,
  catalog,
}: {
  cart: CartItem[];
  subtotal: number;
  update: (index: number, qty: number) => void;
  catalog: Product[];
}) {
  const [coupon, setCoupon] = useState(''),
    [applied, setApplied] = useState(false);
  const discount = applied ? Math.round(subtotal * 0.1) : 0,
    shipping = subtotal - discount >= 499900 ? 0 : 25000;
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
              if (!p) return null;
              return (
                <article key={`${item.slug}${i}`}>
                  <img src={p.image} alt={p.name} />
                  <div>
                    <p className="eyebrow">{p.category}</p>
                    <h2>
                      <a href={`/products/${p.slug}`}>{p.name}</a>
                    </h2>
                    <small>
                      {item.color} / {item.size}
                    </small>
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
            <label>
              Promo code
              <div className="coupon">
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="Try ZYRA10"
                />
                <button
                  onClick={() =>
                    setApplied(coupon.trim().toUpperCase() === 'ZYRA10')
                  }
                >
                  Apply
                </button>
              </div>
            </label>
            {coupon && applied && (
              <p className="success">Code applied: 10% off</p>
            )}
            {coupon && !applied && (
              <p className="hint">Enter ZYRA10 for this demo.</p>
            )}
            <dl>
              <div>
                <dt>Subtotal</dt>
                <dd>{money(subtotal)}</dd>
              </div>
              <div>
                <dt>Discount</dt>
                <dd>-{money(discount)}</dd>
              </div>
              <div>
                <dt>Shipping estimate</dt>
                <dd>{shipping ? money(shipping) : 'Free'}</dd>
              </div>
              <div className="total">
                <dt>Estimated total</dt>
                <dd>{money(subtotal - discount + shipping)}</dd>
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
  onComplete,
}: {
  cart: CartItem[];
  subtotal: number;
  catalog: Product[];
  onComplete: () => void;
}) {
  const [payment, setPayment] = useState('cod'),
    [same, setSame] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const shipping = subtotal >= 499900 ? 0 : 25000,
    total = subtotal + shipping;
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!cart.length) {
      setError('Your bag is empty.');
      return;
    }
    setBusy(true);
    setError('');
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
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
      if (!res.ok) throw new Error('Order could not be created');
      const order = (await res.json()) as Order;
      localStorage.setItem('zyra-last-order', JSON.stringify(order));
      onComplete();
      location.href = `/order-confirmation/${order.token}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };
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
          <p className="eyebrow">01 / Contact</p>
          <h1>Where should we send it?</h1>
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
              <input required name="address" autoComplete="street-address" />
            </label>
            <label>
              City
              <input required name="city" autoComplete="address-level2" />
            </label>
            <label>
              Province
              <select name="province" required>
                <option>Punjab</option>
                <option>Sindh</option>
                <option>Khyber Pakhtunkhwa</option>
                <option>Balochistan</option>
                <option>Islamabad Capital Territory</option>
              </select>
            </label>
            <label>
              Postal code
              <input
                name="postal"
                inputMode="numeric"
                autoComplete="postal-code"
              />
            </label>
            <label className="wide">
              Delivery note (optional)
              <textarea name="note" rows={3} />
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
          <p className="eyebrow form-section">04 / Payment</p>
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
          <label className="check">
            <input
              type="checkbox"
              checked={same}
              onChange={(e) => setSame(e.target.checked)}
            />{' '}
            Billing address is the same as shipping
          </label>
          {!same && (
            <div className="form-grid billing">
              <label className="wide">
                Billing address
                <input required name="billingAddress" />
              </label>
              <label>
                Billing city
                <input required name="billingCity" />
              </label>
              <label>
                Billing postal code
                <input name="billingPostal" />
              </label>
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="dark-button place-order" disabled={busy}>
            {busy ? 'Creating secure order…' : `Place order · ${money(total)}`}{' '}
            <ArrowRight />
          </button>
          <p className="checkout-note">
            <ShieldCheck /> Prices and availability are rechecked on the server
            before your order is created.
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
    <aside className="checkout-summary">
      <h2>Order summary</h2>
      {cart.map((item, i) => {
        const p = catalog.find((product) => product.slug === item.slug);
        if (!p) return null;
        return (
          <div className="checkout-line" key={`${item.slug}${i}`}>
            <div>
              <img src={p.image} alt="" />
              <span>{item.qty}</span>
            </div>
            <p>
              <b>{p.name}</b>
              <small>
                {item.color} / {item.size}
              </small>
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

function ConfirmationView({ token }: { token: string }) {
  const [order, setOrder] = useState<Order | null>(null),
    [loading, setLoading] = useState(true);
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
  return (
    <main className="confirmation">
      <div className="confirmation-mark">
        <Check />
      </div>
      <p className="eyebrow">Order confirmed</p>
      <h1>
        Thank you.
        <br />
        We’ve got it.
      </h1>
      <p>
        A confirmation is ready for <b>{order.customer.email}</b>. No real email is sent
        in demo mode.
      </p>
      <div className="confirmation-grid">
        <div>
          <small>Order number</small>
          <b>{order.number}</b>
        </div>
        <div>
          <small>Status</small>
          <b>{order.status}</b>
        </div>
        <div>
          <small>Payment</small>
          <b>
            {order.payment === 'bank'
              ? 'Awaiting transfer'
              : 'Cash on delivery'}
          </b>
        </div>
        <div>
          <small>Total</small>
          <b>{money(order.total)}</b>
        </div>
      </div>
      {order.payment === 'bank' && (
        <div className="bank-note">
          <b>Bank transfer demo instructions</b>
          <p>
            Use {order.number} as your payment reference. Admin must mark
            payment received before dispatch.
          </p>
        </div>
      )}
      <a className="dark-button" href="/collections">
        Continue shopping
      </a>
      <a className="text-link" href="/track-order">
        Track this order <ArrowRight />
      </a>
    </main>
  );
}

function TrackOrder() {
  const [result, setResult] = useState<Order | null | false>(null),
    [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const query = new URLSearchParams({
      number: String(form.get('number') || ''),
      contact: String(form.get('contact') || ''),
    });
    try {
      const response = await fetch(`/api/orders?${query}`);
      setResult(response.ok ? await response.json() : false);
    } catch {
      setResult(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="simple-page">
      <div>
        <p className="eyebrow">Shipment lookup</p>
        <h1>Track your order</h1>
        <p>
          Enter the order number and the matching email or phone used at
          checkout.
        </p>
        <form onSubmit={submit} className="stack-form">
          <label>
            Order number
            <input required name="number" placeholder="ZY-260903-XXXX" />
          </label>
          <label>
            Email or phone
            <input required name="contact" />
          </label>
          <button className="dark-button" disabled={busy}>
            {busy ? 'Checking…' : 'Track order'} <ArrowRight />
          </button>
        </form>
        {result === false && (
          <p className="form-error">No matching demo order was found.</p>
        )}
        {result && (
          <div className="tracking-result">
            <b>{result.number}</b>
            <span>{result.status}</span>
            <div className="timeline">
              <i className="done" />
              <i />
              <i />
              <i />
            </div>
            <small>Confirmed → Processing → Shipped → Delivered</small>
          </div>
        )}
      </div>
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
}: {
  catalog: Product[];
  onCatalogChange: (products: Product[]) => void;
}) {
  const [allowed, setAllowed] = useState<boolean | null>(null),
    [tab, setTab] = useState('dashboard'),
    [adminCatalog, setAdminCatalog] = useState<Product[]>(catalog),
    [orders, setOrders] = useState<Order[]>([]),
    [editing, setEditing] = useState<Product | null>(null),
    [productFormOpen, setProductFormOpen] = useState(false),
    [selectedOrder, setSelectedOrder] = useState<Order | null>(null),
    [settings, setSettings] = useState<StoreSettings>({ storeName: 'ZYRA', supportEmail: 'hello@zyra.store', freeShippingThreshold: 499900, flatShipping: 25000, bankTransferInstructions: 'Use your order number as the payment reference.' }),
    [sections, setSections] = useState<ContentSection[]>([]),
    [saved, setSaved] = useState(''),
    [adminError, setAdminError] = useState('');

  const loadAdminData = async () => {
    try {
      const [productResponse, publicResponse, orderResponse, settingsResponse, contentResponse] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/products'),
        fetch('/api/admin/orders'),
        fetch('/api/admin/settings'),
        fetch('/api/admin/content'),
      ]);
      if (productResponse.status === 401 || orderResponse.status === 401) {
        sessionStorage.removeItem('zyra-admin-demo');
        setAllowed(false);
        return;
      }
      if (!productResponse.ok || !publicResponse.ok || !orderResponse.ok || !settingsResponse.ok || !contentResponse.ok) {
        throw new Error('Admin data could not be loaded.');
      }
      setAdminCatalog(await productResponse.json());
      onCatalogChange(await publicResponse.json());
      setOrders(await orderResponse.json());
      setSettings(await settingsResponse.json());
      setSections(await contentResponse.json());
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
  };

  const archiveProduct = async (product: Product) => {
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
    setSaved(product.active === false ? `${product.name} restored.` : `${product.name} archived.`);
  };

  const updateOrder = async (order: Order, status: string) => {
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
  };
  return (
    <main className="admin-shell">
      <aside>
        <a className="wordmark" href="/">
          ZYRA<span>®</span>
        </a>
        <p className="eyebrow">Commerce OS</p>
        {['dashboard', 'products', 'orders', 'content', 'settings'].map((x) => (
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
            <div className="admin-section-head">
              <div><h2>Product catalog</h2><p>Add products, edit details, control visibility and adjust stock.</p></div>
              <button className="dark-button" onClick={() => { setEditing(null); setProductFormOpen(true); }}><Plus /> Add product</button>
            </div>
            {productFormOpen && (
              <ProductEditor
                product={editing}
                onCancel={() => { setEditing(null); setProductFormOpen(false); }}
                onSaved={async (message) => { await loadAdminData(); setSaved(message); setEditing(null); setProductFormOpen(false); }}
              />
            )}
            <div className="admin-table">
            <div className="table-head">
              <b>Product</b>
              <b>SKU</b>
              <b>Status</b>
              <b>Inventory</b>
              <b>Actions</b>
            </div>
            {adminCatalog.map((p, i) => (
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
                  <button onClick={() => void archiveProduct(p)}>{p.active === false ? 'Restore' : 'Archive'}</button>
                </span>
              </div>
            ))}
            </div>
          </section>
        )}
        {tab === 'orders' && <AdminOrders orders={orders} onStatus={updateOrder} onSelect={setSelectedOrder} />}
        {tab === 'content' && (
          <div className="admin-form">
            <h2>Homepage content</h2>
            {sections.map((section, i) => (
              <label className="toggle-row" key={section.key}>
                <span>
                  <b>{section.label}</b>
                  <small>Section {String(i + 1).padStart(2, '0')}</small>
                </span>
                <input type="checkbox" checked={section.enabled} onChange={(event) => setSections((current) => current.map((item) => item.key === section.key ? { ...item, enabled: event.target.checked } : item))} />
              </label>
            ))}
            <button
              className="dark-button"
              onClick={async () => {
                const response = await fetch('/api/admin/content', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sections }) });
                const result = await response.json();
                if (!response.ok) { setAdminError(result.error || 'Content could not be saved.'); return; }
                setSections(result); setSaved('Homepage content saved to Supabase.');
              }}
            >
              Save content order
            </button>
            {saved && <p className="success">{saved}</p>}
          </div>
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
              Bank transfer instructions
              <textarea value={settings.bankTransferInstructions} onChange={(event) => setSettings({ ...settings, bankTransferInstructions: event.target.value })} />
            </label>
            <button className="dark-button">Save settings</button>
            {saved && <p className="success">{saved}</p>}
          </form>
        )}
        {(saved || adminError) && <div className={`admin-toast ${adminError ? 'error' : ''}`}>{adminError || saved}</div>}
      </section>
      {selectedOrder && <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} onStatus={updateOrder} catalog={adminCatalog} />}
    </main>
  );
}

function ProductEditor({
  product,
  onCancel,
  onSaved,
}: {
  product: Product | null;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  return (
    <form className="admin-product-form" onSubmit={async (event) => {
      event.preventDefault();
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
        image: String(data.get('image') || ''),
        alternate: String(data.get('alternate') || ''),
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
        <label>Category<select name="category" defaultValue={product?.category || categories[0].name}>{categories.map((category) => <option key={category.slug}>{category.name}</option>)}</select></label>
        <label>Collection<input name="collection" required defaultValue={product?.collection || 'After Hours'} /></label>
        <label>Price (PKR)<input name="price" required type="number" min="0" step="1" defaultValue={product ? product.price / 100 : ''} /></label>
        <label>Compare price (PKR)<input name="compareAt" type="number" min="0" step="1" defaultValue={product?.compareAt ? product.compareAt / 100 : ''} /></label>
        <label>Stock<input name="stock" required type="number" min="0" step="1" defaultValue={product?.stock ?? 0} /></label>
        <label>Sizes, comma separated<input name="sizes" required defaultValue={product?.sizes.join(', ') || 'S, M, L, XL'} /></label>
        <label className="wide">Colors, comma separated<input name="colors" required defaultValue={product?.colors.join(', ') || 'Obsidian, Bone'} /></label>
        <label className="wide">Primary image path<input name="image" required defaultValue={product?.image || '/product-tee.jpg'} /></label>
        <label className="wide">Alternate image path<input name="alternate" required defaultValue={product?.alternate || '/campaign.jpg'} /></label>
        <label className="wide">Description<textarea name="description" required rows={4} defaultValue={product?.description} /></label>
      </div>
      <div className="admin-checks"><label><input type="checkbox" name="featured" defaultChecked={product?.featured} /> Featured</label><label><input type="checkbox" name="newArrival" defaultChecked={product?.newArrival ?? true} /> New arrival</label></div>
      {error && <p className="form-error">{error}</p>}
      <div className="admin-form-actions"><button type="button" className="outline-button" onClick={onCancel}>Cancel</button><button className="dark-button" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button></div>
    </form>
  );
}

const statusFlow: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['PROCESSING', 'CANCELLED'], PROCESSING: ['PACKED', 'CANCELLED'], PACKED: ['SHIPPED', 'CANCELLED'], SHIPPED: ['DELIVERED', 'RETURN_REQUESTED'], DELIVERED: ['RETURN_REQUESTED'], RETURN_REQUESTED: ['RETURNED'], CANCELLED: [], RETURNED: [],
};

function AdminOrders({ orders, onStatus, onSelect }: { orders: Order[]; onStatus: (order: Order, status: string) => void; onSelect: (order: Order) => void }) {
  return (
    <section className="admin-orders">
      <div className="admin-section-head"><div><h2>Orders</h2><p>Customer, contact, payment and fulfilment information in one place.</p></div><span className="status">{orders.length} records</span></div>
      {orders.length === 0 ? <div className="admin-empty"><PackageCheck /><h3>No orders yet</h3><p>Place a test order through the storefront; it will appear here instantly.</p></div> : orders.map((order) => (
        <div key={order.number}>
          <button className="order-link" onClick={() => onSelect(order)}><b>{order.number}</b><small>{new Date(order.createdAt).toLocaleString('en-PK')}</small></button>
          <span><b>{order.customer.firstName} {order.customer.lastName}</b><small>{order.customer.email}<br />{order.customer.phone}</small></span>
          <span><b>{money(order.total)}</b><small>{order.payment === 'cod' ? 'Cash on delivery' : 'Bank transfer'}</small></span>
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
    <section><p className="eyebrow">Items</p>{order.items.map((item, index) => { const product = catalog.find((entry) => entry.slug === item.slug); return <div className="order-detail-line" key={`${item.slug}-${index}`}><img src={product?.image || '/product-tee.jpg'} alt="" /><span><b>{product?.name || item.slug}</b><small>{item.color} / {item.size} · Qty {item.qty}</small></span><strong>{money(item.lineTotal)}</strong></div>; })}</section>
    <dl><div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div><div><dt>Shipping</dt><dd>{order.shipping ? money(order.shipping) : 'Free'}</dd></div><div className="total"><dt>Total</dt><dd>{money(order.total)}</dd></div></dl>
  </aside></div>;
}

function InfoPage({ path }: { path: string }) {
  const name =
    path.split('/').filter(Boolean).pop()?.replaceAll('-', ' ') || 'Page';
  return (
    <main className="simple-page">
      <div>
        <p className="eyebrow">ZYRA / Information</p>
        <h1>{name}</h1>
        <p>
          For this demonstration, the {name} page uses original sample copy.
          Contact{' '}
          <a className="inline-link" href="mailto:hello@zyra.store">
            hello@zyra.store
          </a>{' '}
          for support, delivery questions, returns, privacy, or wholesale
          enquiries.
        </p>
        <a className="dark-button" href="/collections">
          Return to shop
        </a>
      </div>
    </main>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-mission">
        <p className="eyebrow">Our mission</p>
        <h2>
          Make fewer pieces.
          <br />
          Make them matter.
        </h2>
        <p>
          ZYRA is an independent demo streetwear label built around proportion,
          utility and the restless energy of Karachi.
        </p>
      </div>
      <div>
        <b>SHOP</b>
        {categories.slice(0, 5).map((c) => (
          <a key={c.slug} href={`/collections/${c.slug}`}>
            {c.name}
          </a>
        ))}
      </div>
      <div>
        <b>INFO</b>
        {['Shipping', 'Returns', 'FAQ', 'Contact', 'Privacy', 'Terms'].map(
          (x) => (
            <a key={x} href={`/pages/${x.toLowerCase()}`}>
              {x}
            </a>
          ),
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const button = e.currentTarget.querySelector('button');
          if (button) button.textContent = 'Subscribed ✓';
        }}
      >
        <b>PRIVATE DISPATCH</b>
        <p>First access to drops, studio notes and restocks.</p>
        <label className="newsletter">
          <span className="sr-only">Email address</span>
          <input required type="email" placeholder="EMAIL ADDRESS" />
          <button>JOIN ↗</button>
        </label>
      </form>
      <div className="footer-base">
        <span>© 2026 ZYRA / DEMO COMMERCE</span>
        <span>KARACHI, PAKISTAN</span>
        <span>COD · BANK TRANSFER · SECURE CHECKOUT</span>
      </div>
    </footer>
  );
}
