const couriers = [
  { name: 'TCS', image: '/couriers/tcs.png' },
  { name: 'Leopards Courier', image: '/couriers/leopards.png' },
  { name: 'M&P', image: '/couriers/mp.png' },
  { name: 'SLG Trax', image: '/couriers/trax.png' },
];

export function CourierLogos() {
  return <div className="courier-logo-grid" aria-label="Delivery partners">
    {couriers.map(courier => <span className={`courier-logo-card${courier.name === 'SLG Trax' ? ' courier-logo-dark' : ''}`} key={courier.name}><img src={courier.image} alt={courier.name} width={140} height={64} loading="lazy" /></span>)}
  </div>;
}
