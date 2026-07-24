import Link from "next/link";
import Logo from "@/components/Logo";
import { ArrowLeftIcon } from "@/components/icons";

export const metadata = {
  title: "Terms and Conditions — TradeNotti",
};

type Block =
  | { p: string }
  | { ul: string[] }
  | { sub: string; p: string };

interface Section {
  n: number;
  heading: string;
  blocks: Block[];
}

const SECTIONS: Section[] = [
  {
    n: 1,
    heading: "Introduction",
    blocks: [
      { p: "Welcome to TradeNotti." },
      {
        p: 'These Terms and Conditions ("Terms") govern your access to and use of the TradeNotti website, web application, mobile applications, software, APIs, and related services (collectively, the "Services") provided by TradeNotti ("we," "our," or "us").',
      },
      {
        p: "By creating an account, accessing, or using the Services, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, you must not access or use the Services.",
      },
      {
        p: "These Terms form a legally binding agreement between you and TradeNotti regarding your use of the Services.",
      },
    ],
  },
  {
    n: 2,
    heading: "Eligibility",
    blocks: [
      { p: "To use the Services, you must:" },
      {
        ul: [
          "Be at least 18 years of age or the age of majority in your jurisdiction.",
          "Have the legal capacity to enter into a binding agreement.",
          "Comply with all applicable laws and regulations.",
          "Not be prohibited from using the Services under any applicable law.",
        ],
      },
      {
        p: "If you are using the Services on behalf of a business, organization, or other legal entity, you represent and warrant that you have the authority to bind that entity to these Terms.",
      },
    ],
  },
  {
    n: 3,
    heading: "Your Account",
    blocks: [
      {
        p: "To access certain features of the Services, you may be required to create an account.",
      },
      {
        p: "You agree to provide accurate, complete, and current information during registration and to keep such information updated.",
      },
      {
        p: "You are responsible for maintaining the confidentiality of your login credentials and for all activities conducted through your account.",
      },
      {
        p: "You agree to notify us immediately if you become aware of any unauthorized use of your account or any other security breach.",
      },
      {
        p: "We reserve the right to suspend or terminate accounts that contain false, misleading, or incomplete information.",
      },
    ],
  },
  {
    n: 4,
    heading: "Description of the Services",
    blocks: [
      {
        p: "TradeNotti provides a digital trading journal and performance analysis platform designed to assist traders in documenting, organizing, reviewing, and improving their trading activities.",
      },
      {
        p: "Depending on your subscription plan and feature availability, the Services may include:",
      },
      {
        ul: [
          "Trade journaling",
          "AI-insights",
          "Voice journaling and transcription",
          "Performance analytics",
          "Trading statistics",
          "Trade screenshots and attachments",
          "Broker integrations",
          "Importing trading history",
          "Educational insights",
          "Cloud synchronization",
          "Team or collaborative features",
          "API access",
          "Beta features",
        ],
      },
      { p: "Certain features may only be available under paid subscription plans." },
      {
        p: "We reserve the right to modify, discontinue, replace, or introduce features at any time without prior notice.",
      },
    ],
  },
  {
    n: 5,
    heading: "No Financial or Investment Advice",
    blocks: [
      {
        p: "TradeNotti is a technology platform intended to help users record and analyze trading activity.",
      },
      { p: "The Services do not provide:" },
      {
        ul: [
          "financial advice;",
          "investment advice;",
          "trading recommendations;",
          "portfolio management;",
          "brokerage services;",
          "execution of trades; or",
          "personalized investment recommendations.",
        ],
      },
      {
        p: "Any analytics, statistics, insights, AI-generated summaries, suggestions, reports, charts, or other information provided through the Services are for informational purposes only.",
      },
      {
        p: "You remain solely responsible for evaluating any information provided through the Services and for making your own trading and investment decisions.",
      },
      {
        p: "Trading financial instruments involves substantial risk. Past performance does not guarantee future results.",
      },
    ],
  },
  {
    n: 6,
    heading: "AI Features",
    blocks: [
      {
        p: "TradeNotti may provide artificial intelligence features that assist users with documenting trades, generating summaries, organizing journal entries, identifying patterns, producing performance insights, transcribing voice recordings, and performing similar tasks.",
      },
      {
        p: "AI-generated outputs are automatically generated and may contain inaccuracies, omissions, or errors.",
      },
      { p: "You acknowledge and agree that:" },
      {
        ul: [
          "AI outputs are provided solely for informational purposes.",
          "AI-generated content should not be relied upon as professional, financial, legal, tax, or investment advice.",
          "You are responsible for reviewing all AI-generated content before relying on or sharing it.",
          "We do not guarantee the accuracy, completeness, reliability, or suitability of AI-generated outputs.",
        ],
      },
      {
        p: "We may improve, modify, replace, suspend, or discontinue AI features at any time.",
      },
    ],
  },
  {
    n: 7,
    heading: "Broker Integrations and Third-Party Services",
    blocks: [
      {
        p: "TradeNotti may allow users to connect accounts provided by third-party brokers, trading platforms, liquidity providers, data providers, or other financial service providers.",
      },
      { p: "These integrations are provided solely to improve user experience." },
      {
        p: "TradeNotti is not affiliated with, endorsed by, or responsible for any third-party broker unless expressly stated.",
      },
      {
        p: "Your relationship with any third-party provider is governed by that provider's own terms and policies.",
      },
      { p: "We do not guarantee:" },
      {
        ul: [
          "continuous connectivity;",
          "uninterrupted synchronization;",
          "compatibility with every broker;",
          "availability of integrations; or",
          "accuracy of data supplied by third parties.",
        ],
      },
      {
        p: "Broker integrations may become unavailable without notice due to changes made by the applicable third-party provider.",
      },
      {
        p: "You acknowledge that any information received from third-party providers may contain delays, inaccuracies, interruptions, or omissions.",
      },
    ],
  },
  {
    n: 8,
    heading: "User Content",
    blocks: [
      {
        p: "You retain ownership of the content you submit to the Services, including but not limited to:",
      },
      {
        ul: [
          "journal entries;",
          "trading notes;",
          "screenshots;",
          "uploaded files;",
          "images;",
          "voice recordings;",
          "documents;",
          "comments; and",
          "other materials.",
        ],
      },
      {
        p: "By submitting content to the Services, you grant TradeNotti a worldwide, non-exclusive, royalty-free license to host, store, reproduce, process, transmit, display, and otherwise use such content solely for the purpose of operating, maintaining, securing, improving, and providing the Services.",
      },
      { p: "You represent and warrant that:" },
      {
        ul: [
          "you own or have the necessary rights to submit your content;",
          "your content does not violate applicable law;",
          "your content does not infringe the rights of any third party; and",
          "your content does not contain malicious software or unlawful material.",
        ],
      },
      { p: "You remain solely responsible for all content submitted through your account." },
    ],
  },
  {
    n: 9,
    heading: "Data Ownership",
    blocks: [
      {
        p: "TradeNotti does not claim ownership of your trading journal, uploaded documents, voice recordings, or other user-generated content.",
      },
      { p: "Subject to these Terms, you retain all rights to your content." },
      { p: "However, we may process your content as necessary to:" },
      {
        ul: [
          "provide the Services;",
          "synchronize your data;",
          "generate analytics;",
          "perform AI processing;",
          "maintain security;",
          "detect fraud;",
          "comply with legal obligations; and",
          "improve product performance.",
        ],
      },
      {
        p: "Additional information regarding our handling of personal information is described in our Privacy Policy.",
      },
    ],
  },
  {
    n: 10,
    heading: "Intellectual Property Rights",
    blocks: [
      {
        p: "The Services, including all software, source code, designs, interfaces, graphics, logos, trademarks, trade names, text, documentation, databases, audiovisual content, features, functionality, and other materials made available through the Services, are owned by or licensed to TradeNotti and are protected by applicable intellectual property laws.",
      },
      {
        p: "Except as expressly permitted under these Terms, no portion of the Services may be copied, reproduced, modified, distributed, sold, licensed, leased, reverse engineered, decompiled, disassembled, or otherwise exploited without our prior written consent.",
      },
      {
        p: "TradeNotti and the TradeNotti logo, together with any associated branding, are trademarks or service marks of TradeNotti. Nothing in these Terms grants you any right or license to use our trademarks without our prior written permission.",
      },
      {
        p: "Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Services solely for your personal or internal business purposes.",
      },
    ],
  },
  {
    n: 11,
    heading: "Acceptable Use",
    blocks: [
      {
        p: "You agree to use the Services only in accordance with these Terms and all applicable laws and regulations.",
      },
      { p: "You must not:" },
      {
        ul: [
          "use the Services for any unlawful, fraudulent, or deceptive purpose;",
          "attempt to gain unauthorized access to the Services, our systems, or another user's account;",
          "interfere with or disrupt the operation, integrity, or security of the Services;",
          "upload viruses, malware, ransomware, or other harmful code;",
          "scrape, harvest, or collect data from the Services without authorization;",
          "use automated tools, bots, or scripts to access the Services in a manner that places an unreasonable burden on our infrastructure;",
          "reverse engineer, decompile, disassemble, or otherwise attempt to discover the source code of the Services except where permitted by applicable law;",
          "circumvent or attempt to circumvent security features or usage restrictions;",
          "impersonate another person or entity or misrepresent your identity;",
          "submit false, misleading, or inaccurate information;",
          "upload content that infringes the intellectual property or privacy rights of others;",
          "use the Services to transmit spam, unsolicited communications, or malicious content; or",
          "use the Services in any manner that could damage, disable, overburden, or impair the Services.",
        ],
      },
      {
        p: "We reserve the right to investigate suspected violations and to take any action we consider appropriate, including suspending or terminating access to the Services.",
      },
    ],
  },
  {
    n: 12,
    heading: "Subscription Plans and Billing",
    blocks: [
      { p: "Certain features of the Services are available only through paid subscription plans." },
      {
        p: "Subscription pricing, features, usage limits, and billing intervals are described on our pricing page and may change from time to time.",
      },
      {
        p: "By purchasing a subscription, you authorize us or our third-party payment processor to charge the applicable fees using your selected payment method.",
      },
      {
        p: "Unless otherwise stated, subscriptions automatically renew at the end of each billing period until cancelled.",
      },
      { p: "You are responsible for ensuring that your payment information remains accurate and up to date." },
      {
        p: "If payment cannot be successfully processed, we may suspend or restrict access to paid features until payment is received.",
      },
      { p: "Applicable taxes, duties, or governmental charges may be added where required by law." },
    ],
  },
  {
    n: 13,
    heading: "Free Trials and Promotional Offers",
    blocks: [
      {
        p: "From time to time, we may offer free trials, promotional pricing, discounts, or other limited-time offers.",
      },
      { p: "Unless otherwise specified, these offers:" },
      {
        ul: [
          "may be subject to eligibility requirements;",
          "may be limited to one per user or organization;",
          "may be withdrawn at any time; and",
          "have no cash value.",
        ],
      },
      {
        p: "If a free trial converts into a paid subscription, billing will begin automatically unless you cancel before the trial period ends.",
      },
    ],
  },
  {
    n: 14,
    heading: "Refund Policy",
    blocks: [
      { p: "Except where required by applicable law, subscription fees are non-refundable." },
      {
        p: "Cancellation of a subscription prevents future renewals but does not entitle you to a refund for any unused portion of the current billing period.",
      },
      {
        p: "If you believe you have been charged in error, you must contact us promptly so we can investigate the matter.",
      },
      {
        p: "Nothing in this section limits any rights that cannot be excluded under applicable consumer protection laws.",
      },
    ],
  },
  {
    n: 15,
    heading: "Beta Features",
    blocks: [
      {
        p: "We may make certain features, products, integrations, or services available as beta, preview, early access, or experimental features.",
      },
      {
        p: "Beta features are provided for evaluation purposes and may contain bugs, errors, interruptions, or incomplete functionality.",
      },
      { p: "Beta features may be modified, suspended, or discontinued at any time without notice." },
      {
        p: "We make no representations or warranties regarding the availability, reliability, or performance of beta features.",
      },
      { p: "Your use of beta features is entirely at your own risk." },
      {
        p: "Feedback you voluntarily provide regarding beta features may be used by us without restriction or compensation for the purpose of improving the Services.",
      },
    ],
  },
  {
    n: 16,
    heading: "Service Availability",
    blocks: [
      {
        p: "We strive to provide reliable access to the Services but do not guarantee uninterrupted or error-free operation.",
      },
      { p: "The Services may occasionally become unavailable due to:" },
      {
        ul: [
          "scheduled maintenance;",
          "emergency maintenance;",
          "software updates;",
          "technical failures;",
          "network interruptions;",
          "third-party service outages;",
          "security incidents; or",
          "events beyond our reasonable control.",
        ],
      },
      {
        p: "We may temporarily suspend access to all or part of the Services where necessary to protect users, maintain security, or perform maintenance.",
      },
      {
        p: "We are not responsible for any loss resulting from temporary interruptions or unavailability of the Services.",
      },
    ],
  },
  {
    n: 17,
    heading: "Third-Party Services",
    blocks: [
      {
        p: "The Services may contain links to or integrations with third-party websites, software, payment processors, brokers, cloud providers, authentication providers, analytics services, communication platforms, or other external services.",
      },
      { p: "These third-party services are operated independently of TradeNotti." },
      {
        p: "We do not control and are not responsible for the content, availability, security, privacy practices, or performance of any third-party service.",
      },
      {
        p: "Your use of third-party services is governed solely by the applicable terms and policies of those providers.",
      },
      { p: "We encourage you to review those terms before using any third-party service through the Services." },
    ],
  },
  {
    n: 18,
    heading: "Feedback",
    blocks: [
      {
        p: "If you submit comments, ideas, suggestions, recommendations, feature requests, or other feedback relating to the Services, you agree that such feedback is provided voluntarily.",
      },
      {
        p: "You grant TradeNotti the unrestricted right to use, modify, reproduce, distribute, and incorporate your feedback into the Services without compensation, acknowledgment, or obligation to you.",
      },
      { p: "Nothing in these Terms requires us to implement or respond to any feedback submitted." },
    ],
  },
  {
    n: 19,
    heading: "Disclaimer of Warranties",
    blocks: [
      {
        p: 'The Services are provided on an "as is" and "as available" basis, without warranties of any kind, whether express, implied, statutory, or otherwise.',
      },
      {
        p: "To the fullest extent permitted by applicable law, TradeNotti disclaims all warranties, including any implied warranties of merchantability, fitness for a particular purpose, title, non-infringement, accuracy, reliability, availability, and uninterrupted operation.",
      },
      { p: "We do not warrant that:" },
      {
        ul: [
          "the Services will meet your requirements or expectations;",
          "the Services will operate without interruption, delay, or error;",
          "defects or errors will be corrected;",
          "the Services will always be secure or free from viruses or other harmful components;",
          "information, analytics, AI-generated content, or reports produced through the Services are accurate, complete, or suitable for any particular purpose; or",
          "integrations with third-party providers will remain available.",
        ],
      },
      { p: "Your use of the Services is entirely at your own risk." },
    ],
  },
  {
    n: 20,
    heading: "Limitation of Liability",
    blocks: [
      {
        p: "To the fullest extent permitted by applicable law, TradeNotti, its affiliates, directors, officers, employees, contractors, licensors, and service providers shall not be liable for any indirect, incidental, consequential, special, exemplary, or punitive damages arising out of or relating to your use of, or inability to use, the Services.",
      },
      { p: "This includes, without limitation, damages for:" },
      {
        ul: [
          "loss of profits;",
          "trading losses;",
          "loss of revenue;",
          "loss of business opportunities;",
          "loss of goodwill;",
          "loss of data;",
          "business interruption; or",
          "procurement of substitute services.",
        ],
      },
      {
        p: "Our total aggregate liability arising from or relating to the Services shall not exceed the amount you paid to TradeNotti for the Services during the twelve (12) months preceding the event giving rise to the claim.",
      },
      {
        p: "Some jurisdictions do not allow certain limitations of liability. In such jurisdictions, the foregoing limitations shall apply only to the maximum extent permitted by law.",
      },
    ],
  },
  {
    n: 21,
    heading: "Indemnification",
    blocks: [
      {
        p: "You agree to defend, indemnify, and hold harmless TradeNotti, its affiliates, directors, officers, employees, contractors, licensors, and service providers from and against any claims, liabilities, damages, judgments, losses, costs, and expenses, including reasonable legal fees, arising out of or relating to:",
      },
      {
        ul: [
          "your use of the Services;",
          "your violation of these Terms;",
          "your violation of applicable law;",
          "your infringement of any intellectual property or other rights of a third party; or",
          "content submitted through your account.",
        ],
      },
      { p: "This obligation survives the termination of these Terms." },
    ],
  },
  {
    n: 22,
    heading: "Suspension and Termination",
    blocks: [
      {
        p: "We reserve the right to suspend, restrict, or terminate your access to all or part of the Services at any time, with or without notice, if we reasonably believe that:",
      },
      {
        ul: [
          "you have violated these Terms;",
          "your use of the Services poses a security risk;",
          "your activities are unlawful or fraudulent;",
          "continued access may expose us or other users to legal or operational risk; or",
          "suspension or termination is otherwise necessary to protect the Services or our users.",
        ],
      },
      {
        p: "You may stop using the Services at any time and may cancel your account in accordance with the account settings provided within the Services.",
      },
      { p: "Termination does not affect any rights or obligations accrued before the effective date of termination." },
      {
        p: "Any provisions of these Terms that by their nature should survive termination shall remain in effect after termination.",
      },
    ],
  },
  {
    n: 23,
    heading: "Changes to the Services",
    blocks: [
      { p: "We continually improve and update the Services." },
      {
        p: "Accordingly, we may add, remove, modify, suspend, or discontinue any feature, functionality, integration, subscription plan, or portion of the Services at any time.",
      },
      { p: "Where reasonably practicable, we will provide advance notice of material changes." },
      { p: "Nothing in these Terms obligates us to maintain any specific feature indefinitely." },
    ],
  },
  {
    n: 24,
    heading: "Changes to these Terms",
    blocks: [
      { p: "We may revise these Terms from time to time." },
      {
        p: "When material changes are made, we may provide notice through the Services, by email, or by other reasonable means.",
      },
      {
        p: "The updated Terms become effective on the date specified at the top of the document unless otherwise stated.",
      },
      {
        p: "Your continued use of the Services after revised Terms become effective constitutes your acceptance of the updated Terms.",
      },
      { p: "If you do not agree to the revised Terms, you must discontinue your use of the Services." },
    ],
  },
  {
    n: 25,
    heading: "Governing Law",
    blocks: [
      {
        p: "These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which TradeNotti is incorporated, without regard to its conflict of law principles.",
      },
      {
        p: "You agree that any legal action or proceeding arising out of or relating to these Terms or the Services shall be brought exclusively before the courts having jurisdiction in that jurisdiction, unless applicable law requires otherwise.",
      },
    ],
  },
  {
    n: 26,
    heading: "Miscellaneous",
    blocks: [
      {
        sub: "Entire Agreement",
        p: "These Terms, together with our Privacy Policy and any additional policies expressly incorporated by reference, constitute the entire agreement between you and TradeNotti regarding the Services.",
      },
      {
        sub: "Severability",
        p: "If any provision of these Terms is determined to be unlawful, invalid, or unenforceable, the remaining provisions shall remain in full force and effect.",
      },
      {
        sub: "Waiver",
        p: "Our failure to enforce any provision of these Terms shall not constitute a waiver of that provision or of any other rights.",
      },
      {
        sub: "Assignment",
        p: "You may not assign or transfer your rights or obligations under these Terms without our prior written consent. We may assign or transfer our rights and obligations under these Terms without restriction in connection with a merger, acquisition, corporate restructuring, sale of assets, or operation of law.",
      },
      {
        sub: "Force Majeure",
        p: "We shall not be liable for any delay or failure to perform our obligations resulting from events beyond our reasonable control, including natural disasters, acts of government, war, terrorism, labor disputes, power failures, internet outages, cyberattacks, pandemics, or failures of third-party infrastructure.",
      },
      {
        sub: "No Partnership",
        p: "Nothing in these Terms creates any partnership, joint venture, agency, employment, or fiduciary relationship between you and TradeNotti.",
      },
    ],
  },
  {
    n: 27,
    heading: "Contact Information",
    blocks: [
      {
        p: "If you have any questions regarding these Terms or the Services, you may contact us using the contact information provided on our official website.",
      },
      { p: "We will make reasonable efforts to respond to legitimate inquiries in a timely manner." },
      {
        p: "By accessing or using the Services, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.",
      },
    ],
  },
];

