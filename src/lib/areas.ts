import type { FaqItem } from '@/lib/seo'

/**
 * Location landing-page content — the canonical 10 service areas.
 *
 * Editorial rules (doctrine: Fabricated Proof):
 *  - Describe the town's housing stock and how our services fit it. Never
 *    invent job counts, client names, or "we recently completed…" claims.
 *  - Every page must be substantively unique — no town-name swaps of the
 *    same paragraph. These pages out-position the lead directories with
 *    genuine local specificity they cannot fake at scale.
 */

export interface Area {
  slug: string
  name: string
  postcode: string
  county: string
  metaTitle: string
  metaDescription: string
  headline: string
  headlineAccent: string
  intro: string
  paragraphs: [string, string]
  highlights: string[]
  villages: string[]
  faqs: FaqItem[]
  nearby: string[]
}

export const AREAS: Area[] = [
  {
    slug: 'reigate',
    name: 'Reigate',
    postcode: 'RH2',
    county: 'Surrey',
    metaTitle: 'Painter & Decorator in Reigate',
    metaDescription:
      'Brushly is a premium painting and decorating company based in Reigate, RH2. Interior and exterior painting, wallpapering and specialist finishes for period and modern homes. Free quotes.',
    headline: 'Painting & decorating in',
    headlineAccent: 'Reigate',
    intro:
      'Brushly is based in Reigate — this is our home ground, and the town where our standards were set.',
    paragraphs: [
      'Reigate rewards decorators who respect its fabric. From the Georgian and Victorian frontages around the High Street and Church Street to the Edwardian villas towards Priory Park and the family homes of South Park and Woodhatch, much of the town sits within or beside conservation areas, where original sash windows, deep skirting boards, ornate cornicing and lime-plastered walls demand more than a quick roller-over. We prepare period joinery properly — burning off or sanding back failing paint, priming bare timber, and finishing in traditional oil or modern hybrid systems that hold their line.',
      'Being based in RH2 means Reigate clients get our fastest response: viewings within days, not weeks, and a team that already knows the quirks of the local stock — solid walls that need breathable coatings, hairline-cracked lath-and-plaster ceilings, and the wear that busy family hallways take. Interior repaints, full exterior redecorations, wallpaper hanging and specialist finishes all run on the same principle: meticulous preparation first, premium paint second, and a finish that still looks right years later.',
    ],
    highlights: [
      'Local, Reigate-based team — fastest call-outs and site visits in RH2',
      'Period-property specialists: sash windows, cornicing, lime plaster, panelled doors',
      'Breathable paint systems for solid-wall and conservation-area homes',
      'Farrow & Ball, Little Greene and Dulux Trade supplied and applied',
    ],
    villages: ['South Park', 'Woodhatch', 'Meadvale', 'Mead Vale', 'Reigate Heath'],
    faqs: [
      {
        question: 'Do you charge for quotes in Reigate?',
        answer:
          'No — quotes are free. Because we are based in Reigate, we can usually visit within a few days, measure up, talk through colours and finishes, and send a written itemised quote by email or SMS shortly after.',
      },
      {
        question: 'Can you work on listed or conservation-area properties in Reigate?',
        answer:
          'Yes. A large part of our work is in period homes around Reigate town centre and Priory Park. We use breathable, mineral-based or traditional systems where the substrate needs them, and we prepare original joinery rather than replacing it. Where listed-building consent applies to external colour changes, we will flag it before work starts.',
      },
      {
        question: 'Which parts of Reigate do you cover?',
        answer:
          'All of RH2 — the town centre, South Park, Woodhatch, Meadvale and Reigate Heath — plus the surrounding villages. Neighbouring Redhill, Banstead and Dorking each have their own dedicated Brushly coverage too.',
      },
      {
        question: 'Can I see a colour on my own walls before you paint?',
        answer:
          'Yes — our free AI visualizer lets you photograph your room and see it recoloured in seconds, in real paint colours, before you commit. It is the fastest way to shortlist shades before we bring physical sample pots.',
      },
    ],
    nearby: ['redhill', 'banstead', 'dorking', 'tadworth'],
  },
  {
    slug: 'redhill',
    name: 'Redhill',
    postcode: 'RH1',
    county: 'Surrey',
    metaTitle: 'Painter & Decorator in Redhill',
    metaDescription:
      'Premium painting and decorating in Redhill, RH1 — Victorian terraces, family semis and new-build apartments. Interior, exterior, wallpapering and specialist finishes from Brushly, based next door in Reigate.',
    headline: 'Painting & decorating in',
    headlineAccent: 'Redhill',
    intro:
      'Redhill is five minutes from our base — and one of the most varied housing stocks we work in.',
    paragraphs: [
      'Few towns mix their eras like Redhill. Victorian terraces around St John’s and Earlswood sit alongside inter-war semis in Merstham, post-war family homes, and the newest generation of apartments rising from the town-centre regeneration. Each demands a different approach: original terraced houses need patient preparation of old plaster and timber; newer builds need sharp, modern lines, mist-coated fresh plaster and durable finishes that survive rental turnover and family life alike.',
      'For landlords and homeowners along the London-commute corridor, speed matters as much as finish. We run tight, well-planned jobs — rooms sheeted and protected, surfaces prepared properly, two full coats as standard — so a repaint between tenancies or before a sale happens on schedule without the finish being rushed. Exterior work on Redhill’s brick, render and pebbledash elevations uses weather-resistant masonry systems chosen for the substrate, not whatever is cheapest that week.',
    ],
    highlights: [
      'Minutes from our Reigate base — quick visits across all of RH1',
      'Victorian terrace specialists: old plaster, period joinery, original doors',
      'Fast, clean tenancy and pre-sale repaints for landlords and movers',
      'Durable modern finishes for new-build apartments and fresh plaster',
    ],
    villages: ['Earlswood', 'St John’s', 'Merstham', 'Whitebushes', 'South Merstham'],
    faqs: [
      {
        question: 'How quickly can you start a decorating job in Redhill?',
        answer:
          'Lead times vary with the season, but because Redhill is next door to our Reigate base we can usually get a site visit booked within days and give you an honest start date in the written quote. Smaller jobs can often slot in sooner than full redecorations.',
      },
      {
        question: 'Do you handle repaints for Redhill landlords and letting agents?',
        answer:
          'Yes. Between-tenancy repaints are a regular part of our work in RH1 — neutral schemes, durable trade-quality paint, tight turnarounds, and photographic proof of the finished rooms. We invoice the business entity with the property referenced separately, which keeps agency paperwork clean.',
      },
      {
        question: 'Can you paint new-build apartments in Redhill town centre?',
        answer:
          'Yes — new plaster needs a proper mist coat and the right emulsion build-up, and we finish crisp, modern lines around metal balustrades, MDF joinery and feature walls. We also advise on colours that keep compact apartments feeling bright.',
      },
      {
        question: 'Which areas around Redhill do you cover?',
        answer:
          'All of RH1 including Earlswood, Merstham, Whitebushes and St John’s, plus Reigate, Horley and the villages between. If you are just outside those postcodes, ask — the answer is usually yes.',
      },
    ],
    nearby: ['reigate', 'horley', 'banstead', 'tadworth'],
  },
  {
    slug: 'epsom',
    name: 'Epsom',
    postcode: 'KT17–KT19',
    county: 'Surrey',
    metaTitle: 'Painter & Decorator in Epsom',
    metaDescription:
      'Brushly delivers premium painting and decorating across Epsom and Ewell — Edwardian villas, 1930s family homes and modern developments. Interior, exterior, wallpapering and specialist finishes. Free quotes.',
    headline: 'Painting & decorating in',
    headlineAccent: 'Epsom',
    intro:
      'From the Edwardian avenues around College Road to the Downs, Epsom homes deserve a finish as considered as the town itself.',
    paragraphs: [
      'Epsom’s best streets — the College conservation area, the tree-lined avenues off Worple Road, the villas towards Epsom Downs — carry serious period detail: tall ceilings, deep cornices, timber sashes, and hallways that set the tone for the whole house. Decorating here is about preserving that character while bringing schemes up to date, whether that is a full-house repaint in heritage shades or hanging a designer paper on a single statement wall. Our decorators cut clean lines against original mouldings and finish woodwork so it feels furniture-grade.',
      'Epsom and Ewell also have a huge stock of 1930s semis and later family homes, where the work is about durability as much as beauty — scuff-resistant hallway finishes, kitchens and bathrooms painted in moisture-tolerant systems, and exteriors protected against the weather that rolls off the Downs. Wherever you are between Stoneleigh and Langley Vale, the process is the same: honest scope, itemised written quote, protected floors and furniture, and a finish we are happy to put our name to.',
    ],
    highlights: [
      'Period specialists for the College area and Epsom’s Edwardian stock',
      'Family-home repaints across Ewell, Stoneleigh and West Ewell',
      'Exterior masonry and woodwork systems built for the Downs weather',
      'Designer wallpaper hanging with precise pattern matching',
    ],
    villages: ['Ewell', 'Stoneleigh', 'West Ewell', 'Epsom Downs', 'Langley Vale', 'Horton'],
    faqs: [
      {
        question: 'Do you cover the whole of Epsom and Ewell?',
        answer:
          'Yes — KT17, KT18 and KT19 in full: Epsom town, Ewell village, Stoneleigh, West Ewell, Horton, Langley Vale and up to Epsom Downs. Neighbouring Ashtead, Banstead and Tadworth have their own dedicated coverage.',
      },
      {
        question: 'Can you recommend colours for a period home in Epsom?',
        answer:
          'Yes — colour consultation is part of the service. We regularly work with Farrow & Ball and Little Greene palettes that suit Edwardian and Victorian interiors, and we will assess your rooms’ natural light before recommending. You can also preview any shade on a photo of your own room with our free AI visualizer.',
      },
      {
        question: 'How much does it cost to decorate a room in Epsom?',
        answer:
          'It depends on the room’s size, the condition of the surfaces, and the specification — which is why we never quote blind. A site visit is free, and the written quote is itemised so you can see exactly what the preparation, materials and labour cover. No day-rate ambiguity, no surprises.',
      },
      {
        question: 'Are you insured to work in my home?',
        answer:
          'Fully — Brushly Ltd carries £2m public liability insurance alongside employers’ liability cover, and we are happy to provide documentation with your quote.',
      },
    ],
    nearby: ['ashtead', 'banstead', 'tadworth', 'leatherhead'],
  },
  {
    slug: 'banstead',
    name: 'Banstead',
    postcode: 'SM7',
    county: 'Surrey',
    metaTitle: 'Painter & Decorator in Banstead',
    metaDescription:
      'Premium painting and decorating in Banstead, Nork and Woodmansterne. Interior and exterior repaints, wallpapering and specialist finishes for SM7’s detached and semi-detached family homes. Free quotes from Brushly.',
    headline: 'Painting & decorating in',
    headlineAccent: 'Banstead',
    intro:
      'Banstead’s inter-war homes were built to last — the decorating should be too.',
    paragraphs: [
      'Banstead, Nork and Woodmansterne are defined by generous 1920s and 1930s family houses: bay-fronted semis, wide detached homes on leafy plots, oak front doors, and original details like picture rails and panelled internal doors that deserve to be kept crisp rather than painted into oblivion. Our interior work here leans on careful preparation — filling and sanding until walls read flat in raking light, restoring rather than losing the mouldings — and finishes that stand up to family life on the North Downs.',
      'Outside, Banstead’s render, brick and tile-hung elevations take the full brunt of the exposed Downs weather, so exterior redecoration is as much protection as presentation: fungicidal washes, stabilised substrates, and premium weather-resistant masonry and joinery systems applied in the right conditions. From a single hallway refresh on the High Street side to a complete exterior in Nork Park, every job gets the same written scope and the same standard.',
    ],
    highlights: [
      'Specialists in 1930s bays, picture rails and original panelled joinery',
      'Weather-first exterior systems for exposed Downs-edge elevations',
      'Clean, tidy interior repaints with furniture and floors fully protected',
      'Minutes from our Reigate base via the A217 — reliable scheduling',
    ],
    villages: ['Nork', 'Woodmansterne', 'Chipstead', 'Kingswood fringe', 'Burgh Heath'],
    faqs: [
      {
        question: 'Do you cover Nork, Woodmansterne and Chipstead as well as Banstead village?',
        answer:
          'Yes — all of SM7 and its borders, including Nork, Woodmansterne, Burgh Heath and Chipstead. We are based a short drive away in Reigate, so scheduling and site visits across the area are straightforward.',
      },
      {
        question: 'Can you redecorate my hallway, stairs and landing in one visit?',
        answer:
          'Hall, stairs and landing is one of the most requested jobs in Banstead’s three-bed semis, and one where preparation shows most. Depending on scope it typically runs over a small number of days rather than one — we will give you an exact schedule in the quote, and the space stays usable each evening.',
      },
      {
        question: 'What paint do you use on exterior render?',
        answer:
          'We assess the render first — age, cracking, previous coatings, any damp. Then we specify accordingly: stabilising primers where needed, and premium masonry systems (including breathable or elastomeric options) chosen for the substrate rather than a one-size-fits-all product.',
      },
      {
        question: 'Do you offer free quotes in Banstead?',
        answer:
          'Yes — site visits and written quotes are free and itemised. You will know exactly what is included in preparation, materials and labour before you decide.',
      },
    ],
    nearby: ['epsom', 'tadworth', 'reigate', 'redhill'],
  },
  {
    slug: 'tadworth',
    name: 'Tadworth',
    postcode: 'KT20',
    county: 'Surrey',
    metaTitle: 'Painter & Decorator in Tadworth',
    metaDescription:
      'Brushly provides premium painting and decorating across Tadworth, Kingswood and Walton-on-the-Hill — large detached homes, period cottages and modern builds in KT20. Interior, exterior and specialist finishes.',
    headline: 'Painting & decorating in',
    headlineAccent: 'Tadworth',
    intro:
      'Kingswood and Walton-on-the-Hill hold some of Surrey’s finest homes — work here has to meet that standard.',
    paragraphs: [
      'KT20 is a patchwork of the exceptional: the grand detached houses of the Kingswood Warren estate, arts-and-crafts and neo-Georgian homes on private roads, flint-and-brick cottages around Walton-on-the-Hill’s pond, and comfortable family homes through Tadworth itself. Interiors at this level are unforgiving — long sightlines, large glazed elevations and quality furnishings expose any shortcut in preparation — so we work to a furniture-grade standard: surfaces made flat, woodwork rubbed down and built up in fine coats, and lines cut sharp against stone, oak and glass.',
      'Larger properties also mean larger logistics, and we plan for them: multi-room phasing so the house stays livable, correct access equipment for tall elevations and stairwells, and premium exterior systems for render, timber cladding and hardwood joinery that face the Downs weather. Whether it is a full exterior in Kingswood or a drawing-room repaint in heritage colours, the job is scoped in writing and finished to the same exacting line.',
    ],
    highlights: [
      'High-specification finishes for Kingswood’s largest detached homes',
      'Multi-room and whole-house projects phased around family life',
      'Tall-elevation exteriors with proper access planning included',
      'Specialist finishes: Venetian plaster, limewash and metallic glazes',
    ],
    villages: ['Kingswood', 'Walton-on-the-Hill', 'Lower Kingswood', 'Burgh Heath', 'Mogador'],
    faqs: [
      {
        question: 'Do you take on whole-house redecorations in Kingswood?',
        answer:
          'Yes — larger phased projects are exactly what our process is built for. We scope room by room, agree a schedule that keeps the house livable, and hold one consistent standard from the first ceiling to the final door edge. The written quote itemises every space so nothing is ambiguous.',
      },
      {
        question: 'Can you handle tall exterior elevations and access equipment?',
        answer:
          'Yes. We assess access at the site visit — towers, scaffolding or specialist equipment where needed — and arrange it as part of the job, costed transparently in the quote rather than appearing as a surprise later.',
      },
      {
        question: 'Do you offer specialist finishes like Venetian plaster in Tadworth?',
        answer:
          'We do — hand-applied Venetian and Marmorino polished plaster, limewash for period walls, and metallic and pearlescent glazes. These are applied by hand using traditional methods, so every wall is genuinely unique.',
      },
      {
        question: 'Which villages around Tadworth do you cover?',
        answer:
          'All of KT20: Tadworth, Kingswood, Lower Kingswood, Walton-on-the-Hill, Mogador and Burgh Heath. Banstead, Epsom and Reigate each have dedicated Brushly coverage of their own.',
      },
    ],
    nearby: ['banstead', 'epsom', 'reigate', 'dorking'],
  },
  {
    slug: 'ashtead',
    name: 'Ashtead',
    postcode: 'KT21',
    county: 'Surrey',
    metaTitle: 'Painter & Decorator in Ashtead',
    metaDescription:
      'Premium painting and decorating in Ashtead, KT21 — village-centre cottages, 1930s family homes and modern rebuilds. Interior, exterior, wallpapering and specialist finishes from Brushly. Free itemised quotes.',
    headline: 'Painting & decorating in',
    headlineAccent: 'Ashtead',
    intro:
      'Ashtead blends village charm with serious family homes — and both deserve a proper finish.',
    paragraphs: [
      'Between The Street’s village character and the substantial family houses towards Ashtead Park and the Downs, KT21 offers everything from period cottages with wobbly-wall charm to crisp modern rebuilds on generous plots. That range is the point: older cottages need sympathetic preparation and breathable systems that let historic walls move and breathe, while Ashtead’s many rebuilt and extended homes call for razor-straight lines, spray-quality woodwork and hard-wearing designer emulsions.',
      'Ashtead families tend to extend rather than move, and redecoration often follows building work — which is where our preparation focus earns its keep. New plaster mist-coated correctly, filler lines feathered invisible, fresh joinery primed and built up properly: the difference between a paint job that flatters an extension for six months and one that still looks right in six years. We also hang wallpaper, from a single nursery feature wall to full designer schemes.',
    ],
    highlights: [
      'Post-extension and renovation decorating done to a lasting standard',
      'Sympathetic systems for Ashtead’s village-centre period cottages',
      'Sharp modern finishes for rebuilt and extended family homes',
      'Covered by our Epsom–Leatherhead corridor for reliable scheduling',
    ],
    villages: ['Ashtead Park', 'The Street', 'Lower Ashtead', 'Ashtead Common fringe'],
    faqs: [
      {
        question: 'We have just finished an extension in Ashtead — when can decoration start?',
        answer:
          'New plaster needs to dry before it is decorated; timing depends on plaster type, thickness and the season, and we will assess it honestly at the site visit rather than rushing coats onto damp walls. When it is ready, we mist-coat and build up the finish properly so it lasts.',
      },
      {
        question: 'Do you decorate cottages and older properties in Ashtead village?',
        answer:
          'Yes — sympathetic preparation, flexible fillers where old walls move, and breathable paint systems where the substrate needs them. Period joinery is prepared and repainted rather than lost under thick coats.',
      },
      {
        question: 'Can you match the finish quality of a high-end kitchen company?',
        answer:
          'That is the standard we aim woodwork at: surfaces rubbed flat, fine coats built up, and a hand-finished result comparable to factory-sprayed joinery. Ask to see our finish on panelled doors and wardrobes when we visit.',
      },
      {
        question: 'Which nearby areas do you also cover?',
        answer:
          'Ashtead sits in the middle of our patch — Epsom, Leatherhead and Tadworth are all covered with dedicated pages of their own, and Oxshott and Cobham fall within our working range via Esher and Leatherhead.',
      },
    ],
    nearby: ['epsom', 'leatherhead', 'tadworth', 'esher'],
  },
  {
    slug: 'leatherhead',
    name: 'Leatherhead',
    postcode: 'KT22',
    county: 'Surrey',
    metaTitle: 'Painter & Decorator in Leatherhead',
    metaDescription:
      'Brushly delivers premium painting and decorating across Leatherhead, Fetcham and Bookham — riverside period homes, executive estates and family houses in KT22. Interior, exterior and specialist finishes.',
    headline: 'Painting & decorating in',
    headlineAccent: 'Leatherhead',
    intro:
      'From the old riverside town to Givons Grove, Leatherhead spans centuries of building — we decorate all of them.',
    paragraphs: [
      'Leatherhead’s historic core — timber-framed and Georgian buildings around Church Street and the Mole riverside — gives way to substantial executive homes on Givons Grove and the family streets of Fetcham and Great Bookham. Each era gets its own treatment: traditional preparation and heritage colourways where the building’s age shows in its bones, and immaculate contemporary schemes for the modern estates, where flat walls, shadow-gap details and full-height glazing leave nowhere for sloppy work to hide.',
      'The KT22 corridor is also commuter country, and we run our jobs accordingly: clear start dates, sheeted and protected rooms, tidy end-of-day handovers, and communication that respects your working week. Exteriors along the Mole valley contend with damp air and heavy tree cover, so we specify fungicidal treatment and breathable, weather-resistant systems as standard where conditions demand them — protection first, then presentation.',
    ],
    highlights: [
      'Coverage across Leatherhead, Fetcham, Great Bookham and Givons Grove',
      'Heritage-appropriate work in the historic riverside town centre',
      'Immaculate contemporary finishes for executive and new-build homes',
      'Mole-valley exteriors: fungicidal treatment and breathable systems',
    ],
    villages: ['Fetcham', 'Great Bookham', 'Little Bookham', 'Givons Grove', 'Oxshott fringe'],
    faqs: [
      {
        question: 'Do you cover Fetcham and Bookham as well as Leatherhead town?',
        answer:
          'Yes — the full KT22/KT23 belt: Leatherhead town, Fetcham, Great and Little Bookham, and Givons Grove. Neighbouring Ashtead, Dorking and Esher have their own dedicated coverage, and Oxshott sits within our working range.',
      },
      {
        question: 'My exterior paintwork keeps going green — can you fix that?',
        answer:
          'Tree cover and the Mole valley’s damp air make algae a common problem in Leatherhead. We treat it properly: fungicidal wash, full clean-down, stabilisation where needed, then a breathable exterior system that resists regrowth rather than sealing the problem in.',
      },
      {
        question: 'Can you work around a busy family and commuting schedule?',
        answer:
          'That is normal for us. We agree working hours up front, protect and re-open living spaces daily, and keep you updated as each room completes — the job should fit your week, not dominate it.',
      },
      {
        question: 'Do you hang designer wallpaper?',
        answer:
          'Yes — including hand-printed, grasscloth and wide-width papers, with full surface preparation, lining where needed, and precise pattern matching. We can also advise on paper choice for each room’s light and use.',
      },
    ],
    nearby: ['ashtead', 'dorking', 'esher', 'epsom'],
  },
  {
    slug: 'dorking',
    name: 'Dorking',
    postcode: 'RH4–RH5',
    county: 'Surrey',
    metaTitle: 'Painter & Decorator in Dorking',
    metaDescription:
      'Premium painting and decorating in Dorking and the Surrey Hills — period cottages, listed buildings and family homes in RH4 & RH5. Breathable systems, heritage colours and specialist finishes from Brushly.',
    headline: 'Painting & decorating in',
    headlineAccent: 'Dorking',
    intro:
      'Under Box Hill and the Surrey Hills, Dorking’s period buildings ask for decorators who understand old walls.',
    paragraphs: [
      'Dorking is one of the most architecturally rewarding towns we cover: flint cottages and Georgian townhouses through the historic West Street antiques quarter, Victorian villas on the hill roads, and village homes out through Westcott, Brockham and Mickleham. Many of these buildings pre-date modern cement — their solid walls, lime plasters and old timbers need to breathe. We specify accordingly: limewash and mineral paints where they belong, breathable primers on old render, and flexible traditional preparation on surfaces that have moved for a century and will keep moving.',
      'That heritage sensibility runs alongside thoroughly modern work — family homes across RH4 and RH5 get durable designer emulsions, crisp woodwork and hard-working kitchen and bathroom finishes. And for period interiors that want something special, our specialist range comes into its own: hand-applied limewash for soft, cloudy depth, Venetian plaster for polished stone lustre, and heritage colour consultation matched to the age of the house.',
    ],
    highlights: [
      'Limewash, mineral and breathable systems for solid-wall period homes',
      'Experience with listed buildings and conservation-sensitive exteriors',
      'Coverage into the Surrey Hills villages: Westcott, Brockham, Mickleham',
      'Heritage colour consultation matched to the building’s era',
    ],
    villages: ['Westcott', 'Brockham', 'Mickleham', 'North Holmwood', 'Pixham'],
    faqs: [
      {
        question: 'Why does my old Dorking cottage need breathable paint?',
        answer:
          'Solid walls built with lime mortar manage moisture by letting it evaporate through the surface. Seal them with modern plastic-based paint and the moisture gets trapped — blowing plaster and flaking paint follow. We specify breathable systems (limewash, mineral or microporous paints) so the wall can keep doing what it was built to do.',
      },
      {
        question: 'Can you work on a listed building in Dorking?',
        answer:
          'Yes — with the appropriate care. Like-for-like redecoration is usually fine, but certain changes to a listed building (particularly external colours and finishes) can need consent, and we will flag that honestly before work starts rather than leaving you exposed.',
      },
      {
        question: 'Do you cover the villages around Dorking?',
        answer:
          'Yes — RH4 and RH5 including Westcott, Brockham, Mickleham, Pixham and the Holmwoods. Leatherhead and Reigate are covered as dedicated areas in their own right.',
      },
      {
        question: 'What is limewash and is it right for my home?',
        answer:
          'Limewash is a traditional mineral coating that soaks into the surface rather than filming over it, giving a soft, slightly cloudy depth of colour that modern flat emulsion cannot imitate — and it is naturally breathable. It suits old plaster and masonry beautifully; we will tell you honestly if your walls are better served by a modern system instead.',
      },
    ],
    nearby: ['reigate', 'leatherhead', 'horley', 'tadworth'],
  },
  {
    slug: 'horley',
    name: 'Horley',
    postcode: 'RH6',
    county: 'Surrey',
    metaTitle: 'Painter & Decorator in Horley',
    metaDescription:
      'Brushly provides premium painting and decorating across Horley, RH6 — Victorian town-centre homes and the new Westvale Park generation. Interior, exterior, wallpapering and new-build finishing. Free quotes.',
    headline: 'Painting & decorating in',
    headlineAccent: 'Horley',
    intro:
      'Horley is growing fast — and its newest homes need decorating as much as its oldest.',
    paragraphs: [
      'Horley runs from a Victorian and Edwardian core around the town centre and Massetts Road to thousands of brand-new homes across Westvale Park and the town’s expanding estates. New builds bring their own decorating truths: developer white rarely survives real life, fresh plaster keeps drying and hairline-cracking through the first years, and the standard builder finish is a starting point rather than an end state. We correct settlement cracks properly, re-mist where needed, and replace bland default schemes with colour that makes a new house feel like your home.',
      'In the older streets, the work looks different — period timber, original plaster and bay-fronted elevations that need patient preparation and weather-resistant exterior systems. Landlords around the Gatwick corridor also lean on us for dependable between-let repaints: durable trade finishes, neutral schemes that photograph well, and schedules that hold. One standard across all of it, scoped in writing before a brush is lifted.',
    ],
    highlights: [
      'New-build specialists: settlement cracks, mist coats, colour upgrades',
      'Coverage across Westvale Park and Horley’s new estates',
      'Period repaints in the Victorian town centre and Massetts Road area',
      'Dependable between-let repaints for Gatwick-corridor landlords',
    ],
    villages: ['Westvale Park', 'Meath Green', 'Hookwood', 'Smallfield', 'Salfords'],
    faqs: [
      {
        question: 'My new-build in Horley has cracks appearing — is that normal?',
        answer:
          'Almost always, yes. New homes dry out and settle for the first couple of years, producing hairline cracks at plasterboard joints and corners. We rake out, fill with flexible filler, and repaint properly — and we will tell you honestly if a crack looks structural rather than cosmetic and should be raised with your builder or warranty first.',
      },
      {
        question: 'Can you repaint my whole new-build from developer white?',
        answer:
          'Yes — this is one of the most satisfying jobs we do. We help you build a whole-house scheme, preview colours on photos of your actual rooms with our free AI visualizer, and apply designer-quality emulsions that outlast the builder-grade original by years.',
      },
      {
        question: 'Do you work with landlords near Gatwick?',
        answer:
          'Yes — between-let repaints across RH6 with durable trade-quality finishes, neutral lettable schemes, and invoicing that keeps your paperwork straight. We schedule tightly so void periods stay short.',
      },
      {
        question: 'Which areas around Horley do you cover?',
        answer:
          'All of RH6 — including Westvale Park, Meath Green, Hookwood, Salfords and Smallfield — plus Redhill and Reigate to the north as dedicated areas.',
      },
    ],
    nearby: ['redhill', 'reigate', 'dorking'],
  },
  {
    slug: 'esher',
    name: 'Esher',
    postcode: 'KT10',
    county: 'Surrey',
    metaTitle: 'Painter & Decorator in Esher',
    metaDescription:
      'Premium painting and decorating in Esher, Claygate, Oxshott and Cobham — high-specification interiors, designer papers and specialist finishes for KT10 & KT11 homes. Free itemised quotes from Brushly.',
    headline: 'Painting & decorating in',
    headlineAccent: 'Esher',
    intro:
      'On the private roads of Esher, Oxshott and Cobham, the finish is the standard — there is nowhere to hide.',
    paragraphs: [
      'Esher and its neighbours — Claygate, Oxshott, Cobham and the Crown Estate side of the A3 — hold some of the highest-specification homes in the country. Decorating at this level is a different discipline: vast wall runs and double-height halls that show every undulation, hardwood joinery and bespoke cabinetry that deserve hand-finished coats, designer papers priced per roll like art, and clients who can tell the difference between good and immaculate. Immaculate is the brief we accept.',
      'Our specialist range earns its place here — Venetian and Marmorino polished plasters, soft limewash, metallic and pearlescent glazes — alongside meticulous core decorating in Farrow & Ball, Little Greene and premium trade systems. We phase larger houses so family life continues, coordinate cleanly alongside other trades during refurbishments, and protect finished floors, stone and joinery as carefully as we paint. The written quote itemises everything; the finish speaks for itself.',
    ],
    highlights: [
      'High-specification finishing for Esher, Oxshott and Cobham homes',
      'Double-height halls and large wall runs finished flat and flawless',
      'Venetian plaster, limewash and metallic specialist finishes',
      'Clean coordination alongside builders, joiners and designers',
    ],
    villages: ['Claygate', 'Oxshott', 'Cobham', 'Hinchley Wood', 'West End'],
    faqs: [
      {
        question: 'Do you cover Oxshott and Cobham as well as Esher?',
        answer:
          'Yes — Esher, Claygate, Oxshott, Cobham and Hinchley Wood are all within our working area, alongside our core Surrey towns. For larger projects we phase the work and agree the schedule in writing before starting.',
      },
      {
        question: 'Can you work alongside our interior designer or builder?',
        answer:
          'Yes, and we prefer to be involved early — sequencing decoration correctly around other trades protects the finish and the programme. We work happily to a designer’s specification, sample boards and colour schedules, and communicate progress without needing to be chased.',
      },
      {
        question: 'How do you protect expensive floors and joinery during work?',
        answer:
          'Properly: breathable floor protection over stone and timber, sheeted and taped thresholds, furniture wrapped or moved, and clean end-of-day handovers. Protection is itemised in the quote like any other part of the job, because it is one.',
      },
      {
        question: 'Do you apply Venetian plaster and other specialist finishes?',
        answer:
          'Yes — hand-applied Venetian and Marmorino polished plaster, traditional and modern limewash, colour washing, and metallic and pearlescent glazes. Each is applied by hand with natural variation, so no two walls are alike.',
      },
    ],
    nearby: ['leatherhead', 'ashtead', 'epsom'],
  },
]

export const getArea = (slug: string): Area | undefined =>
  AREAS.find((a) => a.slug === slug)

export const getNearbyAreas = (area: Area): Area[] =>
  area.nearby
    .map((slug) => getArea(slug))
    .filter((a): a is Area => Boolean(a))
