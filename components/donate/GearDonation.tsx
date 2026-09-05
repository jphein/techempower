import Link from 'next/link'

import { trackEvent } from '@/components/GoogleAnalytics'

import styles from './GearDonation.module.css'

// /donate is a hybrid: the Notion page (edited in Notion) is the "give money"
// half; NotionPage.tsx injects <GearTeaser> above its title and <GearDonation>
// below its body for the "give gear" half.

const EMAIL = 'hi@techempower.org'

// Pre-filled email so a donor doesn't have to guess what we need to know.
const GEAR_MAILTO =
  `mailto:${EMAIL}?subject=` +
  encodeURIComponent('Electronics donation') +
  '&body=' +
  encodeURIComponent(
    [
      "Hi TechEMPOWER — I'd like to donate some gear.",
      '',
      'What it is:',
      '',
      'Working? (yes / no / not sure):',
      '',
      'Roughly how much (a bag, a carload, a truckload):',
      '',
      'Where it is (town):',
      '',
      'Drop-off or pickup?:',
      '',
      'Best way to reach me:'
    ].join('\n')
  )

const GEAR_WE_TAKE: { icon: string; title: string; text: string }[] = [
  {
    icon: '💻',
    title: 'Computers & laptops',
    text: 'Desktops, laptops, Chromebooks, servers, parts. Any age, any condition.'
  },
  {
    icon: '📱',
    title: 'Phones & tablets',
    text: 'Smartphones, flip phones, iPads, e-readers — cracked screens welcome.'
  },
  {
    icon: '🖥️',
    title: 'Screens & TVs',
    text: 'Monitors, flat-screen TVs, projectors. Yes, even the old tube kind.'
  },
  {
    icon: '🔌',
    title: 'Cables, chargers & gadgets',
    text: 'Routers, printers, speakers, cameras, keyboards, that drawer of cords.'
  },
  {
    icon: '🤖',
    title: 'Robots, drones & toys',
    text: 'Game consoles, robot vacuums, drones, RC cars, anything with a battery inside.'
  },
  {
    icon: '🛴',
    title: 'E-bikes, scooters & hoverboards',
    text: 'The whole ride or just the battery pack. Dead packs too.'
  },
  {
    icon: '🔋',
    title: 'Lithium batteries — every kind',
    text: 'Phone, laptop, power-tool and e-bike packs, portable chargers, loose lithium cells, dead or alive. No alkaline, NiCad, NiMH or lead-acid, please.'
  },
  {
    icon: '⚡',
    title: 'Solar & power gear',
    text: 'Panels, inverters, portable power stations, UPS backups, generators.'
  },
  {
    icon: '🔧',
    title: 'Wire, electrical & lighting',
    text: 'Copper wire, electrical panels, breakers, conduit, enclosures, switches, outlets and other electrical supplies, motors, smart bulbs and LED fixtures. No fluorescent tubes or CFLs, please.'
  },
  {
    icon: '🛠️',
    title: 'Tools of all kinds',
    text: 'Power tools and their batteries, hand tools, meters and test gear, shop equipment. Working or not.'
  },
  {
    icon: '💿',
    title: 'Software, media & accounts',
    text: 'License keys, boxed software, CDs, DVDs, floppies, tape, transferable subscriptions and accounts, domains, cloud credits. If it helps a family or our shop, why not?'
  },
  {
    icon: '🚗',
    title: 'Electric vehicles',
    text: 'Cars, golf carts, mobility scooters. Running or not — we handle the DMV and IRS paperwork.'
  }
]

/** Teal chip rendered above the Notion title: "we take electronics too ↓". */
export function GearTeaser() {
  return (
    <div className={styles.teaserWrap}>
      <a
        href='#gear'
        className={styles.teaser}
        onClick={() => trackEvent('gear_teaser_click', { location: 'donate' })}
      >
        <span className={styles.teaserIcon} aria-hidden='true'>
          🔌
        </span>
        Old electronics, batteries, or an EV? We take those too
        <span className={styles.teaserArrow} aria-hidden='true'>
          ↓
        </span>
      </a>
    </div>
  )
}

