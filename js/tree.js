import { db } from "./firebase.js?v=20260612-emulator-qa";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";

import {
  getAllPeople,
  getFamilyRole,
  groupByGeneration,
  sortGenerationKeys,
  areSpouses,
  derivePersonChildren,
  resolvePersonParentIds,
  resolvePersonSpouseIds,
  findPersonByNameString,
  toTitle,
  toTitleFullName,
  buildFullName
} from "./helpers.js?v=20260612-4";
import { resolveCurrentUserFamilyId } from "./familyContext.js?v=20260612-4";
import { generateLargeDemoTree } from "./demoTreeData.js?v=20260612-4";
import { STARTER_TREE_ID } from "./starterTree.js?v=20260612-4";

/* Keep a reference to the last rendered people so we can redraw lines on resize */
let lastRenderedPeople = [];
let pendingHighlightPersonId = null;
let treeFocusMatches = [];
let treeFocusIndex = -1;
let currentTreeView = "cards";
let chartRefreshToken = 0;
let chartLoadTimer = null;
let activeTreeContext = {
  familyId: null,
  isDemoMode: true,
  canEdit: false,
};
const TREE_DENSITY_STORAGE_KEY = "treeDensity";
const TREE_VIEW_STORAGE_KEY = "treePreferredView";
const TREE_RECENTS_STORAGE_KEY = "treeRecentlyViewedPeople";
const TREE_RECENTS_LIMIT = 8;
const TREE_RELATIVE_GROUP_LIMIT = 4;
const TREE_DENSITIES = new Set(["comfortable", "dense", "compact"]);
const TREE_VIEWS = new Set(["chart", "cards"]);
const CHART_READY_TIMEOUT_MS = 9000;
const OVERVIEW_MODE_THRESHOLD = 34;
const OVERVIEW_COLLAPSE_AFTER_GENERATION = 3;
const MOBILE_OVERVIEW_COLLAPSE_AFTER_GENERATION = 2;
const RELATIONSHIP_SUGGESTION_LIMIT = 7;

function isLargeDemoMode() {
  return new URLSearchParams(window.location.search).get("demo") === "large";
}

function getInitialFocusPersonId() {
  return new URLSearchParams(window.location.search).get("focus") || null;
}

function getInitialTreeQuery() {
  return new URLSearchParams(window.location.search).get("treeQuery") || "";
}

function getRequestedTreeView() {
  const requestedView = new URLSearchParams(window.location.search).get("view");
  return TREE_VIEWS.has(requestedView) ? requestedView : null;
}

function isBirthdayDemoFamily(familyId) {
  return familyId === STARTER_TREE_ID;
}

function getPreferredTreeView(isOverviewMode, familyId = null) {
  const requestedView = getRequestedTreeView();
  if (requestedView) return requestedView;

  return isOverviewMode || isBirthdayDemoFamily(familyId) || !familyId ? "chart" : "chart";
}

function getChartRouteBase() {
  return window.location.pathname.includes("/html/")
    ? "/html/family_chart_spike.html"
    : "/tree-spike";
}

function buildChartFrameUrl(familyId, isDemoMode = false) {
  const params = new URLSearchParams();
  if (isDemoMode || !familyId) {
    params.set("demo", "large");
  } else {
    params.set("familyId", familyId);
  }
  params.set("embed", "tree");
  const focusPersonId = getInitialFocusPersonId();
  if (focusPersonId) {
    params.set("focus", focusPersonId);
  }
  const treeQuery = getInitialTreeQuery();
  if (treeQuery) {
    params.set("treeQuery", treeQuery);
  }
  if (chartRefreshToken) {
    params.set("fresh", String(chartRefreshToken));
  }

  return `${getChartRouteBase()}?${params.toString()}`;
}

function clearChartLoadTimer() {
  if (chartLoadTimer) {
    window.clearTimeout(chartLoadTimer);
    chartLoadTimer = null;
  }
}

function setChartStatus(state, title, message, { showFallback = false } = {}) {
  const chartView = document.getElementById("treeChartView");
  const titleEl = document.getElementById("treeChartStatusTitle");
  const messageEl = document.getElementById("treeChartStatusMessage");
  const fallbackBtn = document.getElementById("treeChartFallbackBtn");

  if (chartView) chartView.dataset.chartState = state;
  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;
  if (fallbackBtn) fallbackBtn.hidden = !showFallback;
}

function startChartLoadTimer() {
  clearChartLoadTimer();
  chartLoadTimer = window.setTimeout(() => {
    setChartStatus(
      "error",
      "Chart is taking too long",
      "The connected chart did not finish loading. The fallback list is still available.",
      { showFallback: true }
    );
  }, CHART_READY_TIMEOUT_MS);
}

function markChartLoading(message = "Building the family map...") {
  setChartStatus("loading", "Loading connected chart", message);
  startChartLoadTimer();
}

function markChartReady() {
  clearChartLoadTimer();
  setChartStatus("ready", "Connected chart ready", "The connected chart is ready.");
  const focusedPersonId = getInitialFocusPersonId();
  if (focusedPersonId) {
    focusPersonInChartFrame(focusedPersonId, getInitialTreeQuery());
  }
}

function markChartError(message = "The connected chart could not load. The fallback list is still available.") {
  clearChartLoadTimer();
  setChartStatus("error", "Chart view needs a refresh", message, { showFallback: true });
}

function updateChartFrameSource(familyId, isDemoMode = false) {
  const frame = document.getElementById("treeChartFrame");
  if (!frame) return;

  const nextSrc = buildChartFrameUrl(familyId, isDemoMode);
  const currentSrc = frame.getAttribute("src");
  if (currentSrc === nextSrc) return;

  markChartLoading();
  frame.dataset.chartReady = "false";
  frame.dataset.expectedSrc = nextSrc;
  frame.src = nextSrc;
}

function setupChartFrameSafety() {
  const frame = document.getElementById("treeChartFrame");
  const fallbackBtn = document.getElementById("treeChartFallbackBtn");
  if (!frame) return;

  frame.addEventListener("load", () => {
    const src = frame.getAttribute("src") || "";
    if (!src || src === "about:blank") return;
    if (frame.dataset.chartReady === "true") return;
    markChartLoading("Finalizing the connected chart...");
  });

  frame.addEventListener("error", () => {
    markChartError("The connected chart frame failed to load. Open fallback cards to keep browsing.");
  });

  fallbackBtn?.addEventListener("click", () => {
    setTreeView("cards");
    document.getElementById("tree-layout")?.scrollIntoView({
      block: "start",
      inline: "nearest",
      behavior: "smooth",
    });
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data || {};

    if (data.type === "tree-chart-resize") {
      const nextHeight = Math.max(720, Math.min(Number(data.height) || 0, 1800));
      if (nextHeight && frame) {
        frame.style.height = `${nextHeight}px`;
        frame.style.minHeight = `${nextHeight}px`;
        const chartView = document.getElementById("treeChartView");
        if (chartView) {
          chartView.style.minHeight = `${nextHeight}px`;
        }
      }
      return;
    }

    if (data.type === "tree-chart-person-selected") {
      setSelectedPersonPanel(data.personId, {
        source: "chart",
        scroll: false,
      });
      return;
    }

    if (data.type !== "tree-chart-status") return;

    if (data.status === "ready") {
      frame.dataset.chartReady = "true";
      markChartReady();
      return;
    }

    if (data.status === "error") {
      markChartError(data.message || "The connected chart could not render. The fallback list is still available.");
    }
  });
}

function focusPersonInChartFrame(personId, query = "") {
  if (!personId || currentTreeView !== "chart") return;

  const frame = document.getElementById("treeChartFrame");
  if (!frame?.contentWindow) return;

  frame.contentWindow.postMessage({
    type: "tree-chart-focus-person",
    personId,
    query,
  }, window.location.origin);
}

function sendChartControl(action) {
  if (!action || currentTreeView !== "chart") return false;

  const frame = document.getElementById("treeChartFrame");
  if (!frame?.contentWindow || frame.dataset.chartReady !== "true") return false;

  frame.contentWindow.postMessage({
    type: "tree-chart-control",
    action,
  }, window.location.origin);
  return true;
}

function updateTreeViewUrl(view) {
  const url = new URL(window.location.href);
  url.searchParams.set("view", view);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  updateRenderedProfileLinksForContext();
}

function updateTreeFocusUrl({ personId = null, query = null } = {}) {
  const url = new URL(window.location.href);

  if (personId) {
    url.searchParams.set("focus", personId);
  } else if (personId === "") {
    url.searchParams.delete("focus");
  }

  if (query) {
    url.searchParams.set("treeQuery", query);
  } else if (query === "") {
    url.searchParams.delete("treeQuery");
  }

  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  updateRenderedProfileLinksForContext();
}

function updateRenderedProfileLinksForContext() {
  const params = new URLSearchParams(window.location.search);
  const treeQuery = params.get("treeQuery") || "";

  document.querySelectorAll('#tree-layout a[data-person-id]').forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;

    const url = new URL(href, window.location.origin);
    if (TREE_VIEWS.has(currentTreeView)) {
      url.searchParams.set("view", currentTreeView);
    }
    if (treeQuery) {
      url.searchParams.set("treeQuery", treeQuery);
    } else {
      url.searchParams.delete("treeQuery");
    }
    link.href = `${url.pathname}${url.search}${url.hash}`;
  });
}

function setTreeView(view, options = {}) {
  const nextView = TREE_VIEWS.has(view) ? view : "cards";
  const { persist = true, updateUrl = true } = options;
  currentTreeView = nextView;

  const treeLayout = document.getElementById("tree-layout");
  const chartView = document.getElementById("treeChartView");
  const toolbar = document.querySelector(".tree-toolbar");
  const isChartView = nextView === "chart";

  if (treeLayout) treeLayout.hidden = isChartView;
  if (chartView) chartView.hidden = !isChartView;
  toolbar?.classList.toggle("is-chart-view", isChartView);
  document.body.classList.toggle("tree-chart-active", isChartView);
  document.body.classList.toggle(
    "tree-card-cue-ready",
    !isChartView && document.body.classList.contains("tree-card-layout-ready")
  );

  document.querySelectorAll("[data-tree-view]").forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.treeView === nextView ? "true" : "false");
  });

  const label = document.querySelector(".tree-toolbar-label");
  const hint = document.querySelector(".tree-scroll-hint");
  const actionHint = document.querySelector(".tree-action-hint");
  if (isChartView) {
    if (label) label.textContent = "Start here";
    if (hint) hint.textContent = "Search or click a card.";
    if (actionHint) actionHint.textContent = "Pan and zoom the map when the family gets wide.";
  }

  if (persist) localStorage.setItem(TREE_VIEW_STORAGE_KEY, nextView);
  if (updateUrl) updateTreeViewUrl(nextView);
  updateRenderedProfileLinksForContext();
}

function getOverviewCollapseAfterGeneration() {
  return window.matchMedia("(max-width: 640px)").matches
    ? MOBILE_OVERVIEW_COLLAPSE_AFTER_GENERATION
    : OVERVIEW_COLLAPSE_AFTER_GENERATION;
}

function getModalFocusableElements(modal) {
  return [...modal.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter(element => element.offsetParent !== null);
}

/* ---------------------------
   MODAL: ADD PERSON (UI ONLY)
--------------------------- */

function setupAddPersonModal() {
  const modal = document.getElementById("addModal");
  const btn = document.getElementById("addPersonBtn");
  const closeBtn = modal?.querySelector(".close");
  const modalContent = modal?.querySelector(".modal-content");
  let previouslyFocusedElement = null;

  if (!modal || !btn || !closeBtn) return;

  function openModal() {
    previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : btn;
    document.body.classList.add("add-person-modal-open");
    modal.hidden = false;
    modal.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
    window.dispatchEvent(new CustomEvent("add-person-modal-opened"));
    const firstNameInput = document.getElementById("firstName");
    if (firstNameInput && !firstNameInput.disabled) {
      firstNameInput.focus();
      return;
    }
    modalContent?.focus();
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.hidden = true;
    document.body.classList.remove("add-person-modal-open");
    btn.setAttribute("aria-expanded", "false");
    if (previouslyFocusedElement && document.contains(previouslyFocusedElement)) {
      previouslyFocusedElement.focus();
    } else {
      btn.focus();
    }
  }

  btn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);

  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = getModalFocusableElements(modal);
    if (focusableElements.length === 0) {
      event.preventDefault();
      modalContent?.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  });

  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  window.addEventListener("person-added", () => {
    closeModal();
  });
}

/* ---------------------------
   CARD CREATION
--------------------------- */

function createPersonCard(person, familyId = null, options = {}) {
  // birthDate is likely a Firestore Timestamp
  let formattedDate = "Birthday not listed";
  if (person.birthDate && typeof person.birthDate.toDate === "function") {
    const d = person.birthDate.toDate();
    formattedDate = d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  const fullTitleName = toTitleFullName(person.firstName, person.lastName);

  const link = document.createElement(options.noProfileLinks ? "span" : "a");
  if (!options.noProfileLinks) {
    const params = new URLSearchParams();
    params.set("person", person.id);
    addTreeProfileContext(params, familyId, {
      isDemoMode: Boolean(options.isDemoMode),
      isPublicExample: !familyId && !options.isDemoMode,
    });
    link.href = `/profile?${params.toString()}`;
  }
  link.dataset.personId = person.id; // for connector calculations
  link.dataset.personName = getPersonSearchText(person);

  const card = document.createElement("div");
  card.className = "person-card";
  if (options.highlightPersonId && person.id === options.highlightPersonId) {
    card.classList.add("person-card-new");
  }

  const media = document.createElement("div");
  media.className = "person-card-media";

  if (person.image) {
    const image = document.createElement("img");
    image.src = person.image;
    image.alt = "";
    image.loading = "lazy";
    media.appendChild(image);
  } else {
    const initials = document.createElement("span");
    initials.textContent = getInitials(person);
    media.appendChild(initials);
  }

  card.appendChild(media);

  const heading = document.createElement("h3");
  heading.textContent = fullTitleName || "Unnamed";
  card.appendChild(heading);

  const born = document.createElement("p");
  born.textContent = `Born: ${formattedDate}`;
  card.appendChild(born);

  if (options.showRelationshipTags) {
    const tagText = getPersonRelationshipTag(person, options.allPeople || []);
    if (tagText) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = tagText;
      card.appendChild(tag);
    }
  }

  link.appendChild(card);
  return link;
}

