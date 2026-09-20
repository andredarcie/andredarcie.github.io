const header = document.querySelector(".site-header");
const progressBar = document.querySelector("#reading-progress-bar");
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#primary-navigation");
const navLinks = [...document.querySelectorAll(".primary-nav a[href^='#']")];
const revealItems = document.querySelectorAll(".reveal");
const readingTime = document.querySelector("#reading-time");
const mapDialog = document.querySelector("#map-dialog");
const openMapButton = document.querySelector("[data-open-map]");
const closeMapButton = document.querySelector("[data-close-map]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function updateScrollUI() {
  const scrollTop = window.scrollY;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? Math.min((scrollTop / scrollable) * 100, 100) : 0;

  progressBar.style.width = `${progress}%`;
  header.classList.toggle("is-sticky", scrollTop > 120);
}

function closeMenu() {
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.querySelector(".sr-only").textContent = "Abrir menu";
  navigation.classList.remove("is-open");
  document.body.classList.remove("menu-open");
}

menuButton.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  menuButton.querySelector(".sr-only").textContent = isOpen ? "Abrir menu" : "Fechar menu";
  navigation.classList.toggle("is-open", !isOpen);
  document.body.classList.toggle("menu-open", !isOpen);
});

navLinks.forEach((link) => {
  link.addEventListener("click", closeMenu);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navigation.classList.contains("is-open")) {
    closeMenu();
    menuButton.focus();
  }
});

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  },
  {
    rootMargin: "-28% 0px -62% 0px",
    threshold: 0,
  },
);

["historia", "territorio", "evidencias", "linha-do-tempo", "fontes"].forEach((id) => {
  const section = document.getElementById(id);
  if (section) sectionObserver.observe(section);
});

if (reduceMotion) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -8% 0px",
      threshold: 0.08,
    },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

if (readingTime) {
  const articleText = document.querySelector("main").innerText.trim();
  const wordCount = articleText.split(/\s+/).length;
  const minutes = Math.max(1, Math.round(wordCount / 210));
  readingTime.textContent = `${minutes} min de leitura`;
}

if (mapDialog && typeof mapDialog.showModal === "function") {
  openMapButton.addEventListener("click", () => {
    mapDialog.showModal();
    document.body.style.overflow = "hidden";
  });

  closeMapButton.addEventListener("click", () => {
    mapDialog.close();
  });

  mapDialog.addEventListener("click", (event) => {
    const bounds = mapDialog.getBoundingClientRect();
    const clickedOutside =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;

    if (clickedOutside) mapDialog.close();
  });

  mapDialog.addEventListener("close", () => {
    document.body.style.overflow = "";
    openMapButton.focus();
  });
} else if (openMapButton) {
  openMapButton.hidden = true;
}

window.addEventListener("scroll", updateScrollUI, { passive: true });
window.addEventListener("resize", () => {
  if (window.innerWidth > 980 && navigation.classList.contains("is-open")) closeMenu();
});

updateScrollUI();
