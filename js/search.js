import {
  getAllPeople,
  toTitleFullName,
  normalizeNamePart,
  buildFullName,
  derivePersonChildren,
  resolvePersonParentIds,
  resolvePersonSpouseIds,
} from "./helpers.js?v=20260522-11";
import { db } from "./firebase.js?v=20260522-11";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";
import { resolveCurrentUserFamilyId } from "./familyContext.js?v=20260522-11";

let allPeople = [];
let currentFamilyId = null;
let currentSearchQuery = "";
let currentSearchScope = "example";
let currentDirectorySort = "name";

function getQueryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("query") || params.get("q") || "";
}

function setSearchContext(message) {
  const contextEl = document.getElementById("searchContext");
  if (contextEl) contextEl.textContent = message;
}

function setSearchFormDisabled(form, disabled) {
  if (!form) return;
  form.querySelectorAll("input, button, select, textarea").forEach(control => {
    control.disabled = disabled;
  });
}

function getPersonDisplayName(person) {
  return toTitleFullName(person?.firstName || "", person?.lastName || "") || "Unnamed";
}

function getInitials(person) {
  const first = person?.firstName ? String(person.firstName).trim().charAt(0) : "";
  const last = person?.lastName ? String(person.lastName).trim().charAt(0) : "";
  return `${first}${last}`.toUpperCase() || "?";
}

