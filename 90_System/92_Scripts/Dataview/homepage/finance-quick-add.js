const financeApp = dv.app || globalThis.app;
const host = dv.container;
const doc = host?.ownerDocument || globalThis.document;
if (!financeApp || !host || !doc) return;

const viewInput = typeof input !== "undefined" && input ? input : {};
const RECORDS_ROOT = "20_Personal_Life/22_Finance/Records";
const TRANSACTION_FOLDER = `${RECORDS_ROOT}/Transactions`;
const ACCOUNT_FOLDER = `${RECORDS_ROOT}/Accounts`;
const SUBSCRIPTION_FOLDER = `${RECORDS_ROOT}/Subscription`;
const FINANCE_BASE_PATH = "20_Personal_Life/22_Finance/Finance.base";
const LOCAL_SETTINGS_PATH = "90_System/93_Configuration/settings.local.md";
const COMPAT_SETTINGS_PATH = "90_System/93_Configuration/settings.md";
const NEW_CATEGORY_VALUE = "__finance_new_category__";
const TRANSACTION_KINDS = new Set(["expense", "income", "transfer"]);
const ALL_KINDS = new Set(["expense", "income", "transfer", "account", "subscription"]);

const DEFAULT_CATEGORIES = Object.freeze([
  "Food", "Groceries", "Housing", "Utilities", "Transport", "Health", "Education",
  "Entertainment", "Shopping", "Personal Care", "Travel", "Insurance", "Debt", "Gifts",
  "Salary", "Freelance", "Business", "Bonus", "Investment", "Interest", "Refund",
  "Subscription", "Transfer", "Other",
]);

