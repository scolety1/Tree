import { db } from "./firebase.js?v=20260522-11";
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
  toTitle,
  toTitleFullName,
  buildFullName
} from "./helpers.js?v=20260522-11";
import { resolveCurrentUserFamilyId } from "./familyContext.js?v=20260522-11";
import { generateLargeDemoTree } from "./demoTreeData.js?v=20260522-11";
import { STARTER_TREE_ID } from "./starterTree.js?v=20260522-11";

/* Keep a reference to the last rendered people so we can redraw lines on resize */
let lastRenderedPeople = [];
let pendingHighlightPersonId = null;
let treeFocusMatches = [];
let treeFocusIndex = -1;
let currentTreeView = "cards";
let chartRefreshToken = 0;
let chartLoadTimer = null;
const TREE_DENSITY_STORAGE_KEY = "treeDensity";
const TREE_VIEW_STORAGE_KEY = "treePreferredView";
const TREE_DENSITIES = new Set(["comfortable", "dense", "compact"]);
const TREE_VIEWS = new Set(["chart", "cards"]);
const CHART_READY_TIMEOUT_MS = 9000;
const OVERVIEW_MODE_THRESHOLD = 34;
const OVERVIEW_COLLAPSE_AFTER_GENERATION = 3;
const MOBILE_OVERVIEW_COLLAPSE_AFTER_GENERATION = 2;

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
      "The connected chart did not finish loading. Card list view is still available.",
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
}