function getPersonRelationshipTag(person, allPeople) {
  if (!person || !Array.isArray(allPeople)) return "";

  const childCount = derivePersonChildren(person, allPeople).length;
  if (childCount > 0) {
    return childCount === 1 ? "1 child" : `${childCount} children`;
  }

  const spouseCount = allPeople.filter(other => other.id !== person.id && areSpouses(person, other)).length;
  if (spouseCount > 0) return spouseCount === 1 ? "Partnered" : `${spouseCount} partners`;

  return "Leaf branch";
}

function focusPersonInTree(personId) {
  if (!personId) return;

  revealCollapsedGenerationForPerson(personId);

  requestAnimationFrame(() => {
    const personLink = document.querySelector(`[data-person-id="${CSS.escape(personId)}"]`);
    const personCard = personLink?.querySelector(".person-card");
    if (!personLink || !personCard) return;

    setFocusedCard(personId);
    personLink.scrollIntoView({
      block: "center",
      inline: "center",
      behavior: "smooth",
    });

    personCard.classList.add("person-card-new");
    window.setTimeout(() => {
      personCard.classList.remove("person-card-new");
    }, 4200);
  });
}

function getInitials(person) {
  const first = person.firstName ? String(person.firstName).trim().charAt(0) : "";
  const last = person.lastName ? String(person.lastName).trim().charAt(0) : "";
  return `${first}${last}`.toUpperCase() || "?";
}

function normalizeTreeSearch(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function addTreeProfileContext(params, familyId, options = {}) {
  if (familyId) {
    params.set("familyId", familyId);
  } else if (options.demoContext) {
    params.set("demo", options.demoContext);
  } else if (options.isDemoMode || options.isPublicExample) {
    const currentDemo = new URLSearchParams(window.location.search).get("demo");
    params.set("demo", currentDemo === "large" ? "large" : "example");
  }

  params.set("from", "tree");
  if (TREE_VIEWS.has(currentTreeView)) {
    params.set("view", currentTreeView);
  }

  const treeQuery = new URLSearchParams(window.location.search).get("treeQuery") || "";
  if (treeQuery) {
    params.set("treeQuery", treeQuery);
  }
}

function getPersonSearchText(person) {
  return normalizeTreeSearch([
    person?.firstName,
    person?.middleInitial,
    person?.lastName,
    toTitleFullName(person?.firstName || "", person?.lastName || ""),
  ].filter(Boolean).join(" "));
}

function getPersonDisplayName(person) {
  return toTitleFullName(person?.firstName || "", person?.lastName || "") || "Unnamed";
}

function getPersonById(personId) {
  return lastRenderedPeople.find(person => person.id === personId) || null;
}

function getRecentPeopleScopeKey() {
  if (activeTreeContext.familyId) return `family:${activeTreeContext.familyId}`;
  return activeTreeContext.isDemoMode ? "demo:large" : "demo:example";
}

function readRecentPeopleStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TREE_RECENTS_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.warn("Could not read recently viewed people:", error);
    return {};
  }
}

function writeRecentPeopleStore(store) {
  try {
    localStorage.setItem(TREE_RECENTS_STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.warn("Could not save recently viewed people:", error);
  }
}

function getRecentPeopleIds() {
  const ids = readRecentPeopleStore()[getRecentPeopleScopeKey()];
  return Array.isArray(ids) ? ids.filter(Boolean) : [];
}

function setRecentPeopleIds(ids) {
  const store = readRecentPeopleStore();
  const scope = getRecentPeopleScopeKey();
  const cleanIds = [...new Set(ids.filter(id => getPersonById(id)))].slice(0, TREE_RECENTS_LIMIT);

  if (cleanIds.length > 0) {
    store[scope] = cleanIds;
  } else {
    delete store[scope];
  }

  writeRecentPeopleStore(store);
}

function createPersonJumpChip(person, labelPrefix = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tree-relative-chip";
  button.textContent = `${labelPrefix}${getPersonDisplayName(person)}`;
  button.addEventListener("click", () => {
    setSelectedPersonPanel(person.id, {
      source: "quick-jump",
      scroll: false,
      focusChart: true,
    });
  });
  return button;
}

function createOverflowChip(count) {
  const chip = document.createElement("span");
  chip.className = "tree-relative-chip tree-relative-overflow";
  chip.textContent = `+${count} more`;
  chip.setAttribute("aria-label", `${count} more relatives in this group`);
  return chip;
}

function addRecentPerson(personId) {
  if (!personId || !getPersonById(personId)) return;

  setRecentPeopleIds([
    personId,
    ...getRecentPeopleIds().filter(id => id !== personId),
  ]);
}

function renderRecentPeople() {
  const panel = document.getElementById("treeRecentPeoplePanel");
  const list = document.getElementById("treeRecentPeopleList");
  if (!panel || !list) return;

  const recentPeople = getRecentPeopleIds()
    .map(getPersonById)
    .filter(Boolean);

  list.replaceChildren();
  panel.hidden = recentPeople.length === 0;
  panel.setAttribute("aria-hidden", recentPeople.length === 0 ? "true" : "false");

  recentPeople.forEach(person => {
    list.appendChild(createPersonJumpChip(person));
  });
}

function clearRecentPeople() {
  setRecentPeopleIds([]);
  renderRecentPeople();
}

function setupRecentPeopleControls() {
  const clearButton = document.getElementById("treeRecentPeopleClear");
  clearButton?.addEventListener("click", clearRecentPeople);
}

function formatSelectedBirthDate(person) {
  const birthday = getBirthdayDate(person);
  if (!birthday) return "Birthday not listed";

  return birthday.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getSelectedRelationshipPeople(person, relationship) {
  if (!person) return [];

  if (relationship === "parents") {
    return resolvePersonParentIds(person, lastRenderedPeople)
      .map(getPersonById)
      .filter(Boolean);
  }

  if (relationship === "spouses") {
    return resolvePersonSpouseIds(person, lastRenderedPeople)
      .map(getPersonById)
      .filter(Boolean);
  }

  if (relationship === "children") {
    return derivePersonChildren(person, lastRenderedPeople);
  }

  if (relationship === "siblings") {
    const parentIds = resolvePersonParentIds(person, lastRenderedPeople);
    if (parentIds.length === 0) return [];

    return lastRenderedPeople
      .filter(other => other.id !== person.id)
      .filter(other => resolvePersonParentIds(other, lastRenderedPeople).some(parentId => parentIds.includes(parentId)))
      .sort((a, b) => getPersonDisplayName(a).localeCompare(getPersonDisplayName(b)));
  }

  return [];
}

function formatSelectedRelationshipList(people, emptyText) {
  if (!people.length) return emptyText;

  const names = people.map(getPersonDisplayName).filter(Boolean);
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
}

function formatSelectedBranchNote({ parents = [], spouses = [], children = [], siblings = [] } = {}) {
  return "";
}

function buildTreeProfileUrl(personId, { edit = false } = {}) {
  if (!personId) return "";

  const params = new URLSearchParams();
  params.set("person", personId);
  addTreeProfileContext(params, activeTreeContext.familyId, {
    isDemoMode: activeTreeContext.isDemoMode,
    isPublicExample: !activeTreeContext.familyId && !activeTreeContext.isDemoMode,
  });

  if (edit && activeTreeContext.canEdit) {
    params.set("edit", "1");
  }

  return `/profile?${params.toString()}`;
}

function setSelectedLink(link, href, label = "") {
  if (!link) return;
  if (!href) {
    link.hidden = true;
    link.removeAttribute("href");
    link.removeAttribute("aria-label");
    return;
  }

  link.hidden = false;
  link.href = href;
  if (label) {
    link.setAttribute("aria-label", label);
  }
}

function addRelativeFocusButton(container, person, labelPrefix = "") {
  if (!container || !person?.id) return;
  container.appendChild(createPersonJumpChip(person, labelPrefix));
}

function createRelativeGroup(title, people) {
  const group = document.createElement("section");
  group.className = "tree-relative-group";
  group.setAttribute("aria-label", title);

  const heading = document.createElement("h3");
  heading.textContent = title;
  group.appendChild(heading);

  const list = document.createElement("div");
  list.className = "tree-relative-chip-list";
  const uniquePeople = [];
  const seenIds = new Set();
  people.forEach(person => {
    if (!person?.id || seenIds.has(person.id)) return;
    seenIds.add(person.id);
    uniquePeople.push(person);
  });

  uniquePeople.slice(0, TREE_RELATIVE_GROUP_LIMIT).forEach(relative => {
    addRelativeFocusButton(list, relative);
  });

  const hiddenCount = uniquePeople.length - TREE_RELATIVE_GROUP_LIMIT;
  if (hiddenCount > 0) {
    list.appendChild(createOverflowChip(hiddenCount));
  }

  group.appendChild(list);
  return group;
}

function renderSelectedRelativeActions(person, parents, spouses, children, siblings) {
  const container = document.getElementById("treeSelectedRelativeActions");
  if (!container) return;

  container.replaceChildren();
  const label = document.createElement("p");
  label.className = "tree-relative-actions-label";
  label.textContent = "Close relatives";
  container.appendChild(label);

  const groups = [
    { title: "Parents", people: parents },
    { title: "Spouse/partner", people: spouses },
    { title: "Children", people: children },
    { title: "Siblings", people: siblings },
  ];

  const visibleGroups = groups.filter(group => group.people.length > 0);

  if (visibleGroups.length === 0) {
    const note = document.createElement("p");
    note.className = "tree-relative-empty";
    note.textContent = "No close relatives are linked yet.";
    container.appendChild(note);
    return;
  }

  visibleGroups.forEach(group => {
    container.appendChild(createRelativeGroup(group.title, group.people));
  });
}

function clearSelectedPersonPanel() {
  const panel = document.getElementById("treeSelectedPersonPanel");
  if (panel) panel.hidden = true;
  document.body.classList.remove("tree-has-selected-person");
  setSelectedLink(document.getElementById("treeSelectedProfileLink"), "");
  setSelectedLink(document.getElementById("treeSelectedEditLink"), "");
  const focusBtn = document.getElementById("treeSelectedFocusBtn");
  if (focusBtn) {
    focusBtn.hidden = true;
    focusBtn.onclick = null;
    focusBtn.removeAttribute("aria-label");
  }
  const clearBtn = document.getElementById("treeSelectedClearBtn");
  if (clearBtn) {
    clearBtn.hidden = true;
    clearBtn.onclick = null;
    clearBtn.removeAttribute("aria-label");
  }
  document.getElementById("treeSelectedRelativeActions")?.replaceChildren();
}

function clearSelectedPersonSelection() {
  clearSelectedPersonPanel();
  document.querySelectorAll(".person-card-focused").forEach(card => {
    card.classList.remove("person-card-focused");
  });
  updateTreeFocusUrl({ personId: "" });
  setTreeFocusStatus("");
}

function setSelectedPersonPanel(personId, { source = "tree", scroll = false, focusChart = false } = {}) {
  const panel = document.getElementById("treeSelectedPersonPanel");
  if (!panel || !personId) return;

  const person = getPersonById(personId);
  if (!person) {
    clearSelectedPersonPanel();
    return;
  }

  const parents = getSelectedRelationshipPeople(person, "parents");
  const spouses = getSelectedRelationshipPeople(person, "spouses");
  const children = getSelectedRelationshipPeople(person, "children");
  const siblings = getSelectedRelationshipPeople(person, "siblings");

  panel.hidden = false;
  document.body.classList.add("tree-has-selected-person");
  document.getElementById("treeSelectedPersonName").textContent = getPersonDisplayName(person);
  document.getElementById("treeSelectedPersonMeta").textContent = activeTreeContext.isDemoMode
    ? "Read-only example"
    : "";
  const branchNote = document.getElementById("treeSelectedBranchNote");
  if (branchNote) {
    branchNote.textContent = "";
    branchNote.hidden = true;
  }
  document.getElementById("treeSelectedBirthday").textContent = formatSelectedBirthDate(person);
  document.getElementById("treeSelectedParents").textContent = formatSelectedRelationshipList(parents, "None listed");
  document.getElementById("treeSelectedSpouse").textContent = formatSelectedRelationshipList(spouses, "None listed");
  document.getElementById("treeSelectedChildren").textContent = formatSelectedRelationshipList(children, "None listed");

  const selectedName = getPersonDisplayName(person);
  const profileLink = document.getElementById("treeSelectedProfileLink");
  if (profileLink) {
    profileLink.textContent = activeTreeContext.isDemoMode ? "View demo details" : "Open profile";
  }
  const editLink = document.getElementById("treeSelectedEditLink");
  if (editLink) {
    editLink.textContent = "Edit profile";
  }
  setSelectedLink(
    profileLink,
    buildTreeProfileUrl(person.id),
    `Open ${selectedName}'s full profile`
  );
  setSelectedLink(
    editLink,
    activeTreeContext.canEdit ? buildTreeProfileUrl(person.id, { edit: true }) : "",
    `Edit ${selectedName}'s profile`
  );

  const focusBtn = document.getElementById("treeSelectedFocusBtn");
  if (focusBtn) {
    focusBtn.hidden = false;
    focusBtn.textContent = "Focus in map";
    focusBtn.setAttribute("aria-label", `Focus ${selectedName} in the family map`);
    focusBtn.onclick = () => {
      focusPersonInTree(person.id);
      focusPersonInChartFrame(person.id, getPersonDisplayName(person));
      updateTreeFocusUrl({ personId: person.id });
      setTreeFocusStatus(`Focused ${getPersonDisplayName(person)}.`);
    };
  }

  const clearBtn = document.getElementById("treeSelectedClearBtn");
  if (clearBtn) {
    clearBtn.hidden = false;
    clearBtn.setAttribute("aria-label", `Clear selected person ${selectedName}`);
    clearBtn.onclick = clearSelectedPersonSelection;
  }

  renderSelectedRelativeActions(person, parents, spouses, children, siblings);
  setFocusedCard(person.id);

  if (focusChart) {
    focusPersonInTree(person.id);
    focusPersonInChartFrame(person.id, getPersonDisplayName(person));
    updateTreeFocusUrl({ personId: person.id });
    setTreeFocusStatus(`Focused ${getPersonDisplayName(person)}.`);
  }

  const isMobileTreeLayout = window.matchMedia("(max-width: 640px)").matches;
  const motionPreference = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  if (isMobileTreeLayout && (scroll || focusChart)) {
    document.querySelector(".tree-canvas-panel")?.scrollIntoView({
      block: "start",
      inline: "nearest",
      behavior: motionPreference,
    });
  } else if (scroll || window.matchMedia("(max-width: 820px)").matches) {
    panel.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: motionPreference,
    });
  }
}

