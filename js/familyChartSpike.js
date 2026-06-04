import { generateLargeDemoTree } from "./demoTreeData.js?v=20260522-11";
import {
  canEditFamily,
  derivePersonChildren,
  getAllPeople,
  resolvePersonParentIds,
  resolvePersonSpouseIds,
  toTitle,
  toTitleFullName,
} from "./helpers.js?v=20260522-11";
import { resolveCurrentUserFamilyId } from "./familyContext.js?v=20260522-11";
import { db } from "./firebase.js?v=20260522-11";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";

const statusEl = document.getElementById("layoutSpikeStatus");
const mappingStatusEl = document.getElementById("relationshipMappingStatus");
const personSearchInput = document.getElementById("personSearchInput");
const personSearchBtn = document.getElementById("personSearchBtn");
const personSearchOptions = document.getElementById("personSearchOptions");
const personSearchHelp = document.getElementById("personSearchHelp");
const focusSelect = document.getElementById("focusPersonSelect");
const fitBtn = document.getElementById("fitChartBtn");
const resetBtn = document.getElementById("resetChartBtn");
const zoomInBtn = document.getElementById("zoomInChartBtn");
const zoomOutBtn = document.getElementById("zoomOutChartBtn");
const verticalBtn = document.getElementById("verticalChartBtn");
const horizontalBtn = document.getElementById("horizontalChartBtn");
const chartContainer = document.getElementById("FamilyChartSpike");
const sourceTreeLink = document.getElementById("chartSourceTreeLink");
const selectedPersonPanel = document.getElementById("selectedPersonPanel");
const selectedPersonName = document.getElementById("selectedPersonName");
const selectedPersonMeta = document.getElementById("selectedPersonMeta");
const selectedPersonBirthday = document.getElementById("selectedPersonBirthday");
const selectedPersonParents = document.getElementById("selectedPersonParents");
const selectedPersonSpouses = document.getElementById("selectedPersonSpouses");
const selectedPersonChildren = document.getElementById("selectedPersonChildren");
const selectedPersonFocusBtn = document.getElementById("selectedPersonFocusBtn");
const selectedPersonProfileLink = document.getElementById("selectedPersonProfileLink");
const selectedPersonEditLink = document.getElementById("selectedPersonEditLink");
const MOBILE_LAYOUT_QUERY = "(max-width: 820px)";

let chart = null;
let chartData = [];
let initialPersonId = null;
let selectedPersonId = null;
let currentSource = {
  familyId: null,
  canEdit: false,
  isDemo: true,
  source: "demo",
};
let relationshipAudit = {
  parentLinks: 0,
  spouseLinks: 0,
  childrenLinks: 0,
  warnings: [],
};
const f3 = window.f3;

function isEmbedMode() {
  return new URLSearchParams(window.location.search).get("embed") === "tree";
}

function notifyTreeFrameStatus(status, message = "") {
  if (!isEmbedMode() || window.parent === window) return;

  window.parent.postMessage({
    type: "tree-chart-status",
    status,
    message,
  }, window.location.origin);
}

function notifyTreeFrameHeight() {
  if (!isEmbedMode() || window.parent === window) return;

  const height = Math.ceil(Math.max(
    document.documentElement.scrollHeight,
    document.body?.scrollHeight || 0,
    document.querySelector(".layout-spike-main")?.scrollHeight || 0
  ));

  window.parent.postMessage({
    type: "tree-chart-resize",
    height,
  }, window.location.origin);
}

function notifyTreePersonSelected(personId) {
  if (!isEmbedMode() || window.parent === window || !personId) return;

  window.parent.postMessage({
    type: "tree-chart-person-selected",
    personId,
  }, window.location.origin);
}