/** The full "give gear" section rendered below the Notion body. */
export function GearDonation() {
  return (
    <section id='gear' className={styles.section} aria-labelledby='gear-h'>
      <p className={styles.divider}>Or give gear instead</p>

      <div className={styles.hero}>
        <div className={styles.heroIcons} aria-hidden='true'>
          <span>💻</span>
          <span>🔋</span>
          <span>🛴</span>
          <span>🤖</span>
          <span>🚗</span>
        </div>
        <h2 id='gear-h' className={styles.heading}>
          Donate your old electronics
        </h2>
        <p className={styles.lede}>
          If it plugs in, charges up, or ever did &mdash; we want it. Working or
          dead, ancient or brand new, one phone or a barn full. Working gear
          gets wiped, refurbished, and handed to a family that needs it.
          Everything else is recycled responsibly through a California-approved
          e-waste recycler. Nothing goes to the landfill.
        </p>
        <div className={styles.actions}>
          <a
            href={GEAR_MAILTO}
            className={styles.btnPrimary}
            onClick={() =>
              trackEvent('gear_donate_intent', { location: 'donate_hero' })
            }
          >
            Email us about your gear
          </a>
          <a href='#gear-what' className={styles.btnSecondary}>
            What do you take?
          </a>
        </div>
      </div>

      <h3 id='gear-what' className={styles.sub}>
        What we take
      </h3>
      <ul className={styles.grid}>
        {GEAR_WE_TAKE.map((item) => (
          <li key={item.title} className={styles.item}>
            <span className={styles.itemIcon} aria-hidden='true'>
              {item.icon}
            </span>
            <span>
              <span className={styles.itemTitle}>{item.title}</span>
              <span className={styles.itemText}>{item.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className={styles.note}>
        Not sure if something counts? It probably does. Ask.
      </p>

      <h3 className={styles.sub}>How it works</h3>
      <ol className={styles.steps}>
        <li>
          <strong>Tell us what you&rsquo;ve got. </strong>One email is plenty
          &mdash; a rough list and a photo if it&rsquo;s easy.
        </li>
        <li>
          <strong>We arrange a drop-off or a free pickup </strong>anywhere in
          Nevada County. Larger loads and vehicles are always picked up.
        </li>
        <li>
          <strong>You get a written receipt </strong>for your taxes, and we get
          to work.
        </li>
      </ol>
      <div className={styles.actions}>
        <a
          href={GEAR_MAILTO}
          className={styles.btnPrimary}
          onClick={() =>
            trackEvent('gear_donate_intent', { location: 'donate_steps' })
          }
        >
          Email {EMAIL}
        </a>
      </div>

      <h3 className={styles.sub}>Before you hand it over</h3>
      <ul className={styles.list}>
        <li>
          <strong>Back up </strong>anything you want to keep. We wipe every
          drive and phone before reuse and can send you a data-destruction
          confirmation on request &mdash; but once it&rsquo;s gone, it&rsquo;s
          gone.
        </li>
        <li>
          <strong>Sign out of your accounts. </strong>On iPhones and iPads, turn
          off Find My; on Android, remove your Google account; on Macs and
          Windows PCs, sign out of iCloud or Microsoft. A locked device
          can&rsquo;t be reused for anyone.
        </li>
        <li>
          <strong>Pull SIM cards and memory cards </strong>if you want them.
          Chargers and cables are a huge help &mdash; toss them in.
        </li>
      </ul>

      <div className={`${styles.callout} ${styles.calloutSafety}`} role='note'>
        <p className={styles.calloutTitle}>
          <span aria-hidden='true'>🔋</span> Battery safety
        </p>
        <ul>
          <li>
            <strong>
              Never put a lithium battery in the trash or recycling bin.
            </strong>{' '}
            It&rsquo;s illegal in California and it starts truck and landfill
            fires.
          </li>
          <li>
            Tape over the terminals of loose batteries (or drop each one in its
            own zip bag) and keep them out of a jumbled pile of metal.
          </li>
          <li>
            <strong>Swollen, leaking, crushed, or burned batteries:</strong>{' '}
            don&rsquo;t bring those to us. Set the item on concrete away from
            anything flammable and take it to the{' '}
            <a
              href='https://www.nevadacountyca.gov/3412/Transfer-Stations'
              target='_blank'
              rel='noopener noreferrer'
            >
              McCourtney Road Transfer Station
            </a>{' '}
            household hazardous waste drop-off (14741 Wolf Mountain Rd, Grass
            Valley). Free for households; call (530) 274-3090 to confirm hours
            before you go.
          </li>
        </ul>
      </div>

      <h3 className={styles.sub}>Your tax receipt</h3>
      <p className={styles.body}>
        TechEMPOWER.org is a 501(c)(3) nonprofit (EIN 92-2581940). We&rsquo;ll
        give you a written acknowledgment describing what you donated. The IRS
        has you, the donor, set the value &mdash; what it would sell for used
        today. A few thresholds worth knowing:
      </p>
      <ul className={styles.list}>
        <li>
          Over <strong>$500 </strong>in donated items for the year: attach{' '}
          <a
            href='https://www.irs.gov/forms-pubs/about-form-8283'
            target='_blank'
            rel='noopener noreferrer'
          >
            IRS Form 8283
          </a>{' '}
          to your return.
        </li>
        <li>
          A single item or group over <strong>$5,000</strong>: you need a
          qualified appraisal, and we sign Section B of your 8283.
        </li>
        <li>
          <strong>Vehicles </strong>(cars, golf carts, anything titled): we send
          you IRS Form 1098-C within 30 days, and we walk you through the DMV
          release of liability so the car is fully off your hands.
        </li>
      </ul>

      <div className={`${styles.callout} ${styles.calloutInfo}`}>
        <p className={styles.calloutTitle}>
          <span aria-hidden='true'>🏢</span> Businesses, schools, offices &
          agencies
        </p>
        <p>
          Clearing out a closet of old laptops or a fleet of monitors?
          We&rsquo;ll pick up in bulk, provide an itemized receipt, and certify
          NIST 800-88 data destruction for every drive and SSD &mdash; serial
          numbers listed, certificate of destruction included. Email{' '}
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
        </p>
      </div>

      <div className={`${styles.callout} ${styles.calloutInfo}`}>
        <p className={styles.calloutTitle}>
          <span aria-hidden='true'>🛍️</span> Thrift stores & fellow nonprofits
        </p>
        <p>
          Electronics pile up in the back room: untested, unwiped, and illegal
          to toss if there&rsquo;s a battery inside. We&rsquo;ll pick them up on
          a regular run, test and wipe the ones you can sell, and responsibly
          recycle the rest &mdash; free. Email{' '}
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a> to set up a pickup schedule.
        </p>
      </div>

      <p className={styles.fine}>
        Know a family who needs a computer, a phone, or help getting online?
        Point them to our <Link href='/'>free guides</Link>, the{' '}
        <Link href='/qualify'>2-minute benefits check</Link>, or the{' '}
        <Link href='/resources'>resource directory</Link>. Thank you for keeping
        this work going.
      </p>
    </section>
  )
}
