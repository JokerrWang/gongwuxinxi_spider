const test = require("node:test");
const assert = require("node:assert/strict");
const { parseNotices } = require("../src/server");

test("parseNotices extracts official notice cards", () => {
  const html = `
    <ul>
      <li><a href="./202603/t20260303_1.html">天津市部分事业单位公开招聘信息</a> 2026-03-03</li>
      <li><a href="/jsdw/rsksw/tzgg4/202602/t20260226_2.html">天津市滨海新区2025年公开招考公务员拟录用人员公示</a>[02-26]</li>
      <li><a href="/abc.html">关于2026年度专业技术人员职业资格考试有关事项的通知</a>[02-05]</li>
    </ul>
  `;

  const notices = parseNotices(html, {
    id: "demo",
    name: "测试源",
    type: "综合考试",
    baseUrl: "https://hrss.tj.gov.cn/ztzl/ztzl1/sydwgkzp/",
    categoryHints: [["公务员", "公务员"]]
  });

  assert.equal(notices.length, 2);
  assert.equal(notices[0].category, "事业单位");
  assert.equal(notices[0].date, "2026-03-03");
  assert.equal(notices[1].category, "公务员");
  assert.match(notices[0].url, /^https:\/\/hrss\.tj\.gov\.cn/);
});