function getTreeFocusElements() {
  return {
    form: document.getElementById("treeFocusForm"),
    input: document.getElementById("treeFocusInput"),
    submitButton: document.getElementById("treeFocusSubmit"),
    status: document.getElementById("treeFocusStatus"),
    dataList: document.getElementById("treePersonList"),
    previousButton: document.getElementById("treeFocusPrevious"),
    nextButton: document.getElementById("treeFocusNext"),
    treeLayout: document.getElementById("tree-layout"),
  };
}

function setTreeFocusStatus(message) {
  const { status } = getTreeFocusElements();
  if (status) status.textContent = message;
}

function updateTreeFocusButtons() {
  const { previousButton, nextButton } = getTreeFocusElements();
  const hasMultipleMatches = treeFocusMatches.length > 1;

  [previousButton, nextButton].forEach(button => {
    if (button) button.disabled = !hasMultipleMatches;
  });
}

function clearTreeFocus() {
  const { treeLayout } = getTreeFocusElements();
  treeLayout?.classList.remove("tree-has-focus-query");
  document.querySelectorAll(".person-card-match, .person-card-focused").forEach(card => {
    card.classList.remove("person-card-match", "person-card-focused");
  });
  treeFocusMatches = [];
  treeFocusIndex = -1;
  updateTreeFocusButtons();
  clearSelectedPersonPanel();
}

function setFocusedCard(personId) {
  const { treeLayout } = getTreeFocusElements();
  document.querySelectorAll(".person-card-focused").forEach(card => {
    card.classList.remove("person-card-focused");
  });

  treeFocusMatches.forEach(person => {
    const link = document.querySelector(`[data-person-id="${CSS.escape(person.id)}"]`);
    link?.querySelector(".person-card")?.classList.add("person-card-match");
  });

  const focusedLink = document.querySelector(`[data-person-id="${CSS.escape(personId)}"]`);
  const focusedCard = focusedLink?.querySelector(".person-card");
  if (!focusedCard) return;

  treeLayout?.classList.toggle("tree-has-focus-query", treeFocusMatches.length > 0);
  focusedCard.classList.add("person-card-match", "person-card-focused");
}

function populateTreeFocusOptions(people) {
  const { dataList, input } = getTreeFocusElements();
  if (!dataList) return;

  dataList.replaceChildren();
  [...people]
    .sort((a, b) => getPersonDisplayName(a).localeCompare(getPersonDisplayName(b)))
    .forEach(person => {
      const option = document.createElement("option");
      option.value = getPersonDisplayName(person);
      dataList.appendChild(option);
    });

  if (input && !people.length) {
    input.value = "";
  }
}

function focusTreeMatch(index) {
  if (treeFocusMatches.length === 0) return;

  treeFocusIndex = (index + treeFocusMatches.length) % treeFocusMatches.length;
  const person = treeFocusMatches[treeFocusIndex];
  const { input } = getTreeFocusElements();
  revealCollapsedGenerationForPerson(person.id);
  setFocusedCard(person.id);
  focusPersonInTree(person.id);
  focusPersonInChartFrame(person.id, input?.value.trim() || "");
  setSelectedPersonPanel(person.id, {
    source: "search",
    scroll: true,
  });
  setTreeFocusStatus(`${treeFocusIndex + 1} of ${treeFocusMatches.length}: ${getPersonDisplayName(person)}`);
  updateTreeFocusUrl({
    personId: person.id,
    query: input?.value.trim() || "",
  });
  updateTreeFocusButtons();
}

function runTreeFocusSearch(direction = 0) {
  const { input } = getTreeFocusElements();
  const query = normalizeTreeSearch(input?.value || "");

  if (!query) {
    clearTreeFocus();
    updateTreeFocusUrl({ personId: "", query: "" });
    setTreeFocusStatus(lastRenderedPeople.length
      ? `Search ${lastRenderedPeople.length} people in this tree.`
      : "Search this tree by name.");
    return;
  }

  const matches = lastRenderedPeople.filter(person => getPersonSearchText(person).includes(query));
  if (matches.length === 0) {
    clearTreeFocus();
    updateTreeFocusUrl({ personId: "", query: input.value.trim() || "" });
    setTreeFocusStatus(`No match for "${input.value.trim()}". Try a first or last name.`);
    return;
  }

  const previousFocusedId = treeFocusMatches[treeFocusIndex]?.id || null;
  treeFocusMatches = matches;

  if (direction !== 0 && previousFocusedId) {
    const currentMatchIndex = matches.findIndex(person => person.id === previousFocusedId);
    focusTreeMatch(currentMatchIndex >= 0 ? currentMatchIndex + direction : 0);
    return;
  }

  const requestedFocusId = previousFocusedId || getInitialFocusPersonId();
  const requestedFocusIndex = requestedFocusId
    ? matches.findIndex(person => person.id === requestedFocusId)
    : -1;
  focusTreeMatch(requestedFocusIndex >= 0 ? requestedFocusIndex : 0);
}

function setupTreeFocusControls() {
  const { form, input, submitButton, previousButton, nextButton } = getTreeFocusElements();
  if (!form || !input) return;

  const submitSearch = () => runTreeFocusSearch(0);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitSearch();
  });

  submitButton?.addEventListener("click", (event) => {
    event.preventDefault();
    submitSearch();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submitSearch();
  });

  input.addEventListener("input", () => {
    if (!input.value.trim()) {
      clearTreeFocus();
      updateTreeFocusUrl({ personId: "", query: "" });
      setTreeFocusStatus(lastRenderedPeople.length
        ? `Search ${lastRenderedPeople.length} people in this tree.`
        : "Search this tree by name.");
    }
  });

  previousButton?.addEventListener("click", () => runTreeFocusSearch(-1));
  nextButton?.addEventListener("click", () => runTreeFocusSearch(1));
  updateTreeFocusButtons();
}

function getRelationshipFinderElements() {
  return {
    form: document.getElementById("relationshipFinderForm"),
    personAInput: document.getElementById("relationshipPersonA"),
    personBInput: document.getElementById("relationshipPersonB"),
    personASuggestions: document.getElementById("relationshipPersonASuggestions"),
    personBSuggestions: document.getElementById("relationshipPersonBSuggestions"),
    result: document.getElementById("relationshipFinderResult"),
  };
}

function setRelationshipResult(content) {
  const { result } = getRelationshipFinderElements();
  if (!result) return;

  if (typeof content === "string") {
    result.textContent = content;
    return;
  }

  result.replaceChildren(content);
}

function findPersonByRelationshipInput(value) {
  const query = normalizeTreeSearch(value);
  if (!query) return null;

  const sortedPeople = [...lastRenderedPeople]
    .sort((a, b) => getPersonDisplayName(a).localeCompare(getPersonDisplayName(b)));

  return (
    sortedPeople.find(person => getPersonSearchText(person) === query) ||
    sortedPeople.find(person => getPersonSearchText(person).startsWith(query)) ||
    sortedPeople.find(person => getPersonSearchText(person).includes(query)) ||
    null
  );
}

function getRelationshipInputPerson(input) {
  if (!input) return null;

  const selectedId = input.dataset.personId || "";
  if (selectedId) {
    const selectedPerson = getPersonById(selectedId);
    if (selectedPerson) return selectedPerson;
  }

  const matchedPerson = findPersonByRelationshipInput(input.value);
  if (matchedPerson) {
    input.dataset.personId = matchedPerson.id;
  }
  return matchedPerson;
}

function getRelationshipSuggestions(query) {
  const normalizedQuery = normalizeTreeSearch(query);
  if (!normalizedQuery) return [];

  return [...lastRenderedPeople]
    .filter(person => getPersonSearchText(person).includes(normalizedQuery))
    .sort((a, b) => getPersonDisplayName(a).localeCompare(getPersonDisplayName(b)))
    .slice(0, RELATIONSHIP_SUGGESTION_LIMIT);
}

function hideRelationshipSuggestions(input, suggestionsEl) {
  if (suggestionsEl) {
    suggestionsEl.hidden = true;
    suggestionsEl.replaceChildren();
  }
  input?.setAttribute("aria-expanded", "false");
}

function selectRelationshipSuggestion(input, suggestionsEl, person) {
  if (!input || !person) return;

  input.value = getPersonDisplayName(person);
  input.dataset.personId = person.id;
  input.setAttribute("aria-activedescendant", "");
  hideRelationshipSuggestions(input, suggestionsEl);
  input.focus();
}

function moveRelationshipSuggestionFocus(currentButton, direction) {
  const buttons = [...currentButton.closest(".relationship-suggestions")?.querySelectorAll("button") || []];
  if (buttons.length === 0) return;

  const currentIndex = buttons.indexOf(currentButton);
  const nextIndex = (currentIndex + direction + buttons.length) % buttons.length;
  buttons[nextIndex]?.focus();
}

function renderRelationshipSuggestions(input, suggestionsEl) {
  if (!input || !suggestionsEl) return;

  const suggestions = getRelationshipSuggestions(input.value);
  suggestionsEl.replaceChildren();

  if (suggestions.length === 0) {
    hideRelationshipSuggestions(input, suggestionsEl);
    return;
  }

  suggestions.forEach((person, index) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "relationship-suggestion";
    option.setAttribute("role", "option");
    option.id = `${suggestionsEl.id}-option-${index}`;
    option.dataset.personId = person.id;
    option.textContent = getPersonDisplayName(person);
    option.setAttribute("aria-selected", "false");
    option.addEventListener("click", () => {
      selectRelationshipSuggestion(input, suggestionsEl, person);
    });
    option.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveRelationshipSuggestionFocus(option, 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveRelationshipSuggestionFocus(option, -1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        hideRelationshipSuggestions(input, suggestionsEl);
        input.focus();
      }
    });
    suggestionsEl.appendChild(option);
  });

  suggestionsEl.hidden = false;
  input.setAttribute("aria-expanded", "true");
}

function setupRelationshipSuggestionInput(input, suggestionsEl) {
  if (!input || !suggestionsEl) return;

  input.setAttribute("autocomplete", "off");
  input.setAttribute("spellcheck", "false");

  input.addEventListener("input", () => {
    delete input.dataset.personId;
    renderRelationshipSuggestions(input, suggestionsEl);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      renderRelationshipSuggestions(input, suggestionsEl);
    }
  });

  input.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (!suggestionsEl.contains(document.activeElement)) {
        hideRelationshipSuggestions(input, suggestionsEl);
      }
    }, 120);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" && !suggestionsEl.hidden) {
      const firstSuggestion = suggestionsEl.querySelector("button");
      if (firstSuggestion) {
        event.preventDefault();
        firstSuggestion.focus();
      }
    } else if (event.key === "Escape") {
      hideRelationshipSuggestions(input, suggestionsEl);
    }
  });
}

function addRelationshipEdge(graph, fromId, toId, label) {
  if (!fromId || !toId || fromId === toId) return;

  if (!graph.has(fromId)) graph.set(fromId, []);
  graph.get(fromId).push({ id: toId, label });
}

function buildRelationshipGraph(people) {
  const graph = new Map();

  people.forEach(person => {
    if (!person?.id) return;
    if (!graph.has(person.id)) graph.set(person.id, []);

    resolvePersonParentIds(person, people).forEach(parentId => {
      addRelationshipEdge(graph, person.id, parentId, "parent");
      addRelationshipEdge(graph, parentId, person.id, "child");
    });

    resolvePersonSpouseIds(person, people).forEach(spouseId => {
      addRelationshipEdge(graph, person.id, spouseId, "spouse/partner");
      addRelationshipEdge(graph, spouseId, person.id, "spouse/partner");
    });

    derivePersonChildren(person, people).forEach(child => {
      addRelationshipEdge(graph, person.id, child.id, "child");
      addRelationshipEdge(graph, child.id, person.id, "parent");
    });
  });

  return graph;
}

function findRelationshipPath(startId, endId, people) {
  if (!startId || !endId) return null;
  if (startId === endId) return [{ id: startId, via: "" }];

  const graph = buildRelationshipGraph(people);
  const queue = [[{ id: startId, via: "" }]];
  const visited = new Set([startId]);

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];
    const neighbors = graph.get(current.id) || [];

    for (const neighbor of neighbors) {
      if (visited.has(neighbor.id)) continue;

      const nextPath = [...path, { id: neighbor.id, via: neighbor.label }];
      if (neighbor.id === endId) return nextPath;

      visited.add(neighbor.id);
      queue.push(nextPath);
    }
  }

  return null;
}

function getPathPerson(path, people, index) {
  const step = path?.[index];
  if (!step) return null;
  return people.find(person => person.id === step.id) || null;
}

