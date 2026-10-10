import { Heart } from "lucide-react"
import { LuxMark } from "@/components/lux/LuxLogo"

/**
 * Help articles for Lux, the parish module (simple events and faith
 * formation). Merged into the docs page; deep-link with /docs?section=<id>.
 */

const h3 = "text-xl font-semibold text-navy mt-6"
const ul = "list-disc list-inside space-y-2 text-gray-600"
const ol = "list-decimal list-inside space-y-4 text-gray-600"
const step = "ml-6 mt-1"
const tip = "rounded-lg border border-gold/40 bg-beige p-4 text-gray-700"
const link = "text-navy underline"

export const luxDocSections = [
  {
    id: "lux",
    title: "Lux for Parishes",
    icon: LuxMark,
    items: [
      { id: "lux-overview", title: "What is Lux?" },
      { id: "lux-setup", title: "Setting Up Lux" },
      { id: "lux-simple-events", title: "Simple Events & Sign-Ups" },
      { id: "lux-programs", title: "Faith Formation & Sacrament Programs" },
      { id: "lux-program-types", title: "OCIA, Family Programs & Baptism Preparation" },
      { id: "lux-class-times", title: "Class Times, Days & Grades" },
      { id: "lux-fees", title: "Tuition, Sibling Discounts & Family Maximum" },
      { id: "lux-documents", title: "Certificates, Letters & Documents" },
      { id: "lux-payments", title: "Payments, Pay at the Office & Fee Assistance" },
      { id: "lux-refunds", title: "Refunds" },
      { id: "lux-parish-page", title: "Your Parish Page & Website Button" },
      { id: "lux-spanish", title: "Spanish for Families" },
      { id: "lux-households", title: "Households & Returning Families" },
      { id: "lux-exports", title: "Rosters & Exports" },
      { id: "lux-privacy", title: "Who Can See What" },
      { id: "lux-upgrade", title: "When You Outgrow Simple Events" },
    ],
  },
  {
    id: "lux-families",
    title: "For Parish Families",
    icon: Heart,
    items: [
      { id: "family-register", title: "Registering Your Family" },
      { id: "family-page", title: "Your Family Page & Sign-In Link" },
      { id: "family-documents", title: "Uploading Documents" },
      { id: "family-paying", title: "Paying & Fee Assistance" },
    ],
  },
]

