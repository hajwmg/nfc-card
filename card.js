(function () {
  const DATA_URL = "https://hajwmg.github.io/nfc-card/cards.json";
  const root = document.getElementById("business-card");
  const toast = document.getElementById("toast");
  let currentLang = "ko";
  let currentCard = null;

  const iconMap = {
    email: "fa-envelope",
    globe: "fa-globe",
    phone: "fa-phone",
    website: "fa-globe"
  };

  function text(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value[currentLang] || value.ko || value.en || "";
  }

  function normalizePhone(phone) {
    return (phone || "").replace(/[^\d+]/g, "");
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function setMeta(card) {
    const meta = card.meta || {};
    document.title = meta.title || `${card.brand.name} - ${card.profile.displayName}`;
    setMetaTag("description", meta.description || "");
    setPropertyTag("og:title", meta.ogTitle || document.title);
    setPropertyTag("og:description", meta.description || "");
    setPropertyTag("og:image", meta.ogImage || "");
  }

  function setMetaTag(name, content) {
    if (!content) return;
    const tag = document.querySelector(`meta[name="${name}"]`);
    if (tag) tag.setAttribute("content", content);
  }

  function setPropertyTag(property, content) {
    if (!content) return;
    const tag = document.querySelector(`meta[property="${property}"]`);
    if (tag) tag.setAttribute("content", content);
  }

  function applyTheme(theme) {
    if (!theme) return;
    document.documentElement.style.setProperty("--card-primary", theme.primary || "#f15a24");
    document.documentElement.style.setProperty("--card-secondary", theme.secondary || "#004c97");
    document.documentElement.style.setProperty("--card-bg", theme.background || "#f4f6f9");
  }

  function render(card) {
    currentCard = card;
    applyTheme(card.theme);
    setMeta(card);

    document.getElementById("brand-top").textContent = card.brand.logoTop || card.brand.name;
    document.getElementById("brand-bottom").textContent = card.brand.logoBottom || "";
    document.getElementById("initials").textContent = card.profile.initials || "";

    const photo = document.getElementById("profile-photo");
    if (card.profile.photo) {
      photo.src = card.profile.photo;
      photo.onload = () => {
        photo.style.display = "block";
        document.getElementById("initials").style.display = "none";
      };
      photo.onerror = () => {
        photo.style.display = "none";
        document.getElementById("initials").style.display = "block";
      };
    }

    document.getElementById("name-main").textContent = text(card.profile.name);
    document.getElementById("name-sub").textContent =
      currentLang === "ko" ? card.profile.displayName || text(card.profile.name) : "";
    document.getElementById("role-department").textContent = text(card.profile.department);
    document.getElementById("role-position").textContent = text(card.profile.position);

    const phone = normalizePhone(card.profile.mobile);
    const phoneLink = document.getElementById("phone-link");
    phoneLink.href = phone ? `tel:${phone}` : "#";

    const emailLink = document.getElementById("email-link");
    emailLink.href = card.profile.email ? `mailto:${card.profile.email}` : "#";

    document.getElementById("save-label").textContent =
      currentLang === "ko" ? "연락처 저장하기" : "Save Contact";
    document.getElementById("mobile-label").textContent = "Mobile";
    document.getElementById("email-label").textContent = "Email";

    renderLinks(card.links || []);

    document.getElementById("office-title").textContent = text(card.office.title);
    document.getElementById("office-address").textContent = text(card.office.address);
    document.getElementById("footer-note").textContent = card.brand.tagline || "";
  }

  function renderLinks(links) {
    const list = document.getElementById("link-list");
    list.innerHTML = "";
    links.forEach((link) => {
      const item = document.createElement("a");
      item.href = link.url;
      item.target = "_blank";
      item.rel = "noopener";
      item.className = "link-card";
      item.innerHTML = `
        <div>
          <p class="eyebrow">${link.type || "Link"}</p>
          <p class="link-title">${text(link.label)}</p>
        </div>
        <i class="fa-solid ${iconMap[link.icon] || "fa-chevron-right"}" aria-hidden="true"></i>
      `;
      list.appendChild(item);
    });
  }

  function downloadVCard() {
    if (!currentCard) return;
    const profile = currentCard.profile;
    const org = currentCard.brand.name || "";
    const title = `${text(profile.department)} ${text(profile.position)}`.trim();
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${text(profile.name)}`,
      `N:${text(profile.name)};;;;`,
      `ORG:${org}`,
      `TITLE:${title}`,
      `TEL;TYPE=CELL:${profile.mobile || ""}`,
      `EMAIL:${profile.email || ""}`,
      `URL:${currentCard.brand.website || ""}`,
      `ADR;TYPE=WORK:;;${text(currentCard.office.address)};;;;`,
      "END:VCARD"
    ];
    const blob = new Blob([lines.join("\r\n")], { type: "text/vcard;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${profile.displayName || text(profile.name)}.vcf`.replace(/\s+/g, "_");
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    showToast(currentLang === "ko" ? "연락처 파일을 저장합니다." : "Saving contact file.");
  }

  function getCardId() {
    const param = new URLSearchParams(window.location.search).get("card");
    if (param) return param;
    if (root && root.dataset.cardId) return root.dataset.cardId;
    return window.location.pathname.split("/").filter(Boolean)[0] || "nfc-me";
  }

  function showError() {
    if (!root) return;
    root.innerHTML = `
      <section class="load-error">
        <h1>명함을 불러오지 못했습니다.</h1>
        <p>잠시 후 다시 시도해 주세요.</p>
      </section>
    `;
  }

  async function init() {
    if (!root) return;
    try {
      const response = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Data request failed");
      const data = await response.json();
      const card = data.cards[getCardId()];
      if (!card) throw new Error("Card not found");
      render(card);
    } catch (error) {
      showError();
    }

    document.querySelectorAll("[data-lang]").forEach((button) => {
      button.addEventListener("click", () => {
        currentLang = button.dataset.lang;
        document.querySelectorAll("[data-lang]").forEach((item) => {
          item.classList.toggle("active", item.dataset.lang === currentLang);
        });
        if (currentCard) render(currentCard);
      });
    });

    const saveButton = document.getElementById("save-contact");
    if (saveButton) saveButton.addEventListener("click", downloadVCard);
  }

  init();
})();