function possessiveName(name) {
  if (!name) return "";
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

function areRelationshipSiblings(personA, personB, people) {
  if (!personA || !personB || personA.id === personB.id) return false;
  const parentIdsA = resolvePersonParentIds(personA, people);
  const parentIdsB = resolvePersonParentIds(personB, people);
  return parentIdsA.some(parentId => parentIdsB.includes(parentId));
}

function areRelationshipCousins(source, target, people) {
  if (!source || !target || source.id === target.id) return false;
  const sourceParents = resolvePersonParentIds(source, people)
    .map(parentId => getPersonById(parentId))
    .filter(Boolean);
  const targetParents = resolvePersonParentIds(target, people)
    .map(parentId => getPersonById(parentId))
    .filter(Boolean);

  return sourceParents.some(sourceParent =>
    targetParents.some(targetParent => areRelationshipSiblings(sourceParent, targetParent, people))
  );
}

function getRelationshipPathPattern(path) {
  return path?.slice(1).map(step => step.via).join(">") || "";
}

function getRelationshipSummary(path, people) {
  if (!path || path.length === 0) return "";
  if (path.length === 1) return "That is the same person.";

  const source = people.find(person => person.id === path[0].id);
  const target = people.find(person => person.id === path[path.length - 1].id);
  const sourceName = getPersonDisplayName(source);
  const targetName = getPersonDisplayName(target);
  const firstStep = path[1]?.via;
  const lastStep = path[path.length - 1]?.via;
  const pattern = getRelationshipPathPattern(path);

  if (path.length === 2) {
    if (firstStep === "parent") return `${targetName} is ${possessiveName(sourceName)} parent.`;
    if (firstStep === "child") return `${targetName} is ${possessiveName(sourceName)} child.`;
    if (firstStep === "spouse/partner") return `${targetName} is ${possessiveName(sourceName)} spouse or partner.`;
  }

  if (areRelationshipSiblings(source, target, people)) {
    return `${sourceName} and ${targetName} are siblings.`;
  }

  if (pattern === "parent>parent") {
    return `${targetName} is ${possessiveName(sourceName)} grandparent.`;
  }

  if (pattern === "child>child") {
    return `${targetName} is ${possessiveName(sourceName)} grandchild.`;
  }

  if (pattern === "child>parent") {
    const sharedChild = getPathPerson(path, people, 1);
    return `${sourceName} and ${targetName} are connected as co-parents through ${getPersonDisplayName(sharedChild)}.`;
  }

  if (pattern === "parent>child") {
    const sharedParent = people.find(person => person.id === path[1]?.id);
    return `${sourceName} and ${targetName} are siblings through ${getPersonDisplayName(sharedParent)}.`;
  }

  if (areRelationshipCousins(source, target, people) || pattern === "parent>parent>child>child") {
    return `${sourceName} and ${targetName} look like cousins in this tree.`;
  }

  return `${sourceName} connects to ${targetName} in ${path.length - 1} family steps.`;
}

function getRelationshipStepLabel(label) {
  if (label === "spouse/partner") return "spouse or partner";
  return label || "connected to";
}

function getRelationshipReadablePath(path, people) {
  if (!path || path.length === 0) return "";

  return path.map((step, index) => {
    const person = people.find(item => item.id === step.id);
    const name = getPersonDisplayName(person);
    if (index === 0) return name;
    return `-> ${getRelationshipStepLabel(step.via)} -> ${name}`;
  }).join(" ");
}

function renderRelationshipMessage(title, message) {
  const wrapper = document.createElement("div");
  wrapper.className = "relationship-story relationship-story-note";

  const heading = document.createElement("strong");
  heading.textContent = title;

  const copy = document.createElement("p");
  copy.textContent = message;

  wrapper.append(heading, copy);
  return wrapper;
}

function renderRelationshipPath(path, people) {
  const wrapper = document.createElement("div");
  wrapper.className = "relationship-story";

  const summary = document.createElement("strong");
  summary.textContent = getRelationshipSummary(path, people);
  wrapper.appendChild(summary);

  const intro = document.createElement("p");
  intro.className = "relationship-story-intro";
  intro.textContent = path.length === 1
    ? "You picked the same card twice."
    : "Use this when someone asks, \"wait, how are we related?\" Read left to right:";
  wrapper.appendChild(intro);

  const readablePath = document.createElement("p");
  readablePath.className = "relationship-path-readable";
  readablePath.textContent = getRelationshipReadablePath(path, people);
  wrapper.appendChild(readablePath);

  const chain = document.createElement("div");
  chain.className = "relationship-path-chain";
  chain.setAttribute("aria-label", "Relationship path");

  path.forEach((step, index) => {
    const person = people.find(item => item.id === step.id);
    if (index > 0) {
      const connector = document.createElement("span");
      connector.className = "relationship-path-connector";
      connector.textContent = getRelationshipStepLabel(step.via);
      chain.appendChild(connector);
    }

    const name = document.createElement("span");
    name.className = "relationship-path-person";
    name.textContent = getPersonDisplayName(person);
    chain.appendChild(name);
  });

  wrapper.appendChild(chain);

  const list = document.createElement("ol");
  list.className = "relationship-path-list";

  path.forEach((step, index) => {
    const person = people.find(item => item.id === step.id);
    const item = document.createElement("li");

    const stepLabel = document.createElement("span");
    stepLabel.className = "relationship-path-step";
    stepLabel.textContent = index === 0 ? "Start" : `Then ${getRelationshipStepLabel(step.via)}`;

    const name = document.createElement("span");
    name.textContent = getPersonDisplayName(person);

    item.append(stepLabel, name);
    list.appendChild(item);
  });

  wrapper.appendChild(list);

  if (path.length > 1) {
    const actions = document.createElement("div");
    actions.className = "relationship-result-actions";

    const source = getPathPerson(path, people, 0);
    const target = getPathPerson(path, people, path.length - 1);
    [source, target].filter(Boolean).forEach((person, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button button-secondary";
      button.textContent = index === 0 ? "Focus first person" : "Focus second person";
      button.addEventListener("click", () => {
        focusPersonFromSidebarList(person, "relationship");
      });
      actions.appendChild(button);
    });

    wrapper.appendChild(actions);
  }

  return wrapper;
}

function clearRelationshipPathHighlight() {
  document.querySelectorAll(".person-card-relationship-path, .person-card-relationship-endpoint").forEach(card => {
    card.classList.remove("person-card-relationship-path", "person-card-relationship-endpoint");
  });
}

function highlightRelationshipPath(path) {
  clearRelationshipPathHighlight();
  if (!path || path.length === 0) return;

  path.forEach((step, index) => {
    const link = document.querySelector(`#tree-layout [data-person-id="${CSS.escape(step.id)}"]`);
    const card = link?.querySelector(".person-card");
    if (!card) return;
    card.classList.add("person-card-relationship-path");
    if (index === 0 || index === path.length - 1) {
      card.classList.add("person-card-relationship-endpoint");
    }
  });
}

function setupRelationshipFinder() {
  const { form, personAInput, personBInput, personASuggestions, personBSuggestions } = getRelationshipFinderElements();
  if (!form || !personAInput || !personBInput) return;

  setupRelationshipSuggestionInput(personAInput, personASuggestions);
  setupRelationshipSuggestionInput(personBInput, personBSuggestions);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (lastRenderedPeople.length === 0) {
      clearRelationshipPathHighlight();
      setRelationshipResult(renderRelationshipMessage(
        "Load a tree first",
        "Open the example tree or a private family tree, then choose two people to compare."
      ));
      return;
    }

    const personA = getRelationshipInputPerson(personAInput);
    const personB = getRelationshipInputPerson(personBInput);
    hideRelationshipSuggestions(personAInput, personASuggestions);
    hideRelationshipSuggestions(personBInput, personBSuggestions);

    if (!personA || !personB) {
      clearRelationshipPathHighlight();
      setRelationshipResult(renderRelationshipMessage(
        "Choose two people from this tree",
        "Pick from the clean suggestion list so the app knows exactly which profile you mean."
      ));
      return;
    }

    const path = findRelationshipPath(personA.id, personB.id, lastRenderedPeople);
    if (!path) {
      clearRelationshipPathHighlight();
      setRelationshipResult(renderRelationshipMessage(
        "No path found yet",
        `${getPersonDisplayName(personA)} and ${getPersonDisplayName(personB)} may need more parent, child, or partner links before the app can connect them. That is a good profile cleanup note, not a broken tree.`
      ));
      return;
    }

    highlightRelationshipPath(path);
    updateTreeFocusUrl({
      personId: personB.id,
      query: getPersonDisplayName(personB),
    });
    focusPersonInTree(personB.id);
    focusPersonInChartFrame(personB.id, getPersonDisplayName(personB));
    setSelectedPersonPanel(personB.id, {
      source: "relationship",
      scroll: true,
    });
    setRelationshipResult(renderRelationshipPath(path, lastRenderedPeople));
  });
}

