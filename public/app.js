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
  refreshButton: document.querySelector("#refreshButton"),
  infoTabs: [...document.querySelectorAll(".info-tab")],
  resultCount: document.querySelector("#resultCount"),
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
    renderSources();
    renderNotices();

    if (payload.errors?.length) {
      elements.updatedText.textContent = `最近一次更新时间为：部分来源暂不可用，已显示 ${state.exams.length} 条可用信息`;
    }
  } catch (error) {
    elements.noticeList.replaceChildren(createMessage("error-state", `拉取失败：${error.message}。请稍后刷新，或直接打开下方官方来源查看。`));
    elements.updatedText.textContent = "最近一次更新时间为：连接失败";
  } finally {
    setLoading(false);
  }
}

function updateSummary(payload) {
  const updatedAt = payload.updatedAt ? new Date(payload.updatedAt) : null;
  elements.updatedText.textContent = updatedAt
    ? `最近一次更新时间为：${formatDateTime(updatedAt)}${payload.cached ? " · 缓存" : ""}`
    : "最近一次更新时间为：已加载";
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

  elements.resultCount.textContent = `${filtered.length} 条`;
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
  pageItems.forEach((item) => {
    const node = elements.template.content.cloneNode(true);
    const pill = node.querySelector(".pill");
    pill.textContent = item.category;
    pill.dataset.kind = item.category;
    node.querySelector(".date").textContent = item.date || "日期待确认";
    node.querySelector("h3").textContent = item.title;
    node.querySelector(".status").textContent = item.highlight || item.status;
    node.querySelector(".source").textContent = item.source;
    const link = node.querySelector(".open-link");
    link.href = item.url;
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
    state.page = page;
    renderNotices();
    document.querySelector(".notice-area").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  return button;
}

function renderSources() {
  elements.sourceList.innerHTML = "";
  const fragment = document.createDocumentFragment();

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
    link.textContent = "打开";

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
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
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
    button.classList.add("active");
    state.activeTab = button.dataset.tab;
    state.page = 1;
    renderNotices();
  });
});

loadExams();
