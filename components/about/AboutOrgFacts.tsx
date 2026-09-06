import Link from 'next/link'

import { trackEvent } from '@/components/GoogleAnalytics'

import styles from './AboutOrgFacts.module.css'

// /about is a hybrid like /donate: the Notion page (edited in Notion) is the
// founder story; NotionPage.tsx injects this section below its body so the
// page also answers "what is the organization, and how do I reach it?" and
// stops dead-ending. /about#contact is the site's contact anchor.

const EMAIL = 'hi@techempower.org'
const EIN = '92-2581940'

// IRS TEOS has no stable per-EIN deep link; ProPublica does.
const IRS_TEOS_URL = 'https://apps.irs.gov/app/eos/'
const PROPUBLICA_URL = `https://projects.propublica.org/nonprofits/organizations/${EIN.replace('-', '')}`

const WHAT_WE_DO: {
  icon: string
  title: string
  text: string
  href: string
}[] = [
  {
    icon: '\u{1F4D6}',
    title: 'Plain-language guides',
    text: 'Step-by-step walkthroughs of programs like Lifeline, CalFresh, and low-cost internet: who qualifies, what to do, who to call.',
    href: '/guides'
  },
  {
    icon: '✅',
    title: 'The 2-minute benefits check',
    text: 'Answer a few questions and see which programs your household likely qualifies for. Runs on your device; your answers never leave it.',
    href: '/qualify'
  },
  {
    icon: '\u{1F5C2}️',
    title: 'The resource directory',
    text: 'Hundreds of free and low-cost programs, each hand-checked against its official source and searchable by topic.',
    href: '/resources'
  },
  {
    icon: '\u{1F3AC}',
    title: '"Wait, I Qualify?!"',
    text: 'A video series made with Nevada County Media that walks through one benefit per episode with the people who run it.',
    href: '/show'
  },
  {
    icon: '\u{1F527}',
    title: 'Repair and reuse',
    text: 'Donated electronics get wiped, repaired, and placed with families who need them. Only what is truly left over is recycled.',
    href: '/donate#gear'
  }
]

export function AboutOrgFacts() {
  return (
    <section
      id='organization'
      className={styles.section}
      aria-labelledby='org-h'
    >
      <p className={styles.divider}>About the organization</p>

      <h2 id='org-h' className={styles.heading}>
        TechEMPOWER.org
      </h2>
      <p className={styles.lede}>
        TechEMPOWER.org is a 501(c)(3) nonprofit based in Grass Valley,
        California. We explain the programs people already qualify for &mdash;
        in plain words, for free &mdash; and put working technology into the
        hands of families who need it. We serve everyone, and we focus on Nevada
        County.
      </p>

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>Status</dt>
          <dd>501(c)(3) public charity</dd>
        </div>
        <div className={styles.fact}>
          <dt>EIN</dt>
          <dd>{EIN}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Based in</dt>
          <dd>Grass Valley, California</dd>
        </div>
      </dl>

      <h3 className={styles.sub}>What we do</h3>
      <ul className={styles.grid}>
        {WHAT_WE_DO.map((item) => (
          <li key={item.title}>
            <Link href={item.href} className={styles.item}>
              <span className={styles.itemIcon} aria-hidden='true'>
                {item.icon}
              </span>
              <span>
                <span className={styles.itemTitle}>{item.title}</span>
                <span className={styles.itemText}>{item.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <h3 className={styles.sub}>Transparency</h3>
      <p className={styles.body}>
        Our nonprofit status and filings are public record. Look us up by EIN{' '}
        <strong>{EIN} </strong>on either register:
      </p>
      <ul className={styles.list}>
        <li>
          <a href={IRS_TEOS_URL} target='_blank' rel='noopener noreferrer'>
            IRS Tax Exempt Organization Search
          </a>{' '}
          &mdash; the official determination and filing history.
        </li>
        <li>
          <a href={PROPUBLICA_URL} target='_blank' rel='noopener noreferrer'>
            ProPublica Nonprofit Explorer
          </a>{' '}
          &mdash; the same filings in a readable form.
        </li>
      </ul>

      <section
        id='contact'
        className={styles.contact}
        aria-labelledby='contact-h'
      >
        <h3 id='contact-h' className={styles.contactHeading}>
          Contact
        </h3>
        <ul className={styles.contactList}>
          <li>
            <span className={styles.contactLabel}>Email</span>
            <a
              href={`mailto:${EMAIL}`}
              onClick={() => trackEvent('contact_email', { location: 'about' })}
            >
              {EMAIL}
            </a>
          </li>
          <li>
            <span className={styles.contactLabel}>Know a program?</span>
            <Link href='/submit'>Submit a resource</Link>
          </li>
          <li>
            <span className={styles.contactLabel}>Chat</span>
            <span>
              Join the Discord &mdash; the invite is on the{' '}
              <Link href='/show'>show page</Link>.
            </span>
          </li>
        </ul>
      </section>

      <div className={styles.actions}>
        <Link
          href='/qualify'
          className={styles.btnPrimary}
          onClick={() => trackEvent('qualify_intent', { location: 'about' })}
        >
          Take the 2-minute check
        </Link>
        <Link
          href='/donate'
          className={styles.btnSecondary}
          onClick={() => trackEvent('donate_intent', { location: 'about' })}
        >
          Donate
        </Link>
      </div>
    </section>
  )
}
