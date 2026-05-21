import "./helpers.js?v=20260521-8";
import "./postPeople.js?v=20260521-8";
import "./tree.js?v=20260521-8";
import "./search.js?v=20260521-8";
import "./home.js?v=20260521-8";
import "./auth.js?v=20260521-8";
import "./dashboard.js?v=20260521-8";
import { getCurrentFamilyId } from "./helpers.js?v=20260521-8";

document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav a');

    function updateFamilyNavLinks(familyId = getCurrentFamilyId()) {
        const isSignedIn = document.body.classList.contains("is-signed-in");
        const isSignedOut = document.body.classList.contains("is-signed-out");
        document.querySelectorAll(".home-nav-item").forEach((item) => {
            item.hidden = !isSignedOut || isSignedIn;
        });

        const treeNavLink = document.getElementById("treeNavLink");
        const searchNavLink = document.getElementById("searchNavLink");

        if (treeNavLink) {
            treeNavLink.textContent = isSignedIn ? "Family Tree" : "Example Tree";
            if (isSignedIn) {
                treeNavLink.href = familyId
                    ? `/tree?familyId=${encodeURIComponent(familyId)}`
                    : "/tree";
            } else {
                treeNavLink.href = "/tree";
            }
        }

        if (searchNavLink) {
            searchNavLink.href = isSignedIn && familyId
                ? `/search?familyId=${encodeURIComponent(familyId)}`
                : "/search";
        }
    }

    updateFamilyNavLinks();

    navLinks.forEach(link => {
        const linkPath = new URL(link.href, window.location.origin).pathname;
        
        if (linkPath === currentPath || 
            (currentPath === '/' && linkPath === '/') ||
            (currentPath.includes('/tree') && linkPath === '/tree') ||
            (currentPath.includes('/search') && linkPath === '/search') ||
            (currentPath.includes('/profile') && linkPath === '/')) {
            link.setAttribute('aria-current', 'page');
            link.classList.add('active');
        }
    });

    const accountLink = document.getElementById('authLink');
    if (accountLink && currentPath === '/account') {
        accountLink.setAttribute('aria-current', 'page');
    }

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
