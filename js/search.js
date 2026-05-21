import {
  getAllPeople,
  toTitleFullName,
  normalizeNamePart,
  buildFullName,
} from "./helpers.js?v=20260521-3";
import { resolveCurrentUserFamilyId } from "./familyContext.js?v=20260521-3";

let allPeople = [];
let currentFamilyId = null;

/**
 * Render a single search result card that links to the profile page.
 */
function createResultCard(person, familyId = null) {
  const link = document.createElement("a");
  let profileUrl = `/profile?person=${encodeURIComponent(person.id)}`;
  if (familyId) {
    profileUrl += `&familyId=${encodeURIComponent(familyId)}`;
  }
  profileUrl += "&from=search";
  link.href = profileUrl;
  link.className = "person-card search-result-card";

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

  const heading = document.createElement("h3");
  heading.textContent = fullTitleName || "Unnamed";
  link.appendChild(heading);

  const born = document.createElement("p");
  born.textContent = `Birthday: ${formattedDate}`;
  link.appendChild(born);

  if (person.generation != null) {
    const generation = document.createElement("p");
    generation.textContent = `Generation: ${person.generation}`;
    link.appendChild(generation);
  }

  return link;
}

/**
 * Core search logic: filter allPeople and render results.
 */
function runSearch(rawQuery, resultsContainer) {
  resultsContainer.replaceChildren();

  const trimmed = rawQuery.trim();
  if (!trimmed) {
    resultsContainer.appendChild(createSearchMessage(
      allPeople.length === 0
        ? "No people are available to search yet."
        : `Search ${allPeople.length} ${allPeople.length === 1 ? "person" : "people"} in this tree.`
    ));
    return;
  }

  const q = normalizeNamePart(trimmed);

  const matches = allPeople.filter((person) => {
    const full = buildFullName(person.firstName, person.lastName);
    return full.includes(q);
  });


  if (matches.length === 0) {
    const noResults = document.createElement("div");
    noResults.className = "empty-state";

    const heading = document.createElement("h3");
    heading.textContent = "No matching people";
    noResults.appendChild(heading);

    const copy = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = trimmed;
    copy.append("No results for ", strong, ". Try a shorter name, a last name, or add the person if they are missing.");
    noResults.appendChild(copy);
    resultsContainer.appendChild(noResults);
    return;
  }

  const summary = document.createElement("p");
  summary.className = "search-summary";
  summary.textContent = `${matches.length} ${matches.length === 1 ? "match" : "matches"} found`;
  resultsContainer.appendChild(summary);

  const list = document.createElement("div");
  list.className = "search-results-list";

  matches.forEach((person) => {
    const card = createResultCard(person, currentFamilyId);
    list.appendChild(card);
  });

  resultsContainer.appendChild(list);
}

function createSearchMessage(message) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  const copy = document.createElement("p");
  copy.textContent = message;
  empty.appendChild(copy);
  return empty;
}

/**
 * Initialize search page. This will silently no-op on pages that
 * don't have the search elements.
 */
async function initSearchPage() {
  const form = document.getElementById("search-form");
  const input = document.getElementById("search-input");
  const resultsContainer = document.getElementById("search-results");

  if (!form || !input || !resultsContainer) {
    return;
  }

  const resolvedFamily = await resolveCurrentUserFamilyId();
  currentFamilyId = resolvedFamily.familyId;

  if (resolvedFamily.user && !currentFamilyId) {
    resultsContainer.replaceChildren();
    resultsContainer.appendChild(createSearchMessage("No private family tree is connected to this account yet. Open Account to start one or join with a code."));
    return;
  }

  try {
    allPeople = await getAllPeople(currentFamilyId);
    runSearch(input.value, resultsContainer);
  } catch (err) {
    console.error("Error loading people for search:", err);
    resultsContainer.replaceChildren();
    const error = document.createElement("p");
    error.textContent = "Error loading search data.";
    resultsContainer.appendChild(error);
    return;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    runSearch(input.value, resultsContainer);
  });

  input.addEventListener("input", () => {
    runSearch(input.value, resultsContainer);
  });

  window.addEventListener("person-added", async () => {
    try {
      allPeople = await getAllPeople(currentFamilyId);
      runSearch(input.value, resultsContainer);
    } catch (err) {
      console.error("Error refreshing search data:", err);
    }
  });
}


document.addEventListener("DOMContentLoaded", initSearchPage);
