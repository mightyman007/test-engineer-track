+++
id = "istqb-m4-decisions-states"
module = "istqb-m4-blackbox"
title = "Decision Tables and State Transitions"
minutes = 16
objectives = ["FL-4.2.3", "FL-4.2.4"]
videos = [
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 32 | Decision Table Testing | Test Case Design Techniques | CTFL (TM Square)", url = "https://www.youtube.com/watch?v=pLiMDdcjPCA" },
  { title = "ISTQB Foundation Level: 4.2.3 Decision Table Testing (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=1aw6uXX4Y-o" },
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 33 | State Transition Testing | Test Case Design Techniques | CTFL (TM Square)", url = "https://www.youtube.com/watch?v=jDPad8KgG-4" },
  { title = "ISTQB Foundation Level: 4.2.4 State Transition Testing (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=p8jyL6-Oj2k" },
]
diagrams = [
  { title = "A four-state login machine: valid transitions solid, invalid dashed", file = "diagrams/state-transition-example.svg" },
]
+++

## Decision tables: testing the combinations (FL-4.2.3)

[Equivalence partitioning](https://istqb-glossary.page/equivalence-partitioning/) treats inputs one set at a time; **[decision table testing](https://istqb-glossary.page/decision-table-testing/)** exists for the opposite situation — requirements that specify how **different combinations of conditions** produce different outcomes. Decision tables are an effective way of recording **complex logic, such as business rules**, and their great strength is being **systematic**: building the full table *forces* you to enumerate every combination, some of which might otherwise be overlooked — and the exercise often exposes **gaps or contradictions in the requirements themselves**.

Building one is mechanical. The **conditions** and the resulting **actions** of the system form the **rows** of the table. Each **column** corresponds to a **decision rule**: a unique combination of conditions, together with the actions that follow. In **limited-entry** decision tables, all condition and action values (except for irrelevant or infeasible ones) are **Boolean** (true/false). In **extended-entry** tables, some or all conditions and actions may take **multiple values** — ranges of numbers, equivalence partitions, discrete values.

## Reading the notation

For conditions: **T** means the condition is satisfied, **F** means it is not, **–** means the value of the condition is **irrelevant for the action outcome**, and **N/A** means the condition is **infeasible** for that rule. For actions: **X** means the action should occur; blank means it should not. (Other notations exist too.)

## Full, simplified, minimized

A **full decision table** has enough columns to cover **every combination of conditions** — with n Boolean conditions that is **2ⁿ columns**. Two conditions = 4 rules; three conditions = 8; five conditions = 32 — the number of rules **grows exponentially with the number of conditions**, which is why exercising all rules can become time-consuming and why a **minimized table** or a risk-based approach may be used instead.

Two ways to shrink the table, both syllabus vocabulary:

- **Simplify** by **deleting columns containing infeasible combinations** of conditions (combinations that cannot occur in reality).
- **Minimize** by **merging columns in which some conditions do not affect the outcome** into a single column — the merged column shows **–** for every condition whose value turns out to be irrelevant. (Minimization algorithms are out of scope of the syllabus; the *idea* of merging is not.)

In decision table testing, **the coverage items are the columns containing feasible combinations of conditions**. 100% coverage means test cases exercise **all these columns**; coverage = exercised columns ÷ total feasible columns, as a percentage.

## State transition testing: models of behavior (FL-4.2.4)

The first three techniques partition data; **[state transition testing](https://istqb-glossary.page/state-transition-testing/)** partitions *behavior*. A **[state diagram](https://istqb-glossary.page/state-diagram/)** models a system's possible **states** and valid **[state transitions](https://istqb-glossary.page/state-transition/)**: a transition is initiated by an **event**, which may be qualified by a **guard condition**, and may cause an **action**. The common labeling syntax is **`event [guard] / action`** — guards and actions are omitted when they do not exist or are irrelevant. Transitions are assumed to be **instantaneous**. A login screen is one component, but it behaves differently depending on which state it is in — that is the insight the model captures, and it is exactly the behavior EP and BVA cannot see.

A test case based on the model is usually a **sequence of events** that produces a sequence of state changes — and **one test case may, and usually will, cover several transitions** at once.

## State tables make invalid transitions visible

A **[state table](https://istqb-glossary.page/state-table/)** is a model equivalent to the state diagram: **rows are states, columns are events** (with guards, if any), and each **cell is a transition** — holding the target state and any resulting actions. The state table's superpower compared to the diagram: it **explicitly shows invalid transitions**, represented by **empty cells**. Any event that has no valid transition from a given state is an invalid transition — and testing it is part of the job, as you will see below.

![A four-state login machine: valid transitions solid, invalid dashed](diagrams/state-transition-example.svg)

## Three coverage levels for states

The syllabus discusses three coverage criteria, in increasing strength:

- **All states coverage**: the coverage items are the **states**; 100% means every state is exercised. Weakest of the three — you can visit every state while skipping most transitions.
- **Valid transitions coverage** (also called **0-switch coverage**): the coverage items are the **single valid transitions**; 100% means every valid transition is exercised. This is the **most widely used** criterion. Achieving it **guarantees** full all-states coverage.
- **All transitions coverage**: the coverage items are **all the transitions shown in a state table** — every valid transition **and** every invalid transition, the invalid ones **attempted**. It guarantees both of the weaker criteria and should be a **minimum requirement for mission- and safety-critical software**.

When attempting invalid transitions, test only **one invalid transition in a single test case** — that helps avoid **[defect masking](https://glossary.istqb.org/en_US/term/defect-masking)**, where one defect prevents the detection of another. (Beyond this syllabus: N-switch criteria generalize 0-switch by counting *sequences* of N chained transitions — worth recognizing by name only.)

## Worked example: the login session (FL-4.2.4)

A login dialog has four states — **Logged Out, Awaiting Second Factor, Logged In, Locked** — and exactly four valid transitions:

| From | Event | To |
|---|---|---|
| Logged Out | credentials accepted | Awaiting Second Factor |
| Awaiting Second Factor | second factor accepted | Logged In |
| Logged In | logout chosen | Logged Out |
| Logged Out | third consecutive failed attempt | Locked |

Everything else is invalid: for instance, *logout chosen* while **Awaiting Second Factor** has no valid transition — the state table shows that cell empty. Now take one test case that executes the event sequence: *credentials accepted → second factor accepted → logout chosen → third consecutive failed attempt*. It walks Logged Out → Awaiting Second Factor → Logged In → Logged Out → Locked, exercising **all four valid transitions** — so this **single** test case achieves **100% valid transitions (0-switch) coverage**, which in turn guarantees 100% all-states coverage. It does **not** achieve 100% all-transitions coverage, though: not one invalid transition was attempted.

## In plain terms

- Decision tables test **combinations**: conditions and actions are rows, each column is a decision rule; **full table = 2ⁿ columns** for n Boolean conditions; delete infeasible columns, merge columns where a condition's value is irrelevant (**–**).
- Decision table **coverage items = the feasible columns**; 100% = all exercised. The technique's strength is systematic combination coverage and surfacing requirement gaps; its cost is exponential growth.
- State transition models behavior: **states, events, guards, actions**; the **state table** (states × events) makes **invalid transitions visible as empty cells**.
- Coverage ladder: **all states** (weakest) < **valid transitions / 0-switch** (most used; guarantees all-states) < **all transitions** (adds attempting invalid ones; minimum for safety-critical). One invalid transition per test case to avoid defect masking.

## Check yourself

1. A business rule has four Boolean conditions. How many columns does the full table have — and what are the two syllabus ways to shrink it?
2. In the notation, what is the difference between **–** and **N/A** in a condition row?
3. Why does the state table show things the state diagram does not?
4. In the login example, why does the single event sequence fail to achieve all-transitions coverage — and what would you add to start closing that gap?