function setupEmbedResizeObserver() {
  if (!isEmbedMode() || window.parent === window) return;

  const resizeObserver = new ResizeObserver(() => notifyTreeFrameHeight());
  resizeObserver.observe(document.documentElement);
  if (document.body) resizeObserver.observe(document.body);
  const main = document.querySelector(".layout-spike-main");
  if (main) resizeObserver.observe(main);
  window.addEventListener("load", notifyTreeFrameHeight);
  window.setTimeout(notifyTreeFrameHeight, 250);
  window.setTimeout(notifyTreeFrameHeight, 900);
}

if (isEmbedMode()) {
  document.body.classList.add("chart-embed");
}

const FEMALE_FIRST_NAMES = new Set([
  "ada", "arden", "avery", "blair", "clara", "cleo", "eden", "elle", "emery",
  "esme", "evelyn", "faye", "finley", "iris", "ivy", "jamie", "june", "lena",
  "lila", "mae", "maeve", "mara", "mina", "mira", "nia", "nora", "poppy",
  "quinn", "reese", "riley", "rose", "ruth", "sage", "skye", "tess", "vera",
  "wren", "zara",
]);

function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

function setMappingStatus(message, tone = "neutral") {
  if (!mappingStatusEl) return;
  mappingStatusEl.textContent = message;
  mappingStatusEl.dataset.tone = tone;
}

function isMobileLayout() {
  return Boolean(window.matchMedia?.(MOBILE_LAYOUT_QUERY).matches);
}

function scrollMobileIntoView(element, delay = 120) {
  if (!element || !isMobileLayout()) return;

  window.setTimeout(() => {
    const behavior = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    element.scrollIntoView({
      behavior,
      block: "start",
      inline: "nearest",
    });
  }, delay);
}

function getMobileScrollTarget(target) {
  if (target === "chart") return chartContainer;
  if (target === "panel") return selectedPersonPanel;
  return null;
}

function isLargeDemoMode() {
  return new URLSearchParams(window.location.search).get("demo") === "large";
}

