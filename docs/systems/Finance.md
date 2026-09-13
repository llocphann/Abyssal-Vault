# Finance

The Finance subsystem stores accounts, transactions, transfers, and recurring commitments as Markdown records under `20_Personal_Life/22_Finance`.

## `Finance_Dashboard.md`

The dashboard note is a Finance report record and stores report-level configuration plus manual review sections.

### Functions

- **`RecordType: FinanceReport`** — distinguishes report notes from operational records.
- **`FinanceSchema`** — tracks the Finance data-model version.
- **`FinanceBook`** — identifies the logical finance book.
- **`ReportDate`** — anchors the report to a specific date when used.
- **`DefaultRange`** — sets the default reporting period.
- **`BookCurrency`** — defines the base currency.
- **`DisplayLocale`** — controls locale-aware formatting.
- **`CurrencyDisplay`** — controls symbol/code/name display.
- **`NegativeFormat`** — controls negative-number formatting.
- **`WeekStartsOn`** — defines the first day of the week.
- **`FiscalYearStartMonth`** — defines the fiscal-year boundary.
- **Financial review** — provides a manual review section.
- **Highlights** — records notable results.
- **Unexpected expenses** — records irregular spending.
- **Changes for the next period** — records decisions for the next cycle.

## `Finance.base`

### Functions

- **Record scope** — reads records under `20_Personal_Life/22_Finance/Records`.
- **Transactions view** — shows `RecordType: FinanceTransaction` records.
- **Transaction summary** — summarizes transaction amounts.
- **Accounts view** — shows `RecordType: FinanceAccount` records.
- **Account cards** — provides a visual account collection.
- **Subscription view** — shows `RecordType: FinanceCommitment` records.
- **Subscription summary** — summarizes recurring amounts.
- **Editable metadata** — lets the Base act as a database-style editing surface.

## Transaction records

Transactions are stored under `Records/Transactions`.

- **Expense** — records money leaving an account.
- **Income** — records money entering an account.
- **Transfer** — records movement between source and destination accounts.
- **`TransactionId`** — gives each record a stable identity.
- **`Date`** — stores the transaction date.
- **`Description`** — stores the purpose.
- **`Amount`** — stores the original amount.
- **`Currency`** — stores the original currency.
- **`Account`** — stores the source/payment account.
- **`ToAccount`** — stores the transfer destination.
- **`Category`** — provides reporting classification.
- **`Fixed`** — marks fixed/recurring costs when applicable.
- **`CommitmentId`** — links a transaction to a recurring commitment.
- **`FxRateToBase`** — stores the conversion rate to the book currency.
- **`BaseAmount`** — stores the normalized amount.
- **Fee fields** — record optional transfer fees.

## Account records

Accounts are stored under `Records/Accounts`.

- **Account identity** — stores account name and ID.
- **Account type** — classifies cash, bank, wallet, or another account type.
- **Currency** — stores the account currency.
- **Opening balance** — stores the balance when tracking begins.
- **Opening date** — stores the date tracking begins.
- **Base opening balance** — normalizes the opening balance to the book currency.
- **Opening FX rate** — stores the normalization rate.
- **Include in net worth** — controls whether the account contributes to net-worth calculations.
- **Active** — disables an account without deleting historical records.

## Subscription records

Subscriptions are stored under `Records/Subscription`.

- **`RecordType: FinanceCommitment`** — identifies recurring commitments.
- **`CommitmentId`** — gives the commitment a stable identity.
- **Name** — stores the service or subscription name.
- **Amount / Currency** — stores the recurring payment.
- **Account** — stores the payment account.
- **Category** — classifies the commitment.
- **Frequency** — defaults to monthly in the current schema.
- **Due day** — stores the monthly payment day.
- **Start / End dates** — define the active period.
- **Base amount / FX rate** — normalize non-base currencies.
- **Active** — disables the commitment while preserving history.

## Homepage Quick Add

`finance-quick-add.js` provides forms for Expense, Income, Transfer, Account, and Subscription creation. It can create missing record folders, read Finance defaults, learn categories from existing records, accept custom categories, handle FX normalization, record transfer fees, and open `Finance.base` for management.