function getBirthdayDate(person) {
  const value = person?.birthDate;
  if (!value) return null;

  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date?.getTime()) ? null : date;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function formatBirthdayMonthDay(date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

function getNextBirthdayInfo(person, today = new Date()) {
  const birthDate = getBirthdayDate(person);
  if (!birthDate) return null;

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let nextBirthday = new Date(todayStart.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (nextBirthday < todayStart) {
    nextBirthday = new Date(todayStart.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
  }

  const daysUntil = Math.round((nextBirthday - todayStart) / 86400000);
  const birthYear = birthDate.getFullYear();
  const ageTurning = Number.isFinite(birthYear) ? nextBirthday.getFullYear() - birthYear : null;

  return {
    birthDate,
    nextBirthday,
    daysUntil,
    ageTurning: Number.isFinite(ageTurning) && ageTurning >= 0 ? ageTurning : null,
  };
}

function createProfileLink(person, familyId, isDemoMode, className = "") {
  const name = getPersonDisplayName(person);
  if (isDemoMode || !person?.id) {
    const span = document.createElement("span");
    if (className) span.className = className;
    span.textContent = name;
    return span;
  }

  const link = document.createElement("a");
  if (className) link.className = className;
  const params = new URLSearchParams();
  params.set("person", person.id);
  addTreeProfileContext(params, familyId, {
    isDemoMode,
    isPublicExample: !familyId && !isDemoMode,
  });
  link.href = `/profile?${params.toString()}`;
  link.textContent = name;
  return link;
}

function focusPersonFromSidebarList(person, sourceLabel = "sidebar") {
  if (!person?.id) return;

  const displayName = getPersonDisplayName(person);
  updateTreeFocusUrl({
    personId: person.id,
    query: displayName,
  });
  focusPersonInTree(person.id);
  focusPersonInChartFrame(person.id, displayName);
  setSelectedPersonPanel(person.id, {
    source: sourceLabel,
    scroll: true,
  });
  setTreeFocusStatus(`Focused ${displayName}.`);
}

function createSidebarPersonFocusButton(person, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = getPersonDisplayName(person);
  button.setAttribute("aria-label", `Focus ${getPersonDisplayName(person)} in the family map`);
  button.addEventListener("click", () => {
    focusPersonFromSidebarList(person, "sidebar");
  });
  return button;
}

function createBirthdayItem(person, info, familyId, isDemoMode) {
  const item = document.createElement("li");
  item.className = "birthday-item";
  item.appendChild(createSidebarPersonFocusButton(person, "birthday-item-name"));

  const date = document.createElement("span");
  date.className = "birthday-date";
  date.textContent = `${formatBirthdayMonthDay(info.birthDate)}${
    Number.isFinite(info.ageTurning) ? `, turns ${info.ageTurning}` : ""
  }`;

  const meta = document.createElement("span");
  meta.className = "birthday-meta";
  meta.textContent = info.daysUntil === 0
    ? "Today"
    : info.daysUntil === 1
      ? "Tomorrow"
      : `In ${info.daysUntil} days`;

  item.append(date, meta);
  return item;
}

function createBirthdaySummaryCard(label, value, note = "") {
  const card = document.createElement("div");
  card.className = "birthday-summary-card";

  const valueEl = document.createElement("strong");
  valueEl.textContent = value;

  const labelEl = document.createElement("span");
  labelEl.textContent = label;

  card.append(valueEl, labelEl);

  if (note) {
    const noteEl = document.createElement("small");
    noteEl.textContent = note;
    card.appendChild(noteEl);
  }

  return card;
}

function createBirthdaySummary(people, birthdayPeople, missingPeople) {
  const summary = document.createElement("section");
  summary.className = "birthday-summary";
  summary.setAttribute("aria-label", "Birthday summary");

  const next = birthdayPeople[0];
  const nextName = next ? getPersonDisplayName(next.person) : "None yet";
  const nextNote = next
    ? next.info.daysUntil === 0
      ? "today"
      : next.info.daysUntil === 1
        ? "tomorrow"
        : `${next.info.daysUntil} days away`
    : "add birthdays to start";

  summary.append(
    createBirthdaySummaryCard("Next up", nextName, nextNote),
    createBirthdaySummaryCard("With birthdays", String(birthdayPeople.length), `of ${people.length} people`),
    createBirthdaySummaryCard("Missing dates", String(missingPeople.length), missingPeople.length ? "needs review" : "all set")
  );

  return summary;
}

function createThisMonthBirthdaySection(birthdayPeople, familyId, isDemoMode) {
  const currentMonth = new Date().getMonth();
  const thisMonth = birthdayPeople.filter(({ info }) => info.birthDate.getMonth() === currentMonth);
  if (thisMonth.length === 0) return null;

  const section = document.createElement("section");
  section.className = "birthday-section";
  const heading = document.createElement("h3");
  heading.textContent = "This month";
  const list = document.createElement("ul");
  list.className = "birthday-list";
  thisMonth.slice(0, 5).forEach(({ person, info }) => {
    list.appendChild(createBirthdayItem(person, info, familyId, isDemoMode));
  });
  section.append(heading, list);
  return section;
}

function renderBirthdayCalendar(people, familyId = null, options = {}) {
  const panel = document.getElementById("birthdayCalendarPanel");
  if (!panel) return;

  panel.replaceChildren();

  if (!people || people.length === 0) {
    const empty = document.createElement("p");
    empty.className = "birthday-empty-note";
    empty.textContent = "Open a tree to see upcoming birthdays here.";
    panel.appendChild(empty);
    return;
  }

  const birthdayPeople = people
    .map(person => ({ person, info: getNextBirthdayInfo(person) }))
    .filter(item => item.info)
    .sort((a, b) => (
      a.info.daysUntil - b.info.daysUntil ||
      getPersonDisplayName(a.person).localeCompare(getPersonDisplayName(b.person))
    ));

  const missingPeople = people
    .filter(person => !getBirthdayDate(person))
    .sort((a, b) => getPersonDisplayName(a).localeCompare(getPersonDisplayName(b)));

  if (birthdayPeople.length === 0) {
    const empty = document.createElement("p");
    empty.className = "birthday-empty-note";
    empty.textContent = `No birthdays are filled in yet. Add dates on profiles to start birthday reminders. ${missingPeople.length} ${missingPeople.length === 1 ? "person needs" : "people need"} a date.`;
    panel.appendChild(empty);
    return;
  }

  const isDemoMode = Boolean(options.isDemoMode);
  const summary = createBirthdaySummary(people, birthdayPeople, missingPeople);
  const thisMonthSection = createThisMonthBirthdaySection(birthdayPeople, familyId, isDemoMode);

  const upcomingSection = document.createElement("section");
  upcomingSection.className = "birthday-section";
  const upcomingHeading = document.createElement("h3");
  upcomingHeading.textContent = "Next birthdays";
  const upcomingList = document.createElement("ul");
  upcomingList.className = "birthday-list";
  birthdayPeople.slice(0, 6).forEach(({ person, info }) => {
    upcomingList.appendChild(createBirthdayItem(person, info, familyId, isDemoMode));
  });
  upcomingSection.append(upcomingHeading, upcomingList);

  const monthCounts = birthdayPeople.reduce((counts, { info }) => {
    const month = info.birthDate.getMonth();
    counts.set(month, (counts.get(month) || 0) + 1);
    return counts;
  }, new Map());
  const monthsSection = document.createElement("section");
  monthsSection.className = "birthday-section";
  const monthsHeading = document.createElement("h3");
  monthsHeading.textContent = "By month";
  const monthsList = document.createElement("ul");
  monthsList.className = "birthday-month-grid";
  const maxMonthCount = Math.max(...monthCounts.values());
  [...monthCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([month, count]) => {
      const item = document.createElement("li");
      item.className = "birthday-month-pill";
      const label = document.createElement("span");
      label.textContent = new Date(2026, month, 1).toLocaleString("en-US", { month: "short" });
      const meter = document.createElement("span");
      meter.className = "birthday-month-meter";
      meter.style.setProperty("--birthday-month-fill", `${Math.max(12, Math.round((count / maxMonthCount) * 100))}%`);
      const countEl = document.createElement("strong");
      countEl.textContent = String(count);
      item.append(label, meter, countEl);
      monthsList.appendChild(item);
    });
  monthsSection.append(monthsHeading, monthsList);

  panel.append(summary);
  if (thisMonthSection) panel.appendChild(thisMonthSection);
  panel.append(upcomingSection, monthsSection);

  if (missingPeople.length > 0) {
    const missingSection = document.createElement("section");
    missingSection.className = "birthday-section";
    const missingHeading = document.createElement("h3");
    missingHeading.textContent = `Missing birthdays (${missingPeople.length})`;
    const missingNote = document.createElement("p");
    missingNote.className = "birthday-missing-note";
    missingNote.textContent = "Start with these so reminders and birthday prep feel complete.";
    const missingList = document.createElement("ul");
    missingList.className = "birthday-missing-list";
    missingPeople.slice(0, 5).forEach(person => {
      const item = document.createElement("li");
      item.appendChild(createSidebarPersonFocusButton(person, "birthday-item-name"));
      missingList.appendChild(item);
    });
    if (missingPeople.length > 5) {
      const extra = document.createElement("li");
      extra.textContent = `+${missingPeople.length - 5} more`;
      missingList.appendChild(extra);
    }
    missingSection.append(missingHeading, missingNote, missingList);
    panel.appendChild(missingSection);
  }
}

function hasMeaningfulBio(person) {
  const bio = String(person?.bio || "").trim();
  if (!bio) return false;

  const normalized = bio.toLowerCase();
  return ![
    "no bio",
    "placeholder",
    "starter profile",
    "add photos",
    "sample family profile",
    "add real memories",
    "replace this",
  ].some(marker => normalized.includes(marker));
}

function getMissingInfoLabels(person, people) {
  const labels = [];
  if (!getBirthdayDate(person)) labels.push("Birthday");
  if (resolvePersonParentIds(person, people).length < 2) labels.push("Parents");
  if (resolvePersonSpouseIds(person, people).length === 0) labels.push("Spouse/partner");
  if (derivePersonChildren(person, people).length === 0) labels.push("Children");
  if (!hasMeaningfulBio(person)) labels.push("Bio/story");
  return labels;
}

function renderMissingInfoChecklist(people, familyId = null, options = {}) {
  const panel = document.getElementById("missingInfoPanel");
  if (!panel) return;

  panel.replaceChildren();

  if (!people || people.length === 0) {
    const empty = document.createElement("p");
    empty.className = "missing-info-summary";
    empty.textContent = "Open a tree to see which profiles need photos, birthdays, stories, or relationships.";
    panel.appendChild(empty);
    return;
  }

  const categories = ["Birthday", "Photo", "Parents", "Spouse/partner", "Children", "Bio/story"];
  const categoryCounts = new Map(categories.map(category => [category, 0]));
  const rows = people
    .map(person => {
      const missing = getMissingInfoLabels(person, people);
      missing.forEach(label => categoryCounts.set(label, (categoryCounts.get(label) || 0) + 1));
      return { person, missing };
    })
    .filter(row => row.missing.length > 0)
    .sort((a, b) => (
      b.missing.length - a.missing.length ||
      getPersonDisplayName(a.person).localeCompare(getPersonDisplayName(b.person))
    ));

  const summary = document.createElement("div");
  summary.className = "missing-info-summary";
  const summaryTitle = document.createElement("strong");
  summaryTitle.textContent = rows.length === 0
    ? "Every profile has the basics."
    : `${rows.length} profiles need attention`;
  const summaryCopy = document.createElement("span");
  summaryCopy.textContent = options.isDemoMode
    ? "Example profiles are read-only, but this shows what the checklist will catch."
    : "Open a profile to fill in the quickest wins first.";
  summary.append(summaryTitle, summaryCopy);
  panel.appendChild(summary);

  const countsList = document.createElement("ul");
  countsList.className = "missing-info-counts";
  categories.forEach(category => {
    const count = categoryCounts.get(category) || 0;
    if (count === 0) return;
    const item = document.createElement("li");
    item.className = "missing-info-count";
    item.textContent = `${category}: ${count}`;
    countsList.appendChild(item);
  });
  if (countsList.children.length > 0) {
    panel.appendChild(countsList);
  }

  if (rows.length === 0) return;

  const list = document.createElement("ul");
  list.className = "missing-info-list";
  rows.slice(0, 8).forEach(({ person, missing }) => {
    const item = document.createElement("li");
    item.className = "missing-info-item";
    item.appendChild(createProfileLink(person, familyId, Boolean(options.isDemoMode), "missing-info-name"));

    const tags = document.createElement("div");
    tags.className = "missing-info-tags";
    missing.forEach(label => {
      const tag = document.createElement("span");
      tag.className = "missing-info-tag";
      tag.textContent = label;
      tags.appendChild(tag);
    });
    item.appendChild(tags);
    list.appendChild(item);
  });

  if (rows.length > 8) {
    const extra = document.createElement("li");
    extra.className = "missing-info-item";
    extra.textContent = `+${rows.length - 8} more profiles need a pass.`;
    list.appendChild(extra);
  }

  panel.appendChild(list);
}

function getMostCommonLastNames(people, limit = 3) {
  const counts = new Map();
  people.forEach(person => {
    const lastName = toTitle(String(person?.lastName || "").trim());
    if (!lastName) return;
    counts.set(lastName, (counts.get(lastName) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

function getFamilyNameCloud(people, limit = 8) {
  return getMostCommonLastNames(people, limit)
    .map(([name, count], index) => {
      const size = index < 2 ? "large" : index < 5 ? "medium" : "small";
      return { name, count, size };
    });
}

function getDailySpotlightPerson(people, today = new Date()) {
  if (!Array.isArray(people) || people.length === 0) return null;

  const sortedPeople = [...people].sort((a, b) => {
    const nameCompare = getPersonDisplayName(a).localeCompare(getPersonDisplayName(b));
    return nameCompare || String(a?.id || "").localeCompare(String(b?.id || ""));
  });
  const seed = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${sortedPeople.length}`;
  const seedValue = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return sortedPeople[seedValue % sortedPeople.length] || null;
}

function getPersonGenerationLabel(person) {
  const generationNumber = Number(person?.generation);
  return Number.isFinite(generationNumber) && generationNumber > 0
    ? `Generation ${generationNumber}`
    : "Generation unknown";
}

function createFamilySpotlightCard(person, people, familyId, isDemoMode) {
  const section = document.createElement("section");
  section.className = "family-spotlight-card";

  const heading = document.createElement("h3");
  heading.textContent = "Relative spotlight";

  const name = createProfileLink(person, familyId, isDemoMode, "family-spotlight-name");

  const meta = document.createElement("div");
  meta.className = "family-spotlight-meta";
  const birthday = getBirthdayDate(person);
  const relativesCount = resolvePersonParentIds(person, people).length
    + resolvePersonSpouseIds(person, people).length
    + derivePersonChildren(person, people).length;
  [
    getPersonGenerationLabel(person),
    birthday ? `Birthday: ${formatBirthdayMonthDay(birthday)}` : "Birthday: not listed yet",
    `${relativesCount} close ${relativesCount === 1 ? "relative" : "relatives"} linked`,
  ].forEach(text => {
    const item = document.createElement("span");
    item.textContent = text;
    meta.appendChild(item);
  });

  const note = document.createElement("p");
  note.className = "family-spotlight-note";
  note.textContent = isDemoMode
    ? "A quick way to explore one person in the sample tree."
    : "A good profile to add a memory, photo, or relationship detail to.";

  section.append(heading, name, meta, note);
  return section;
}

function createFamilyNameCloudSection(people) {
  const names = getFamilyNameCloud(people);
  if (!names.length) return null;

  const section = document.createElement("section");
  section.className = "family-stats-section";
  const heading = document.createElement("h3");
  heading.textContent = "Family name cloud";

  const list = document.createElement("ul");
  list.className = "family-name-cloud";
  names.forEach(({ name, count, size }) => {
    const item = document.createElement("li");
    item.className = `family-name-chip is-${size}`;
    item.textContent = `${name} ${count}`;
    list.appendChild(item);
  });

  section.append(heading, list);
  return section;
}

function formatStatsDate(date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getBirthdayMonthCounts(people) {
  const counts = new Map();
  people.forEach(person => {
    const date = getBirthdayDate(person);
    if (!date) return;
    const month = date.getMonth();
    counts.set(month, (counts.get(month) || 0) + 1);
  });
  return counts;
}

function appendStatsList(parent, headingText, rows) {
  if (!rows.length) return;

  const section = document.createElement("section");
  section.className = "family-stats-section";
  const heading = document.createElement("h3");
  heading.textContent = headingText;
  const list = document.createElement("ul");
  list.className = "family-stats-list";

  rows.forEach(([label, value]) => {
    const item = document.createElement("li");
    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    const valueEl = document.createElement("strong");
    valueEl.textContent = String(value);
    item.append(labelEl, valueEl);
    list.appendChild(item);
  });

  section.append(heading, list);
  parent.appendChild(section);
}

function renderFamilyStats(people, familyId = null, options = {}) {
  const panel = document.getElementById("familyStatsPanel");
  if (!panel) return;

  panel.replaceChildren();

  if (!people || people.length === 0) {
    const empty = document.createElement("p");
    empty.className = "family-stats-note";
    empty.textContent = "Open a tree to see counts, birthday coverage, and cleanup progress.";
    panel.appendChild(empty);
    return;
  }

  const generationCount = sortGenerationKeys(groupByGeneration(people)).length;
  const photoCount = people.filter(person => Boolean(person?.image)).length;
  const birthdayDates = people
    .map(person => getBirthdayDate(person))
    .filter(Boolean)
    .sort((a, b) => a - b);
  const today = new Date();
  const listedBirthdaysToDate = birthdayDates.filter(date => date <= today);
  const missingProfileCount = people.filter(person => getMissingInfoLabels(person, people).length > 0).length;
  const missingFieldCount = people.reduce((sum, person) => sum + getMissingInfoLabels(person, people).length, 0);

  const grid = document.createElement("div");
  grid.className = "family-stats-grid";
  [
    ["People", people.length],
    ["Generations", generationCount],
    ["Photos", photoCount],
    ["Need info", missingProfileCount],
  ].forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "family-stat-card";
    const valueEl = document.createElement("strong");
    valueEl.textContent = String(value);
    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    card.append(valueEl, labelEl);
    grid.appendChild(card);
  });
  panel.appendChild(grid);

  const spotlightPerson = getDailySpotlightPerson(people);
  if (spotlightPerson) {
    panel.appendChild(createFamilySpotlightCard(
      spotlightPerson,
      people,
      familyId,
      Boolean(options.isDemoMode)
    ));
  }

  const birthdayRows = [];
  if (birthdayDates[0]) birthdayRows.push(["Oldest birthday", formatStatsDate(birthdayDates[0])]);
  if (listedBirthdaysToDate[listedBirthdaysToDate.length - 1]) {
    birthdayRows.push(["Youngest birthday", formatStatsDate(listedBirthdaysToDate[listedBirthdaysToDate.length - 1])]);
  }
  if (missingFieldCount > 0) birthdayRows.push(["Missing fields", missingFieldCount]);
  appendStatsList(panel, "Tree health", birthdayRows);

  const monthRows = [...getBirthdayMonthCounts(people).entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, 4)
    .map(([month, count]) => [
      new Date(2026, month, 1).toLocaleString("en-US", { month: "long" }),
      count,
    ]);
  appendStatsList(panel, "Busy birthday months", monthRows);

  appendStatsList(panel, "Common last names", getMostCommonLastNames(people));

  const nameCloud = createFamilyNameCloudSection(people);
  if (nameCloud) panel.appendChild(nameCloud);

  const note = document.createElement("p");
  note.className = "family-stats-note";
  note.textContent = missingProfileCount === 0
    ? "This tree is looking nicely filled in."
    : "Use Profiles to finish to knock out the fastest cleanup wins.";
  panel.appendChild(note);
}

function normalizeHealthName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function getRawLegacySpouseName(person) {
  return buildFullName(person?.spouseFirstName || "", person?.spouseLastName || "");
}

function createDataHealthScore(label, value) {
  const card = document.createElement("div");
  card.className = "data-health-score";
  const valueEl = document.createElement("strong");
  valueEl.textContent = String(value);
  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  card.append(valueEl, labelEl);
  return card;
}

function pushDataHealthIssue(issues, group, label, detail, severity = "warning") {
  issues.push({ group, label, detail, severity });
}

function createDataHealthReport(people) {
  const idToPerson = new Map();
  const duplicateIds = new Set();
  const nameBuckets = new Map();
  const issues = [];

  people.forEach(person => {
    if (!person?.id) return;
    if (idToPerson.has(person.id)) duplicateIds.add(person.id);
    idToPerson.set(person.id, person);

    const nameKey = normalizeHealthName(getPersonDisplayName(person));
    if (!nameKey || nameKey === "unnamed") return;
    if (!nameBuckets.has(nameKey)) nameBuckets.set(nameKey, []);
    nameBuckets.get(nameKey).push(person);
  });

  duplicateIds.forEach(id => {
    pushDataHealthIssue(issues, "Relationship cleanup", "Duplicate person ID", id, "error");
  });

  nameBuckets.forEach(bucket => {
    if (bucket.length < 2) return;
    pushDataHealthIssue(
      issues,
      "Profile review",
      "Duplicate name",
      `${getPersonDisplayName(bucket[0])} appears ${bucket.length} times. Add middle initials, dates, or notes if these are different people.`
    );
  });

  people.forEach(person => {
    const name = getPersonDisplayName(person);
    const rawParentIds = Array.isArray(person.parentIds) ? person.parentIds.filter(Boolean) : [];
    const rawSpouseIds = Array.isArray(person.spouseIds) ? person.spouseIds.filter(Boolean) : [];
    const resolvedParentIds = resolvePersonParentIds(person, people);
    const resolvedSpouseIds = resolvePersonSpouseIds(person, people);
    const children = derivePersonChildren(person, people);

    rawParentIds.forEach(parentId => {
      if (parentId === person.id) {
        pushDataHealthIssue(issues, "Relationship cleanup", "Self parent link", `${name} lists themselves as a parent.`, "error");
      } else if (!idToPerson.has(parentId)) {
        pushDataHealthIssue(issues, "Relationship cleanup", "Broken parent ID", `${name} points to missing parent ID ${parentId}.`, "error");
      }
    });

    rawSpouseIds.forEach(spouseId => {
      if (spouseId === person.id) {
        pushDataHealthIssue(issues, "Relationship cleanup", "Self spouse link", `${name} lists themselves as spouse/partner.`, "error");
      } else if (!idToPerson.has(spouseId)) {
        pushDataHealthIssue(issues, "Relationship cleanup", "Broken spouse ID", `${name} points to missing spouse ID ${spouseId}.`, "error");
      }
    });

    [person.parent1, person.parent2].filter(Boolean).forEach(parentName => {
      if (!findPersonByNameString(parentName, people)) {
        pushDataHealthIssue(
          issues,
          "Legacy compatibility",
          "Unresolved legacy parent",
          `${name} has legacy parent "${parentName}" that does not match a person.`
        );
      }
    });

    const legacySpouseName = getRawLegacySpouseName(person);
    if (legacySpouseName && !findPersonByNameString(legacySpouseName, people)) {
      pushDataHealthIssue(
        issues,
        "Legacy compatibility",
        "Unresolved legacy spouse",
        `${name} has legacy spouse "${legacySpouseName}" that does not match a person.`
      );
    }

    rawSpouseIds
      .filter(spouseId => spouseId !== person.id && idToPerson.has(spouseId))
      .forEach(spouseId => {
        const spouse = idToPerson.get(spouseId);
        const spouseRawIds = Array.isArray(spouse.spouseIds) ? spouse.spouseIds : [];
        const spouseLegacyName = normalizeHealthName(getRawLegacySpouseName(spouse));
        const personName = normalizeHealthName(getPersonDisplayName(person));
        if (!spouseRawIds.includes(person.id) && spouseLegacyName !== personName) {
          pushDataHealthIssue(
            issues,
            "Relationship cleanup",
            "One-way spouse link",
            `${name} points to ${getPersonDisplayName(spouse)}, but the link is not reciprocated.`
          );
        }
      });

    if (resolvedParentIds.length > 2) {
      pushDataHealthIssue(
        issues,
        "Relationship cleanup",
        "More than two parents",
        `${name} resolves to ${resolvedParentIds.length} parents. Check duplicate ID and legacy parent entries.`
      );
    }

    if (resolvedParentIds.length === 0 && resolvedSpouseIds.length === 0 && children.length === 0) {
      pushDataHealthIssue(
        issues,
        "Profile review",
        "Disconnected person",
        `${name} is not connected to parents, spouse/partner, or children yet.`
      );
    }
  });

  const missingBirthdays = people.filter(person => !getBirthdayDate(person));
  const missingBios = people.filter(person => !hasMeaningfulBio(person));
  const peopleWithNoParents = people.filter(person => resolvePersonParentIds(person, people).length === 0);
  const peopleWithNoSpouses = people.filter(person => resolvePersonSpouseIds(person, people).length === 0);
  const peopleWithNoChildren = people.filter(person => derivePersonChildren(person, people).length === 0);

  return {
    peopleCount: people.length,
    issueCount: issues.length,
    errorCount: issues.filter(issue => issue.severity === "error").length,
    warningCount: issues.filter(issue => issue.severity !== "error").length,
    missingBirthdays,
    missingBios,
    peopleWithNoParents,
    peopleWithNoSpouses,
    peopleWithNoChildren,
    issues,
  };
}

function appendDataHealthIssueGroup(panel, headingText, issues) {
  if (!issues.length) return;

  const section = document.createElement("section");
  section.className = "data-health-issue-group";
  const heading = document.createElement("h3");
  heading.textContent = headingText;
  const list = document.createElement("ul");
  list.className = "data-health-issue-list";

  issues.slice(0, 6).forEach(issue => {
    const item = document.createElement("li");
    item.className = `data-health-issue is-${issue.severity === "error" ? "error" : "warning"}`;
    const label = document.createElement("strong");
    label.textContent = issue.label;
    const detail = document.createElement("span");
    detail.textContent = issue.detail;
    item.append(label, detail);
    list.appendChild(item);
  });

  if (issues.length > 6) {
    const extra = document.createElement("li");
    extra.className = "data-health-issue";
    const label = document.createElement("strong");
    label.textContent = `+${issues.length - 6} more`;
    const detail = document.createElement("span");
    detail.textContent = "Use the full data model review later if this list keeps growing.";
    extra.append(label, detail);
    list.appendChild(extra);
  }

  section.append(heading, list);
  panel.appendChild(section);
}

function renderDataHealthInspector(people, options = {}) {
  const panel = document.getElementById("dataHealthPanel");
  if (!panel) return;

  panel.replaceChildren();

  if (!people || people.length === 0) {
    const empty = document.createElement("p");
    empty.className = "data-health-summary";
    empty.textContent = "Open a tree to check relationship data for broken links, duplicate names, and missing profile basics.";
    panel.appendChild(empty);
    return;
  }

  const report = createDataHealthReport(people);
  const completenessIssues = [
    ["Missing birthdays", report.missingBirthdays.length],
    ["Missing bios", report.missingBios.length],
    ["No parents listed", report.peopleWithNoParents.length],
    ["No spouse/partner", report.peopleWithNoSpouses.length],
    ["No children listed", report.peopleWithNoChildren.length],
  ]
    .filter(([, count]) => count > 0)
    .map(([label, count]) => ({
      group: "Profile completeness",
      label,
      detail: `${count} ${count === 1 ? "profile" : "profiles"}`,
      severity: "warning",
    }));
  const totalNotes = report.issueCount + completenessIssues.length;
  const totalWarnings = report.warningCount + completenessIssues.length;

  const summary = document.createElement("div");
  summary.className = "data-health-summary";
  const title = document.createElement("strong");
  title.textContent = totalNotes === 0
    ? "No data health notes found."
    : `${totalNotes} data health ${totalNotes === 1 ? "note" : "notes"} found`;
  const copy = document.createElement("span");
  copy.textContent = options.isDemoMode
    ? "Example tree data is read-only. This shows the kinds of family details a private tree can keep organized."
    : "Read-only check. It does not change people, photos, or relationships.";
  summary.append(title, copy);
  panel.appendChild(summary);

  const scoreGrid = document.createElement("div");
  scoreGrid.className = "data-health-score-grid";
  scoreGrid.append(
    createDataHealthScore("Errors", report.errorCount),
    createDataHealthScore("Warnings", totalWarnings),
    createDataHealthScore("People", report.peopleCount)
  );
  panel.appendChild(scoreGrid);

  const groupedIssues = new Map();
  report.issues.forEach(issue => {
    if (!groupedIssues.has(issue.group)) groupedIssues.set(issue.group, []);
    groupedIssues.get(issue.group).push(issue);
  });

  appendDataHealthIssueGroup(panel, "Relationship cleanup", groupedIssues.get("Relationship cleanup") || []);
  appendDataHealthIssueGroup(panel, "Legacy compatibility", groupedIssues.get("Legacy compatibility") || []);
  appendDataHealthIssueGroup(panel, "Profile review", groupedIssues.get("Profile review") || []);
  appendDataHealthIssueGroup(panel, "Profile completeness", completenessIssues);

  if (report.issueCount === 0 && completenessIssues.length === 0) {
    const empty = document.createElement("p");
    empty.className = "data-health-empty";
    empty.textContent = "This tree is in great shape for the current checks.";
    panel.appendChild(empty);
  }
}

/* ---------------------------
   RENDER ONE GENERATION ROW
--------------------------- */

function getGenerationLabel(genNumber) {
  if (genNumber === 1) return "Founders";
  if (genNumber === 2) return "Children";
  if (genNumber === 3) return "Grandchildren";
  if (genNumber === 4) return "Great-grandchildren";
  return `Generation ${genNumber}`;
}

function renderGeneration(genNumber, peopleInGen, treeLayout, familyId = null, options = {}) {
  const genContainer = document.createElement("div");
  genContainer.className = "generation";
  genContainer.id = `gen-${genNumber}`;
  genContainer.dataset.generationNumber = String(genNumber);
  if (options.collapsed) {
    genContainer.classList.add("generation-collapsed");
    genContainer.dataset.collapsibleGeneration = "true";
    genContainer.hidden = true;
  }

  const title = document.createElement("h2");
  title.className = "generation-title";
  title.textContent = `${getGenerationLabel(genNumber)} - ${peopleInGen.length}`;
  genContainer.appendChild(title);

  const row = document.createElement("div");
  row.className = "generation-row";

  // Pair spouses using helpers.areSpouses
  const usedIds = new Set();

  peopleInGen.forEach((person) => {
    if (usedIds.has(person.id)) return;

    // Try to find their spouse in the same generation
    const spouse = peopleInGen.find(
      (p) => !usedIds.has(p.id) && areSpouses(person, p)
    );

    if (spouse) {
      // spouse-pair container
      const pairContainer = document.createElement("div");
      pairContainer.className = "spouse-pair";

      const personCard = createPersonCard(person, familyId, options);
      const spouseCard = createPersonCard(spouse, familyId, options);

      pairContainer.appendChild(personCard);
      pairContainer.appendChild(spouseCard);

      row.appendChild(pairContainer);

      usedIds.add(person.id);
      usedIds.add(spouse.id);
    } else {
      // single person
      const card = createPersonCard(person, familyId, options);
      row.appendChild(card);
      usedIds.add(person.id);
    }
  });

  genContainer.appendChild(row);
  treeLayout.appendChild(genContainer);
}

function createGenerationCollapseControl({ hiddenGenerationCount, hiddenPersonCount }) {
  const panel = document.createElement("div");
  panel.className = "tree-collapse-panel";
  panel.dataset.treeCollapsePanel = "later-generations";

  const copy = document.createElement("p");
  copy.className = "tree-collapse-copy";
  copy.textContent = `${hiddenGenerationCount} later generations are tucked away so the top of the tree stays readable.`;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "tree-collapse-button";
  button.dataset.treeCollapseToggle = "later-generations";
  button.setAttribute("aria-expanded", "false");
  button.textContent = `Show ${hiddenPersonCount} more descendants`;

  button.addEventListener("click", () => {
    const shouldExpand = button.getAttribute("aria-expanded") !== "true";
    setCollapsedGenerationExpanded(shouldExpand, { scrollToControl: !shouldExpand });
  });

  panel.append(copy, button);
  return panel;
}

function createTreeOverviewSummary({ people, generationCount, visibleGenerationCount, hiddenPersonCount }) {
  const summary = document.createElement("section");
  summary.className = "tree-overview-summary";
  summary.setAttribute("aria-label", "Large tree summary");

  const intro = document.createElement("div");
  intro.className = "tree-overview-summary-copy";

  const title = document.createElement("h2");
  title.textContent = "Family map";

  const copy = document.createElement("p");
  copy.textContent = hiddenPersonCount > 0
    ? `Showing the first ${visibleGenerationCount} generations first. Use Find person or open the later generations when you need the full tree.`
    : "The full tree is visible. Use Find person to jump to a specific relative.";

  intro.append(title, copy);

  const stats = document.createElement("div");
  stats.className = "tree-overview-stats";

  [
    ["People", people.length],
    ["Generations", generationCount],
    ["Hidden for now", hiddenPersonCount],
  ].forEach(([label, value]) => {
    const stat = document.createElement("span");
    stat.className = "tree-overview-stat";
    const valueEl = document.createElement("strong");
    valueEl.textContent = String(value);
    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    stat.append(valueEl, labelEl);
    stats.appendChild(stat);
  });

  summary.append(intro, stats);
  return summary;
}

function setCollapsedGenerationExpanded(isExpanded, options = {}) {
  const panel = document.querySelector("[data-tree-collapse-panel='later-generations']");
  const button = document.querySelector("[data-tree-collapse-toggle='later-generations']");
  const collapsedGenerations = [...document.querySelectorAll("[data-collapsible-generation='true']")];
  if (!panel || !button || collapsedGenerations.length === 0) return;

  const hiddenPersonCount = collapsedGenerations.reduce(
    (sum, generation) => sum + generation.querySelectorAll("[data-person-id]").length,
    0
  );

  collapsedGenerations.forEach(generation => {
    generation.hidden = !isExpanded;
  });

  panel.classList.toggle("is-expanded", isExpanded);
  button.setAttribute("aria-expanded", String(isExpanded));
  button.textContent = isExpanded
    ? "Hide later generations"
    : `Show ${hiddenPersonCount} more descendants`;

  const copy = panel.querySelector(".tree-collapse-copy");
  if (copy) {
    copy.textContent = isExpanded
      ? "Later generations are visible. Use Find person to jump directly to someone."
      : `${collapsedGenerations.length} later generations are tucked away so the top of the tree stays readable.`;
  }

  if (!isExpanded) {
    const focusedHiddenCard = collapsedGenerations.some(generation => generation.querySelector(".person-card-focused"));
    if (focusedHiddenCard) {
      clearTreeFocus();
    }
  }

  if (options.scrollToControl) {
    panel.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  }
}

function revealCollapsedGenerationForPerson(personId) {
  if (!personId) return;

  const personLink = document.querySelector(`[data-person-id="${CSS.escape(personId)}"]`);
  const generation = personLink?.closest("[data-collapsible-generation='true']");
  if (!generation || !generation.hidden) return;

  setCollapsedGenerationExpanded(true);
}

/* ---------------------------
   PARENT TO CHILD CONNECTOR LINES
--------------------------- */

function drawParentChildLines(people) {
  const treeLayout = document.getElementById("tree-layout");
  if (!treeLayout) return;

  // Remove any existing SVG
  const oldSvg = document.getElementById("tree-lines-svg");
  if (oldSvg && oldSvg.parentNode) {
    oldSvg.parentNode.removeChild(oldSvg);
  }

  if (!people || people.length === 0 || treeLayout.classList.contains("tree-overview-mode")) return;

  const layoutRect = treeLayout.getBoundingClientRect();
  const canvasWidth = Math.max(treeLayout.scrollWidth, treeLayout.clientWidth);
  const canvasHeight = Math.max(treeLayout.scrollHeight, treeLayout.clientHeight);

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("id", "tree-lines-svg");
  svg.setAttribute("class", "tree-lines");
  svg.setAttribute("width", canvasWidth);
  svg.setAttribute("height", canvasHeight);
  svg.setAttribute("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`);

  // Map personId -> DOM element + rect info
  const elMap = new Map();
  const allEls = treeLayout.querySelectorAll("[data-person-id]");
  allEls.forEach((el) => {
    const id = el.dataset.personId;
    if (!id) return;
    const rect = el.getBoundingClientRect();
    elMap.set(id, {
      el,
      rect,
      centerX: rect.left + rect.width / 2 - layoutRect.left + treeLayout.scrollLeft,
      topY: rect.top - layoutRect.top + treeLayout.scrollTop,
      bottomY: rect.bottom - layoutRect.top + treeLayout.scrollTop,
    });
  });

  // Build fullName -> person map so we can find parents from parent1/parent2 strings
  const nameToPerson = new Map();
  const idToPerson = new Map();
  people.forEach((p) => {
    if (p.id) {
      idToPerson.set(p.id, p);
    }

    const full = buildFullName(p.firstName, p.lastName);
    if (full) {
      nameToPerson.set(full, p);
    }
  });

  // Group children by their parent pair (order independent)
  const parentGroupMap = new Map();

  people.forEach((child) => {
    const parentIds = Array.isArray(child.parentIds) ? child.parentIds.filter(Boolean) : [];
    const p1 = child.parent1 || "";
    const p2 = child.parent2 || "";
    if (!parentIds.length && !p1 && !p2) return; // unknown parents

    let key;
    if (parentIds.length > 0) {
      key = parentIds.slice().sort().join("|");
    } else if (p1 && p2) {
      // sort so (A,B) and (B,A) are the same group
      key = [p1, p2].sort().join("|");
    } else {
      key = p1 || p2; // single-parent family
    }

    if (!parentGroupMap.has(key)) {
      parentGroupMap.set(key, {
        parentIds,
        parentNames: [p1 || null, p2 || null],
        children: [],
      });
    }
    parentGroupMap.get(key).children.push(child);
  });

  // For each parent group, draw connectors down to their children
  parentGroupMap.forEach((group) => {
    const parentPersons = [];

    if (Array.isArray(group.parentIds)) {
      group.parentIds.forEach(parentId => {
        const parentPerson = idToPerson.get(parentId);
        if (parentPerson && !parentPersons.includes(parentPerson)) {
          parentPersons.push(parentPerson);
        }
      });
    }

    const [p1Name, p2Name] = group.parentNames;

    if (p1Name && nameToPerson.has(p1Name)) {
      const parentPerson = nameToPerson.get(p1Name);
      if (!parentPersons.includes(parentPerson)) {
        parentPersons.push(parentPerson);
      }
    }
    if (p2Name && nameToPerson.has(p2Name)) {
      const p2Person = nameToPerson.get(p2Name);
      if (!parentPersons.includes(p2Person)) {
        parentPersons.push(p2Person);
      }
    }

    if (parentPersons.length === 0) return;

    // Get DOM positions for parents
    const parentCenters = parentPersons
      .map((p) => elMap.get(p.id))
      .filter(Boolean);

    if (parentCenters.length === 0) return;

    // Parent anchor: mid-point between parents, at their bottom
    let parentX;
    let parentY;

    if (parentCenters.length === 1) {
      parentX = parentCenters[0].centerX;
      parentY = parentCenters[0].bottomY + 4;
    } else {
      parentX =
        parentCenters.reduce((sum, pc) => sum + pc.centerX, 0) /
        parentCenters.length;
      parentY = Math.max(...parentCenters.map((pc) => pc.bottomY)) + 4;
    }

    // Children positions
    const childCenters = group.children
      .map((child) => elMap.get(child.id))
      .filter(Boolean);

    if (childCenters.length === 0) return;

    // For each child, draw a path: parent bottom -> midY -> child top
    childCenters.forEach((childInfo) => {
      const childX = childInfo.centerX;
      const childY = childInfo.topY - 4;

      const midY = (parentY + childY) / 2;

      const path = document.createElementNS(svgNS, "path");
      const d = `M ${parentX} ${parentY} L ${parentX} ${midY} L ${childX} ${midY} L ${childX} ${childY}`;
      path.setAttribute("d", d);
      svg.appendChild(path);
    });
  });

  treeLayout.prepend(svg);
}

function redrawTreeLinesSoon() {
  if (!lastRenderedPeople || lastRenderedPeople.length === 0) return;
  requestAnimationFrame(() => drawParentChildLines(lastRenderedPeople));
}

function setTreeDensity(mode) {
  const density = TREE_DENSITIES.has(mode) ? mode : "comfortable";
  const treeLayout = document.getElementById("tree-layout");
  if (!treeLayout) return;

  treeLayout.classList.toggle("tree-density-dense", density === "dense");
  treeLayout.classList.toggle("tree-density-compact", density === "compact");

  document.querySelectorAll("[data-tree-density]").forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.treeDensity === density ? "true" : "false");
  });

  localStorage.setItem(TREE_DENSITY_STORAGE_KEY, density);
  redrawTreeLinesSoon();
}

function setTreeModeCopy(isOverviewMode) {
  const label = document.querySelector(".tree-toolbar-label");
  const hint = document.querySelector(".tree-scroll-hint");
  const actionHint = document.querySelector(".tree-action-hint");

  if (label) {
    label.textContent = "Start here";
  }

  if (hint) {
    hint.textContent = isOverviewMode
      ? "Use Find person to jump."
      : "Search or click a card.";
  }

  if (actionHint) {
    actionHint.textContent = isOverviewMode
      ? "Fallback list for wide families."
      : "Scroll sideways if this tree grows wider than the screen.";
  }
}

function setupTreeDensityControls() {
  const storedDensity = isLargeDemoMode()
    ? "compact"
    : localStorage.getItem(TREE_DENSITY_STORAGE_KEY) || "comfortable";
  setTreeDensity(storedDensity);

  document.querySelectorAll("[data-tree-density]").forEach((button) => {
    button.addEventListener("click", () => {
      setTreeDensity(button.dataset.treeDensity);
    });
  });
}

function setupTreeViewSwitch() {
  document.querySelectorAll("[data-tree-view]").forEach((button) => {
    button.addEventListener("click", () => {
      setTreeView(button.dataset.treeView);
      if (button.dataset.treeView === "chart") {
        document.getElementById("treeChartView")?.scrollIntoView({
          block: "start",
          inline: "nearest",
          behavior: "smooth",
        });
      }
    });
  });
}

function setupTreeMapControls() {
  const overviewButton = document.getElementById("treeMapOverviewBtn");
  const zoomInButton = document.getElementById("treeMapZoomInBtn");
  const zoomOutButton = document.getElementById("treeMapZoomOutBtn");
  const status = document.getElementById("treeFullscreenStatus");
  const canvasPanel = document.querySelector(".tree-canvas-panel");

  function setMapStatus(message) {
    if (status) status.textContent = message;
  }

  function scrollMapIntoView() {
    canvasPanel?.scrollIntoView({
      block: "start",
      inline: "nearest",
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  function sendOrFallback(action, fallback) {
    if (sendChartControl(action)) {
      scrollMapIntoView();
      return true;
    }

    if (currentTreeView === "chart") {
      return false;
    }

    fallback?.();
    return false;
  }

  overviewButton?.addEventListener("click", () => {
    const didSend = sendOrFallback("fit", () => {
      setCollapsedGenerationExpanded(false, { scrollToControl: false });
      clearTreeFocus();
      document.getElementById("tree-layout")?.scrollIntoView({
        block: "start",
        inline: "nearest",
        behavior: "smooth",
      });
    });
    setMapStatus(didSend
      ? "Showing the full family overview."
      : currentTreeView === "chart"
        ? "Full overview is available after the family map finishes loading."
        : "Returned to the top of the card list overview.");
  });

  zoomInButton?.addEventListener("click", () => {
    const didSend = sendOrFallback("zoom-in", scrollMapIntoView);
    setMapStatus(didSend
      ? "Zoomed in on the family map."
      : "Zoom is available in Family map view after the chart loads.");
  });

  zoomOutButton?.addEventListener("click", () => {
    const didSend = sendOrFallback("zoom-out", scrollMapIntoView);
    setMapStatus(didSend
      ? "Zoomed out on the family map."
      : "Zoom is available in Family map view after the chart loads.");
  });
}

function setupTreeFullscreenButton() {
  const button = document.getElementById("treeFullscreenBtn");
  const status = document.getElementById("treeFullscreenStatus");
  const panel = document.querySelector(".tree-canvas-panel");
  if (!button || !panel) return;

  function updateButtonLabel() {
    const isFullscreen = Boolean(document.fullscreenElement);
    button.textContent = isFullscreen ? "Exit" : "Full";
    button.setAttribute(
      "aria-label",
      isFullscreen ? "Exit full screen family tree view" : "Open family tree in full screen"
    );
  }

  button.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await panel.requestFullscreen();
      }
      if (status) status.textContent = "";
    } catch (err) {
      console.error("Unable to toggle fullscreen:", err);
      if (status) status.textContent = "Full screen was blocked by the browser.";
    }
  });

  document.addEventListener("fullscreenchange", updateButtonLabel);
  updateButtonLabel();
}

function setupTreePresentationControls() {
  const presentationButton = document.getElementById("treePresentationBtn");
  const printButton = document.getElementById("treePrintBtn");
  const escapeBar = document.getElementById("treePresentationEscapeBar");
  const findForm = document.getElementById("treePresentationFindForm");
  const findInput = document.getElementById("treePresentationFindInput");
  const presentationStatus = document.getElementById("treePresentationStatus");
  const exitButton = document.getElementById("treePresentationExitBtn");
  const backButton = document.getElementById("treePresentationBackBtn");
  const zoomInButton = document.getElementById("treePresentationZoomInBtn");
  const zoomOutButton = document.getElementById("treePresentationZoomOutBtn");
  const zoomResetButton = document.getElementById("treePresentationZoomResetBtn");
  const canvasPanel = document.querySelector(".tree-canvas-panel");
  if (!presentationButton && !printButton) return;

  function setPresentationMode(isActive, { scrollToTree = false } = {}) {
    document.body.classList.toggle("tree-presentation-mode", isActive);
    if (escapeBar) escapeBar.hidden = !isActive;
    if (presentationButton) {
      presentationButton.textContent = isActive ? "Exit map view" : "Map view";
      presentationButton.setAttribute("aria-pressed", isActive ? "true" : "false");
      presentationButton.setAttribute(
        "aria-label",
        isActive ? "Exit presentation view" : "Show presentation view"
      );
    }

    if (isActive) {
      if (currentTreeView !== "chart") {
        setTreeView("chart");
      }
      const { input } = getTreeFocusElements();
      if (findInput && input) {
        findInput.value = input.value || "";
      }
      if (presentationStatus) {
        presentationStatus.textContent = "Presentation mode is on. Use Find person, zoom, or Exit presentation.";
      }
    } else if (presentationStatus) {
      presentationStatus.textContent = "";
    }

    if (isActive && scrollToTree) {
      canvasPanel?.scrollIntoView({
        block: "start",
        inline: "nearest",
        behavior: "smooth",
      });
    }
  }

  function exitPresentation({ restoreFocus = true } = {}) {
    setPresentationMode(false);
    if (restoreFocus) {
      presentationButton?.focus({ preventScroll: true });
    }
  }

  function setPresentationStatus(message) {
    if (presentationStatus) presentationStatus.textContent = message;
  }

  function sendPresentationChartControl(action, successMessage) {
    if (sendChartControl(action)) {
      setPresentationStatus(successMessage);
      return;
    }
    setPresentationStatus("That control is available after the family map finishes loading.");
  }

  function focusPresentationPerson(query) {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setPresentationStatus("Type a name to focus someone in the presentation.");
      return;
    }

    const person = findPersonByRelationshipInput(cleanQuery);
    if (!person) {
      setPresentationStatus(`No match found for "${cleanQuery}". Try a first or last name.`);
      return;
    }

    const displayName = getPersonDisplayName(person);
    const { input } = getTreeFocusElements();
    if (input) input.value = displayName;
    if (findInput) findInput.value = displayName;

    updateTreeFocusUrl({
      personId: person.id,
      query: displayName,
    });
    focusPersonInTree(person.id);
    focusPersonInChartFrame(person.id, displayName);
    setSelectedPersonPanel(person.id, {
      source: "presentation",
      scroll: false,
      focusChart: true,
    });
    setPresentationStatus(`Focused ${displayName}.`);
  }

  presentationButton?.addEventListener("click", () => {
    setPresentationMode(!document.body.classList.contains("tree-presentation-mode"), {
      scrollToTree: true,
    });
  });

  exitButton?.addEventListener("click", () => {
    exitPresentation();
  });

  backButton?.addEventListener("click", () => {
    exitPresentation();
    document.querySelector(".tree-page-heading")?.scrollIntoView({
      block: "start",
      inline: "nearest",
      behavior: "smooth",
    });
  });

  findForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    focusPresentationPerson(findInput?.value || "");
  });

  zoomInButton?.addEventListener("click", () => {
    sendPresentationChartControl("zoom-in", "Zoomed in.");
  });

  zoomOutButton?.addEventListener("click", () => {
    sendPresentationChartControl("zoom-out", "Zoomed out.");
  });

  zoomResetButton?.addEventListener("click", () => {
    sendPresentationChartControl("reset", "Reset the map view.");
  });

  printButton?.addEventListener("click", () => {
    window.print();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !document.body.classList.contains("tree-presentation-mode")) return;
    exitPresentation();
  });
}