function formatBirthDate(value) {
  if (value && typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return "Unknown birthday";
}

function getBirthYear(value) {
  if (value && typeof value.toDate === "function") {
    const year = value.toDate().getFullYear();
    return Number.isFinite(year) ? String(year) : "";
  }

  return "";
}

function inferGender(person) {
  return FEMALE_FIRST_NAMES.has(String(person.firstName || "").toLowerCase()) ? "F" : "M";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getSafeImageSrc(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  if (/^data:image\/(?:gif|jpeg|jpg|png|webp);base64,/i.test(rawValue)) {
    return rawValue;
  }

  try {
    const url = new URL(rawValue);
    return url.protocol === "https:" ? url.toString() : "";
  } catch (error) {
    return "";
  }
}

function getInitials(firstName, lastName) {
  return `${String(firstName || "").charAt(0)}${String(lastName || "").charAt(0)}`.toUpperCase() || "?";
}

function buildRawName(firstName, lastName) {
  return `${String(firstName || "").trim()} ${String(lastName || "").trim()}`.trim();
}

function hasLegacyParentFields(person) {
  return Boolean(String(person?.parent1 || "").trim() || String(person?.parent2 || "").trim());
}

function hasLegacySpouseFields(person) {
  return Boolean(buildRawName(person?.spouseFirstName, person?.spouseLastName));
}

function getChartPerson(personId) {
  return chartData.find(item => item.id === personId) || null;
}

function getPersonLabel(personId) {
  const person = getChartPerson(personId);
  return person?.data?.originalName || personId || "Unknown";
}

function formatRelationshipList(personIds) {
  const labels = [...new Set(personIds || [])]
    .filter(Boolean)
    .map(getPersonLabel)
    .filter(Boolean);

  if (labels.length === 0) return "Unknown";
  if (labels.length <= 4) return labels.join(", ");
  return `${labels.slice(0, 4).join(", ")} and ${labels.length - 4} more`;
}

function normalizeSearchValue(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getSearchLabels(person) {
  const firstName = person?.data?.["first name"] || "";
  const lastName = person?.data?.["last name"] || "";
  const originalName = person?.data?.originalName || `${firstName} ${lastName}`;
  return [
    originalName,
    `${firstName} ${lastName}`,
    `${lastName} ${firstName}`,
    firstName,
    lastName,
  ].filter(Boolean);
}

function findPersonBySearch(query) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return null;

  const sortedPeople = [...chartData].sort((a, b) => getPersonLabel(a.id).localeCompare(getPersonLabel(b.id)));
  const rankedMatches = [
    (label) => label === normalizedQuery,
    (label) => label.startsWith(normalizedQuery),
    (label) => label.includes(normalizedQuery),
  ];

  for (const matcher of rankedMatches) {
    const match = sortedPeople.find(person => getSearchLabels(person).some(label => matcher(normalizeSearchValue(label))));
    if (match) return match;
  }

  return null;
}

function mapToFamilyChartData(people) {
  function getParentIds(person) {
    return resolvePersonParentIds(person, people);
  }

  return people.map(person => {
    const spouseIds = resolvePersonSpouseIds(person, people);
    const children = derivePersonChildren(person, people).map(child => child.id);
    const parents = getParentIds(person);

    return {
      id: person.id,
      data: {
        "first name": toTitle(person.firstName || ""),
        "last name": toTitle(person.lastName || ""),
        birthday: formatBirthDate(person.birthDate),
        birthYear: getBirthYear(person.birthDate),
        gender: inferGender(person),
        image: getSafeImageSrc(person.image),
        initials: getInitials(person.firstName, person.lastName),
        originalName: toTitleFullName(person.firstName || "", person.lastName || ""),
      },
      rels: {
        parents,
        spouses: [...spouseIds],
        children,
      },
    };
  });
}

function analyzeRelationshipMapping(people, data) {
  const peopleIds = new Set(people.map(person => person.id).filter(Boolean));
  const warnings = [];
  let parentLinks = 0;
  let spouseLinks = 0;
  let childrenLinks = 0;

  data.forEach(person => {
    parentLinks += person.rels?.parents?.length || 0;
    spouseLinks += person.rels?.spouses?.length || 0;
    childrenLinks += person.rels?.children?.length || 0;
  });

  people.forEach(person => {
    const mappedPerson = data.find(item => item.id === person.id);
    if (!mappedPerson) return;

    const rawParentIds = Array.isArray(person.parentIds) ? person.parentIds.filter(Boolean) : [];
    const rawSpouseIds = Array.isArray(person.spouseIds) ? person.spouseIds.filter(Boolean) : [];
    const missingParentIds = rawParentIds.filter(parentId => !peopleIds.has(parentId));
    const missingSpouseIds = rawSpouseIds.filter(spouseId => !peopleIds.has(spouseId));

    if (missingParentIds.length > 0) {
      warnings.push(`${getPersonLabel(person.id)} has missing parent IDs: ${missingParentIds.join(", ")}`);
    }

    if (missingSpouseIds.length > 0) {
      warnings.push(`${getPersonLabel(person.id)} has missing spouse IDs: ${missingSpouseIds.join(", ")}`);
    }

    if (hasLegacyParentFields(person) && (mappedPerson.rels?.parents?.length || 0) === 0) {
      warnings.push(`${getPersonLabel(person.id)} has legacy parent names that did not resolve.`);
    }

    if (hasLegacySpouseFields(person) && (mappedPerson.rels?.spouses?.length || 0) === 0) {
      warnings.push(`${getPersonLabel(person.id)} has a legacy spouse name that did not resolve.`);
    }
  });

  return {
    parentLinks,
    spouseLinks,
    childrenLinks,
    warnings,
  };
}

function getProfileUrl(personId, options = {}) {
  if (!personId || currentSource.isDemo || !currentSource.familyId) return "";

  const currentParams = new URLSearchParams(window.location.search);
  const params = new URLSearchParams({
    person: personId,
    familyId: currentSource.familyId,
    from: "tree",
  });

  if (isEmbedMode()) {
    params.set("view", "chart");
  }

  const treeQuery = currentParams.get("treeQuery") || "";
  if (treeQuery) {
    params.set("treeQuery", treeQuery);
  }

  if (options.edit) {
    params.set("edit", "1");
  }

  return `/profile?${params.toString()}`;
}

function formatChartStatus() {
  const label = currentSource.source === "demo-fallback"
    ? "Showing demo chart"
    : currentSource.isDemo ? "Demo chart" : "Private family chart";
  const sourceDetail = currentSource.isDemo
    ? ""
    : "";
  const fallbackDetail = currentSource.source === "demo-fallback"
    ? " Sign in to preview the requested private family tree."
    : "";
  const warningDetail = relationshipAudit.warnings.length > 0
    ? ` ${relationshipAudit.warnings.length} relationship note${relationshipAudit.warnings.length === 1 ? "" : "s"} need review.`
    : "";

  return `${label}: loaded ${chartData.length} people and their family connections.${warningDetail}${sourceDetail}${fallbackDetail}`;
}

function updateMappingStatus() {
  if (relationshipAudit.warnings.length === 0) {
    setMappingStatus("Family connections loaded cleanly for this chart.", "success");
    return;
  }

  setMappingStatus(
    `${relationshipAudit.warnings.length} relationship mapping note${relationshipAudit.warnings.length === 1 ? "" : "s"}: ${relationshipAudit.warnings.slice(0, 2).join(" ")}${relationshipAudit.warnings.length > 2 ? " More are available in the browser console." : ""}`,
    "warning"
  );
  console.warn("Family Chart relationship mapping notes:", relationshipAudit.warnings);
}

function createPersonCardHtml(d) {
  const data = d.data?.data || {};
  const personId = escapeHtml(d.data?.id || "");
  const firstName = escapeHtml(data["first name"]);
  const lastName = escapeHtml(data["last name"]);
  const fullName = escapeHtml(data.originalName || `${firstName} ${lastName}`.trim());
  const birthday = escapeHtml(data.birthday || "Unknown birthday");
  const birthYear = data.birthYear ? `Born ${escapeHtml(data.birthYear)}` : birthday;
  const initials = escapeHtml(data.initials || "?");
  const image = getSafeImageSrc(data.image);
  const duplicateTag = d.duplicate ? `<span class="f3-card-duplicate-tag">x${escapeHtml(d.duplicate)}</span>` : "";

  return `
    <div class="card-inner tree-card-node" data-person-id="${personId}">
      <div class="tree-card-media" aria-hidden="true">
        ${image ? `<img class="tree-card-photo" src="${escapeHtml(image)}" alt="" loading="lazy">` : `<span class="tree-card-initials">${initials}</span>`}
      </div>
      <div class="tree-card-copy">
        <div class="tree-card-name" title="${fullName}">${firstName} ${lastName}</div>
        <div class="tree-card-birth">${birthYear}</div>
      </div>
      ${duplicateTag}
    </div>
  `;
}

function populateFocusSelect(data) {
  if (!focusSelect) return;

  const sorted = [...data].sort((a, b) => {
    const aName = `${a.data["last name"]} ${a.data["first name"]}`;
    const bName = `${b.data["last name"]} ${b.data["first name"]}`;
    return aName.localeCompare(bName);
  });

  focusSelect.replaceChildren();
  sorted.forEach(person => {
    const option = document.createElement("option");
    option.value = person.id;
    option.textContent = person.data.originalName || person.id;
    focusSelect.appendChild(option);
  });

  if (personSearchOptions) {
    personSearchOptions.replaceChildren();
    sorted.forEach(person => {
      const option = document.createElement("option");
      option.value = person.data.originalName || person.id;
      personSearchOptions.appendChild(option);
    });
  }
}

function getChartPersonName(personId) {
  const person = getChartPerson(personId);
  return person?.data?.originalName || "that person";
}

function updateSelectedCardState() {
  if (!chartContainer) return;
  const selectedPerson = getChartPerson(selectedPersonId);
  const immediateFamilyIds = new Set([
    ...(selectedPerson?.rels?.parents || []),
    ...(selectedPerson?.rels?.spouses || []),
    ...(selectedPerson?.rels?.children || []),
  ].filter(Boolean));

  chartContainer.classList.toggle("has-path-highlight", Boolean(selectedPersonId));

  chartContainer.querySelectorAll(".tree-card-node.is-selected, .tree-card-node.is-immediate-family, .tree-card-node.is-dimmed").forEach(card => {
    card.classList.remove("is-selected");
    card.classList.remove("is-immediate-family");
    card.classList.remove("is-dimmed");
  });

  if (!selectedPersonId) return;

  chartContainer.querySelectorAll(".tree-card-node[data-person-id]").forEach(card => {
    const personId = card.dataset.personId;
    if (personId === selectedPersonId) {
      card.classList.add("is-selected");
    } else if (immediateFamilyIds.has(personId)) {
      card.classList.add("is-immediate-family");
    } else {
      card.classList.add("is-dimmed");
    }
  });
}

function updateSelectedPersonPanel(personId) {
  if (!selectedPersonPanel) return;

  const person = getChartPerson(personId);
  if (!person) {
    if (selectedPersonName) selectedPersonName.textContent = "Choose someone";
    if (selectedPersonMeta) selectedPersonMeta.textContent = "Focus or click a card to see their family details.";
    if (selectedPersonBirthday) selectedPersonBirthday.textContent = "-";
    if (selectedPersonParents) selectedPersonParents.textContent = "-";
    if (selectedPersonSpouses) selectedPersonSpouses.textContent = "-";
    if (selectedPersonChildren) selectedPersonChildren.textContent = "-";
    hideSelectedPersonLink(selectedPersonProfileLink);
    hideSelectedPersonLink(selectedPersonEditLink);
    selectedPersonPanel.classList.remove("has-selection");
    return;
  }

  selectedPersonPanel.classList.add("has-selection");
  notifyTreePersonSelected(personId);
  if (selectedPersonName) selectedPersonName.textContent = person.data.originalName || person.id;
  if (selectedPersonMeta) {
    selectedPersonMeta.textContent = currentSource.isDemo
      ? "Read-only demo person. Use this panel to understand the selected branch."
      : currentSource.canEdit
        ? "Private-tree person. Edit details, photos, and relationships from here."
        : "Private-tree person. Open More details to view the full profile.";
  }
  if (selectedPersonBirthday) selectedPersonBirthday.textContent = person.data.birthday || "Unknown";
  if (selectedPersonParents) selectedPersonParents.textContent = formatRelationshipList(person.rels?.parents);
  if (selectedPersonSpouses) selectedPersonSpouses.textContent = formatRelationshipList(person.rels?.spouses);
  if (selectedPersonChildren) selectedPersonChildren.textContent = formatRelationshipList(person.rels?.children);

  if (selectedPersonProfileLink) {
    const profileUrl = getProfileUrl(person.id);
    if (!profileUrl) {
      selectedPersonProfileLink.hidden = true;
      selectedPersonProfileLink.removeAttribute("href");
      selectedPersonProfileLink.removeAttribute("target");
    } else {
      selectedPersonProfileLink.hidden = false;
      selectedPersonProfileLink.href = profileUrl;
      if (isEmbedMode()) {
        selectedPersonProfileLink.target = "_top";
      } else {
        selectedPersonProfileLink.removeAttribute("target");
      }
    }
  }

  if (selectedPersonEditLink) {
    const editUrl = currentSource.canEdit ? getProfileUrl(person.id, { edit: true }) : "";
    if (!editUrl) {
      selectedPersonEditLink.hidden = true;
      selectedPersonEditLink.removeAttribute("href");
      selectedPersonEditLink.removeAttribute("target");
    } else {
      selectedPersonEditLink.hidden = false;
      selectedPersonEditLink.href = editUrl;
      if (isEmbedMode()) {
        selectedPersonEditLink.target = "_top";
      } else {
        selectedPersonEditLink.removeAttribute("target");
      }
    }
  }

  notifyTreeFrameHeight();
}

function hideSelectedPersonLink(link) {
  if (!link) return;
  link.hidden = true;
  link.removeAttribute("href");
  link.removeAttribute("target");
}

function selectPerson(personId, { center = false, status = "", mobileScrollTarget = "" } = {}) {
  if (!personId) return;

  selectedPersonId = personId;
  if (focusSelect) focusSelect.value = personId;
  updateSelectedPersonPanel(personId);
  updateSelectedCardState();
  if (personSearchInput) personSearchInput.value = getChartPersonName(personId);

  if (center) {
    updateMainPerson(personId, "main_to_middle", { updatePanel: false, status });
    scrollMobileIntoView(getMobileScrollTarget(mobileScrollTarget), 500);
    return;
  }

  if (status) setStatus(status);
  scrollMobileIntoView(getMobileScrollTarget(mobileScrollTarget));
}

function searchAndFocusPerson() {
  const query = personSearchInput?.value || "";
  const match = findPersonBySearch(query);

  if (!match) {
    if (personSearchHelp) personSearchHelp.textContent = "No matching person found. Try a first name, last name, or both.";
    setStatus("No matching person found in this chart.");
    return;
  }

  if (personSearchHelp) {
    personSearchHelp.textContent = "Selected person, parents, spouse/partner, and children are highlighted on the chart.";
  }

  selectPerson(match.id, {
    center: true,
    status: `Found ${getChartPersonName(match.id)} and highlighted their immediate family.`,
    mobileScrollTarget: "panel",
  });
}

function handleParentTreeFocusRequest(data) {
  if (!data || data.type !== "tree-chart-focus-person") return;

  const match = getChartPerson(data.personId) || findPersonBySearch(data.query);
  if (!match) {
    setStatus("That person is not available in this chart yet.");
    return;
  }

  selectPerson(match.id, {
    center: true,
    status: `Focused ${getChartPersonName(match.id)} from tree search.`,
  });
}

function fitChart(transitionTime = 450) {
  if (!chart) {
    setStatus("The chart is still loading. Try Fit tree again in a moment.");
    return;
  }

  chart.updateTree({
    tree_position: "fit",
    transition_time: transitionTime,
  });
  window.setTimeout(updateSelectedCardState, transitionTime + 40);
}

function updateMainPerson(personId, treePosition = "main_to_middle", options = {}) {
  if (!chart || !personId) return;
  const { updatePanel = true, status = "" } = options;

  chart.updateMainId(personId);
  chart.updateTree({
    tree_position: treePosition,
    transition_time: 450,
  });

  window.setTimeout(updateSelectedCardState, 480);
  if (updatePanel) {
    selectPerson(personId, {
      center: false,
      status: status || `Focused ${getChartPersonName(personId)}. Use Fit tree to return to the full overview.`,
    });
  } else if (status) {
    setStatus(status);
  }
}

function setOrientationButtons(activeOrientation) {
  if (verticalBtn) verticalBtn.setAttribute("aria-pressed", activeOrientation === "vertical" ? "true" : "false");
  if (horizontalBtn) horizontalBtn.setAttribute("aria-pressed", activeOrientation === "horizontal" ? "true" : "false");
}

function resetChartView() {
  if (!chart || !initialPersonId) {
    setStatus("The chart is still loading. Try Reset view again in a moment.");
    return;
  }

  chart.setOrientationVertical();
  setOrientationButtons("vertical");
  chart.updateMainId(initialPersonId);
  if (focusSelect) focusSelect.value = initialPersonId;
  selectPerson(initialPersonId, { center: false });
  fitChart();
  setStatus("View reset to the full vertical family overview.");
}

function getZoomListener() {
  const svg = chartContainer?.querySelector("svg.main_svg");
  if (!svg) return null;

  if (svg.__zoomObj) return svg;
  if (svg.parentNode?.__zoomObj) return svg.parentNode;
  return null;
}

function zoomChart(amount) {
  const d3 = window.d3;
  const listener = getZoomListener();

  if (!d3 || !listener?.__zoomObj) {
    setStatus("Zoom controls are still loading. You can also scroll or pinch over the chart.");
    return;
  }

  d3.select(listener)
    .transition()
    .duration(280)
    .call(listener.__zoomObj.scaleBy, amount);

  setStatus(amount > 1 ? "Zoomed in on the chart." : "Zoomed out from the chart.");
}

function updateSourceTreeLink() {
  if (!sourceTreeLink) return;

  if (currentSource.isDemo || !currentSource.familyId) {
    sourceTreeLink.href = "/tree?demo=large";
    sourceTreeLink.textContent = "Back to current demo";
    return;
  }

  sourceTreeLink.href = `/tree?familyId=${encodeURIComponent(currentSource.familyId)}`;
  sourceTreeLink.textContent = "Back to current tree";
}

async function loadSpikePeople() {
  const params = new URLSearchParams(window.location.search);

  if (isLargeDemoMode()) {
    currentSource = { familyId: null, canEdit: false, isDemo: true, source: "demo" };
    return generateLargeDemoTree();
  }

  const resolvedFamily = await resolveCurrentUserFamilyId();
  if (!resolvedFamily.user || !resolvedFamily.familyId) {
    currentSource = { familyId: null, canEdit: false, isDemo: true, source: "demo-fallback" };
    setStatus("Sign in to preview your private tree here. Showing the large demo chart for now.");
    return generateLargeDemoTree();
  }

  const familyId = params.get("familyId") || resolvedFamily.familyId;
  let canEdit = false;
  try {
    const familySnap = await getDoc(doc(db, "families", familyId));
    canEdit = familySnap.exists() && canEditFamily(familySnap.data(), resolvedFamily.user);
  } catch (error) {
    console.warn("Could not check chart edit access:", error);
  }
  currentSource = { familyId, canEdit, isDemo: false, source: resolvedFamily.source || "firebase" };
  return getAllPeople(familyId);
}

function chooseInitialPerson(data) {
  const requestedFocusId = new URLSearchParams(window.location.search).get("focus");
  const requestedPerson = requestedFocusId
    ? data.find(person => person.id === requestedFocusId)
    : null;
  if (requestedPerson) return requestedPerson;

  if (currentSource.isDemo) {
    return data.find(person => person.id === "demo-g3-11") || data[0];
  }

  return (
    data.find(person => person.rels?.parents?.length > 0 && person.rels?.children?.length > 0) ||
    data.find(person => person.rels?.children?.length > 0) ||
    data[0]
  );
}

async function renderSpike() {
  if (!chartContainer) return;
  if (!f3?.createChart) {
    throw new Error("Family Chart browser bundle did not load.");
  }

  setStatus("Loading chart data...");
  const people = await loadSpikePeople();
  updateSourceTreeLink();

  if (!people || people.length === 0) {
    setStatus("No people are available for this chart yet.");
    notifyTreeFrameStatus("error", "No people are available for this chart yet.");
    return;
  }

  chartData = mapToFamilyChartData(people);
  relationshipAudit = analyzeRelationshipMapping(people, chartData);
  updateMappingStatus();
  populateFocusSelect(chartData);

  const initialPerson = chooseInitialPerson(chartData);
  initialPersonId = initialPerson?.id || null;
  selectedPersonId = initialPersonId;
  if (focusSelect && initialPerson) focusSelect.value = initialPerson.id;

  chart = f3.createChart("#FamilyChartSpike", chartData)
    .setTransitionTime(450)
    .setOrientationVertical()
    .setShowSiblingsOfMain(true)
    .setDuplicateBranchToggle(true)
    .setAncestryDepth(5)
    .setProgenyDepth(5)
    .setCardXSpacing(242)
    .setCardYSpacing(158);

  chart.setCardHtml()
    .setStyle("rect")
    .setCardInnerHtmlCreator(createPersonCardHtml)
    .setOnCardClick((event, datum) => {
      const personId = datum?.data?.id;
      if (!personId) return;
      selectPerson(personId, {
        center: true,
        status: `Selected ${getChartPersonName(personId)}.`,
      });
    })
    .setOnHoverPathToMain()
    .setCardDim({
      w: 220,
      h: 108,
    });

  if (initialPerson) {
    chart.updateMain(initialPerson);
  }

  chart.updateTree({
    initial: true,
    tree_position: "fit",
  });

  window.setTimeout(() => fitChart(0), 120);
  window.setTimeout(updateSelectedCardState, 180);
  updateSelectedPersonPanel(initialPersonId);
  if (personSearchInput && initialPersonId) personSearchInput.value = getChartPersonName(initialPersonId);

  setStatus(formatChartStatus());
  notifyTreeFrameStatus("ready");
  notifyTreeFrameHeight();

  window.familyChartSpike = {
    chart,
    chartData,
    currentSource,
    relationshipAudit,
    sourcePeople: people,
    mapToFamilyChartData,
  };
}

if (chartContainer) {
  setupEmbedResizeObserver();
  renderSpike().catch(error => {
    console.error("Family Chart spike failed:", error);
    setStatus(`Family Chart failed to render: ${error.message || "Unknown error"}`);
    notifyTreeFrameStatus("error", `Family Chart failed to render: ${error.message || "Unknown error"}`);
  });
}

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  handleParentTreeFocusRequest(event.data);
});

