const chartEmbedParams = new URLSearchParams(window.location.search);

if (chartEmbedParams.get("embed") === "tree") {
  document.documentElement.classList.add("chart-embed-page");
}
