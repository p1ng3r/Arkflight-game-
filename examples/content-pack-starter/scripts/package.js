
const MODULE_ID = "arkflight-example-adventure";
const PACKAGE_ID = "example-adventure";
const VERSION = "0.1.0";

function buildPackageDefinition() {
  return {
    id: PACKAGE_ID,
    title: "The Example Adventure",
    version: VERSION,
    description: "Replace this with the adventure pitch.",
    author: "Arkflight",
    category: "adventure",
    recommendedLevel: 6,
    playerCount: "4-6",
    duration: "1 session",
    tags: ["example"],

    requirements: {
      system: "pf2e",
      core: ">=0.1.0",
      modules: []
    },

    optionalModules: [],

    content: {
      events: [],
      journals: [],
      macros: [],
      tables: [],
      actors: [],
      scenes: []
    },

    adventure: {
      stages: [
        {
          id: "opening",
          label: "Opening",
          kind: "exploration",
          description: "Replace with the real first stage."
        }
      ]
    },

    runtime: {
      launch: async ({ state, stage, shipReference }) => {
        return openAdventure({ state, stage, shipReference });
      }
    }
  };
}

async function openAdventure({ state, stage, shipReference } = {}) {
  console.info("Arkflight | Example Adventure opened", {
    state,
    stage,
    shipReference
  });

  ui.notifications?.info?.(
    "Example Adventure is registered. Replace openAdventure() with the real GM runtime."
  );

  return { state, stage, shipReference };
}

async function registerPackage({ sync = true } = {}) {
  const content = game.arkflight?.content;

  if (!content?.registerPackage) {
    throw new Error(
      "Arkflight Event Manager 2.0 is unavailable. Update Arkflight Game."
    );
  }

  if (!content.get(PACKAGE_ID)) {
    content.registerPackage(buildPackageDefinition(), {
      source: MODULE_ID
    });
  }

  if (game.user?.isGM && sync) {
    await content.sync(PACKAGE_ID);
  }

  return content.get(PACKAGE_ID);
}

Hooks.once("ready", async () => {
  try {
    await registerPackage();
  } catch (error) {
    console.error(
      "Arkflight | Example Adventure registration failed",
      error
    );
    ui.notifications?.error?.(error.message);
  }
});

Hooks.once("ready", () => {
  game.arkflight ??= {};
  game.arkflight.exampleAdventure = Object.freeze({
    open: openAdventure,
    sync: () => game.arkflight.content.sync(PACKAGE_ID),
    reset: () => game.arkflight.content.resetProgress(PACKAGE_ID),
    status: () => game.arkflight.content.state(PACKAGE_ID)
  });
});
