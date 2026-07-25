/**
 * Stone World — Story & Narrative Engine
 * 
 * Manages objectives, tech tree progression, and the narrative dialogue.
 */

export const STORY_EVENTS = [
  {
    id: 'intro',
    trigger: { type: 'start' },
    objective: 'The Spark of Civilization',
    subGoal: 'Gather sticks and create Fire.',
    dialogue: [
      "Wake up! You've been asleep for 3,700 years.",
      "The world has petrified. All of humanity's 2 million years of history... gone.",
      "But we have something better than magic. We have science. Ten billion percent pure logic.",
      "I am Dr. Aris. Together, we are going to fast-track civilization from the Stone Age to the modern era.",
      "First rule of survival: Heat. We need fire to cook, see, and forge. Find some sticks and use friction!"
    ]
  },
  {
    id: 'fire_crafted',
    trigger: { type: 'craft', item: 'fire' },
    objective: 'The Foundation of Industry',
    subGoal: 'Build a Kiln to reach high temperatures.',
    dialogue: [
      "Excellent! Friction generated kinetic energy, converting it into thermal energy.",
      "You hold the foundation of all human industry in your hands.",
      "But a campfire won't melt metal. We need an oven that traps heat. We need a Kiln.",
      "Gather clay, bake it into bricks, and bind it with mortar. We're going to trap the sun!"
    ]
  },
  {
    id: 'kiln_crafted',
    trigger: { type: 'craft', item: 'kiln' },
    objective: 'The Bronze Age',
    subGoal: 'Smelt copper and tin to forge Bronze.',
    dialogue: [
      "A Kiln! Now we're talking. By trapping thermal radiation, we can exceed 1000°C.",
      "This means we can perform carbothermic reduction. We can strip oxygen away from rocks.",
      "It's time to leave the Stone Age behind. Find Malachite for copper and Cassiterite for tin.",
      "Alloy them together. The soft sunset metal and the brittle silver will create something unbreakable: Bronze!"
    ]
  },
  {
    id: 'bronze_crafted',
    trigger: { type: 'craft', item: 'bronze' },
    objective: 'The Age of Alchemy',
    subGoal: 'Melt sand and lime to create Glass.',
    dialogue: [
      "Welcome to the Bronze Age! Notice how the tin atoms disrupt the copper crystal lattice? That's what gives it strength.",
      "Now that we have durable tools, we need to conquer chemistry. And to do that, we need containers that acid won't eat.",
      "We need a material that is an amorphous solid. We need Glass.",
      "Melt sand with quicklime. We are going to make invisible stone!"
    ]
  },
  {
    id: 'glass_crafted',
    trigger: { type: 'craft', item: 'glass' },
    objective: 'The Iron Age',
    subGoal: 'Extract Iron from ore using a blast furnace.',
    dialogue: [
      "Beautiful! Silica fused perfectly with calcium oxide.",
      "Now we have test tubes and lenses. But Bronze is too soft for heavy machinery.",
      "We need the metal that conquered the earth. Iron.",
      "The melting point is insanely high. You'll need limestone as a flux to pull away the impurities.",
      "Burn it hot, Aris-style. Let's build the bones of the modern world!"
    ]
  },
  {
    id: 'iron_crafted',
    trigger: { type: 'craft', item: 'iron' },
    objective: 'The Electrical Age',
    subGoal: 'Build a Voltaic Cell to harness electricity.',
    dialogue: [
      "Iron! The most abundant element on Earth by mass.",
      "We've conquered mechanics and chemistry. There is only one force left to tame before we reach the modern era.",
      "The invisible lightning. Electricity.",
      "We need acid, copper, and zinc. By submerging two different metals in an electrolyte, we'll create a galvanic cell.",
      "It's time to capture lighting in a bottle!"
    ]
  },
  {
    id: 'battery_crafted',
    trigger: { type: 'craft', item: 'voltaic_cell' },
    objective: 'The Light of Science',
    subGoal: 'Construct an Electric Lamp.',
    dialogue: [
      "You did it! Zinc is oxidizing, electrons are flowing to the copper.",
      "We have continuous electrical current!",
      "Let's put those electrons to work. Route them through a high-resistance filament inside a glass bulb.",
      "We are going to defeat the darkness of this petrified world. Let there be light!"
    ]
  },
  {
    id: 'lamp_crafted',
    trigger: { type: 'craft', item: 'electric_lamp' },
    objective: 'The Revival Fluid',
    subGoal: 'Create Nital to revive humanity.',
    dialogue: [
      "Look at that glow... Joule heating converting electrical energy directly into light.",
      "You've climbed 2 million years of human history in just a few days.",
      "But we aren't done. The people in stone are waiting.",
      "Combine distilled alcohol, nitric acid, and our chemical mastery. We need Nital.",
      "It's time to wake everyone up."
    ]
  }
];

export class StoryEngine {
  constructor(engine) {
    this.engine = engine;
    this.completedEvents = new Set();
    this.currentObjective = "The Spark of Civilization";
    this.currentSubGoal = "Gather sticks and create Fire.";
    this.onDialogue = null;
    this.onObjectiveUpdate = null;
  }

  init() {
    // Listen for crafts to trigger story
    this.engine.on('craftSuccess', (data) => {
      this.checkEvent('craft', data.reaction.output);
    });

    // Start intro if it's a new game (or just started)
    setTimeout(() => {
      if (!this.completedEvents.has('intro')) {
        this.triggerEvent('intro');
      }
    }, 1000);
  }

  checkEvent(type, item) {
    const event = STORY_EVENTS.find(e => 
      e.trigger.type === type && 
      e.trigger.item === item && 
      !this.completedEvents.has(e.id)
    );
    
    if (event) {
      this.triggerEvent(event.id);
    }
  }

  triggerEvent(eventId) {
    const event = STORY_EVENTS.find(e => e.id === eventId);
    if (!event) return;

    this.completedEvents.add(eventId);
    this.currentObjective = event.objective;
    this.currentSubGoal = event.subGoal;

    if (this.onObjectiveUpdate) {
      this.onObjectiveUpdate(this.currentObjective, this.currentSubGoal);
    }

    if (this.onDialogue) {
      this.onDialogue(event.dialogue);
    }
  }

  // Restore state for saves (if implemented)
  loadState(state) {
    if (state && state.completedEvents) {
      this.completedEvents = new Set(state.completedEvents);
      this.currentObjective = state.currentObjective || "Survive";
      this.currentSubGoal = state.currentSubGoal || "Explore the world.";
      if (this.onObjectiveUpdate) {
        this.onObjectiveUpdate(this.currentObjective, this.currentSubGoal);
      }
    }
  }

  saveState() {
    return {
      completedEvents: Array.from(this.completedEvents),
      currentObjective: this.currentObjective,
      currentSubGoal: this.currentSubGoal
    };
  }
}
