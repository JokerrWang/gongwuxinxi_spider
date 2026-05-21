const state = {
  exams: [],
  sources: [],
  filter: "全部",
  keyword: "",
  loading: false
};

const elements = {
  updatedText: document.querySelector("#updatedText"),
  refreshButton: document.querySelector("#refreshButton"),
  searchInput: document.querySelector("#searchInput"),
  tabs: [...document.querySelectorAll(".tab")],
  resultCount: document.querySelector("#resultCount"),
  noticeList: document.querySelector("#noticeList"),
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
  const keyword = state.keyword.trim().toLowerCase();
  const filtered = state.exams.filter((item) => {
    const typeMatched = state.filter === "全部" || item.category === state.filter;
    const text = `${item.title} ${item.source} ${item.highlight}`.toLowerCase();
    return typeMatched && (!keyword || text.includes(keyword));
  });

  elements.resultCount.textContent = `${filtered.length} 条`;
  elements.noticeList.innerHTML = "";

  if (!filtered.length) {
    elements.noticeList.replaceChildren(createMessage("empty-state", "没有匹配结果。可以换个关键词，或切回“全部”。"));
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach((item) => {
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

elements.searchInput.addEventListener("input", (event) => {
  state.keyword = event.target.value;
  renderNotices();
});

elements.tabs.forEach((button) => {
  button.addEventListener("click", () => {
    elements.tabs.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.filter = button.dataset.filter;
    renderNotices();
  });
});

loadExams();