function BlockView({ block }: { block: Block }) {
  if ("ul" in block) {
    return (
      <ul className="my-3 flex flex-col gap-1.5 pl-5 text-[14.5px] leading-relaxed text-ink-soft marker:text-faint">
        {block.ul.map((item, i) => (
          <li key={i} className="list-disc">
            {item}
          </li>
        ))}
      </ul>
    );
  }
  if ("sub" in block) {
    return (
      <div className="mt-3">
        <div className="mb-1 text-[13.5px] font-semibold text-ink">{block.sub}</div>
        <p className="text-[14.5px] leading-relaxed text-ink-soft">{block.p}</p>
      </div>
    );
  }
  return <p className="my-3 text-[14.5px] leading-relaxed text-ink-soft">{block.p}</p>;
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo />
          <Link
            href="/login"
            className="mt-2 inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-muted hover:text-ink"
          >
            <ArrowLeftIcon size={15} /> Back
          </Link>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-9">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            TradeNotti Terms and Conditions
          </h1>
          <p className="mt-1.5 text-[13px] text-faint">Last Updated: June 24, 2026</p>

          <div className="mt-8 flex flex-col divide-y divide-line">
            {SECTIONS.map((s) => (
              <section key={s.n} className="py-5 first:pt-0 last:pb-0">
                <h2 className="text-[16px] font-semibold text-ink">
                  {s.n}. {s.heading}
                </h2>
                {s.blocks.map((b, i) => (
                  <BlockView key={i} block={b} />
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