function hasMeaningfulMemoryBio(person) {
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

function formatDirectoryBirthday(person) {
  const date = getBirthdayDate(person);
  if (!date) return "Birthday unknown";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getMissingInfoLabels(person, people) {
  const labels = [];
  if (!getBirthdayDate(person)) labels.push("birthday");
  if (!person?.image) labels.push("photo");
  if (resolvePersonParentIds(person, people).length < 2) labels.push("parents");
  if (resolvePersonSpouseIds(person, people).length === 0) labels.push("partner");
  if (derivePersonChildren(person, people).length === 0) labels.push("children");
  if (!hasMeaningfulMemoryBio(person)) labels.push("story");
  return labels;
}

function buildProfileUrl(person, familyId = null) {
  const params = new URLSearchParams();
  params.set("person", person.id);
  if (familyId) params.set("familyId", familyId);
  if (currentSearchQuery) params.set("query", currentSearchQuery);
  if (currentDirectorySort && currentDirectorySort !== "name") params.set("sort", currentDirectorySort);
  params.set("from", "search");
  return `/profile?${params.toString()}`;
}

async function getFamilySearchLabel(familyId) {
  if (!familyId) return "the example tree";

  try {
    const familySnap = await getDoc(doc(db, "families", familyId));
    const familyName = familySnap.exists() ? String(familySnap.data().name || "").trim() : "";
    return familyName || "this private family tree";
  } catch (error) {
    console.warn("Could not load family name for search context:", error);
    return "this private family tree";
  }
}

/**
 * Render a single search result card that links to the profile page.
 */
function createResultCard(person, familyId = null) {
  const link = document.createElement("a");
  link.href = buildProfileUrl(person, familyId);
  link.className = "person-card search-result-card";

  const fullTitleName = toTitleFullName(person.firstName, person.lastName);

  const header = document.createElement("div");
  header.className = "directory-card-header";

  const heading = document.createElement("h3");
  heading.textContent = fullTitleName || "Unnamed";

  const avatar = document.createElement("span");
  avatar.className = "directory-avatar";
  if (person.image) {
    const image = document.createElement("img");
    image.src = person.image;
    image.alt = "";
    image.loading = "lazy";
    avatar.appendChild(image);
  } else {
    avatar.textContent = getInitials(person);
  }

  header.append(heading, avatar);
  link.appendChild(header);

  const born = document.createElement("p");
  born.className = "directory-card-meta";
  born.textContent = formatDirectoryBirthday(person);
  link.appendChild(born);

  if (person.generation != null) {
    const generation = document.createElement("p");
    generation.className = "directory-card-meta";
    generation.textContent = `Generation: ${person.generation}`;
    link.appendChild(generation);
  }

  const missing = getMissingInfoLabels(person, allPeople);
  const badges = document.createElement("div");
  badges.className = "directory-badges";

  if (person.image) {
    const tag = document.createElement("span");
    tag.className = "directory-badge";
    tag.textContent = "photo";
    badges.appendChild(tag);
  }
  if (hasMeaningfulMemoryBio(person)) {
    const tag = document.createElement("span");
    tag.className = "directory-badge";
    tag.textContent = "story";
    badges.appendChild(tag);
  }
  missing.slice(0, 3).forEach(label => {
    const tag = document.createElement("span");
    tag.className = "directory-badge is-warning";
    tag.textContent = `needs ${label}`;
    badges.appendChild(tag);
  });
  if (missing.length > 3) {
    const tag = document.createElement("span");
    tag.className = "directory-badge is-warning";
    tag.textContent = `+${missing.length - 3} more`;
    badges.appendChild(tag);
  }
  link.appendChild(badges);

  return link;
}

function createMemoryCard(person, familyId = null) {
  const link = document.createElement("a");
  link.className = "memory-card";
  link.href = buildProfileUrl(person, familyId);

  const media = document.createElement("div");
  media.className = "memory-card-media";
  if (person.image) {
    const image = document.createElement("img");
    image.src = person.image;
    image.alt = "";
    image.loading = "lazy";
    media.appendChild(image);
  } else {
    const initials = document.createElement("span");
    initials.className = "memory-card-initials";
    initials.textContent = getInitials(person);
    media.appendChild(initials);
  }

  const body = document.createElement("div");
  body.className = "memory-card-body";

  const heading = document.createElement("h3");
  heading.textContent = getPersonDisplayName(person);

  const copy = document.createElement("p");
  const bio = String(person.bio || "").trim();
  copy.textContent = hasMeaningfulMemoryBio(person)
    ? (bio.length > 180 ? `${bio.slice(0, 177).trim()}...` : bio)
    : "Photo added. Open the profile to add a story or memory.";

  const tags = document.createElement("div");
  tags.className = "memory-card-tags";
  if (person.image) {
    const photoTag = document.createElement("span");
    photoTag.className = "memory-card-tag";
    photoTag.textContent = "Photo";
    tags.appendChild(photoTag);
  }
  if (hasMeaningfulMemoryBio(person)) {
    const storyTag = document.createElement("span");
    storyTag.className = "memory-card-tag";
    storyTag.textContent = "Story";
    tags.appendChild(storyTag);
  }

  body.append(heading, copy, tags);
  link.append(media, body);
  return link;
}

function renderMemoryWall(people, familyId = null) {
  const wall = document.getElementById("memoryWall");
  if (!wall) return;

  wall.replaceChildren();

  if (!people || people.length === 0) {
    wall.appendChild(createSearchMessage("Load a tree to see family memories."));
    return;
  }

  const memoryPeople = people
    .filter(person => person?.image || hasMeaningfulMemoryBio(person))
    .sort((a, b) => {
      const aScore = (a.image ? 2 : 0) + (hasMeaningfulMemoryBio(a) ? 1 : 0);
      const bScore = (b.image ? 2 : 0) + (hasMeaningfulMemoryBio(b) ? 1 : 0);
      return bScore - aScore || getPersonDisplayName(a).localeCompare(getPersonDisplayName(b));
    });

  if (memoryPeople.length === 0) {
    wall.appendChild(createSearchMessage("No photos or story notes have been added yet. Open a profile to add the first memory."));
    return;
  }

  const summary = document.createElement("p");
  summary.className = "search-summary";
  summary.textContent = `${memoryPeople.length} ${memoryPeople.length === 1 ? "memory" : "memories"} ready to browse.`;
  wall.appendChild(summary);

  const grid = document.createElement("div");
  grid.className = "memory-wall-grid";
  memoryPeople.slice(0, 12).forEach(person => {
    grid.appendChild(createMemoryCard(person, familyId));
  });
  wall.appendChild(grid);
}

/**
 * Core search logic: filter allPeople and render results.
 */
function runSearch(rawQuery, resultsContainer) {
  resultsContainer.replaceChildren();

  const trimmed = rawQuery.trim();
  currentSearchQuery = trimmed;

  if (allPeople.length === 0) {
    resultsContainer.appendChild(createSearchMessage("No people are available in this tree yet."));
    return;
  }

  const q = normalizeNamePart(trimmed);

  const matches = trimmed ? allPeople.filter((person) => {
    const full = buildFullName(person.firstName, person.lastName);
    return full.includes(q);
  }) : [...allPeople];


  if (matches.length === 0) {
    const noResults = document.createElement("div");
    noResults.className = "empty-state";

    const heading = document.createElement("h3");
    heading.textContent = "No matching people";
    noResults.appendChild(heading);

    const copy = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = trimmed;
    copy.append("No directory results for ", strong, `. Try a shorter name, a last name, or add the person if they are missing from ${currentSearchScope}.`);
    noResults.appendChild(copy);
    resultsContainer.appendChild(noResults);
    return;
  }

  const summary = document.createElement("p");
  summary.className = "search-summary";
  const sortedMatches = sortDirectoryPeople(matches);
  summary.textContent = trimmed
    ? `${matches.length} ${matches.length === 1 ? "match" : "matches"} found in ${currentSearchScope}`
    : `${matches.length} ${matches.length === 1 ? "person" : "people"} in ${currentSearchScope}`;
  resultsContainer.appendChild(summary);

  const list = document.createElement("div");
  list.className = "search-results-list";

  sortedMatches.forEach((person) => {
    const card = createResultCard(person, currentFamilyId);
    list.appendChild(card);
  });

  resultsContainer.appendChild(list);
}

function sortDirectoryPeople(people) {
  return [...people].sort((a, b) => {
    if (currentDirectorySort === "generation") {
      const generationCompare = (Number(a.generation) || 999) - (Number(b.generation) || 999);
      if (generationCompare !== 0) return generationCompare;
    }

    if (currentDirectorySort === "birthday") {
      const aTime = getBirthdayDate(a)?.getTime() || Number.MAX_SAFE_INTEGER;
      const bTime = getBirthdayDate(b)?.getTime() || Number.MAX_SAFE_INTEGER;
      if (aTime !== bTime) return aTime - bTime;
    }

    if (currentDirectorySort === "missing") {
      const missingCompare = getMissingInfoLabels(b, allPeople).length - getMissingInfoLabels(a, allPeople).length;
      if (missingCompare !== 0) return missingCompare;
    }

    return getPersonDisplayName(a).localeCompare(getPersonDisplayName(b));
  });
}

function updateSearchUrl(rawQuery) {
  const queryText = rawQuery.trim();
  const url = new URL(window.location.href);

  if (queryText) {
    url.searchParams.set("query", queryText);
  } else {
    url.searchParams.delete("query");
  }

  if (currentFamilyId) {
    url.searchParams.set("familyId", currentFamilyId);
  }

  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function createSearchMessage(message) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  const heading = document.createElement("h3");
  heading.textContent = "Directory status";
  const copy = document.createElement("p");
  copy.textContent = message;
  empty.append(heading, copy);
  return empty;
}

/**
 * Initialize search page. This will silently no-op on pages that
 * don't have the search elements.
 */
async function initSearchPage() {
  const form = document.getElementById("search-form");
  const input = document.getElementById("search-input");
  const sortSelect = document.getElementById("directorySort");
  const resultsContainer = document.getElementById("search-results");

  if (!form || !input || !resultsContainer) {
    return;
  }

  const resolvedFamily = await resolveCurrentUserFamilyId();
  currentFamilyId = resolvedFamily.familyId;
  const searchLabel = await getFamilySearchLabel(currentFamilyId);
  currentSearchScope = currentFamilyId ? searchLabel : "the read-only example tree";
  setSearchContext(currentFamilyId
    ? `Searching ${searchLabel}.`
    : "Searching the read-only example tree. Sign in to search your private family tree.");

  const queryFromUrl = getQueryFromUrl();
  if (queryFromUrl) {
    input.value = queryFromUrl;
  }
  if (sortSelect) {
    const requestedSort = new URLSearchParams(window.location.search).get("sort");
    if (["name", "generation", "birthday", "missing"].includes(requestedSort)) {
      sortSelect.value = requestedSort;
      currentDirectorySort = requestedSort;
    }
  }

  if (currentFamilyId && !resolvedFamily.user) {
    setSearchFormDisabled(form, true);
    setSearchContext("This is a private family tree. Sign in to search it.");
    resultsContainer.replaceChildren();
    resultsContainer.appendChild(createSearchMessage("Sign in with an invited account to search this private family tree."));
    renderMemoryWall([]);
    return;
  }

  if (resolvedFamily.user && !currentFamilyId) {
    setSearchFormDisabled(form, true);
    setSearchContext("No private family tree is connected to this account yet.");
    resultsContainer.replaceChildren();
    resultsContainer.appendChild(createSearchMessage("No private family tree is connected to this account yet. Open Account to start one or join with a code."));
    renderMemoryWall([]);
    return;
  }

  setSearchFormDisabled(form, false);

  try {
    allPeople = await getAllPeople(currentFamilyId);
    runSearch(input.value, resultsContainer);
    renderMemoryWall(allPeople, currentFamilyId);
  } catch (err) {
    console.error("Error loading people for search:", err);
    setSearchContext("Search data could not load.");
    setSearchFormDisabled(form, true);
    resultsContainer.replaceChildren();
    resultsContainer.appendChild(createSearchMessage("Could not load people for this search. Refresh the page, then confirm this account has access to the selected tree."));
    renderMemoryWall([]);
    return;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    updateSearchUrl(input.value);
    runSearch(input.value, resultsContainer);
  });

  input.addEventListener("input", () => {
    updateSearchUrl(input.value);
    runSearch(input.value, resultsContainer);
  });

  sortSelect?.addEventListener("change", () => {
    currentDirectorySort = sortSelect.value || "name";
    const url = new URL(window.location.href);
    if (currentDirectorySort === "name") {
      url.searchParams.delete("sort");
    } else {
      url.searchParams.set("sort", currentDirectorySort);
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    runSearch(input.value, resultsContainer);
  });

  window.addEventListener("popstate", () => {
    input.value = getQueryFromUrl();
    const requestedSort = new URLSearchParams(window.location.search).get("sort");
    currentDirectorySort = ["name", "generation", "birthday", "missing"].includes(requestedSort) ? requestedSort : "name";
    if (sortSelect) sortSelect.value = currentDirectorySort;
    runSearch(input.value, resultsContainer);
  });

  window.addEventListener("person-added", async (event) => {
    const queryBeforeRefresh = input.value;
    const addedName = event.detail?.name || "that person";
    updateSearchUrl(queryBeforeRefresh);
    setSearchContext(`Added ${addedName}. Refreshing ${currentSearchScope} without changing your search.`);

    try {
      allPeople = await getAllPeople(currentFamilyId);
      input.value = queryBeforeRefresh;
      updateSearchUrl(queryBeforeRefresh);
      runSearch(queryBeforeRefresh, resultsContainer);
      renderMemoryWall(allPeople, currentFamilyId);
      setSearchContext(queryBeforeRefresh
        ? `Added ${addedName}. Still searching ${currentSearchScope} for "${queryBeforeRefresh}".`
        : `Added ${addedName}. Search ${allPeople.length} ${allPeople.length === 1 ? "person" : "people"} in ${currentSearchScope}.`);
    } catch (err) {
      console.error("Error refreshing search data:", err);
      input.value = queryBeforeRefresh;
      updateSearchUrl(queryBeforeRefresh);
      setSearchContext("The person was added, but Search could not refresh yet. Try reloading this page.");
    }
  });
}


document.addEventListener("DOMContentLoaded", initSearchPage);
