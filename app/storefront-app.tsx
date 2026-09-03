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
  Heart,
  Menu,
  Minus,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from 'lucide-react';
import {
  categories,
  money,
  productBySlug,
  products,
  type Product,
} from '@/lib/catalog';

type CartItem = { slug: string; size: string; color: string; qty: number };
type Order = {
  token: string;
  number: string;
  email: string;
  phone: string;
  items: CartItem[];
  total: number;
  payment: string;
  status: string;
  createdAt: string;
};
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
    (sum, item) => sum + (productBySlug(item.slug)?.price || 0) * item.qty,
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
        <Home />
      ) : path.startsWith('/products/') ? (
        <ProductView slug={path.split('/')[2]} add={add} />
      ) : path === '/collections' ||
        path.startsWith('/collections/') ||
        path === '/search' ? (
        <CatalogView path={path} />
      ) : path === '/cart' ? (
        <CartView cart={cart} subtotal={subtotal} update={update} />
      ) : path === '/checkout' ? (
        <CheckoutView
          cart={cart}
          subtotal={subtotal}
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
        <AdminView />
      ) : (
        <InfoPage path={path} />
      )}
      {storefront && <Footer />}
      <Drawer open={menuOpen} close={() => setMenuOpen(false)} />
      <SearchPanel open={searchOpen} close={() => setSearchOpen(false)} />
      <CartPanel
        open={cartOpen}
        close={() => setCartOpen(false)}
        cart={cart}
        subtotal={subtotal}
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