function setupTreeTour() {
  const toggle = document.getElementById("treeTourToggle");
  const panel = document.getElementById("treeTourPanel");
  const closeButton = document.getElementById("treeTourClose");
  if (!toggle || !panel) return;

  function setTourOpen(isOpen, { restoreFocus = false } = {}) {
    panel.hidden = !isOpen;
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (isOpen) {
      panel.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      closeButton?.focus({ preventScroll: true });
    } else if (restoreFocus) {
      toggle.focus({ preventScroll: true });
    }
  }

  toggle.addEventListener("click", () => {
    setTourOpen(panel.hidden);
  });

  closeButton?.addEventListener("click", () => {
    setTourOpen(false, { restoreFocus: true });
  });

  panel.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    setTourOpen(false, { restoreFocus: true });
  });
}

function setTreeSubtitle(message) {
  const subtitleEl = document.getElementById("treeSubtitle");
  if (subtitleEl) subtitleEl.textContent = message;
}

function setPublicDemoBannerVisible(isVisible) {
  const banner = document.getElementById("publicDemoBanner");
  if (!banner) return;
  banner.hidden = !isVisible;
}

function setLargeTreeHintVisible(isVisible) {
  const hint = document.getElementById("largeTreeHint");
  if (!hint) return;
  hint.hidden = !isVisible;
}