function markChartError(message = "The connected chart could not load. Card list view is still available.") {
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

    if (data.type !== "tree-chart-status") return;

    if (data.status === "ready") {
      frame.dataset.chartReady = "true";
      markChartReady();
      return;
    }

    if (data.status === "error") {
      markChartError(data.message || "The connected chart could not render. Card list view is still available.");
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
  if (isChartView) {
    if (label) label.textContent = "Family map";
    if (hint) hint.textContent = "Pan, zoom, or search to move through the tree.";
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
    modal.hidden = false;
    modal.classList.add("is-open");
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
  let formattedDate = "Unknown";
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
  // Include familyId in profile link if it exists
  let profileUrl = `/profile?person=${encodeURIComponent(person.id)}`;
  if (familyId) {
    profileUrl += `&familyId=${encodeURIComponent(familyId)}`;
  }
  profileUrl += "&from=tree";
  if (TREE_VIEWS.has(currentTreeView)) {
    profileUrl += `&view=${encodeURIComponent(currentTreeView)}`;
  }
  const currentParams = new URLSearchParams(window.location.search);
  const treeQuery = currentParams.get("treeQuery") || "";
  if (treeQuery) {
    profileUrl += `&treeQuery=${encodeURIComponent(treeQuery)}`;
  }
  if (!options.noProfileLinks) {
    link.href = profileUrl;
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

function getTreeFocusElements() {
  return {
    form: document.getElementById("treeFocusForm"),
    input: document.getElementById("treeFocusInput"),
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
  const { form, input, previousButton, nextButton } = getTreeFocusElements();
  if (!form || !input) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    runTreeFocusSearch(0);
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

function getRelationshipSummary(path, people) {
  if (!path || path.length === 0) return "";
  if (path.length === 1) return "That is the same person.";

  const target = people.find(person => person.id === path[path.length - 1].id);
  const firstStep = path[1]?.via;
  const lastStep = path[path.length - 1]?.via;

  if (path.length === 2) {
    if (firstStep === "parent") return `${getPersonDisplayName(target)} is their parent.`;
    if (firstStep === "child") return `${getPersonDisplayName(target)} is their child.`;
    if (firstStep === "spouse/partner") return `${getPersonDisplayName(target)} is their spouse or partner.`;
  }

  if (path.length === 3 && firstStep === "parent" && lastStep === "parent") {
    return `${getPersonDisplayName(target)} is their grandparent.`;
  }

  if (path.length === 3 && firstStep === "child" && lastStep === "child") {
    return `${getPersonDisplayName(target)} is their grandchild.`;
  }

  if (path.length === 3 && firstStep === "parent" && lastStep === "child") {
    return `${getPersonDisplayName(target)} is connected through a shared parent.`;
  }

  return `${getPersonDisplayName(target)} is ${path.length - 1} family steps away.`;
}

function renderRelationshipPath(path, people) {
  const wrapper = document.createElement("div");
  const summary = document.createElement("strong");
  summary.textContent = getRelationshipSummary(path, people);
  wrapper.appendChild(summary);

  const list = document.createElement("ol");
  list.className = "relationship-path-list";

  path.forEach((step, index) => {
    const person = people.find(item => item.id === step.id);
    const item = document.createElement("li");

    const stepLabel = document.createElement("span");
    stepLabel.className = "relationship-path-step";
    stepLabel.textContent = index === 0 ? "Start" : `Then ${step.via}`;

    const name = document.createElement("span");
    name.textContent = getPersonDisplayName(person);

    item.append(stepLabel, name);
    list.appendChild(item);
  });

  wrapper.appendChild(list);
  return wrapper;
}

function setupRelationshipFinder() {
  const { form, personAInput, personBInput } = getRelationshipFinderElements();
  if (!form || !personAInput || !personBInput) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (lastRenderedPeople.length === 0) {
      setRelationshipResult("Load a family tree first, then choose two people.");
      return;
    }

    const personA = findPersonByRelationshipInput(personAInput.value);
    const personB = findPersonByRelationshipInput(personBInput.value);

    if (!personA || !personB) {
      setRelationshipResult("Choose two people from this tree. Try typing a first and last name.");
      return;
    }

    const path = findRelationshipPath(personA.id, personB.id, lastRenderedPeople);
    if (!path) {
      setRelationshipResult(`No relationship path found between ${getPersonDisplayName(personA)} and ${getPersonDisplayName(personB)} yet.`);
      return;
    }

    focusPersonInChartFrame(personB.id, getPersonDisplayName(personB));
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
  if (familyId) params.set("familyId", familyId);
  params.set("from", "tree");
  if (TREE_VIEWS.has(currentTreeView)) params.set("view", currentTreeView);
  link.href = `/profile?${params.toString()}`;
  link.textContent = name;
  return link;
}

function createBirthdayItem(person, info, familyId, isDemoMode) {
  const item = document.createElement("li");
  item.className = "birthday-item";
  item.appendChild(createProfileLink(person, familyId, isDemoMode, "birthday-item-name"));

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

function renderBirthdayCalendar(people, familyId = null, options = {}) {
  const panel = document.getElementById("birthdayCalendarPanel");
  if (!panel) return;

  panel.replaceChildren();

  if (!people || people.length === 0) {
    const empty = document.createElement("p");
    empty.className = "birthday-empty-note";
    empty.textContent = "Load a tree to see birthdays.";
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
    empty.textContent = `No birthdays are filled in yet. ${missingPeople.length} people are missing birthdays.`;
    panel.appendChild(empty);
    return;
  }

  const upcomingSection = document.createElement("section");
  upcomingSection.className = "birthday-section";
  const upcomingHeading = document.createElement("h3");
  upcomingHeading.textContent = "Next birthdays";
  const upcomingList = document.createElement("ul");
  upcomingList.className = "birthday-list";
  birthdayPeople.slice(0, 6).forEach(({ person, info }) => {
    upcomingList.appendChild(createBirthdayItem(person, info, familyId, Boolean(options.isDemoMode)));
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
  [...monthCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([month, count]) => {
      const item = document.createElement("li");
      item.className = "birthday-month-pill";
      item.textContent = `${new Date(2026, month, 1).toLocaleString("en-US", { month: "short" })}: ${count}`;
      monthsList.appendChild(item);
    });
  monthsSection.append(monthsHeading, monthsList);

  panel.append(upcomingSection, monthsSection);

  if (missingPeople.length > 0) {
    const missingSection = document.createElement("section");
    missingSection.className = "birthday-section";
    const missingHeading = document.createElement("h3");
    missingHeading.textContent = `Missing birthdays (${missingPeople.length})`;
    const missingList = document.createElement("ul");
    missingList.className = "birthday-missing-list";
    missingPeople.slice(0, 5).forEach(person => {
      const item = document.createElement("li");
      item.appendChild(createProfileLink(person, familyId, Boolean(options.isDemoMode), "birthday-item-name"));
      missingList.appendChild(item);
    });
    if (missingPeople.length > 5) {
      const extra = document.createElement("li");
      extra.textContent = `+${missingPeople.length - 5} more`;
      missingList.appendChild(extra);
    }
    missingSection.append(missingHeading, missingList);
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
    "replace this",
  ].some(marker => normalized.includes(marker));
}

function getMissingInfoLabels(person, people) {
  const labels = [];
  if (!getBirthdayDate(person)) labels.push("Birthday");
  if (!person?.image) labels.push("Photo");
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
    empty.textContent = "Load a tree to see what needs filling in.";
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
    ? "Demo profiles are read-only, but this shows what the checklist will catch."
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

function renderFamilyStats(people) {
  const panel = document.getElementById("familyStatsPanel");
  if (!panel) return;

  panel.replaceChildren();

  if (!people || people.length === 0) {
    const empty = document.createElement("p");
    empty.className = "family-stats-note";
    empty.textContent = "Load a tree to see family stats.";
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

  const note = document.createElement("p");
  note.className = "family-stats-note";
  note.textContent = missingProfileCount === 0
    ? "This tree is looking nicely filled in."
    : "Use Missing info to knock out the fastest cleanup wins.";
  panel.appendChild(note);
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
  title.textContent = `${getGenerationLabel(genNumber)} · ${peopleInGen.length}`;
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
   PARENT Ã¢â€ â€™ CHILD CONNECTOR LINES
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

  if (label) {
    label.textContent = isOverviewMode ? "Large tree overview" : "Tree view";
  }

  if (hint) {
    hint.textContent = isOverviewMode
      ? "Use Find person to jump around larger families."
      : "Scroll sideways to see larger families.";
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

function setupTreeFullscreenButton() {
  const button = document.getElementById("treeFullscreenBtn");
  const status = document.getElementById("treeFullscreenStatus");
  const panel = document.querySelector(".tree-canvas-panel");
  if (!button || !panel) return;

  function updateButtonLabel() {
    button.textContent = document.fullscreenElement ? "Exit Full Screen" : "Full Screen";
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

async function updateTreeTitle(familyId, user = null) {
  const titleEl = document.getElementById("treeTitle");
  const joinCodeDisplay = document.getElementById("joinCodeDisplay");
  const joinCodeValue = document.getElementById("joinCodeValue");
  
  if (!titleEl) return;

  if (isLargeDemoMode()) {
    titleEl.textContent = "Large Demo Family Tree";
    document.title = "Large Demo Family Tree";
    if (joinCodeDisplay) {
      joinCodeDisplay.style.display = "none";
    }
    return;
  }

  // Example tree: no familyId Ã¢â€ â€™ keep default title and hide join code
  if (!familyId) {
    titleEl.textContent = "Example Family Tree";
    if (joinCodeDisplay) {
      joinCodeDisplay.style.display = "none";
    }
    return;
  }

  try {
    const familyRef = doc(db, "families", familyId);
    const familySnap = await getDoc(familyRef);

    if (!familySnap.exists()) {
      titleEl.textContent = "Family Tree";
      if (joinCodeDisplay) {
        joinCodeDisplay.style.display = "none";
      }
      return;
    }

    const data = familySnap.data();

    if (data.archivedAt) {
      titleEl.textContent = "Archived Family Tree";
      if (joinCodeDisplay) {
        joinCodeDisplay.style.display = "none";
      }
      return;
    }

    titleEl.textContent = data.name || "Family Tree";

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

  if (!largeDemoMode && familyId && !resolvedFamily.user) {
    const titleEl = document.getElementById("treeTitle");
    const joinCodeDisplay = document.getElementById("joinCodeDisplay");
    if (titleEl) titleEl.textContent = "Family Tree";
    if (joinCodeDisplay) joinCodeDisplay.style.display = "none";
    setTreeView("cards", { persist: false, updateUrl: false });
    setTreeMessage(treeLayout, "Sign in to view this private family tree.");
    return;
  }

  if (!largeDemoMode && resolvedFamily.user && !familyId) {
    const titleEl = document.getElementById("treeTitle");
    const joinCodeDisplay = document.getElementById("joinCodeDisplay");
    if (titleEl) titleEl.textContent = "Family Tree";
    if (joinCodeDisplay) joinCodeDisplay.style.display = "none";
    setTreeView("cards", { persist: false, updateUrl: false });
    setTreeMessage(treeLayout, "No private family tree is connected to this account yet. Open Account to start one or join with a code.");
    return;
  }

  // Update the title (family name or example)
  await updateTreeTitle(familyId, resolvedFamily.user);
  updateChartFrameSource(familyId, largeDemoMode || !familyId);

  if (!largeDemoMode && await isFamilyArchived(familyId)) {
    setTreeView("cards", { persist: false, updateUrl: false });
    setTreeMessage(treeLayout, "This family tree has been archived.");
    return;
  }

  setTreeMessage(treeLayout, "Loading this family tree...");

  try {
    const allPeople = largeDemoMode ? generateLargeDemoTree() : await getAllPeople(familyId);

    if (!allPeople || allPeople.length === 0) {
      populateTreeFocusOptions([]);
      clearTreeFocus();
      setTreeView("cards", { persist: false, updateUrl: false });
      setTreeMessage(
        treeLayout,
        familyId
          ? "This tree is empty. Use the + button to add the first family member."
          : "The example tree is empty or unavailable right now."
      );
      return;
    }

    // Group & sort by generation using BFS-based helpers
    const genMap = groupByGeneration(allPeople);
    const genKeys = sortGenerationKeys(genMap);
    const overviewMode = allPeople.length >= OVERVIEW_MODE_THRESHOLD || largeDemoMode;
    setTreeModeCopy(overviewMode);
    setTreeView(getPreferredTreeView(overviewMode, familyId), { persist: false, updateUrl: false });
    updateChartFrameSource(familyId, largeDemoMode || !familyId);
    populateTreeFocusOptions(allPeople);
    clearTreeFocus();
    const { input: focusInput } = getTreeFocusElements();
    if (focusInput && initialTreeQuery) {
      focusInput.value = initialTreeQuery;
    }
    setTreeFocusStatus(overviewMode
      ? `Search ${allPeople.length} people to jump directly to a card.`
      : `Search ${allPeople.length} people in this tree.`);
    renderBirthdayCalendar(allPeople, familyId, { isDemoMode: largeDemoMode });
    renderMissingInfoChecklist(allPeople, familyId, { isDemoMode: largeDemoMode });
    renderFamilyStats(allPeople);

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
      focusPersonInTree(pendingHighlightPersonId || initialFocusPersonId);
    }
    pendingHighlightPersonId = null;
  } catch (err) {
    console.error("Error loading family tree:", err);
    setTreeView("cards", { persist: false, updateUrl: false });
    setTreeMessage(treeLayout, "Could not load this family tree. Refresh the page, then confirm this account has access.");
  }
}

function setTreeMessage(treeLayout, message) {
  lastRenderedPeople = [];
  document.body.classList.remove("tree-card-layout-ready", "tree-card-cue-ready");
  treeLayout.replaceChildren();
  treeLayout.classList.remove("tree-overview-mode");
  setTreeModeCopy(false);
  populateTreeFocusOptions([]);
  clearTreeFocus();
  renderBirthdayCalendar([], null, { isDemoMode: false });
  renderMissingInfoChecklist([], null, { isDemoMode: false });
  renderFamilyStats([]);
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
  setupTreeFullscreenButton();
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