function SearchPanel({ open, close }: { open: boolean; close: () => void }) {
  const [query, setQuery] = useState('');
  const found = query.trim()
    ? products
        .filter((p) =>
          (p.name + p.category).toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 5)
    : products.slice(0, 4);
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
}: {
  open: boolean;
  close: () => void;
  cart: CartItem[];
  subtotal: number;
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
                const p = productBySlug(item.slug)!;
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

function Home() {
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
      <Rail title="Best sellers" label="Most wanted" list={products} />
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
        list={products.slice(6)}
      />
      <section className="editorial-grid">
        <a href={`/products/${products[10].slug}`}>
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
        list={products.filter(
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

function CatalogView({ path }: { path: string }) {
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
      products
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
    [availability, sort, selected, max, query],
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
}: {
  slug: string;
  add: (item: CartItem) => void;
}) {
  const product = productBySlug(slug) || products[0];
  const [size, setSize] = useState(''),
    [color, setColor] = useState(product.colors[0]),
    [qty, setQty] = useState(1),
    [image, setImage] = useState(product.image),
    [error, setError] = useState(''),
    [chart, setChart] = useState(false);
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
          list={products.filter((p) => p.slug !== product.slug).slice(0, 4)}
        />
      </section>
    </main>
  );
}

function CartView({
  cart,
  subtotal,
  update,
}: {
  cart: CartItem[];
  subtotal: number;
  update: (index: number, qty: number) => void;
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
              const p = productBySlug(item.slug)!;
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
  onComplete,
}: {
  cart: CartItem[];
  subtotal: number;
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
        <OrderSummary cart={cart} subtotal={subtotal} shipping={shipping} />
      </form>
    </main>
  );
}

function OrderSummary({
  cart,
  subtotal,
  shipping,
}: {
  cart: CartItem[];
  subtotal: number;
  shipping: number;
}) {
  return (
    <aside className="checkout-summary">
      <h2>Order summary</h2>
      {cart.map((item, i) => {
        const p = productBySlug(item.slug)!;
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
  const [order, setOrder] = useState<Order | null>(null);
  useEffect(() => {
    try {
      const parsed = JSON.parse(
        localStorage.getItem('zyra-last-order') || 'null',
      );
      if (parsed?.token === token) setOrder(parsed);
    } catch {}
  }, [token]);
  if (!order)
    return (
      <main className="confirmation">
        <p className="eyebrow">Order lookup</p>
        <h1>Confirmation unavailable</h1>
        <p>This local demo keeps the latest confirmation in this browser.</p>
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
        A confirmation is ready for <b>{order.email}</b>. No real email is sent
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
  const [result, setResult] = useState<Order | null | false>(null);
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const last = JSON.parse(localStorage.getItem('zyra-last-order') || 'null');
    setResult(
      last &&
        last.number === form.get('number') &&
        (last.email === form.get('contact') ||
          last.phone === form.get('contact'))
        ? last
        : false,
    );
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
          <button className="dark-button">
            Track order <ArrowRight />
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
  const [error, setError] = useState('');
  return (
    <main className="admin-login">
      <a className="wordmark" href="/">
        ZYRA<span>®</span>
      </a>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          if (f.get('email') && String(f.get('password')).length >= 8) {
            sessionStorage.setItem('zyra-admin-demo', '1');
            location.href = '/admin';
          } else
            setError(
              'Use any valid email and at least 8 characters for this local demo.',
            );
        }}
      >
        <p className="eyebrow">Operations / Demo</p>
        <h1>Admin access</h1>
        <p>
          This prototype uses an isolated demo session. Production credentials
          are never hardcoded.
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
        <button className="dark-button">
          Enter operations <ArrowRight />
        </button>
      </form>
    </main>
  );
}

function AdminView() {
  const [allowed, setAllowed] = useState(false),
    [tab, setTab] = useState('dashboard'),
    [stock, setStock] = useState(
      Object.fromEntries(products.map((p) => [p.slug, p.stock])),
    ),
    [saved, setSaved] = useState('');
  useEffect(
    () => setAllowed(sessionStorage.getItem('zyra-admin-demo') === '1'),
    [],
  );
  if (!allowed)
    return (
      <main className="admin-login">
        <form>
          <h1>Protected area</h1>
          <p>Start a demo admin session to view operations.</p>
          <a className="dark-button" href="/admin/login">
            Go to admin login
          </a>
        </form>
      </main>
    );
  const low = Object.values(stock).filter((n) => n < 5).length;
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
          onClick={() => {
            sessionStorage.removeItem('zyra-admin-demo');
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
                <small>Demo revenue</small>
                <b>Rs. 184,290</b>
                <span>+12.4% this month</span>
              </div>
              <div>
                <small>Open orders</small>
                <b>18</b>
                <span>6 ready to pack</span>
              </div>
              <div>
                <small>Low stock SKUs</small>
                <b>{low}</b>
                <span>Needs attention</span>
              </div>
              <div>
                <small>Conversion</small>
                <b>3.8%</b>
                <span>Seeded metric</span>
              </div>
            </div>
            <AdminOrders />
          </>
        )}
        {tab === 'products' && (
          <div className="admin-table">
            <div className="table-head">
              <b>Product</b>
              <b>SKU</b>
              <b>Status</b>
              <b>Inventory</b>
            </div>
            {products.map((p, i) => (
              <div key={p.slug}>
                <span>
                  <img src={p.image} alt="" />
                  <b>{p.name}</b>
                </span>
                <code>ZY-{String(i + 1).padStart(3, '0')}</code>
                <span className="status">
                  {stock[p.slug] === 0 ? 'Sold out' : 'Active'}
                </span>
                <span className="inventory">
                  <button
                    onClick={() =>
                      setStock((s) => ({
                        ...s,
                        [p.slug]: Math.max(0, s[p.slug] - 1),
                      }))
                    }
                  >
                    −
                  </button>
                  <b>{stock[p.slug]}</b>
                  <button
                    onClick={() =>
                      setStock((s) => ({ ...s, [p.slug]: s[p.slug] + 1 }))
                    }
                  >
                    +
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
        {tab === 'orders' && <AdminOrders />}
        {tab === 'content' && (
          <div className="admin-form">
            <h2>Homepage content</h2>
            {[
              'Campaign hero',
              'Best sellers',
              'Brand manifesto',
              'Core forms',
              'Collection grid',
              'Customer reviews',
            ].map((x, i) => (
              <label className="toggle-row" key={x}>
                <span>
                  <b>{x}</b>
                  <small>Section {String(i + 1).padStart(2, '0')}</small>
                </span>
                <input type="checkbox" defaultChecked />
              </label>
            ))}
            <button
              className="dark-button"
              onClick={() =>
                setSaved('Homepage order saved locally for this demo.')
              }
            >
              Save content order
            </button>
            {saved && <p className="success">{saved}</p>}
          </div>
        )}
        {tab === 'settings' && (
          <form
            className="admin-form"
            onSubmit={(e) => {
              e.preventDefault();
              setSaved('Store settings saved for this demo session.');
            }}
          >
            <h2>Store settings</h2>
            <label>
              Store name
              <input defaultValue="ZYRA" />
            </label>
            <label>
              Support email
              <input type="email" defaultValue="hello@zyra.store" />
            </label>
            <label>
              Free shipping threshold
              <input defaultValue="4999" inputMode="numeric" />
            </label>
            <label>
              Bank transfer instructions
              <textarea defaultValue="Use your order number as the payment reference." />
            </label>
            <button className="dark-button">Save settings</button>
            {saved && <p className="success">{saved}</p>}
          </form>
        )}
      </section>
    </main>
  );
}

function AdminOrders() {
  return (
    <section className="admin-orders">
      <h2>Recent orders</h2>
      {[
        ['ZY-260903-A71C', 'A. Khan', 'Rs. 7,230', 'Confirmed'],
        ['ZY-260903-91BF', 'N. Rahman', 'Rs. 4,490', 'Packing'],
        ['ZY-260902-7D23', 'S. Ali', 'Rs. 9,180', 'Awaiting payment'],
        ['ZY-260902-E614', 'H. Noor', 'Rs. 2,740', 'Shipped'],
      ].map((row) => (
        <div key={row[0]}>
          {row.map((cell, i) => (
            <span key={cell} className={i === 3 ? 'status' : ''}>
              {cell}
            </span>
          ))}
          <select aria-label={`Update ${row[0]} status`} defaultValue={row[3]}>
            <option>Confirmed</option>
            <option>Processing</option>
            <option>Packing</option>
            <option>Shipped</option>
            <option>Delivered</option>
            <option>Cancelled</option>
            <option>Awaiting payment</option>
          </select>
        </div>
      ))}
    </section>
  );
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