async function updateTreeTitle(familyId, user = null) {
  const titleEl = document.getElementById("treeTitle");
  const joinCodeDisplay = document.getElementById("joinCodeDisplay");
  const joinCodeValue = document.getElementById("joinCodeValue");
  
  if (!titleEl) return;

  if (isLargeDemoMode()) {
    setPublicDemoBannerVisible(true);
    titleEl.textContent = "Large Example Family Tree";
    document.title = "Large Example Family Tree";
    setTreeSubtitle("Read-only example tree.");
    if (joinCodeDisplay) {
      joinCodeDisplay.style.display = "none";
    }
    return;
  }

  // Example tree: no familyId, so keep sample copy and hide the join code.
  if (!familyId) {
    setPublicDemoBannerVisible(true);
    titleEl.textContent = "Example Family Tree";
    document.title = "Our Family Tree";
    setTreeSubtitle("A read-only sample tree. Use Find person or click a card to see how profiles and relationships work.");
    if (joinCodeDisplay) {
      joinCodeDisplay.style.display = "none";
    }
    return;
  }

  setPublicDemoBannerVisible(false);

  try {
    const familyRef = doc(db, "families", familyId);
    const familySnap = await getDoc(familyRef);

    if (!familySnap.exists()) {
      titleEl.textContent = "Family Tree";
      setTreeSubtitle("This tree could not be found. Open Account or check the invite link before trying again.");
      if (joinCodeDisplay) {
        joinCodeDisplay.style.display = "none";
      }
      return;
    }

    const data = familySnap.data();

    if (data.archivedAt) {
      titleEl.textContent = "Archived Family Tree";
      setTreeSubtitle("This family tree is archived. You can browse what is available, but editing is paused.");
      if (joinCodeDisplay) {
        joinCodeDisplay.style.display = "none";
      }
      return;
    }

    titleEl.textContent = data.name || "Family Tree";
    setTreeSubtitle("Search a relative, click any card for details, or open a profile to edit stories, relationships, and photos.");

    // Optional: update browser tab title as well
    document.title = data.name || "Our Family Tree";
    
    const canManageInvite = getFamilyRole(data, user) === "owner";

    // Display join code only to the owner. Viewers should not be able to re-share access.
    if (joinCodeDisplay && joinCodeValue && data.joinCode && canManageInvite) {
      joinCodeValue.textContent = data.joinCode;
      joinCodeDisplay.style.display = "block";
    } else if (joinCodeDisplay) {
      joinCodeDisplay.style.display = "none";
    }
  } catch (err) {
    console.error("Error loading family name:", err);
    titleEl.textContent = "Family Tree";
    setTreeSubtitle("This tree could not load its title. Refresh, sign in, or confirm this account has access.");
    if (joinCodeDisplay) {
      joinCodeDisplay.style.display = "none";
    }
  }
}

