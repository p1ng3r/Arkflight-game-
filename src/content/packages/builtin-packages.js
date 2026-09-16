import { GLASSBACK_CINDERWAKE } from "../events/glassback-cinderwake.js";
import { GILDED_SHATTER } from "../events/gilded-shatter.js";

export const BUILTIN_CONTENT_PACKAGES = Object.freeze([
  Object.freeze({
    id: "glassback-cinderwake",
    title: "The Glassback at Cinderwake Wreck",
    version: "1.0.0",
    description: "A three-round Arkflight ship event through burning wreckage and a Glassback leviathan's cinderwake.",
    category: "ship-event",
    image: GLASSBACK_CINDERWAKE.image,
    tags: ["ship-event", "voyage", "leviathan", "escape"],
    builtIn: true,
    content: { events: [GLASSBACK_CINDERWAKE] },
    adventure: {
      entryPoint: GLASSBACK_CINDERWAKE.id,
      stages: [{ id: "cinderwake-escape", label: "Escape Cinderwake", kind: "ship-event", eventId: GLASSBACK_CINDERWAKE.id }]
    }
  }),
  Object.freeze({
    id: "gilded-shatter",
    title: "The Gilded Shatter",
    version: "1.0.0",
    description: "Board the gilded derelict, survive the Dark Star's gravity shear, and open the wreck for normal PF2e exploration.",
    category: "adventure",
    image: GILDED_SHATTER.image,
    recommendedLevel: 6,
    playerCount: "4-6",
    tags: ["ship-event", "exploration", "salvage", "dark-star"],
    builtIn: true,
    content: { events: [GILDED_SHATTER] },
    resources: {
      compendiums: {
        journals: "world.arkflight-gilded-shatter-gm-guide",
        macros: "world.arkflight-gilded-shatter-gm-macros"
      }
    },
    adventure: {
      entryPoint: GILDED_SHATTER.id,
      stages: [
        { id: "boarding", label: "Board the Wreck", kind: "ship-event", eventId: GILDED_SHATTER.id },
        { id: "wreck-exploration", label: "Explore the Wreck", kind: "exploration", description: "Normal PF2e deck exploration after boarding." },
        { id: "salvage-escape", label: "Salvage & Escape", kind: "finale", description: "Resolve the wreck's final salvage and escape sequence." }
      ]
    }
  })
]);
