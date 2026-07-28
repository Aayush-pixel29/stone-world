export const PROCESSES = {
  heat: { name: 'Heat', emoji: '🔥', description: 'Apply fire or extreme heat' },
  mix: { name: 'Mix', emoji: '🫗', description: 'Combine materials together' },
  crush: { name: 'Crush', emoji: '🔨', description: 'Break down or grind materials' },
  soak: { name: 'Soak', emoji: '💧', description: 'Dissolve or steep in liquid' },
  friction: { name: 'Friction', emoji: '✋', description: 'Rub materials together vigorously' }
};

export const REACTIONS = [
  // TIER 0
  {
    inputs: ['stick', 'stick'],
    process: 'friction',
    output: 'fire',
    outputQty: 1,
    tier: 0,
    description: 'You created fire!',
    science: 'Friction generates heat energy via kinetic-to-thermal conversion.',
    hint: 'Two brothers rubbing together birth the sun.'
  },
  {
    inputs: ['stone', 'stone'],
    process: 'crush',
    output: 'sharp_stone',
    outputQty: 1,
    tier: 0,
    description: 'A crude but effective cutting edge.',
    science: 'Mechanical fracturing of brittle minerals creates sharp, thin edges.',
    hint: 'Smash the earth to find its teeth.'
  },
  {
    inputs: ['sharp_stone', 'stick'],
    process: 'mix',
    output: 'crude_axe',
    outputQty: 1,
    tier: 0,
    description: 'A basic tool for chopping.',
    science: 'Simple machines: a wedge attached to a lever multiplies applied force.',
    hint: 'Wood and stone unite to conquer wood.'
  },
  {
    inputs: ['fire', 'wood'],
    process: 'heat',
    output: 'charcoal',
    outputQty: 1,
    tier: 0,
    description: 'Slow-burning carbon fuel.',
    science: 'Pyrolysis of biomass in low oxygen yields nearly pure amorphous carbon.',
    hint: 'Feed the flames but deny them breath.'
  },
  {
    inputs: ['crude_axe', 'wood'],
    process: 'crush',
    output: 'plank',
    outputQty: 1,
    tier: 0,
    description: 'A flat piece of worked wood.',
    science: 'Cleaving wood along its natural grain separates the cellulose fibers.',
    hint: 'Split the tree to build the world.'
  },
  {
    inputs: ['plant_fiber', 'plant_fiber'],
    process: 'mix',
    output: 'rope',
    outputQty: 1,
    tier: 0,
    description: 'Twisted fibers form a strong cord.',
    science: 'Twisting multiple weak fibers creates a strong composite structure through friction.',
    hint: 'Twist the weak to bind the strong.'
  },
  {
    inputs: ['rope', 'sharp_stone', 'stick'],
    process: 'mix',
    output: 'spear',
    outputQty: 1,
    tier: 0,
    description: 'A long-reaching weapon.',
    science: 'Concentrating force into a tiny surface area maximizes pressure for penetration.',
    hint: 'Reach out and touch the predator.'
  },
  {
    inputs: ['clay', 'fire'],
    process: 'heat',
    output: 'fired_clay',
    outputQty: 1,
    tier: 0,
    description: 'Hardened earth.',
    science: 'Thermal dehydration of hydrous aluminium phyllosilicates forms a rigid ceramic.',
    hint: 'Bake the mud until it remembers stone.'
  },
  {
    inputs: ['reeds', 'reeds'],
    process: 'mix',
    output: 'basket',
    outputQty: 1,
    tier: 0,
    description: 'A woven container.',
    science: 'Interlocking structural members provide tensile and compressive strength.',
    hint: 'Weave the water-grass to hold the harvest.'
  },
  {
    inputs: ['bark', 'water'],
    process: 'soak',
    output: 'tannin',
    outputQty: 1,
    tier: 0,
    description: 'Astringent plant extract.',
    science: 'Aqueous extraction of polyphenolic biomolecules from tree bark.',
    hint: 'Bleed the tree\'s skin into the silent pool.'
  },
  {
    inputs: ['fire', 'fish'],
    process: 'heat',
    output: 'cooked_fish',
    outputQty: 1,
    tier: 0,
    description: 'Nourishing hot meal.',
    science: 'Heat denatures proteins, making them more digestible and killing pathogens.',
    hint: 'The swimmer meets the flame to feed the flesh.'
  },
  {
    inputs: ['berries', 'water'],
    process: 'mix',
    output: 'berry_juice',
    outputQty: 1,
    tier: 0,
    description: 'Sweet and hydrating.',
    science: 'Maceration ruptures cell walls, releasing intracellular fluids and sugars.',
    hint: 'Crush the sweet jewels into the drinking pool.'
  },

  // BRIDGE REACTIONS (critical paths)
  {
    inputs: ['fire', 'wood'],
    process: 'mix',
    output: 'ash',
    outputQty: 1,
    tier: 0,
    description: 'The fire leaves behind a fine gray powder.',
    science: 'Complete combustion of organic matter yields mineral-rich alkaline ash.',
    hint: 'What remains when the flame has eaten all it can?'
  },
  {
    inputs: ['river_stone'],
    process: 'crush',
    output: 'stone',
    outputQty: 2,
    tier: 0,
    description: 'You break the smooth river stone into usable chunks.',
    science: 'Fracturing rounded cobbles yields angular fragments with sharper edges.',
    hint: 'The river polished it, but your fist reveals its nature.'
  },

  // TIER 1
  {
    inputs: ['fired_clay', 'fired_clay', 'mortar'],
    process: 'mix',
    output: 'kiln',
    outputQty: 1,
    tier: 1,
    description: 'An oven capable of reaching high temperatures.',
    science: 'Refractory materials trap thermal energy, allowing temperatures exceeding 1000°C.',
    hint: 'Build a house to trap the sun.'
  },
  {
    inputs: ['seashells'],
    process: 'crush',
    output: 'calcium_carbonate_powder',
    outputQty: 1,
    tier: 1,
    description: 'Crushed shells.',
    science: 'Mechanical comminution of biogenic CaCO₃ increases surface area for reactions.',
    hint: 'Grind the sea\'s armor to dust.'
  },
  {
    inputs: ['calcium_carbonate_powder', 'kiln'],
    process: 'heat',
    output: 'quicklime',
    outputQty: 1,
    tier: 1,
    description: 'Caustic, highly reactive powder.',
    science: 'Thermal decomposition (calcination): CaCO₃ → CaO + CO₂.',
    hint: 'Burn the white dust until the air flees.'
  },
  {
    inputs: ['quicklime', 'sand', 'water'],
    process: 'mix',
    output: 'mortar',
    outputQty: 1,
    tier: 1,
    description: 'A workable paste that hardens.',
    science: 'Carbonatation of calcium hydroxide in the presence of silica forms a hard matrix.',
    hint: 'Stone-glue born of burning and quenching.'
  },
  {
    inputs: ['quicklime', 'water'],
    process: 'mix',
    output: 'slaked_lime',
    outputQty: 1,
    tier: 1,
    description: 'A highly alkaline paste.',
    science: 'Exothermic hydration reaction: CaO + H₂O → Ca(OH)₂.',
    hint: 'Feed water to the thirsty burnt stone; watch it boil without fire.'
  },
  {
    inputs: ['animal_fat', 'fire'],
    process: 'heat',
    output: 'rendered_fat',
    outputQty: 1,
    tier: 1,
    description: 'Purified animal grease.',
    science: 'Thermal melting separates lipids from connective tissue and water.',
    hint: 'Melt the beast to harvest its oil.'
  },
  {
    inputs: ['ash', 'water'],
    process: 'soak',
    output: 'lye',
    outputQty: 1,
    tier: 1,
    description: 'A highly alkaline liquid.',
    science: 'Leaching of potassium carbonate (K₂CO₃) and hydroxide (KOH) from wood ash.',
    hint: 'Water steals the biting ghost of the fire.'
  },
  {
    inputs: ['lye', 'rendered_fat'],
    process: 'mix',
    output: 'soap',
    outputQty: 1,
    tier: 1,
    description: 'A cleansing bar.',
    science: 'Saponification: base-catalyzed hydrolysis of triglycerides yields fatty acid salts.',
    hint: 'Combine the slick beast with the biting ghost to wash away all sins.'
  },
  {
    inputs: ['kiln', 'sand'],
    process: 'heat',
    output: 'crude_glass',
    outputQty: 1,
    tier: 1,
    description: 'Opaque, unrefined glass.',
    science: 'Melting of silica (SiO₂) forms an amorphous solid. Impurities prevent transparency.',
    hint: 'Melt the beach until it turns to ice that does not melt.'
  },
  {
    inputs: ['kiln', 'wood'],
    process: 'heat',
    output: 'charcoal_refined',
    outputQty: 1,
    tier: 1,
    description: 'High-quality, hot-burning carbon.',
    science: 'High-temperature pyrolysis drives off almost all volatile organic compounds.',
    hint: 'Bake the wood in a tomb of clay.'
  },
  {
    inputs: ['hide', 'tannin'],
    process: 'soak',
    output: 'leather',
    outputQty: 1,
    tier: 1,
    description: 'Durable, preserved animal skin.',
    science: 'Tannins cross-link collagen proteins, preventing putrefaction and hardening.',
    hint: 'The tree\'s blood grants immortality to the beast\'s skin.'
  },
  {
    inputs: ['raw_meat', 'fire'],
    process: 'heat',
    output: 'cooked_meat',
    outputQty: 1,
    tier: 1,
    description: 'A delicious, safe meal.',
    science: 'Heat denatures proteins and kills pathogens via thermal breakdown.',
    hint: 'The beast meets the flame.'
  },
  {
    inputs: ['clay', 'water'],
    process: 'mix',
    output: 'clay_slip',
    outputQty: 1,
    tier: 1,
    description: 'A watery suspension of clay.',
    science: 'Deflocculation of clay particles creates a colloidal suspension.',
    hint: 'Drown the mud to make it flow like water.'
  },

  // TIER 2
  {
    inputs: ['charcoal', 'malachite'],
    process: 'heat',
    output: 'copper',
    outputQty: 1,
    tier: 2,
    description: 'A soft, conductive metal.',
    science: 'Carbothermic reduction: 2 Cu₂CO₃(OH)₂ + C → 4 Cu + 3 CO₂ + 2 H₂O.',
    hint: 'The green stone bleeds sunset metal in the charcoal\'s embrace.'
  },
  {
    inputs: ['charcoal', 'tin_ore'],
    process: 'heat',
    output: 'tin',
    outputQty: 1,
    tier: 2,
    description: 'A silvery, low-melting metal.',
    science: 'Carbothermic reduction of cassiterite: SnO₂ + C → Sn + CO₂.',
    hint: 'From dark rock, a silver tear falls in the heat.'
  },
  {
    inputs: ['copper', 'tin'],
    process: 'heat',
    output: 'bronze',
    outputQty: 1,
    tier: 2,
    description: 'A hard, durable alloy.',
    science: 'Alloying: tin atoms disrupt the copper crystal lattice, increasing hardness.',
    hint: 'The soft sunset and the brittle moon wed to become unbreakable.'
  },
  {
    inputs: ['bronze', 'stone'],
    process: 'crush',
    output: 'bronze_blade',
    outputQty: 1,
    tier: 2,
    description: 'A sharp, enduring edge.',
    science: 'Work hardening and abrasive grinding produce a sharp metallic edge.',
    hint: 'Bite the new metal with the old earth to give it teeth.'
  },
  {
    inputs: ['bronze_blade', 'rope', 'stick'],
    process: 'mix',
    output: 'bronze_sword',
    outputQty: 1,
    tier: 2,
    description: 'A deadly weapon of war.',
    science: 'A lever arm amplifies the slashing force of the metallic wedge.',
    hint: 'Bind the golden fang to the wooden arm.'
  },
  {
    inputs: ['copper', 'fire'],
    process: 'heat',
    output: 'copper_wire',
    outputQty: 1,
    tier: 2,
    description: 'A thin, flexible conductive thread.',
    science: 'Ductility of copper allows it to be drawn into thin wires when annealed.',
    hint: 'Stretch the sunset into a thread.'
  },
  {
    inputs: ['kiln', 'sand', 'slaked_lime'],
    process: 'heat',
    output: 'glass',
    outputQty: 1,
    tier: 2,
    description: 'Clear, brittle material.',
    science: 'Calcium oxide acts as a network modifier, stabilizing the silica melt into soda-lime glass.',
    hint: 'Melt the sand with the burnt stone to capture invisible water.'
  },
  {
    inputs: ['bronze', 'glass'],
    process: 'heat',
    output: 'glass_lens',
    outputQty: 1,
    tier: 2,
    description: 'Curved glass that bends light.',
    science: 'Molding glass into convex shapes relies on Snell\'s Law to refract light to a focal point.',
    hint: 'A frozen teardrop that magnifies the world.'
  },
  {
    inputs: ['clay_slip', 'kiln'],
    process: 'heat',
    output: 'pottery',
    outputQty: 1,
    tier: 2,
    description: 'A durable ceramic container.',
    science: 'Vitrification fuses clay particles, dramatically reducing porosity.',
    hint: 'The flowing mud is frozen forever by the fire.'
  },
  {
    inputs: ['pottery', 'water'],
    process: 'mix',
    output: 'water_vessel',
    outputQty: 1,
    tier: 2,
    description: 'A jar for carrying fluids.',
    science: 'Capillary action is prevented by the vitrified ceramic walls.',
    hint: 'The earth holds the rain without drinking it.'
  },
  {
    inputs: ['copper', 'crude_axe'],
    process: 'crush',
    output: 'copper_sheet',
    outputQty: 1,
    tier: 2,
    description: 'Flattened copper.',
    science: 'Malleability allows the metal lattice to deform under compressive stress.',
    hint: 'Beat the sunset metal flat like a leaf.'
  },
  {
    inputs: ['charcoal', 'saltpeter', 'sulfur'],
    process: 'crush',
    output: 'gunpowder',
    outputQty: 1,
    tier: 2,
    description: 'An explosive black powder.',
    science: 'Deflagration: 10 KNO₃ + 3 S + 8 C → 2 K₂CO₃ + 3 K₂SO₄ + 6 CO₂ + 5 N₂.',
    hint: 'The demon\'s breath, waiting for a spark.'
  },

  // TIER 3
  {
    inputs: ['charcoal', 'iron_ore', 'limestone'],
    process: 'heat',
    output: 'iron',
    outputQty: 1,
    tier: 3,
    description: 'A strong, heavy metal.',
    science: 'Blast furnace reduction: Fe₂O₃ + 3 CO → 2 Fe + 3 CO₂. Limestone acts as flux.',
    hint: 'Blood-rock and burnt wood, purged by the white stone, yield the world\'s bones.'
  },
  {
    inputs: ['charcoal', 'iron'],
    process: 'heat',
    output: 'steel',
    outputQty: 1,
    tier: 3,
    description: 'An exceptionally hard alloy.',
    science: 'Carbon infusion (cementation): interstitial carbon atoms strain the iron lattice.',
    hint: 'Feed the black dust to the hot iron bone.'
  },
  {
    inputs: ['steel', 'stone'],
    process: 'crush',
    output: 'steel_blade',
    outputQty: 1,
    tier: 3,
    description: 'A razor-sharp edge.',
    science: 'Martensite formation and grinding create a superior, durable cutting edge.',
    hint: 'Grind the star-metal until it can slice the wind.'
  },
  {
    inputs: ['leather', 'steel_blade', 'stick'],
    process: 'mix',
    output: 'steel_sword',
    outputQty: 1,
    tier: 3,
    description: 'The pinnacle of melee weaponry.',
    science: 'A perfect balance of tensile strength and hardness mounted on a moment arm.',
    hint: 'The ultimate fang, bound in beast-skin.'
  },
  {
    inputs: ['fire', 'iron'],
    process: 'heat',
    output: 'iron_sheet',
    outputQty: 1,
    tier: 3,
    description: 'Flat, durable iron.',
    science: 'Hot working of iron allows plastic deformation without fracturing.',
    hint: 'Beat the hot bone flat.'
  },
  {
    inputs: ['bronze', 'iron_sheet', 'iron_sheet'],
    process: 'mix',
    output: 'anvil',
    outputQty: 1,
    tier: 3,
    description: 'A heavy block for shaping metal.',
    science: 'Massive inertia provides an unyielding counter-force for forging operations.',
    hint: 'The altar where metal is baptized in hammers.'
  },
  {
    inputs: ['kiln', 'limestone'],
    process: 'heat',
    output: 'quicklime',
    outputQty: 1,
    tier: 3,
    description: 'Burnt limestone.',
    science: 'Calcination of bulk limestone: CaCO₃ → CaO + CO₂.',
    hint: 'The mountain\'s flesh, burnt to biting ash.'
  },
  {
    inputs: ['iron', 'sulfur'],
    process: 'heat',
    output: 'iron_sulfide',
    outputQty: 1,
    tier: 3,
    description: 'A dark, foul-smelling compound.',
    science: 'Direct combination reaction: Fe + S → FeS.',
    hint: 'The bone of the earth corrupted by brimstone.'
  },
  {
    inputs: ['iron_sulfide', 'water'],
    process: 'soak',
    output: 'sulfuric_acid_weak',
    outputQty: 1,
    tier: 3,
    description: 'A corrosive liquid.',
    science: 'Simulated microbial/weathering oxidation of sulfide yielding dilute H₂SO₄.',
    hint: 'Drown the corrupted iron to wring out its biting tears.'
  },
  {
    inputs: ['salt', 'sulfuric_acid_weak'],
    process: 'mix',
    output: 'hydrochloric_acid',
    outputQty: 1,
    tier: 3,
    description: 'A potent, fuming acid.',
    science: 'Displacement reaction: 2 NaCl + H₂SO₄ → Na₂SO₄ + 2 HCl.',
    hint: 'Ocean\'s tears meet biting water to brew the stone-eater.'
  },
  {
    inputs: ['charcoal', 'zinc_ore'],
    process: 'heat',
    output: 'zinc',
    outputQty: 1,
    tier: 3,
    description: 'A bluish-white metal.',
    science: 'Carbothermic reduction of sphalerite/smithsonite yielding volatile zinc vapor, which condenses.',
    hint: 'The gray stone yields a shy metal in the choking smoke.'
  },
  {
    inputs: ['copper', 'hydrochloric_acid', 'zinc'],
    process: 'mix',
    output: 'voltaic_cell',
    outputQty: 1,
    tier: 3,
    description: 'A primitive battery.',
    science: 'Galvanic cell: Zn oxidizes to Zn²⁺, transferring electrons to Cu through an external circuit.',
    hint: 'Two metals drown in acid to spark invisible fire.'
  },

  // TIER 4
  {
    inputs: ['copper_wire', 'voltaic_cell'],
    process: 'mix',
    output: 'circuit',
    outputQty: 1,
    tier: 4,
    description: 'A path for electric current.',
    science: 'Closing the electrical loop allows sustained flow of electrons.',
    hint: 'A leash for the invisible lightning.'
  },
  {
    inputs: ['circuit', 'glass_lens'],
    process: 'mix',
    output: 'electric_lamp',
    outputQty: 1,
    tier: 4,
    description: 'A contained, glowing light.',
    science: 'Joule heating of a resistive element in a protected vacuum or inert atmosphere.',
    hint: 'A star trapped in a teardrop of glass.'
  },
  {
    inputs: ['alcohol', 'sulfuric_acid_weak'],
    process: 'mix',
    output: 'ether',
    outputQty: 1,
    tier: 4,
    description: 'A volatile, sweet-smelling solvent.',
    science: 'Acid-catalyzed dehydration of ethanol: 2 C₂H₅OH → C₂H₅OC₂H₅ + H₂O.',
    hint: 'The biting water strips the spirit of its heaviness, leaving only dreams.'
  },
  {
    inputs: ['berry_juice'],
    process: 'soak',
    output: 'alcohol',
    outputQty: 1,
    tier: 4,
    description: 'An intoxicating, flammable liquid.',
    science: 'Anaerobic fermentation by yeast converts sugars into ethanol and CO₂.',
    hint: 'Time turns the sweet blood into a burning spirit.'
  },
  {
    inputs: ['alcohol', 'copper_sheet', 'fire'],
    process: 'heat',
    output: 'distilled_alcohol',
    outputQty: 1,
    tier: 4,
    description: 'Highly concentrated spirits.',
    science: 'Fractional distillation separates ethanol (BP 78.37°C) from water (BP 100°C).',
    hint: 'Boil the spirit and catch its ghost on cold metal.'
  },
  {
    inputs: ['ash', 'soap', 'water'],
    process: 'mix',
    output: 'disinfectant',
    outputQty: 1,
    tier: 4,
    description: 'A sterilizing solution.',
    science: 'Alkaline surfactants disrupt lipid bilayers of pathogens.',
    hint: 'Purify the water to wash away the invisible demons.'
  },
  {
    inputs: ['hydrochloric_acid', 'iron'],
    process: 'soak',
    output: 'ferric_chloride',
    outputQty: 1,
    tier: 4,
    description: 'An etchant and coagulant.',
    science: 'Reaction of iron with acid yields iron(II) chloride, oxidizing to iron(III) chloride: Fe + 2 HCl → FeCl₂ + H₂.',
    hint: 'The acid eats the iron, turning the water to blood.'
  },
  {
    inputs: ['charcoal', 'kiln', 'quicklime'],
    process: 'heat',
    output: 'calcium_carbide',
    outputQty: 1,
    tier: 4,
    description: 'A dark, rocky chemical.',
    science: 'Endothermic synthesis in a furnace: CaO + 3 C → CaC₂ + CO.',
    hint: 'Bake the burnt stone with black dust until they become one.'
  },
  {
    inputs: ['calcium_carbide', 'water'],
    process: 'mix',
    output: 'acetylene_gas',
    outputQty: 1,
    tier: 4,
    description: 'A highly flammable gas.',
    science: 'Hydrolysis of calcium carbide: CaC₂ + 2 H₂O → C₂H₂ + Ca(OH)₂.',
    hint: 'Water frees the screaming gas from the dark rock.'
  },
  {
    inputs: ['distilled_alcohol', 'saltpeter', 'sulfuric_acid_weak'],
    process: 'mix',
    output: 'nital',
    outputQty: 1,
    tier: 4,
    description: 'The revival fluid.',
    science: 'In situ generation of nitric acid (from nitrate + sulfuric acid) mixed with ethanol creates a potent etchant.',
    hint: 'The biting spirit that awakens sleeping stone.'
  },
  // TIER 5 - Industrial Age
  {
    inputs: ['oil_shale', 'fire'],
    process: 'heat',
    output: 'oil',
    outputQty: 1,
    tier: 5,
    description: 'You extracted crude oil.',
    science: 'Destructive distillation of oil shale extracts kerogen, converting it to synthetic crude oil.',
    hint: 'Squeeze the black blood from the rock with heat.'
  },
  {
    inputs: ['oil', 'sulfuric_acid_weak'],
    process: 'mix',
    output: 'plastic',
    outputQty: 1,
    tier: 5,
    description: 'You synthesized a durable polymer.',
    science: 'Polymerization of hydrocarbons creates a strong, moldable synthetic material.',
    hint: 'Mix the black gold with acid.'
  },
  {
    inputs: ['steel', 'anvil'],
    process: 'crush', 
    output: 'gears',
    outputQty: 2,
    tier: 5,
    description: 'Precisely machined steel gears.',
    science: 'Mechanical advantage allows transmission of torque and speed.',
    hint: 'Beat the hardest metal into teeth.'
  },
  {
    inputs: ['iron', 'water'],
    process: 'heat', 
    output: 'steam_engine',
    outputQty: 1,
    tier: 5,
    description: 'A functional steam engine!',
    science: 'Expanding water vapor converts thermal energy into mechanical work.',
    hint: 'Trap boiling water in a metal cage.'
  }
];