async function isFamilyArchived(familyId) {
  if (!familyId) return false;

  try {
    const familyRef = doc(db, "families", familyId);
    const familySnap = await getDoc(familyRef);
    return familySnap.exists() && Boolean(familySnap.data().archivedAt);
  } catch (err) {
    console.error("Error checking family archive status:", err);
    return false;
  }
}

async function userCanEditTree(familyId, user) {
  if (!familyId || !user) return false;

  try {
    const familySnap = await getDoc(doc(db, "families", familyId));
    return familySnap.exists() && ["owner", "editor"].includes(getFamilyRole(familySnap.data(), user));
  } catch (err) {
    console.warn("Could not check tree edit access:", err);
    return false;
  }
}

async function loadFamilyTree() {
  const treeLayout = document.getElementById("tree-layout");
  if (!treeLayout) {
    return;
  }

  const largeDemoMode = isLargeDemoMode();
  const initialFocusPersonId = getInitialFocusPersonId();
  const initialTreeQuery = getInitialTreeQuery();
  const resolvedFamily = largeDemoMode
    ? { familyId: null, user: null }
    : await resolveCurrentUserFamilyId();
  const familyId = resolvedFamily.familyId;
  const isPublicDemoMode = largeDemoMode || (!familyId && !resolvedFamily.user);
  activeTreeContext = {
    familyId,
    isDemoMode: isPublicDemoMode,
    canEdit: false,
  };

  if (!largeDemoMode && familyId && !resolvedFamily.user) {
    const titleEl = document.getElementById("treeTitle");
    const joinCodeDisplay = document.getElementById("joinCodeDisplay");
    if (titleEl) titleEl.textContent = "Family Tree";
    if (joinCodeDisplay) joinCodeDisplay.style.display = "none";
    setTreeView("cards", { persist: false, updateUrl: false });
    setTreeMessage(treeLayout, "Sign in with an invited account to view this private family tree.", [
      { label: "Sign In", href: "/signin" },
    ]);
    return;
  }

  if (!largeDemoMode && resolvedFamily.user && !familyId) {
    const titleEl = document.getElementById("treeTitle");
    const joinCodeDisplay = document.getElementById("joinCodeDisplay");
    if (titleEl) titleEl.textContent = "Family Tree";
    if (joinCodeDisplay) joinCodeDisplay.style.display = "none";
    setTreeView("cards", { persist: false, updateUrl: false });
    setTreeMessage(treeLayout, "No private family tree is connected to this account yet. Open Account to start one or join with a code.", [
      { label: "Open Account", href: "/account" },
    ]);
    return;
  }

  // Update the title (family name or example)
  await updateTreeTitle(familyId, resolvedFamily.user);
  activeTreeContext.canEdit = await userCanEditTree(familyId, resolvedFamily.user);
  updateChartFrameSource(familyId, isPublicDemoMode);

  if (!largeDemoMode && await isFamilyArchived(familyId)) {
    setTreeView("cards", { persist: false, updateUrl: false });
    setTreeMessage(treeLayout, "This family tree has been archived. Open Account to choose another tree or review access.", [
      { label: "Open Account", href: "/account" },
    ]);
    return;
  }

  setTreeMessage(treeLayout, "Loading this family tree...");

  try {
    const allPeople = isPublicDemoMode ? generateLargeDemoTree() : await getAllPeople(familyId);

    if (!allPeople || allPeople.length === 0) {
      populateTreeFocusOptions([]);
      clearTreeFocus();
      setTreeView("cards", { persist: false, updateUrl: false });
      setTreeMessage(
        treeLayout,
        familyId
          ? "This tree is ready for its first person. Use Add Person when you have owner or editor access."
          : "The example tree is unavailable right now. Refresh to try loading the demo again.",
        familyId
          ? []
          : [{ label: "Refresh", onClick: () => window.location.reload() }]
      );
      return;
    }

    // Group & sort by generation using BFS-based helpers
    const genMap = groupByGeneration(allPeople);
    const genKeys = sortGenerationKeys(genMap);
    const overviewMode = allPeople.length >= OVERVIEW_MODE_THRESHOLD || isPublicDemoMode;
    setLargeTreeHintVisible(overviewMode);
    setTreeModeCopy(overviewMode);
    setTreeView(getPreferredTreeView(overviewMode, familyId), { persist: false, updateUrl: false });
    updateChartFrameSource(familyId, isPublicDemoMode);
    populateTreeFocusOptions(allPeople);
    renderRecentPeople();
    clearTreeFocus();
    const { input: focusInput } = getTreeFocusElements();
    if (focusInput && initialTreeQuery) {
      focusInput.value = initialTreeQuery;
    }
    setTreeFocusStatus(overviewMode
      ? `Search ${allPeople.length} people to jump directly to a card.`
      : `Search ${allPeople.length} people in this tree.`);
    renderBirthdayCalendar(allPeople, familyId, { isDemoMode: isPublicDemoMode });
    renderMissingInfoChecklist(allPeople, familyId, { isDemoMode: isPublicDemoMode });
    renderFamilyStats(allPeople, familyId, { isDemoMode: isPublicDemoMode });
    renderDataHealthInspector(allPeople, { isDemoMode: isPublicDemoMode });

    treeLayout.replaceChildren(); // clear loading text
    treeLayout.classList.toggle("tree-overview-mode", overviewMode);

    const collapseAfterGeneration = getOverviewCollapseAfterGeneration();
    const collapsedGenKeys = overviewMode
      ? genKeys.filter(genNumber => genNumber > collapseAfterGeneration)
      : [];
    const hiddenPersonCount = collapsedGenKeys.reduce(
      (sum, genNumber) => sum + (genMap.get(genNumber) || []).length,
      0
    );

    if (overviewMode) {
      treeLayout.appendChild(createTreeOverviewSummary({
        people: allPeople,
        generationCount: genKeys.length,
        visibleGenerationCount: genKeys.length - collapsedGenKeys.length,
        hiddenPersonCount,
      }));
    }

    genKeys.forEach((genNumber) => {
      if (
        overviewMode &&
        genNumber === collapseAfterGeneration + 1 &&
        collapsedGenKeys.length > 0 &&
        hiddenPersonCount > 0
      ) {
        treeLayout.appendChild(createGenerationCollapseControl({
          hiddenGenerationCount: collapsedGenKeys.length,
          hiddenPersonCount,
        }));
      }

      const peopleInGen = genMap.get(genNumber) || [];
      renderGeneration(genNumber, peopleInGen, treeLayout, familyId, {
        collapsed: overviewMode && genNumber > collapseAfterGeneration,
        noProfileLinks: largeDemoMode,
        isDemoMode: isPublicDemoMode,
        highlightPersonId: pendingHighlightPersonId,
        showRelationshipTags: overviewMode,
        allPeople,
      });
    });

    // cache and draw connectors
    lastRenderedPeople = allPeople;
    document.body.classList.toggle("tree-card-layout-ready", !overviewMode);
    document.body.classList.toggle("tree-card-cue-ready", !overviewMode && currentTreeView === "cards");
    if (overviewMode) {
      const oldSvg = document.getElementById("tree-lines-svg");
      if (oldSvg && oldSvg.parentNode) {
        oldSvg.parentNode.removeChild(oldSvg);
      }
    } else {
      redrawTreeLinesSoon();
    }
    if (initialTreeQuery) {
      runTreeFocusSearch(0);
    } else {
      const focusedPersonId = pendingHighlightPersonId || initialFocusPersonId;
      focusPersonInTree(focusedPersonId);
      if (focusedPersonId) {
        setSelectedPersonPanel(focusedPersonId, {
          source: "initial",
          scroll: false,
        });
      }
    }
    pendingHighlightPersonId = null;
  } catch (err) {
    console.error("Error loading family tree:", err);
    setTreeView("cards", { persist: false, updateUrl: false });
    setTreeMessage(treeLayout, "Could not load this family tree. Refresh the page, then confirm this account has access.", [
      { label: "Refresh", onClick: () => window.location.reload() },
      { label: "Open Account", href: "/account", secondary: true },
    ]);
  }
}

function setTreeMessage(treeLayout, message, actions = []) {
  lastRenderedPeople = [];
  renderRecentPeople();
  document.body.classList.remove("tree-card-layout-ready", "tree-card-cue-ready");
  setLargeTreeHintVisible(false);
  treeLayout.replaceChildren();
  treeLayout.classList.remove("tree-overview-mode");
  setTreeModeCopy(false);
  populateTreeFocusOptions([]);
  clearTreeFocus();
  renderBirthdayCalendar([], null, { isDemoMode: false });
  renderMissingInfoChecklist([], null, { isDemoMode: false });
  renderFamilyStats([]);
  renderDataHealthInspector([], { isDemoMode: false });
  clearSelectedPersonPanel();
  const state = document.createElement("div");
  state.className = "tree-state-message";

  const title = document.createElement("strong");
  if (/loading/i.test(message)) {
    title.textContent = "Loading tree";
  } else if (/empty|No private|No family/i.test(message)) {
    title.textContent = "Nothing here yet";
  } else if (/sign in/i.test(message)) {
    title.textContent = "Sign in needed";
  } else if (/could not|error|archived/i.test(message)) {
    title.textContent = "Tree unavailable";
  } else {
    title.textContent = "Family tree";
  }

  const copy = document.createElement("span");
  copy.textContent = message;
  state.append(title, copy);

  if (Array.isArray(actions) && actions.length > 0) {
    const actionRow = document.createElement("div");
    actionRow.className = "tree-state-actions";
    actions.forEach(action => {
      const control = action.href ? document.createElement("a") : document.createElement("button");
      control.className = action.secondary ? "button button-secondary" : "button";
      control.textContent = action.label;
      if (action.href) {
        control.href = action.href;
      } else {
        control.type = "button";
        control.addEventListener("click", action.onClick || (() => {}));
      }
      actionRow.appendChild(control);
    });
    state.appendChild(actionRow);
  }

  treeLayout.appendChild(state);
}

/* ---------------------------
   INIT
--------------------------- */

// Setup copy code functionality - make the code itself clickable
function setupCopyCode() {
  const joinCodeValue = document.getElementById("joinCodeValue");

  async function copyJoinCode() {
    if (!joinCodeValue) return;
      const code = joinCodeValue.textContent;
      if (code) {
        try {
          await navigator.clipboard.writeText(code);
          const originalBg = joinCodeValue.style.backgroundColor;
          joinCodeValue.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
          joinCodeValue.title = "Access code copied.";
          setTimeout(() => {
            joinCodeValue.style.backgroundColor = originalBg;
            joinCodeValue.title = "Click or press Enter to copy";
          }, 500);
        } catch (err) {
          console.error("Failed to copy code:", err);
          const range = document.createRange();
          range.selectNode(joinCodeValue);
          window.getSelection().removeAllRanges();
          window.getSelection().addRange(range);
          joinCodeValue.title = "Code selected. Press Ctrl+C to copy.";
        }
      }
  }

  if (joinCodeValue) {
    joinCodeValue.addEventListener("click", copyJoinCode);
    joinCodeValue.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      copyJoinCode();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupTreeDensityControls();
  setupTreeViewSwitch();
  setupTreeFocusControls();
  setupRelationshipFinder();
  setupRecentPeopleControls();
  setupTreeMapControls();
  setupTreeFullscreenButton();
  setupTreePresentationControls();
  setupTreeTour();
  setupChartFrameSafety();
  setupAddPersonModal();
  setupCopyCode();
  loadFamilyTree();

  window.addEventListener("person-added", (event) => {
    pendingHighlightPersonId = event.detail?.personId || null;
    chartRefreshToken = Date.now();
    loadFamilyTree();
  });

  // Redraw connectors on resize so lines stay aligned
  window.addEventListener("resize", () => {
    if (lastRenderedPeople && lastRenderedPeople.length > 0) {
      redrawTreeLinesSoon();
    }
  });
});