if (focusSelect) {
  focusSelect.addEventListener("change", () => {
    selectPerson(focusSelect.value, {
      center: true,
      status: `Focused ${getChartPersonName(focusSelect.value)}. Use Fit tree to return to the full overview.`,
      mobileScrollTarget: "panel",
    });
  });
}

if (personSearchBtn) {
  personSearchBtn.addEventListener("click", searchAndFocusPerson);
}

if (personSearchInput) {
  personSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchAndFocusPerson();
    }
  });
}

if (selectedPersonFocusBtn) {
  selectedPersonFocusBtn.addEventListener("click", () => {
    const personId = selectedPersonId || focusSelect?.value;
    if (!personId) return;
    selectPerson(personId, {
      center: true,
      status: `Focused ${getChartPersonName(personId)} in the chart.`,
      mobileScrollTarget: "chart",
    });
  });
}

if (fitBtn) {
  fitBtn.addEventListener("click", () => {
    fitChart();
    setStatus("Fitted the full tree overview.");
    scrollMobileIntoView(chartContainer, 220);
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    resetChartView();
    scrollMobileIntoView(chartContainer, 220);
  });
}

if (zoomInBtn) {
  zoomInBtn.addEventListener("click", () => {
    zoomChart(1.2);
    scrollMobileIntoView(chartContainer, 120);
  });
}

if (zoomOutBtn) {
  zoomOutBtn.addEventListener("click", () => {
    zoomChart(0.84);
    scrollMobileIntoView(chartContainer, 120);
  });
}

if (verticalBtn) {
  verticalBtn.addEventListener("click", () => {
    if (!chart) return;
    chart.setOrientationVertical();
    setOrientationButtons("vertical");
    fitChart();
    setStatus("Switched to vertical layout and fitted the tree.");
    scrollMobileIntoView(chartContainer, 220);
  });
}

if (horizontalBtn) {
  horizontalBtn.addEventListener("click", () => {
    if (!chart) return;
    chart.setOrientationHorizontal();
    setOrientationButtons("horizontal");
    fitChart();
    setStatus("Switched to horizontal layout and fitted the tree.");
    scrollMobileIntoView(chartContainer, 220);
  });
}
