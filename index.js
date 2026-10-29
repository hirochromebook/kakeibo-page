const STORAGE_KEY = "kakeiboEntries";
const numberFormatter = new Intl.NumberFormat("ja-JP");

const form = document.querySelector("#entry-form");
const entryList = document.querySelector("#entry-list");
const totalOutput = document.querySelector('output[name="total"]');
const formMessage = document.querySelector("#form-message");

let entries = [];
let storageReady = false;

function isEntry(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    typeof value.item === "string" &&
    (value.type === "expense" || value.type === "income") &&
    Number.isSafeInteger(value.amount) &&
    value.amount > 0
  );
}

function readEntries() {
  const savedEntries = localStorage.getItem(STORAGE_KEY);
  if (savedEntries === null) {
    return [];
  }

  const parsedEntries = JSON.parse(savedEntries);
  if (!Array.isArray(parsedEntries) || !parsedEntries.every(isEntry)) {
    throw new Error("保存された家計簿データの形式が正しくありません。");
  }
  return parsedEntries;
}

function renderEntries() {
  entryList.replaceChildren();

  if (entries.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = "登録したデータはありません。";
    row.append(cell);
    entryList.append(row);
  } else {
    for (const entry of entries) {
      const row = document.createElement("tr");
      const values = [
        entry.date,
        entry.item,
        entry.type === "income" ? "収入" : "支出",
        numberFormatter.format(entry.amount),
      ];

      for (const value of values) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }
      entryList.append(row);
    }
  }

  const balance = entries.reduce(
    (total, entry) =>
      total + (entry.type === "income" ? entry.amount : -entry.amount),
    0,
  );
  totalOutput.textContent = numberFormatter.format(balance);
}

try {
  entries = readEntries();
  storageReady = true;
  renderEntries();
} catch (error) {
  console.error("家計簿データの読み込みに失敗しました。", error);
  formMessage.textContent =
    "保存データを読み込めませんでした。データを確認するまで追加できません。";
  form.querySelector('button[type="submit"]').disabled = true;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!storageReady) {
    return;
  }

  const formData = new FormData(form);
  const amount = Number(formData.get("amount"));
  const entry = {
    date: String(formData.get("date")),
    item: String(formData.get("item")).trim(),
    type: String(formData.get("type")),
    amount,
  };

  if (
    entry.date === "" ||
    entry.item === "" ||
    (entry.type !== "expense" && entry.type !== "income") ||
    !Number.isSafeInteger(entry.amount) ||
    entry.amount <= 0
  ) {
    formMessage.textContent = "日付・品目・収支区分・金額を正しく入力してください。";
    return;
  }

  const updatedEntries = [...entries, entry];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));
  } catch (error) {
    console.error("家計簿データの保存に失敗しました。", error);
    formMessage.textContent =
      "データを保存できませんでした。ブラウザーの保存領域を確認してください。";
    return;
  }

  entries = updatedEntries;
  renderEntries();
  form.reset();
  formMessage.textContent = "家計簿に追加しました。";
});
