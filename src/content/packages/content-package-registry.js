const PACKAGE_ID = /^[a-z0-9][a-z0-9-]*$/;

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function rows(value) { return Array.isArray(value) ? [...value] : []; }
function text(value, fallback = "") { return String(value ?? fallback).trim(); }

function normalizeEvent(entry) {
  const event = entry?.event ?? entry;
  if (!event?.id) throw new Error("Arkflight content-package event entries require an event with id.");
  return freeze({ id: event.id, event, role: text(entry?.role, "event"), label: text(entry?.label, event.title ?? event.id) });
}

function normalizeStage(stage, index) {
  const id = text(stage?.id, `stage-${index + 1}`);
  if (!PACKAGE_ID.test(id)) throw new Error(`Invalid Arkflight adventure stage id: ${id}`);
  return freeze({
    id,
    label: text(stage?.label, id.replaceAll("-", " ")),
    kind: text(stage?.kind, "event"),
    eventId: stage?.eventId ? text(stage.eventId) : null,
    description: text(stage?.description),
    optional: Boolean(stage?.optional)
  });
}

export function defineContentPackage(definition = {}) {
  const id = text(definition.id);
  if (!PACKAGE_ID.test(id)) throw new Error(`Invalid Arkflight content package id: ${id || "(blank)"}`);
  const title = text(definition.title);
  if (!title) throw new Error(`Arkflight content package ${id} requires a title.`);
  const content = definition.content ?? {};
  const events = rows(content.events).map(normalizeEvent);
  const stages = rows(definition.adventure?.stages).map(normalizeStage);
  const entryPoint = text(definition.adventure?.entryPoint) || events[0]?.id || null;
  if (entryPoint && !events.some((entry) => entry.id === entryPoint) && !stages.some((stage) => stage.eventId === entryPoint)) {
    throw new Error(`Arkflight content package ${id} entryPoint ${entryPoint} is not declared by the package.`);
  }

  return freeze({
    id,
    title,
    version: text(definition.version, "1.0.0"),
    description: text(definition.description),
    author: text(definition.author),
    category: text(definition.category, "adventure"),
    image: text(definition.image),
    recommendedLevel: definition.recommendedLevel ?? null,
    playerCount: text(definition.playerCount),
    duration: text(definition.duration),
    tags: freeze(rows(definition.tags).map((tag) => text(tag)).filter(Boolean)),
    builtIn: Boolean(definition.builtIn),
    requirements: freeze({
      system: text(definition.requirements?.system, "pf2e"),
      core: text(definition.requirements?.core),
      modules: freeze(rows(definition.requirements?.modules).map((id) => text(id)).filter(Boolean))
    }),
    optionalModules: freeze(rows(definition.optionalModules).map((id) => text(id)).filter(Boolean)),
    adventure: freeze({ entryPoint, stages: freeze(stages) }),
    content: freeze({
      events: freeze(events),
      journals: freeze(rows(content.journals)),
      macros: freeze(rows(content.macros)),
      tables: freeze(rows(content.tables)),
      actors: freeze(rows(content.actors)),
      scenes: freeze(rows(content.scenes))
    }),
    resources: freeze({ ...(definition.resources ?? {}) })
  });
}

export class ContentPackageRegistry {
  constructor({ registerEvent = null, unregisterEvent = null } = {}) {
    this._packages = new Map();
    this._eventOwners = new Map();
    this._listeners = new Set();
    this._registerEvent = registerEvent;
    this._unregisterEvent = unregisterEvent;
  }

  register(definition, { source = "unknown", replace = false } = {}) {
    const pkg = defineContentPackage(definition);
    const existing = this._packages.get(pkg.id);
    if (existing && !replace) throw new Error(`Arkflight content package already registered: ${pkg.id}`);

    for (const entry of pkg.content.events) {
      const owner = this._eventOwners.get(entry.id);
      if (owner && owner !== pkg.id && !replace) throw new Error(`Arkflight event ${entry.id} is already owned by package ${owner}.`);
    }

    if (existing) this.unregister(pkg.id, { preserveEventDefinitions: false, silent: true });
    for (const entry of pkg.content.events) {
      this._registerEvent?.(entry.event, { owner: `package:${pkg.id}`, replace });
      this._eventOwners.set(entry.id, pkg.id);
    }

    const record = freeze({ package: pkg, source: text(source, "unknown"), registeredAt: Date.now() });
    this._packages.set(pkg.id, record);
    this._emit("registered", pkg.id);
    return pkg;
  }

  unregister(packageId, { preserveEventDefinitions = false, silent = false } = {}) {
    const id = text(packageId);
    const record = this._packages.get(id);
    if (!record) return false;
    for (const entry of record.package.content.events) {
      if (this._eventOwners.get(entry.id) !== id) continue;
      this._eventOwners.delete(entry.id);
      if (!preserveEventDefinitions) this._unregisterEvent?.(entry.id, { owner: `package:${id}` });
    }
    this._packages.delete(id);
    if (!silent) this._emit("unregistered", id);
    return true;
  }

  get(packageId) { return this._packages.get(text(packageId))?.package ?? null; }
  record(packageId) { return this._packages.get(text(packageId)) ?? null; }
  list() { return [...this._packages.values()].map((entry) => entry.package).sort((a, b) => a.title.localeCompare(b.title)); }
  source(packageId) { return this._packages.get(text(packageId))?.source ?? null; }
  packageForEvent(eventId) { const owner = this._eventOwners.get(text(eventId)); return owner ? this.get(owner) : null; }
  events(packageId) { return this.get(packageId)?.content.events.map((entry) => entry.event) ?? []; }

  onChange(callback) {
    if (typeof callback !== "function") throw new Error("Arkflight package registry listener must be a function.");
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  _emit(type, packageId) {
    const payload = freeze({ type, packageId, package: this.get(packageId) });
    for (const callback of this._listeners) callback(payload);
  }
}