export const luxDocContent: Record<string, { title: string; content: React.ReactNode }> = {
  "lux-overview": {
    title: "What is Lux?",
    content: (
      <div className="space-y-4">
        <p>
          Lux is the simple side of ChiRho Events, made for parishes. It handles the two things most parish offices do all
          year: <strong>sign-ups for parish events</strong> and <strong>registration for faith formation and the sacraments</strong>.
          There are no group portals, housing or check-in stations to learn. If you can fill out a Google Form, you can run Lux.
        </p>
        <p>Lux is included with the <strong>Chapel</strong> and <strong>Parish</strong> plans.</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200 mt-2">
            <thead className="bg-navy text-white">
              <tr>
                <th className="border border-gray-200 p-3 text-left">Plan</th>
                <th className="border border-gray-200 p-3 text-left">Price</th>
                <th className="border border-gray-200 p-3 text-left">Simple events per year</th>
                <th className="border border-gray-200 p-3 text-left">Faith formation programs</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border p-3">Chapel</td><td className="border p-3">$39/mo</td><td className="border p-3">5</td><td className="border p-3">Unlimited</td></tr>
              <tr><td className="border p-3">Parish</td><td className="border p-3">$59/mo</td><td className="border p-3">10</td><td className="border p-3">Unlimited</td></tr>
            </tbody>
          </table>
        </div>
        <h3 className={h3}>What you can do with Lux</h3>
        <ul className={ul}>
          <li><strong>Simple events</strong>: fish fry, Bible study, retreat, picnic, volunteer sign-up. One page with tickets, a few questions, and card or office payment.</li>
          <li><strong>Faith formation and sacrament programs</strong>: Faith Formation, Family Faith Formation, First Communion, Confirmation, Baptism Preparation, OCIA, Vacation Bible School. Families register everyone on one form: children, adults, or the whole family together.</li>
          <li><strong>Class times</strong>: offer several days or times, or split classes by grade, each with its own limit.</li>
          <li><strong>Sibling discounts and a family maximum</strong>, worked out automatically.</li>
          <li><strong>Certificates and letters</strong> (baptismal, First Communion, sponsor and godparent letters), uploaded by families and kept privately in one place.</li>
          <li><strong>English or Spanish</strong>: families switch with one click, and their emails come in the language they chose.</li>
          <li><strong>Your own parish page</strong> with your photo, welcome and colors, plus a button for your website.</li>
          <li><strong>Pay online, pay at the office, or ask for fee assistance</strong>, with refunds, all tracked in one place.</li>
          <li><strong>Returning families</strong> sign in with an emailed link. Their information is already filled in.</li>
          <li><strong>Rosters and exports</strong> for catechists, sacramental records and the finance office.</li>
        </ul>
        <h3 className={h3}>Emails from Lux</h3>
        <p>
          Confirmations, receipts, reminders and sign-in links go to families from <strong>lux@chirhoevents.com</strong>, shown as
          &quot;Your Parish via Lux&quot;. When a family hits reply, it goes to your parish contact email.
        </p>
        <p>
          Larger organizations on Cathedral, Shrine or Basilica can add Lux alongside the full Events portal. Contact
          {" "}<a href="mailto:support@chirhoevents.com" className={link}>support@chirhoevents.com</a> to turn it on.
        </p>
      </div>
    ),
  },

  "lux-setup": {
    title: "Setting Up Lux",
    content: (
      <div className="space-y-4">
        <p>When you sign in, Lux opens on its Home page. A short checklist there walks you through setup. Most parishes finish in about 15 minutes.</p>
        <ol className={ol}>
          <li>
            <strong>Add your logo and contact email</strong>
            <p className={step}>Go to <strong>Settings → Logo &amp; colors</strong> and <strong>Settings → Parish</strong>. Your logo appears on every page families see, and replies to Lux emails go to your contact email.</p>
          </li>
          <li>
            <strong>Connect Stripe (optional)</strong>
            <p className={step}>To take card payments, go to <strong>Settings → Card payments</strong> and connect Stripe. Money goes straight to your parish&apos;s bank account. Skip this if families only pay at the office. See <a href="/docs?section=stripe-connect" className={link}>Connecting Stripe</a>.</p>
          </li>
          <li>
            <strong>Set your fees</strong>
            <p className={step}>In <strong>Settings → Lux</strong>, set your sibling discount and family maximum, and write instructions for paying at the office (hours, who to make checks out to).</p>
          </li>
          <li>
            <strong>Check your parish page address</strong>
            <p className={step}>Every parish gets one public page, like <code className="bg-gray-100 px-1 rounded">chirhoevents.com/lux/st-mary-austin</code>, listing open programs and upcoming events. You can change the address in <strong>Settings → Lux</strong>.</p>
          </li>
          <li>
            <strong>Make your parish page your own (optional)</strong>
            <p className={step}>In <strong>Settings → Lux</strong>, add a photo of your church, a welcome message, an announcement and your color. See <a href="/docs?section=lux-parish-page" className={link}>Your Parish Page &amp; Website Button</a>.</p>
          </li>
          <li>
            <strong>Set up your first program or event</strong>
            <p className={step}>Click <strong>Set something up</strong> and choose <em>An event or sign-up</em> or <em>A class or sacrament program</em>.</p>
          </li>
          <li>
            <strong>Share your parish page</strong>
            <p className={step}>Copy the link from the Home page and put it in the bulletin and your parish emails. For your website, copy the ready-made button from <strong>Settings → Lux</strong>.</p>
          </li>
        </ol>
        <div className={tip}>
          <strong>Invite your team:</strong> in <strong>Settings → Team</strong>, add your pastor, DRE or office staff. There are two kinds of access:
          <em> Admin</em> can do everything, and <em>Staff (view only)</em> can look but not change anything. Everyone you invite can see
          everything in Lux, including documents.
        </div>
      </div>
    ),
  },

  "lux-simple-events": {
    title: "Simple Events & Sign-Ups",
    content: (
      <div className="space-y-4">
        <p>A simple event is one sign-up page with tickets, a few questions, and payment. It&apos;s built for parish events, not conferences.</p>
        <h3 className={h3}>Creating an event</h3>
        <ol className={ol}>
          <li><strong>Click Set something up → An event or sign-up</strong></li>
          <li>
            <strong>The basics</strong>
            <p className={step}>Title, a short description, dates and times, where it is, and the language it&apos;s in (English, Spanish or bilingual).</p>
          </li>
          <li>
            <strong>Tickets</strong>
            <p className={step}>Use one ticket or a few (Adult $12, Child $6, Family $30). A $0 ticket makes it a free sign-up. You can set a limit per ticket, a total capacity, and how many tickets one person can buy.</p>
          </li>
          <li>
            <strong>What to ask</strong>
            <p className={step}>Name and email are always collected. Add questions like &quot;Dietary needs?&quot; or &quot;Which shift can you help with?&quot;</p>
          </li>
          <li>
            <strong>Payment</strong>
            <p className={step}>Turn on <em>Pay online by card</em>, <em>Pay at the parish office</em>, or both.</p>
          </li>
          <li>
            <strong>Optional extras</strong>
            <p className={step}>Require a waiver signature, ask about allergies and medical needs, and add a message for the confirmation email.</p>
          </li>
          <li>
            <strong>Publish</strong>
            <p className={step}>Save as a draft to finish later, or publish to open registration. Your event appears on your parish page and gets its own link to share.</p>
          </li>
        </ol>
        <h3 className={h3}>Running the event</h3>
        <ul className={ul}>
          <li>Open the event to see everyone registered, search, and expand a person to see their answers.</li>
          <li><strong>Record a payment</strong> when someone pays cash or by check. They get a receipt by email.</li>
          <li><strong>Close</strong> registration early, <strong>reopen</strong> it, or <strong>hide</strong> the event from your parish page.</li>
          <li>Registration closes by itself when the event starts (or at the time you set).</li>
          <li>Cancel a registration to give the spot back, then use <strong>Refund</strong> to give money back. See <a href="/docs?section=lux-refunds" className={link}>Refunds</a>.</li>
          <li>Download everyone as a spreadsheet with <strong>Export</strong>.</li>
        </ul>
        <h3 className={h3}>Your yearly event allowance</h3>
        <p>
          Chapel includes 5 simple events per year and Parish includes 10, counted from your subscription date. An event counts when you
          publish it. Drafts don&apos;t count, and faith formation programs never count. Need more? Contact support and we can raise your limit.
        </p>
      </div>
    ),
  },

  "lux-programs": {
    title: "Faith Formation & Sacrament Programs",
    content: (
      <div className="space-y-4">
        <p>
          A program is anything people register for over the year: weekly Faith Formation, First Communion prep, Confirmation, Baptism
          Preparation, OCIA, Vacation Bible School. A program can be for children, for adults, or for whole families. Programs are unlimited on every Lux plan.
        </p>
        <h3 className={h3}>Start from a template</h3>
        <ul className={ul}>
          <li><strong>Faith Formation</strong>: grades K–8, baptismal certificate optional, photo permission and pickup questions.</li>
          <li><strong>First Communion</strong>: grade 2 by default, baptismal certificate required (or &quot;baptized here&quot;).</li>
          <li><strong>Confirmation</strong>: grades 8–10, baptismal certificate and sponsor&apos;s letter of good standing (First Communion certificate optional), sponsor information, and service hours.</li>
          <li><strong>Family Faith Formation</strong>: the whole family registers together for one family fee.</li>
          <li><strong>Baptism Preparation</strong>: for parents preparing for a baby&apos;s baptism. Class dates, the child&apos;s birth certificate, and godparents&apos; letters of good standing.</li>
          <li><strong>OCIA</strong>: adults register themselves. Baptism background and sacraments already received.</li>
          <li><strong>Custom</strong>: start blank for anything else.</li>
        </ul>
        <p>Everything in a template can be changed.</p>
        <h3 className={h3}>What you set for each program</h3>
        <ul className={ul}>
          <li><strong>Name, school year and description</strong> families see.</li>
          <li><strong>Who it&apos;s for</strong>: children, adults or families. Adults and families don&apos;t need grades.</li>
          <li><strong>Grades</strong> the program accepts, and an optional <strong>capacity</strong>.</li>
          <li><strong>Class times</strong> families choose from, if you offer more than one. See <a href="/docs?section=lux-class-times" className={link}>Class Times, Days &amp; Grades</a>.</li>
          <li>The <strong>language</strong> classes are taught in: English, Spanish or bilingual.</li>
          <li><strong>Registration dates</strong>: when it opens and closes.</li>
          <li><strong>Tuition</strong>, charged per person or once per family, and <strong>extra fees</strong> (books, retreat, sacrament fee). Choose which extra fees get the sibling discount.</li>
          <li>Whether families can <strong>pay online</strong>, <strong>pay at the office</strong>, or <strong>ask for fee assistance</strong>.</li>
          <li><strong>Documents</strong> to collect, and whether &quot;baptized at this parish&quot; is accepted instead of an upload.</li>
          <li><strong>Questions</strong> for each child, on top of name, birthday, grade, baptism, allergies and medical notes.</li>
          <li>A <strong>confirmation message</strong> (parent meeting date, class schedule) and how long to <strong>keep uploaded documents</strong>.</li>
        </ul>
        <h3 className={h3}>The roster</h3>
        <p>
          Open a program to see everyone registered. Filter by grade, class time, payment, or documents. Expand a person to see their family, baptism
          information, allergies, answers, sponsor, service hours and documents. You can add staff notes, record service hours, open the
          family&apos;s payments, or cancel a registration (the spot opens up and anything unpaid comes off what they owe).
        </p>
        <div className={tip}>
          <strong>One form for the whole family.</strong> Parents register every child at once, even in different programs. Siblings are recognized
          automatically, so the discount and family maximum are always right.
        </div>
      </div>
    ),
  },

  "lux-fees": {
    title: "Tuition, Sibling Discounts & Family Maximum",
    content: (
      <div className="space-y-4">
        <p>Every parish charges differently, so Lux keeps fees flexible. Set the parish-wide rules once in <strong>Settings → Lux</strong>. Tuition and extra fees are set per program.</p>
        <h3 className={h3}>Sibling discount</h3>
        <ul className={ul}>
          <li>Choose <strong>a dollar amount</strong> or <strong>a percent</strong> off each additional child.</li>
          <li>Optionally use a <strong>different amount from the third child on</strong> (for example $25 off the second child, $50 off each after that).</li>
          <li>The most expensive child pays full price. The discount comes off the others.</li>
          <li>It applies to tuition, and to extra fees you mark as discountable. Books, for example, can stay full price.</li>
        </ul>
        <h3 className={h3}>Family maximum</h3>
        <p>Set the most one family pays for all their children in a school year, for example $350. Lux stops charging once a family reaches it.</p>
        <h3 className={h3}>Registering on different days</h3>
        <p>
          A family that registers one child in August and another in September pays the same as if they&apos;d registered both together.
          Children already registered that year count as earlier siblings, and what the family already owes counts toward the maximum.
        </p>
        <h3 className={h3}>One fee per family</h3>
        <p>
          A program can charge <strong>once per family</strong> instead of per person (Family Faith Formation does by default). The family pays the
          fee once, however many people they register, and isn&apos;t charged again if they add someone later in the year. The sibling discount
          doesn&apos;t apply to a family fee.
        </p>
        <h3 className={h3}>Programs that don&apos;t follow the rules</h3>
        <p>Each program can opt out of the sibling discount or the family maximum. A sacrament fee, for example, often shouldn&apos;t be discounted.</p>
        <div className={tip}>
          <strong>Example:</strong> Faith Formation is $100 per child plus $30 books (not discounted), with $25 off each additional child and a
          $300 family maximum. A family with three children pays $130 + $105 + $105 = $340, so the maximum brings it down to $300.
        </div>
      </div>
    ),
  },

  "lux-documents": {
    title: "Baptismal Certificates & Documents",
    content: (
      <div className="space-y-4">
        <p>
          Programs can ask for any document: a baptismal certificate, a First Communion or Confirmation certificate, a sponsor&apos;s letter of good
          standing, godparents&apos; letters, a birth certificate. When you set up a program, add the common ones with one click, or type your own.
          Families upload a photo or scan (PDF or image, up to 10 MB) when they register, or later from their family page.
          Every document from every program is in one place: the <strong>Documents</strong> page.
        </p>
        <h3 className={h3}>Reviewing documents</h3>
        <ol className={ol}>
          <li>
            <strong>Open Documents</strong>
            <p className={step}>The <em>To review</em> tab lists everything families have uploaded.</p>
          </li>
          <li>
            <strong>Click a document, then Open</strong>
            <p className={step}>The file opens in a new tab through a private link that works for 5 minutes. Click Open again any time for a fresh link. The file itself stays stored until you delete it.</p>
          </li>
          <li>
            <strong>Approve it, or ask for a new copy</strong>
            <p className={step}>If a photo is blurry or it&apos;s the wrong document, choose <em>Ask for a new copy</em> and add a note. The family sees your note in their reminder.</p>
          </li>
        </ol>
        <h3 className={h3}>&quot;Baptized at this parish&quot;</h3>
        <p>
          When a family says their child was baptized at your parish, there&apos;s nothing to upload. The document shows under <strong>Parish
          lookups</strong>. Check your sacramental register, then click <em>Found in our records</em>.
        </p>
        <h3 className={h3}>Missing documents and reminders</h3>
        <p>
          The <strong>Missing</strong> tab lists everything still needed. Click <strong>Email reminders</strong> to send each family one email listing
          what they owe, with a link that signs them straight in to upload it. You can also remind one family from their document.
        </p>
        <h3 className={h3}>Paper copies</h3>
        <p>If a family brings a certificate to the office, open the document and click <em>Upload a copy we have</em>. It&apos;s approved right away.</p>
        <h3 className={h3}>Documents carry over</h3>
        <p>An approved baptismal certificate is reused automatically when the same child registers for another program, so families don&apos;t upload it twice.</p>
        <h3 className={h3}>How long documents are kept</h3>
        <p>
          By default, documents are kept until you delete them. Each program can delete files automatically 1, 2 or 5 years after upload.
          To delete one family&apos;s files (for example when they ask), open the household and click <strong>Delete this family&apos;s documents</strong>.
          Documents you already approved stay marked approved.
        </p>
      </div>
    ),
  },

  "lux-payments": {
    title: "Payments, Pay at the Office & Fee Assistance",
    content: (
      <div className="space-y-4">
        <h3 className={h3}>How families pay</h3>
        <ul className={ul}>
          <li><strong>Online by card</strong>: through Stripe, straight to your parish&apos;s account. Spots are held while they pay.</li>
          <li><strong>At the parish office</strong>: they&apos;re registered right away and see your office instructions. You record the payment when it comes in.</li>
          <li><strong>Fee assistance</strong>: families can quietly ask for help. Nothing is due until you decide.</li>
        </ul>
        <p>Families who chose the office can still pay online later from the link in their confirmation email or their family page.</p>
        <h3 className={h3}>Recording an office payment</h3>
        <ol className={ol}>
          <li><strong>Open Payments</strong>, find the family under <em>Still owed</em>, and click it.</li>
          <li><strong>Click Record a payment</strong>, enter the amount, and choose cash, check (with the check number), card at the office, or other.</li>
          <li><strong>Save.</strong> The family gets a receipt from Lux showing what&apos;s left, if anything.</li>
        </ol>
        <p>Event balances are listed on the same page, and you can record those from there too.</p>
        <h3 className={h3}>Fee assistance</h3>
        <p>
          Requests appear at the top of <strong>Payments</strong>, with the family&apos;s note. Open one and choose to <strong>reduce the fee</strong> to
          an amount you set, <strong>waive</strong> it entirely, or <strong>keep the full fee</strong>. Add a note if you like. The family is emailed
          privately, and their children stay registered either way.
        </p>
        <div className={tip}>
          You can also lower what any family owes, even without a request, with <strong>Adjust amount due</strong> on their registration.
        </div>
        <p>To give money back, see <a href="/docs?section=lux-refunds" className={link}>Refunds</a>.</p>
        <h3 className={h3}>The totals</h3>
        <p>The top of the Payments page shows what&apos;s been paid online and at the office this year, what&apos;s still owed, and refunds.</p>
      </div>
    ),
  },

  "lux-program-types": {
    title: "OCIA, Family Programs & Baptism Preparation",
    content: (
      <div className="space-y-4">
        <p>Faith formation isn&apos;t only for children. When you set up a program, choose who it&apos;s for:</p>
        <ul className={ul}>
          <li><strong>Children</strong>: parents register their kids, with grades (Faith Formation, First Communion, Confirmation).</li>
          <li><strong>Adults</strong>: people register themselves, with no grade (OCIA, Bible study series, adult Confirmation).</li>
          <li><strong>Families</strong>: the whole family registers together, parents and children (Family Faith Formation).</li>
        </ul>
        <h3 className={h3}>OCIA</h3>
        <p>
          Start from the OCIA template. Adults register themselves on your parish page: they click <em>This is me</em>, answer whether they&apos;ve
          been baptized and which sacraments they&apos;ve received, and can upload a baptismal certificate if they have one. Your roster shows them as adults.
        </p>
        <h3 className={h3}>Family Faith Formation</h3>
        <p>
          Start from the Family Faith Formation template. A parent adds everyone attending (themselves and each child) and the family pays
          <strong> one family fee</strong>, however many people come. A child added later in the year isn&apos;t charged again. If the person who
          carried the fee is cancelled, the fee moves to someone else in the family, so it&apos;s never lost or charged twice.
        </p>
        <h3 className={h3}>Baptism Preparation</h3>
        <p>
          For parents preparing for their baby&apos;s baptism. Add your class dates as class times (for example &quot;Saturday, Jan 10 · 10am&quot;) so
          parents pick one. The template asks for the child&apos;s birth certificate, the godparents&apos; names, and a letter of good standing for
          each godparent from another parish. Babies don&apos;t need a grade.
        </p>
        <div className={tip}>
          You can mix these on one family&apos;s form. A mother can register herself for OCIA and her children for Faith Formation in one go.
        </div>
      </div>
    ),
  },

  "lux-class-times": {
    title: "Class Times, Days & Grades",
    content: (
      <div className="space-y-4">
        <p>
          Many parishes offer the same program on different days, like Sunday morning or Wednesday evening, or split classes by grade. Add these as
          <strong> class times</strong> on the program, and families pick one for each person when they register.
        </p>
        <h3 className={h3}>Setting up class times</h3>
        <ol className={ol}>
          <li><strong>Open the program and find Class times.</strong></li>
          <li><strong>Click Add a class time</strong> and give it a name families will recognize, like &quot;Sunday 9:00am&quot;.</li>
          <li><strong>Add details</strong> (optional), like the room or the weeks it meets.</li>
          <li><strong>Choose grades</strong> (optional) if the class is only for some grades, like grades 1–3. Families only see the class times that fit their child.</li>
          <li><strong>Set a limit</strong> (optional). When a class time fills up, families see it as full and choose another.</li>
        </ol>
        <h3 className={h3}>On the roster</h3>
        <p>
          The program page shows how many people are in each class time. Click one to see only that class, then export it for the catechist.
          Exports include a Class time column. To move someone (a family asks to switch to Wednesday), expand them on the roster and choose a
          different class time.
        </p>
        <h3 className={h3}>Changing class times later</h3>
        <p>
          You can rename class times or add new ones any time. A class time with people in it can&apos;t be removed, and its limit can&apos;t go below
          the number already registered. Move people to another class time first, or cancel their registrations.
        </p>
        <div className={tip}>
          Siblings in different class times still get the sibling discount and count toward the family maximum.
        </div>
      </div>
    ),
  },

  "lux-refunds": {
    title: "Refunds",
    content: (
      <div className="space-y-4">
        <p>
          When a family withdraws, you cancel an event, or someone pays too much, give the money back from Lux. Refunds work the same for faith
          formation registrations and event sign-ups. Only admins can give refunds.
        </p>
        <h3 className={h3}>Giving a refund</h3>
        <ol className={ol}>
          <li>
            <strong>Open the registration</strong>
            <p className={step}>For a program, open the family&apos;s registration from the roster, the household page or Payments. For an event, open the event and expand the person.</p>
          </li>
          <li><strong>Click Refund.</strong></li>
          <li>
            <strong>Choose how the money goes back</strong>
            <p className={step}><em>Back to their card</em> refunds through Stripe if they paid online. <em>Cash</em>, <em>check</em> or another way records money you gave back from the office.</p>
          </li>
          <li><strong>Enter the amount and why</strong>, add a note for your records if you like, and click <strong>Refund</strong>.</li>
        </ol>
        <p>The family gets an email in their language letting them know a refund is on the way.</p>
        <h3 className={h3}>Card refunds</h3>
        <ul className={ul}>
          <li>The money comes out of your parish&apos;s Stripe balance and usually reaches their card in 5–10 business days.</li>
          <li>If a family paid by card more than once, Lux splits the refund across their payments for you.</li>
          <li>You can refund part of a payment, and refund more later.</li>
        </ul>
        <h3 className={h3}>What it does to what they owe</h3>
        <p>
          A refund never leaves a family with a new balance. If they had paid in full, they&apos;re still paid in full; if they still owed something,
          they owe the same amount after the refund.
        </p>
        <div className={tip}>
          <strong>Cancelling and refunding are two steps.</strong> Cancel first to open the spot (for a family that hasn&apos;t paid, that&apos;s all you
          need). If they&apos;d already paid, open the registration and click Refund. You can refund a cancelled registration.
        </div>
      </div>
    ),
  },

  "lux-parish-page": {
    title: "Your Parish Page & Website Button",
    content: (
      <div className="space-y-4">
        <p>
          Your parish page is the one link families use for everything: open programs, upcoming events, and their family page. Make it look like
          your parish in <strong>Settings → Lux</strong>.
        </p>
        <h3 className={h3}>Making it your own</h3>
        <ul className={ul}>
          <li><strong>Header photo</strong>: a wide photo of your church or a parish celebration, shown across the top.</li>
          <li><strong>Headline and welcome message</strong>: leave them blank for &quot;Welcome to your parish&quot; and a standard message.</li>
          <li><strong>Announcement</strong>: a highlighted box for a deadline or a change in office hours.</li>
          <li><strong>Button color</strong>: pick one of ours or your own parish color.</li>
          <li><strong>Spanish text</strong> (optional): your own headline, message and announcement for families who switch to Spanish.</li>
        </ul>
        <p>A preview shows how it will look. Click <strong>Save settings</strong> when you&apos;re done. The photo saves as soon as you upload it.</p>
        <h3 className={h3}>Adding a button to your website</h3>
        <ol className={ol}>
          <li><strong>In Settings → Lux, find Add Lux to your parish website.</strong></li>
          <li><strong>Choose the button text</strong>: English, Español, or both.</li>
          <li><strong>Click Copy button code.</strong></li>
          <li>
            <strong>Paste it on your website</strong>
            <p className={step}>In WordPress, edit the page, click <strong>+</strong>, add a <strong>Custom HTML</strong> block, paste, and click Update. On Wix, Squarespace and most website builders, use an &quot;Embed&quot; or &quot;Code&quot; block.</p>
          </li>
        </ol>
        <p>Prefer your own button? Copy the plain link instead and use it on any button or menu item you already have.</p>
      </div>
    ),
  },

  "lux-spanish": {
    title: "Spanish for Families",
    content: (
      <div className="space-y-4">
        <p>
          Every page families see has an <strong>English / Español</strong> switch at the top: your parish page, the registration form, event
          sign-ups, the family page, and payment pages. Lux remembers their choice, and opens in Spanish automatically when their phone or computer is set to Spanish.
        </p>
        <h3 className={h3}>What&apos;s translated for you</h3>
        <ul className={ul}>
          <li>All the buttons, labels, instructions, grades, dates and messages.</li>
          <li>The questions and documents from Lux templates, as long as you haven&apos;t reworded them.</li>
          <li>Emails: confirmations, receipts, reminders, sign-in links and refunds go out in the language the family registered in.</li>
        </ul>
        <h3 className={h3}>What you write yourself</h3>
        <p>
          Program names, descriptions and your own questions appear as you wrote them. Many parishes write them in both languages, like
          &quot;Faith Formation / Formación en la fe&quot;. Your parish page has optional Spanish versions of the headline, message and announcement.
        </p>
        <h3 className={h3}>Classes in Spanish</h3>
        <p>
          Set <strong>Classes are taught in</strong> on a program, or the language on an event, to English, Spanish or bilingual. Families see it on
          your parish page. Offering the same program in two languages? Add each as its own class time, like &quot;Sunday 9am (English)&quot; and
          &quot;Sunday 11am (Español)&quot;.
        </p>
        <div className={tip}>Your staff dashboard stays in English.</div>
      </div>
    ),
  },

  "lux-households": {
    title: "Households & Returning Families",
    content: (
      <div className="space-y-4">
        <p>
          Every family that registers becomes a <strong>household</strong>: parents or guardians, contact information, an emergency contact, and their
          children with birthdays, grades, baptism details and health notes. The household carries over from year to year.
        </p>
        <h3 className={h3}>Finding a family</h3>
        <p>Open <strong>Households</strong> and search by a parent&apos;s or child&apos;s name, email or phone. Filter to families who owe money, are missing documents, or asked for fee assistance.</p>
        <h3 className={h3}>On a family&apos;s page</h3>
        <ul className={ul}>
          <li>Each child&apos;s programs, registration status and documents.</li>
          <li>Their registrations and payments, with fee assistance decisions.</li>
          <li><strong>Edit</strong> any detail, or archive a child who moved away or aged out.</li>
          <li><strong>Staff notes</strong> that only your team sees.</li>
          <li><strong>Email family link</strong> sends them a sign-in link to their family page.</li>
        </ul>
        <h3 className={h3}>Next year</h3>
        <p>
          When registration opens again, families click &quot;Registered with us before?&quot; on your parish page and enter their email. They get a
          link that signs them in with everything filled in. They confirm their details, choose programs, and they&apos;re done.
        </p>
      </div>
    ),
  },

  "lux-exports": {
    title: "Rosters & Exports",
    content: (
      <div className="space-y-4">
        <p>Open <strong>Exports</strong> to download spreadsheets (CSV files that open in Excel, Numbers or Google Sheets):</p>
        <ul className={ul}>
          <li><strong>Program roster</strong>: each child with grade, parents, contact information, allergies, sacrament details, payment and document status. Good for catechists and sacramental records.</li>
          <li><strong>Documents still needed</strong>: who is missing what, with contact information.</li>
          <li><strong>Event sign-ups</strong>: everyone registered for an event, with tickets, answers and payment.</li>
          <li><strong>Payments</strong>: every payment, online and at the office, for the finance office.</li>
          <li><strong>Households</strong>: every family on file.</li>
        </ul>
        <p>A program&apos;s roster page also has an export button that keeps your current filters.</p>
      </div>
    ),
  },

  "lux-privacy": {
    title: "Who Can See What",
    content: (
      <div className="space-y-4">
        <h3 className={h3}>Your team</h3>
        <p>
          Everyone you invite to your parish&apos;s ChiRho account can see all of Lux, including baptismal certificates and fee assistance requests.
          Only invite people who should. <em>Admins</em> can make changes; <em>Staff (view only)</em> can look but not change. Only admins can give refunds.
        </p>
        <h3 className={h3}>Families</h3>
        <p>
          Families can upload documents and see whether they were received, but they can never download them again. They see only their own household,
          and only after signing in from a link sent to the email on file.
        </p>
        <h3 className={h3}>How documents are protected</h3>
        <ul className={ul}>
          <li>Files are stored in private storage, never on a public web address.</li>
          <li>Each time staff open a document, Lux creates a link that expires after 5 minutes.</li>
          <li>Every time a document is opened, approved or deleted, it&apos;s recorded with who did it and when.</li>
          <li>Sign-in links work once and expire. Requests for links are rate-limited, and Lux never reveals whether an email is on file.</li>
        </ul>
      </div>
    ),
  },

  "lux-upgrade": {
    title: "When You Outgrow Simple Events",
    content: (
      <div className="space-y-4">
        <p>
          Some events grow into something bigger: group registration with a leader portal, housing, liability forms for every participant, check-in
          stations. That&apos;s the full ChiRho Events portal, available on the Cathedral, Shrine and Basilica plans.
        </p>
        <p>
          If your organization has the full Events portal, open a simple event and click <strong>Convert to full event</strong>. Its registrations,
          tickets and payments come along. On Chapel and Parish, that button doesn&apos;t appear, since most parishes never need it. To move up, contact
          {" "}<a href="mailto:support@chirhoevents.com" className={link}>support@chirhoevents.com</a> and we&apos;ll help you choose.
        </p>
      </div>
    ),
  },

  "family-register": {
    title: "Registering Your Family",
    content: (
      <div className="space-y-4">
        <p>Your parish will share a link to its registration page. Everything happens on one form, even for several people in different programs. Prefer Spanish? Click <strong>Español</strong> at the top of the page.</p>
        <ol className={ol}>
          <li>
            <strong>Click Register my children</strong>
            <p className={step}>If you registered last year, click &quot;Registered with us before?&quot; first and we&apos;ll email you a link with your information filled in.</p>
          </li>
          <li><strong>Enter your family&apos;s information</strong>: parents or guardians, phone, address and an emergency contact.</li>
          <li><strong>Add each person</strong>: a child, or an adult (for OCIA, or for a family program, click <em>This is me</em> to add yourself). Choose their program and class time, then enter their birthday, grade, baptism information and any allergies.</li>
          <li><strong>Upload documents</strong> the program asks for, like a baptismal certificate. You can also do this later.</li>
          <li><strong>Review the total</strong>, including any sibling discount, and choose how to pay: online by card or at the parish office. You can also ask for fee assistance.</li>
        </ol>
        <p>You&apos;ll get a confirmation email from <strong>Your Parish via Lux</strong> (lux@chirhoevents.com) with everything you registered for.</p>
      </div>
    ),
  },

  "family-page": {
    title: "Your Family Page & Sign-In Link",
    content: (
      <div className="space-y-4">
        <p>
          Your family page is where you upload documents, pay a balance, update your information, and register for next year. There&apos;s no
          password. You sign in with a link we email you.
        </p>
        <ol className={ol}>
          <li><strong>Go to your parish&apos;s registration page</strong> and find &quot;Registered with us before?&quot;</li>
          <li><strong>Enter the email you registered with.</strong></li>
          <li><strong>Open the link in the email.</strong> It works once and expires in 30 minutes, so request a new one any time.</li>
        </ol>
        <p>Links in confirmation and reminder emails also sign you in, and last a week.</p>
        <div className={tip}>
          Didn&apos;t get the email? Check your spam folder and make sure you used the same email you registered with. Still nothing? Contact your parish office.
        </div>
      </div>
    ),
  },

  "family-documents": {
    title: "Uploading Documents",
    content: (
      <div className="space-y-4">
        <p>Some programs need a document, like a baptismal certificate or a sponsor letter.</p>
        <ul className={ul}>
          <li>Take a clear photo with your phone or upload a scan. PDF and images up to 10 MB are accepted.</li>
          <li>Upload while you register, from your family page, or from the link in a reminder email.</li>
          <li>Once uploaded, you&apos;ll see whether the parish has received or approved it. If they need a new copy, you&apos;ll get an email explaining why.</li>
          <li>If your child was baptized at the same parish, check &quot;Baptized here&quot;. The parish will look it up, so there&apos;s nothing to upload.</li>
        </ul>
        <p>Only your parish staff can see your documents. They&apos;re stored privately and can&apos;t be downloaded from your family page.</p>
      </div>
    ),
  },

  "family-paying": {
    title: "Paying & Fee Assistance",
    content: (
      <div className="space-y-4">
        <ul className={ul}>
          <li><strong>Online by card</strong>: pay when you register, or later from your confirmation email or family page.</li>
          <li><strong>At the parish office</strong>: your children are registered right away. Bring payment using the instructions in your confirmation.</li>
          <li><strong>Fee assistance</strong>: if cost is a concern, check &quot;I&apos;d like to ask about fee assistance&quot; and add a note if you like. Only parish staff see it, and nothing is due until they reply.</li>
        </ul>
        <p>You&apos;ll get a receipt by email for every payment, including ones made at the office.</p>
      </div>
    ),
  },
}