const text = value => String(value ?? "").trim();
const numberValue = (value, fallback = NaN) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = text(value).replaceAll(",", "");
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const currencyCode = value => {
  const code = text(value).toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
};
const yamlString = value => JSON.stringify(text(value));
const yamlNumberOrBlank = value => Number.isFinite(value) ? String(value) : '""';
const localDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const safeName = value => {
  const cleaned = text(value)
    .replace(/[\\/:*?"<>|#[\]^]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .trim();
  return (cleaned || "Finance record").slice(0, 96).trim();
};
const makeId = prefix => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const settingsFile = financeApp.vault.getAbstractFileByPath?.(LOCAL_SETTINGS_PATH)
  || financeApp.vault.getAbstractFileByPath?.(COMPAT_SETTINGS_PATH);
const globalSettings = settingsFile
  ? financeApp.metadataCache?.getFileCache?.(settingsFile)?.frontmatter || {}
  : {};
const currentPage = typeof dv.current === "function" ? dv.current() || {} : {};
const financeBook = text(viewInput.FinanceBook)
  || text(currentPage.FinanceBook)
  || text(globalSettings.FinanceBook)
  || "default";
const bookCurrency = currencyCode(viewInput.BookCurrency)
  || currencyCode(globalSettings.BookCurrency)
  || currencyCode(currentPage.BookCurrency)
  || "USD";

const knownCategories = new Set(DEFAULT_CATEGORIES);
for (const file of typeof financeApp.vault.getMarkdownFiles === "function" ? financeApp.vault.getMarkdownFiles() : []) {
  if (!file.path.startsWith(`${RECORDS_ROOT}/`)) continue;
  const fm = financeApp.metadataCache?.getFileCache?.(file)?.frontmatter || {};
  if ((text(fm.FinanceBook) || "default") !== financeBook) continue;
  if (!["FinanceTransaction", "FinanceCommitment"].includes(text(fm.RecordType))) continue;
  const category = text(fm.Category);
  if (category) knownCategories.add(category);
}

async function ensureFolder(folderPath) {
  const parts = folderPath.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (financeApp.vault.getAbstractFileByPath(current)) continue;
    try {
      await financeApp.vault.createFolder(current);
    } catch (error) {
      if (!financeApp.vault.getAbstractFileByPath(current)) throw error;
    }
  }
}

function uniquePath(folder, filename) {
  const stem = filename.toLowerCase().endsWith(".md") ? filename.slice(0, -3) : filename;
  let candidate = `${folder}/${stem}.md`;
  let suffix = 2;
  while (financeApp.vault.getAbstractFileByPath(candidate)) {
    candidate = `${folder}/${stem} ${suffix}.md`;
    suffix += 1;
  }
  return candidate;
}

function normalizedBaseAmount(amount, currency, fxRate) {
  if (!Number.isFinite(amount)) return NaN;
  if (!currency || currency === bookCurrency) return amount;
  if (Number.isFinite(fxRate) && fxRate > 0) return amount * fxRate;
  return NaN;
}

function transactionContent(data) {
  const baseAmount = normalizedBaseAmount(data.amount, data.currency, data.fxRate);
  const feeBaseAmount = data.feeAmount > 0 ? normalizedBaseAmount(data.feeAmount, data.currency, data.fxRate) : NaN;
  return `---\nRecordType: FinanceTransaction\nFinanceSchema: 1\nFinanceBook: ${yamlString(financeBook)}\nTransactionId: ${yamlString(data.id)}\nDate: ${yamlString(data.date)}\nType: ${yamlString(data.type)}\nDescription: ${yamlString(data.description)}\nAmount: ${data.amount}\nCurrency: ${yamlString(data.currency)}\nAccount: ${yamlString(data.account)}\nToAccount: ${yamlString(data.toAccount)}\nCategory: ${yamlString(data.category)}\nFixed: ${data.fixed}\nCommitmentId: \"\"\nFxRateToBase: ${yamlNumberOrBlank(data.fxRate)}\nBaseAmount: ${yamlNumberOrBlank(baseAmount)}\nFeeAmount: ${data.feeAmount > 0 ? data.feeAmount : '""'}\nFeeCurrency: ${data.feeAmount > 0 ? yamlString(data.currency) : '""'}\nFeeFxRateToBase: ${data.feeAmount > 0 ? yamlNumberOrBlank(data.fxRate) : '""'}\nFeeBaseAmount: ${data.feeAmount > 0 ? yamlNumberOrBlank(feeBaseAmount) : '""'}\ncategories:\n  - \"[[Finance Transaction]]\"\n---\n\n# Transaction notes\n\n-\n`;
}

function accountContent(data) {
  const computedBase = normalizedBaseAmount(data.openingBalance, data.currency, data.openingFxRate);
  const baseOpeningBalance = Number.isFinite(data.baseOpeningBalance) ? data.baseOpeningBalance : computedBase;
  return `---\nRecordType: FinanceAccount\nFinanceSchema: 1\nFinanceBook: ${yamlString(financeBook)}\nAccountId: ${yamlString(data.id)}\nAccount: ${yamlString(data.name)}\nAccountType: ${yamlString(data.type)}\nCurrency: ${yamlString(data.currency)}\nOpeningBalance: ${data.openingBalance}\nOpeningDate: ${yamlString(data.openingDate)}\nBaseOpeningBalance: ${yamlNumberOrBlank(baseOpeningBalance)}\nOpeningFxRateToBase: ${yamlNumberOrBlank(data.openingFxRate)}\nIncludeInNetWorth: ${data.includeInNetWorth}\nActive: ${data.active}\ncategories:\n  - \"[[Finance Account]]\"\n---\n\n# Account notes\n\n-\n`;
}

function subscriptionContent(data) {
  const baseAmount = normalizedBaseAmount(data.amount, data.currency, data.fxRate);
  return `---\nRecordType: FinanceCommitment\nFinanceSchema: 1\nFinanceBook: ${yamlString(financeBook)}\nCommitmentId: ${yamlString(data.id)}\nName: ${yamlString(data.name)}\nAmount: ${data.amount}\nCurrency: ${yamlString(data.currency)}\nAccount: ${yamlString(data.account)}\nCategory: ${yamlString(data.category)}\nFrequency: monthly\nDueDay: ${data.dueDay}\nStartDate: ${yamlString(data.startDate)}\nEndDate: ${yamlString(data.endDate)}\nFxRateToBase: ${yamlNumberOrBlank(data.fxRate)}\nBaseAmount: ${yamlNumberOrBlank(baseAmount)}\nActive: true\ncategories:\n  - \"[[Finance Subscription]]\"\n---\n\n# Subscription notes\n\n-\n`;
}

const root = doc.createElement("section");
root.className = "dv-finance-quick-add";
root.innerHTML = `
  <header class="dv-finance-quick-head">
    <div><span class="dv-finance-kicker">QUICK ADD</span><h2>Add finance record</h2><p>Transactions, optional accounts, and recurring subscriptions.</p></div>
    <button type="button" class="dv-finance-manage" data-finance-manage>Manage base</button>
  </header>
  <div class="dv-finance-quick-body">
    <nav class="dv-finance-tabs" role="tablist" aria-label="Finance record type">
      <button type="button" class="is-active" data-kind="expense" aria-selected="true">Expense</button><button type="button" data-kind="income" aria-selected="false">Income</button><button type="button" data-kind="transfer" aria-selected="false">Transfer</button><button type="button" data-kind="account" aria-selected="false">Account</button><button type="button" data-kind="subscription" aria-selected="false">Subscription</button>
    </nav>
    <form class="dv-finance-form" data-form="transaction"><div class="dv-finance-grid">
      <label><span>Amount</span><input type="number" min="0" step="any" inputmode="decimal" name="amount" required placeholder="0" /></label><label><span>Account <small>(optional)</small></span><input type="text" name="account" placeholder="Optional source label" /></label><label data-transfer hidden><span>To account <small>(optional)</small></span><input type="text" name="toAccount" placeholder="Optional destination label" /></label><label data-category-field><span>Category</span><select name="category" data-category></select></label><label data-custom-category hidden><span>New category</span><input type="text" name="customCategory" placeholder="Category name" /></label><label class="dv-finance-wide"><span>Description</span><input type="text" name="description" placeholder="What was this for?" /></label><label><span>Date</span><input type="date" name="date" required /></label><label><span>Currency</span><input type="text" name="currency" maxlength="3" placeholder="${bookCurrency}" /></label><label data-transfer hidden><span>Transfer fee</span><input type="number" min="0" step="any" inputmode="decimal" name="feeAmount" placeholder="0" /></label><label><span>FX rate to base</span><input type="number" min="0" step="any" inputmode="decimal" name="fxRate" placeholder="Optional" /></label><label class="dv-finance-check" data-expense><input type="checkbox" name="fixed" /><span>Fixed expense</span></label>
    </div><div class="dv-finance-actions"><span class="dv-finance-hint" data-transaction-hint>Expense · Records/Transactions</span><button type="submit" class="mod-cta">Add expense</button></div></form>
    <form class="dv-finance-form" data-form="account" hidden><div class="dv-finance-grid">
      <label class="dv-finance-wide"><span>Account name</span><input type="text" name="account" required placeholder="e.g. Main bank" /></label><label><span>Account type</span><input type="text" name="accountType" placeholder="Bank, cash, wallet…" /></label><label><span>Currency</span><input type="text" name="currency" maxlength="3" placeholder="${bookCurrency}" /></label><label><span>Opening balance</span><input type="number" step="any" inputmode="decimal" name="openingBalance" value="0" /></label><label><span>Opening date</span><input type="date" name="openingDate" /></label><label><span>Opening FX rate to base</span><input type="number" min="0" step="any" inputmode="decimal" name="openingFxRate" placeholder="Optional" /></label><label><span>Base opening balance</span><input type="number" step="any" inputmode="decimal" name="baseOpeningBalance" placeholder="Auto" /></label><label class="dv-finance-check"><input type="checkbox" name="includeInNetWorth" checked /><span>Include in net worth</span></label><label class="dv-finance-check"><input type="checkbox" name="active" checked /><span>Active</span></label>
    </div><div class="dv-finance-actions"><span class="dv-finance-hint">Optional · saved to Records/Accounts</span><button type="submit" class="mod-cta">Add account</button></div></form>
    <form class="dv-finance-form" data-form="subscription" hidden><div class="dv-finance-grid">
      <label class="dv-finance-wide"><span>Name</span><input type="text" name="name" required placeholder="e.g. Netflix" /></label><label><span>Amount</span><input type="number" min="0" step="any" inputmode="decimal" name="amount" required placeholder="0" /></label><label><span>Account <small>(optional)</small></span><input type="text" name="account" placeholder="Optional label" /></label><label><span>Category</span><select name="category" data-subscription-category></select></label><label data-subscription-custom-category hidden><span>New category</span><input type="text" name="customCategory" placeholder="Category name" /></label><label><span>Currency</span><input type="text" name="currency" maxlength="3" placeholder="${bookCurrency}" /></label><label><span>Due day</span><input type="number" min="1" max="31" name="dueDay" value="1" /></label><label><span>Start date</span><input type="date" name="startDate" /></label><label><span>End date</span><input type="date" name="endDate" /></label><label><span>FX rate to base</span><input type="number" min="0" step="any" inputmode="decimal" name="fxRate" placeholder="Optional" /></label>
    </div><div class="dv-finance-actions"><span class="dv-finance-hint">Saved to Records/Subscription</span><button type="submit" class="mod-cta">Add subscription</button></div></form>
    <p class="dv-finance-status" data-status aria-live="polite"></p>
  </div>`;

const style = doc.createElement("style");
style.textContent = `
.dv-finance-quick-add{--df-surface:var(--background-secondary);--df-surface-2:color-mix(in srgb,var(--background-secondary) 84%,var(--background-primary) 16%);--df-hover:var(--background-modifier-hover);--df-border:var(--background-modifier-border);--df-text:var(--text-normal);--df-muted:var(--text-muted);--df-faint:var(--text-faint);--df-accent:var(--interactive-accent);width:100%;overflow:hidden;border:1px solid var(--df-border);border-radius:14px;background:var(--df-surface);color:var(--df-text);box-sizing:border-box}.dv-finance-quick-add *{box-sizing:border-box}.dv-finance-quick-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 18px 14px;border-bottom:1px solid var(--df-border)}.dv-finance-quick-head h2{margin:0;font-size:1rem}.dv-finance-quick-head p{margin:5px 0 0;color:var(--df-muted);font-size:.76rem}.dv-finance-kicker{display:block;margin-bottom:4px;color:var(--text-accent);font-size:.7rem;font-weight:700;letter-spacing:.14em}.dv-finance-manage{flex:0 0 auto;margin:0;padding:7px 10px;border:1px solid var(--df-border);border-radius:8px;background:transparent;color:var(--df-muted);box-shadow:none;font-size:.74rem}.dv-finance-manage:hover{background:var(--df-hover);color:var(--df-text)}.dv-finance-quick-body{display:grid;gap:16px;padding:16px 18px 18px}.dv-finance-tabs{display:flex;flex-wrap:wrap;gap:6px;padding:3px;border:1px solid var(--df-border);border-radius:10px;background:var(--df-surface-2)}.dv-finance-tabs button{margin:0;padding:7px 11px;border:0;border-radius:7px;background:transparent;color:var(--df-muted);box-shadow:none;font-size:.75rem}.dv-finance-tabs button.is-active{background:color-mix(in srgb,var(--df-accent) 15%,var(--df-surface));color:var(--df-text)}.dv-finance-form{display:grid;gap:14px}.dv-finance-form[hidden],.dv-finance-form [hidden]{display:none!important}.dv-finance-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.dv-finance-grid label{min-width:0;display:grid;align-content:start;gap:6px;color:var(--df-muted);font-size:.7rem}.dv-finance-grid input,.dv-finance-grid select{width:100%;min-width:0;height:34px;margin:0;padding:6px 9px;border:1px solid var(--df-border);border-radius:8px;background:var(--df-surface-2);color:var(--df-text);box-shadow:none;font:inherit;font-size:.78rem}.dv-finance-wide{grid-column:span 2}.dv-finance-grid .dv-finance-check{display:flex;align-items:center;align-self:end;gap:8px;min-height:34px;padding:6px 2px}.dv-finance-actions{display:flex;align-items:center;justify-content:space-between;gap:12px}.dv-finance-hint,.dv-finance-status{color:var(--df-faint);font-size:.7rem}.dv-finance-status{min-height:1.1em;margin:0}.dv-finance-status[data-tone=success]{color:var(--color-green,var(--text-success))}.dv-finance-status[data-tone=error]{color:var(--color-red,var(--text-error))}@media(max-width:800px){.dv-finance-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.dv-finance-quick-head,.dv-finance-actions{align-items:stretch;flex-direction:column}.dv-finance-grid{grid-template-columns:1fr}.dv-finance-wide{grid-column:span 1}.dv-finance-tabs button{flex:1 1 calc(33.333% - 6px)}}`;
root.prepend(style);
host.replaceChildren(root);

const status = root.querySelector("[data-status]");
const tabs = Array.from(root.querySelectorAll("[data-kind]"));
const transactionForm = root.querySelector('[data-form="transaction"]');
const accountForm = root.querySelector('[data-form="account"]');
const subscriptionForm = root.querySelector('[data-form="subscription"]');
const transactionCategory = transactionForm.elements.namedItem("category");
const transactionCustomCategory = transactionForm.elements.namedItem("customCategory");
const transactionCustomField = root.querySelector("[data-custom-category]");
const transactionCategoryField = root.querySelector("[data-category-field]");
const subscriptionCategory = subscriptionForm.elements.namedItem("category");
const subscriptionCustomCategory = subscriptionForm.elements.namedItem("customCategory");
const subscriptionCustomField = root.querySelector("[data-subscription-custom-category]");
const transactionHint = root.querySelector("[data-transaction-hint]");
let activeKind = "expense";

function setStatus(message, tone = "") { status.textContent = message; if (tone) status.dataset.tone = tone; else delete status.dataset.tone; }
function setBusy(form, busy) { form.toggleAttribute("aria-busy", busy); for (const button of form.querySelectorAll("button")) button.disabled = busy; }
function refreshCategorySelect(select, selected = "") {
  select.replaceChildren();
  const placeholder = doc.createElement("option"); placeholder.value = ""; placeholder.textContent = "Choose category"; placeholder.disabled = true; placeholder.selected = !selected; select.appendChild(placeholder);
  for (const category of [...knownCategories].sort((a,b)=>a.localeCompare(b))) { const option=doc.createElement("option"); option.value=category; option.textContent=category; option.selected=category===selected; select.appendChild(option); }
  const custom=doc.createElement("option"); custom.value=NEW_CATEGORY_VALUE; custom.textContent="New category…"; select.appendChild(custom);
}
function updateTransactionCustom(){const custom=activeKind!=="transfer"&&transactionCategory.value===NEW_CATEGORY_VALUE;transactionCustomField.hidden=!custom;transactionCustomCategory.required=custom;if(custom)transactionCustomCategory.focus();}
function updateSubscriptionCustom(){const custom=subscriptionCategory.value===NEW_CATEGORY_VALUE;subscriptionCustomField.hidden=!custom;subscriptionCustomCategory.required=custom;if(custom)subscriptionCustomCategory.focus();}
function showKind(kind){
  activeKind=ALL_KINDS.has(kind)?kind:"expense"; for(const tab of tabs){const active=tab.dataset.kind===activeKind;tab.classList.toggle("is-active",active);tab.setAttribute("aria-selected",String(active));}
  const isTransaction=TRANSACTION_KINDS.has(activeKind); transactionForm.hidden=!isTransaction; accountForm.hidden=activeKind!=="account"; subscriptionForm.hidden=activeKind!=="subscription";
  if(isTransaction){const isTransfer=activeKind==="transfer";const isExpense=activeKind==="expense";for(const field of root.querySelectorAll("[data-transfer]"))field.hidden=!isTransfer;for(const field of root.querySelectorAll("[data-expense]"))field.hidden=!isExpense;transactionCategoryField.hidden=isTransfer;transactionCategory.required=!isTransfer;if(isTransfer){transactionCategory.value="Transfer";transactionCustomField.hidden=true;transactionCustomCategory.required=false;}else{if(transactionCategory.value==="Transfer")transactionCategory.value="";updateTransactionCustom();}transactionHint.textContent=`${activeKind[0].toUpperCase()}${activeKind.slice(1)} · Records/Transactions`;transactionForm.querySelector('button[type="submit"]').textContent=`Add ${activeKind}`;} setStatus("");
}
function resetTransaction(){transactionForm.reset();transactionForm.elements.namedItem("date").value=localDateString();transactionForm.elements.namedItem("currency").value=bookCurrency;refreshCategorySelect(transactionCategory);transactionCustomField.hidden=true;transactionCustomCategory.required=false;}
function resetAccount(){accountForm.reset();accountForm.elements.namedItem("currency").value=bookCurrency;accountForm.elements.namedItem("openingBalance").value="0";accountForm.elements.namedItem("openingDate").value=localDateString();accountForm.elements.namedItem("includeInNetWorth").checked=true;accountForm.elements.namedItem("active").checked=true;}
function resetSubscription(){subscriptionForm.reset();subscriptionForm.elements.namedItem("currency").value=bookCurrency;subscriptionForm.elements.namedItem("dueDay").value="1";subscriptionForm.elements.namedItem("startDate").value=localDateString();refreshCategorySelect(subscriptionCategory,"Subscription");subscriptionCategory.value="Subscription";subscriptionCustomField.hidden=true;subscriptionCustomCategory.required=false;}

transactionForm.addEventListener("submit",async event=>{event.preventDefault();const formData=new FormData(transactionForm);const selectedCategory=activeKind==="transfer"?"Transfer":text(formData.get("category"));const category=selectedCategory===NEW_CATEGORY_VALUE?text(formData.get("customCategory")):selectedCategory||"Uncategorised";const amount=Math.abs(numberValue(formData.get("amount")));if(!Number.isFinite(amount)||amount<=0)return setStatus("Amount must be greater than zero.","error");const account=text(formData.get("account"));const toAccount=activeKind==="transfer"?text(formData.get("toAccount")):"";const date=text(formData.get("date"))||localDateString();const transferDescription=account&&toAccount?`${account} to ${toAccount}`:"Transfer";const description=text(formData.get("description"))||(activeKind==="transfer"?transferDescription:activeKind==="income"?"Income":"Expense");const currency=currencyCode(formData.get("currency"))||bookCurrency;const fxRate=numberValue(formData.get("fxRate"));const feeAmount=activeKind==="transfer"?Math.abs(numberValue(formData.get("feeAmount"),0)):0;const id=makeId("TX");setBusy(transactionForm,true);setStatus("Saving…");try{await ensureFolder(TRANSACTION_FOLDER);const path=uniquePath(TRANSACTION_FOLDER,`${date} - ${safeName(description)} - ${id.slice(-6)}`);await financeApp.vault.create(path,transactionContent({id,date,type:activeKind,description,amount,currency,account,toAccount,category,fixed:activeKind==="expense"&&formData.get("fixed")==="on",fxRate,feeAmount}));knownCategories.add(category);resetTransaction();showKind(activeKind);setStatus(`Added ${activeKind}: ${description}.`,"success");}catch(error){setStatus(`Could not create transaction: ${error?.message||error}`,"error");}finally{setBusy(transactionForm,false);}});
accountForm.addEventListener("submit",async event=>{event.preventDefault();const formData=new FormData(accountForm);const name=text(formData.get("account"));const openingBalance=numberValue(formData.get("openingBalance"),0);if(!name)return setStatus("Account name is required.","error");if(!Number.isFinite(openingBalance))return setStatus("Opening balance must be a number.","error");const data={id:makeId("ACC"),name,type:text(formData.get("accountType"))||"Bank",currency:currencyCode(formData.get("currency"))||bookCurrency,openingBalance,openingDate:text(formData.get("openingDate"))||localDateString(),openingFxRate:numberValue(formData.get("openingFxRate")),baseOpeningBalance:numberValue(formData.get("baseOpeningBalance")),includeInNetWorth:formData.get("includeInNetWorth")==="on",active:formData.get("active")==="on"};setBusy(accountForm,true);setStatus("Saving…");try{await ensureFolder(ACCOUNT_FOLDER);await financeApp.vault.create(uniquePath(ACCOUNT_FOLDER,safeName(name)),accountContent(data));resetAccount();setStatus(`Added account: ${name}.`,"success");}catch(error){setStatus(`Could not create account: ${error?.message||error}`,"error");}finally{setBusy(accountForm,false);}});
subscriptionForm.addEventListener("submit",async event=>{event.preventDefault();const formData=new FormData(subscriptionForm);const selectedCategory=text(formData.get("category"));const category=selectedCategory===NEW_CATEGORY_VALUE?text(formData.get("customCategory")):selectedCategory||"Subscription";const name=text(formData.get("name"));const amount=Math.abs(numberValue(formData.get("amount")));if(!name)return setStatus("Subscription name is required.","error");if(!Number.isFinite(amount)||amount<=0)return setStatus("Subscription amount must be greater than zero.","error");const data={id:makeId("SUB"),name,amount,account:text(formData.get("account")),category,currency:currencyCode(formData.get("currency"))||bookCurrency,dueDay:Math.max(1,Math.min(31,Math.round(numberValue(formData.get("dueDay"),1)))),startDate:text(formData.get("startDate"))||localDateString(),endDate:text(formData.get("endDate")),fxRate:numberValue(formData.get("fxRate"))};setBusy(subscriptionForm,true);setStatus("Saving…");try{await ensureFolder(SUBSCRIPTION_FOLDER);await financeApp.vault.create(uniquePath(SUBSCRIPTION_FOLDER,safeName(name)),subscriptionContent(data));knownCategories.add(category);resetSubscription();setStatus(`Added subscription: ${name}.`,"success");}catch(error){setStatus(`Could not create subscription: ${error?.message||error}`,"error");}finally{setBusy(subscriptionForm,false);}});
for(const tab of tabs)tab.addEventListener("click",()=>showKind(tab.dataset.kind||"expense"));transactionCategory.addEventListener("change",updateTransactionCustom);subscriptionCategory.addEventListener("change",updateSubscriptionCustom);root.querySelector("[data-finance-manage]").addEventListener("click",()=>{const file=financeApp.vault.getAbstractFileByPath(FINANCE_BASE_PATH);if(!file)return setStatus("Finance.base was not found.","error");const leaf=financeApp.workspace?.getLeaf?.(true);if(leaf?.openFile)void leaf.openFile(file);});
resetTransaction();resetAccount();resetSubscription();showKind("expense");
