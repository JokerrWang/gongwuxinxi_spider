const state = {
  exams: [],
  sources: [],
  activeTab: "civil",
  page: 1,
  loading: false
};

const PAGE_SIZE = 10;

const elements = {
  updatedText: document.querySelector("#updatedText"),
  syncStatus: document.querySelector("#syncStatus"),
  refreshButton: document.querySelector("#refreshButton"),
  infoTabs: [...document.querySelectorAll(".info-tab")],
  resultCount: document.querySelector("#resultCount"),
  totalCount: document.querySelector("#totalCount"),
  civilCount: document.querySelector("#civilCount"),
  enterpriseCount: document.querySelector("#enterpriseCount"),
  civilTabCount: document.querySelector("#civilTabCount"),
  enterpriseTabCount: document.querySelector("#enterpriseTabCount"),
  noticeList: document.querySelector("#noticeList"),
  pagination: document.querySelector("#pagination"),
  sourceList: document.querySelector("#sourceList"),
  template: document.querySelector("#noticeTemplate")
};

async function loadExams(force = false) {
  setLoading(true);
  try {
    const response = await fetch(`/api/exams${force ? "?refresh=1" : ""}`);
    if (!response.ok) throw new Error("接口暂时不可用");
    const payload = await response.json();

    state.exams = payload.exams || [];
    state.sources = payload.sources || [];
    state.page = 1;
    updateSummary(payload);
    updateCounts();
    renderSources();
    renderNotices();

    if (payload.errors?.length) {
      elements.updatedText.textContent = `部分来源异常`;
      elements.syncStatus.textContent = `已显示 ${state.exams.length} 条`;
    }
  } catch (error) {
    elements.noticeList.replaceChildren(createMessage("error-state", `拉取失败：${error.message}。请稍后刷新，或直接打开下方官方来源查看。`));
    elements.updatedText.textContent = "更新失败";
    elements.syncStatus.textContent = "稍后重试";
  } finally {
    setLoading(false);
  }
}

function updateSummary(payload) {
  const updatedAt = payload.updatedAt ? new Date(payload.updatedAt) : null;
  const nextRefreshAt = payload.nextRefreshAt ? new Date(payload.nextRefreshAt) : null;
  elements.updatedText.textContent = updatedAt
    ? `更新 ${formatDateTime(updatedAt)}${payload.cached ? " 缓存" : ""}`
    : "已加载";
  elements.syncStatus.textContent = nextRefreshAt
    ? `下次 ${formatTime(nextRefreshAt)}`
    : "同步完成";
}

function updateCounts() {
  const civilTotal = state.exams.filter((item) => item.category !== "国企").length;
  const enterpriseTotal = state.exams.filter((item) => item.category === "国企").length;

  elements.totalCount.textContent = state.exams.length;
  elements.civilCount.textContent = civilTotal;
  elements.enterpriseCount.textContent = enterpriseTotal;
  elements.civilTabCount.textContent = civilTotal;
  elements.enterpriseTabCount.textContent = enterpriseTotal;
}

function renderNotices() {
  const filtered = state.exams.filter((item) => {
    if (state.activeTab === "enterprise") return item.category === "国企";
    return item.category !== "国企";
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  state.page = Math.min(state.page, totalPages);
  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  elements.resultCount.textContent = `当前筛选 ${filtered.length} 条`;
  elements.noticeList.innerHTML = "";
  elements.pagination.innerHTML = "";

  if (!filtered.length) {
    const message = state.activeTab === "enterprise"
      ? "国企信息查询能力即将增加，当前暂无动态。"
      : "暂无最新动态。";
    elements.noticeList.replaceChildren(createMessage("empty-state", message));
    return;
  }

  const fragment = document.createDocumentFragment();
  pageItems.forEach((item, index) => {
    const node = elements.template.content.cloneNode(true);
    const card = node.querySelector(".notice-card");
    const pill = node.querySelector(".pill");
    const date = node.querySelector(".date");

    card.style.animationDelay = `${Math.min(index * 35, 180)}ms`;
    pill.textContent = item.category;
    pill.dataset.kind = item.category;
    date.textContent = item.date || "日期待确认";
    if (item.date) date.dateTime = item.date;
    node.querySelector("h3").textContent = item.title;
    node.querySelector(".status").textContent = item.highlight || item.status;
    node.querySelector(".source").textContent = item.source;
    node.querySelector(".age").textContent = getAgeLabel(item.date);
    const link = node.querySelector(".open-link");
    link.href = item.url;
    link.setAttribute("aria-label", `查看原文：${item.title}`);
    link.addEventListener("pointerdown", () => {
      link.classList.remove("is-tapping");
      window.requestAnimationFrame(() => link.classList.add("is-tapping"));
    });
    link.addEventListener("animationend", () => link.classList.remove("is-tapping"));
    fragment.appendChild(node);
  });

  elements.noticeList.appendChild(fragment);
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  if (totalPages <= 1) return;

  const previous = createPageButton("上一页", state.page - 1, state.page === 1);
  const next = createPageButton("下一页", state.page + 1, state.page === totalPages);
  const label = document.createElement("span");
  label.className = "page-status";
  label.textContent = `${state.page} / ${totalPages}`;

  elements.pagination.append(previous, label, next);
}

function createPageButton(label, page, disabled) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "page-button";
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener("click", () => {
    button.classList.add("is-switching");
    state.page = page;
    window.setTimeout(() => {
      renderNotices();
      document.querySelector(".notice-area").scrollIntoView({ behavior: "smooth", block: "start" });
    }, 140);
  });
  return button;
}

function renderSources() {
  elements.sourceList.innerHTML = "";
  const fragment = document.createDocumentFragment();

  if (!state.sources.length) {
    elements.sourceList.replaceChildren(createMessage("empty-state", "官方来源正在加载。"));
    return;
  }

  state.sources.forEach((source) => {
    const row = document.createElement("div");
    const text = document.createElement("div");
    const name = document.createElement("strong");
    const type = document.createElement("span");
    const link = document.createElement("a");

    row.className = "source-item";
    name.textContent = source.name;
    type.textContent = source.type;
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "访问";
    link.setAttribute("aria-label", `访问${source.name}`);

    text.append(name, type);
    row.append(text, link);
    fragment.appendChild(row);
  });

  elements.sourceList.appendChild(fragment);
}

function setLoading(value) {
  state.loading = value;
  elements.refreshButton.disabled = value;
  elements.refreshButton.classList.toggle("loading", value);
  if (value) elements.syncStatus.textContent = "同步中";
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getAgeLabel(value) {
  if (!value) return "时间待确认";
  const time = Date.parse(value);
  if (Number.isNaN(time)) return "时间待确认";

  const days = Math.max(0, Math.floor((Date.now() - time) / 86400000));
  if (days === 0) return "今日发布";
  if (days <= 30) return `${days} 天前`;
  return "30 天以上";
}

function createMessage(className, message) {
  const node = document.createElement("div");
  node.className = className;
  node.textContent = message;
  return node;
}

elements.refreshButton.addEventListener("click", () => loadExams(true));

elements.infoTabs.forEach((button) => {
  button.addEventListener("click", () => {
    elements.infoTabs.forEach((item) => item.classList.remove("active"));
    elements.infoTabs.forEach((item) => item.setAttribute("aria-selected", "false"));
    button.classList.add("active");
    button.setAttribute("aria-selected", "true");
    state.activeTab = button.dataset.tab;
    state.page = 1;
    renderNotices();
  });
});

loadExams();
