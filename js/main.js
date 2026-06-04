import "./helpers.js?v=20260522-11";
import "./postPeople.js?v=20260522-11";
import "./tree.js?v=20260522-11";
import "./search.js?v=20260522-11";
import "./home.js?v=20260522-11";
import "./auth.js?v=20260522-11";
import "./dashboard.js?v=20260522-11";
import { getCurrentFamilyId } from "./helpers.js?v=20260522-11";

document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav a');
    const TREE_VIEWS = new Set(["chart", "cards"]);

    function getCurrentParams() {
        return new URLSearchParams(window.location.search);
    }

    function getCurrentTreeView() {
        const view = getCurrentParams().get("view");
        return TREE_VIEWS.has(view) ? view : "";
    }

    function getTreeContextParams() {
        const params = getCurrentParams();
        const context = {};
        const treeView = getCurrentTreeView();
        const focus = currentPath.includes("/profile")
            ? params.get("person") || params.get("focus") || ""
            : params.get("focus") || "";
        const searchQuery = (
            params.get("treeQuery") ||
            (currentPath.includes("/search") || params.get("from") === "search" ? params.get("query") : "") ||
            ""
        );

        if (treeView) context.view = treeView;
        if (focus) context.focus = focus;
        if (searchQuery) context.treeQuery = searchQuery;

        return context;
    }

    function buildAppUrl(path, params = {}) {
        const urlParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value) {
                urlParams.set(key, value);
            }
        });

        const queryString = urlParams.toString();
        return queryString ? `${path}?${queryString}` : path;
    }

    function updateActiveNavLinks() {
        document.querySelectorAll(".nav a, #authLink").forEach((link) => {
            link.classList.remove("active");
            link.removeAttribute("aria-current");
        });

        document.querySelectorAll(".nav a").forEach((link) => {
            const linkPath = new URL(link.href, window.location.origin).pathname;

            if (
                linkPath === currentPath ||
                (currentPath === "/" && linkPath === "/") ||
                (currentPath.includes("/tree") && linkPath === "/tree")
            ) {
                link.setAttribute("aria-current", "page");
                link.classList.add("active");
            }
        });

        const accountLink = document.getElementById("authLink");
        if (accountLink && currentPath === "/account") {
            accountLink.setAttribute("aria-current", "page");
        }
    }

    function updateFamilyNavLinks(familyId = getCurrentFamilyId()) {
        const isSignedIn = document.body.classList.contains("is-signed-in");
        const isSignedOut = document.body.classList.contains("is-signed-out");
        const treeContext = getTreeContextParams();
        document.querySelectorAll(".home-nav-item").forEach((item) => {
            item.hidden = !isSignedOut || isSignedIn;
            item.setAttribute("aria-hidden", item.hidden ? "true" : "false");
        });

        const treeNavLink = document.getElementById("treeNavLink");
        const brandHomeLink = document.getElementById("brandHomeLink");
        const accountLink = document.getElementById("authLink");

        if (treeNavLink) {
            treeNavLink.textContent = isSignedIn ? "Family Tree" : "Example Tree";
            if (isSignedIn) {
                treeNavLink.href = buildAppUrl("/tree", {
                    familyId,
                    ...treeContext,
                });
            } else {
                treeNavLink.href = "/tree";
            }
        }

        if (brandHomeLink) {
            brandHomeLink.href = isSignedIn
                ? buildAppUrl("/tree", {
                    familyId,
                    ...treeContext,
                })
                : "/";
        }

        if (accountLink && isSignedIn) {
            accountLink.href = buildAppUrl("/account", { familyId });
        }

        updateActiveNavLinks();
    }

    updateFamilyNavLinks();

    window.addEventListener("family-id-changed", (event) => {
        updateFamilyNavLinks(event.detail?.familyId || null);
    });

    window.addEventListener("family-auth-state-changed", () => {
        updateFamilyNavLinks();
    });
    
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
});
