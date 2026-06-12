import "./helpers.js?v=20260612-4";
import "./postPeople.js?v=20260612-4";
import "./tree.js?v=20260612-ui-1";
import "./search.js?v=20260612-4";
import "./home.js?v=20260612-4";
import { signOutCurrentUser } from "./auth.js?v=20260612-4";
import "./dashboard.js?v=20260612-4";
import "./migrateRelationships.js?v=20260612-migration-guard";
import { getCurrentFamilyId } from "./helpers.js?v=20260612-4";

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

    function getDemoContextParams() {
        const params = getCurrentParams();
        const demo = params.get("demo");
        const context = {};

        if (demo) context.demo = demo;
        return context;
    }

    function createMobileMenuItem({ label, href, onClick, destructive = false }) {
        const item = document.createElement("li");
        const control = href ? document.createElement("a") : document.createElement("button");

        control.textContent = label;
        control.className = destructive ? "mobile-menu-link mobile-menu-link-danger" : "mobile-menu-link";

        if (href) {
            control.href = href;
        } else {
            control.type = "button";
        }

        if (onClick) {
            control.addEventListener("click", onClick);
        }

        item.appendChild(control);
        return item;
    }

    function setupMobileMenu() {
        const header = document.querySelector("header");
        if (!header || document.getElementById("mobileMenuButton")) return;

        const menuWrap = document.createElement("div");
        menuWrap.className = "mobile-menu-wrap";

        const menuButton = document.createElement("button");
        menuButton.id = "mobileMenuButton";
        menuButton.className = "mobile-menu-button";
        menuButton.type = "button";
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-controls", "mobileNavMenu");

        const menuIcon = document.createElement("span");
        menuIcon.setAttribute("aria-hidden", "true");
        const menuText = document.createElement("span");
        menuText.className = "mobile-menu-button-text";
        menuText.textContent = "Menu";
        menuButton.append(menuIcon, menuText);

        const menu = document.createElement("div");
        menu.id = "mobileNavMenu";
        menu.className = "mobile-menu";
        menu.hidden = true;

        const menuList = document.createElement("ul");
        menuList.className = "mobile-menu-list";
        menu.appendChild(menuList);

        menuWrap.append(menuButton, menu);
        header.appendChild(menuWrap);

        function closeMenu({ restoreFocus = false } = {}) {
            menu.hidden = true;
            menuButton.setAttribute("aria-expanded", "false");
            if (restoreFocus) menuButton.focus({ preventScroll: true });
        }

        function openMenu() {
            renderMobileMenuItems();
            menu.hidden = false;
            menuButton.setAttribute("aria-expanded", "true");
        }

        function getContextFamilyId() {
            return getCurrentFamilyId();
        }

        function getDirectoryUrl(familyId, isSignedIn) {
            const demoContext = getDemoContextParams();

            if (demoContext.demo) {
                return buildAppUrl("/search", demoContext);
            }

            if (!isSignedIn) {
                return buildAppUrl("/search", { demo: "large" });
            }

            if (familyId) {
                return buildAppUrl("/search", { familyId });
            }

            return "";
        }

        function renderMobileMenuItems() {
            const isSignedIn = document.body.classList.contains("is-signed-in");
            const familyId = getContextFamilyId();
            const treeContext = getTreeContextParams();
            const demoContext = getDemoContextParams();
            const items = [
                { label: "Home", href: "/" },
            ];

            if (isSignedIn && familyId) {
                items.push({
                    label: "Family Tree",
                    href: buildAppUrl("/tree", {
                        familyId,
                        ...treeContext,
                    }),
                });
            } else if (isSignedIn) {
                items.push({ label: "Family Tree", href: "/tree" });
            }

            items.push({
                label: "Example Tree",
                href: buildAppUrl("/tree", demoContext.demo ? demoContext : {}),
            });

            const directoryUrl = getDirectoryUrl(familyId, isSignedIn);
            if (directoryUrl) {
                items.push({ label: "People Directory", href: directoryUrl });
            }

            if (isSignedIn) {
                items.push({
                    label: "Account",
                    href: buildAppUrl("/account", { familyId }),
                });
                items.push({
                    label: "Sign Out",
                    destructive: true,
                    onClick: async () => {
                        closeMenu();
                        await signOutCurrentUser();
                        window.location.href = "/";
                    },
                });
            } else {
                items.push({ label: "Sign In", href: "/signin" });
            }

            menuList.replaceChildren(...items.map(createMobileMenuItem));
        }

        menuButton.addEventListener("click", () => {
            if (menu.hidden) {
                openMenu();
            } else {
                closeMenu();
            }
        });

        document.addEventListener("click", (event) => {
            if (menu.hidden || menuWrap.contains(event.target)) return;
            closeMenu();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape" || menu.hidden) return;
            closeMenu({ restoreFocus: true });
        });

        renderMobileMenuItems();
        window.addEventListener("family-id-changed", renderMobileMenuItems);
        window.addEventListener("family-auth-state-changed", renderMobileMenuItems);
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

    setupMobileMenu();
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
