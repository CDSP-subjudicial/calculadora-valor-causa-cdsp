const sectors = [
  {
    id: "fora-sus-internacao",
    name: "Fora do SUS e/ou Internação Compulsória",
    subjects: [
      {
        id: "bomba-infusao-insulina",
        name: "Bomba de Infusão de Insulina",
        calculator: {
          hypotheses: [
            {
              id: "hipotese-1",
              name: "Hipótese 1",
              summary: "Consumíveis mensais: Sensor, Cateter e Reservatório.",
              items: [
                consumable("Sensor (caixa c/ 5 unidades)", 428, 1),
                consumable("Cateter (caixa c/ 10 unidades)", 126.8, 1),
                consumable("Reservatório (caixa c/ 10 unidades)", 213, 1)
              ]
            },
            {
              id: "hipotese-2",
              name: "Hipótese 2",
              summary: "Consumíveis mensais com Transmissor e Sistema de infusão permanentes.",
              items: [
                consumable("Sensor (caixa c/ 5 unidades)", 428, 1),
                consumable("Cateter (caixa c/ 10 unidades)", 126.8, 1),
                consumable("Reservatório (caixa c/ 10 unidades)", 213, 1),
                permanent("Transmissor (1 unidade permanente)", 3492),
                permanent("Sistema de infusão - inclui aplicador, cabo USB, carregador e capa (1 unidade permanente)", 21280)
              ]
            },
            {
              id: "hipotese-3",
              name: "Hipótese 3",
              summary: "Hipótese completa com consumíveis, permanentes, lancetas e tiras.",
              items: [
                consumable("Sensor (caixa c/ 5 unidades)", 428, 1),
                consumable("Cateter (caixa c/ 10 unidades)", 126.8, 1),
                consumable("Reservatório (caixa c/ 10 unidades)", 213, 1),
                permanent("Transmissor (1 unidade permanente)", 3492),
                permanent("Sistema de infusão - inclui aplicador, cabo USB, carregador e capa (1 unidade permanente)", 21280),
                consumable("Lancetas de teste para meidas de glicose (caixa c/ 204 lancetas)", 99.9, 1),
                consumable("Tiras (caixa c/ 50 unidades)", 108.9, 1)
              ]
            }
          ]
        }
      }
    ]
  },
  { id: "home-care-tfd", name: "Home Care e/ou TFD", subjects: [] },
  { id: "terapias", name: "Terapias", subjects: [] },
  { id: "procedimentos", name: "Procedimentos", subjects: [] },
  { id: "medicamentos", name: "Medicamentos", subjects: [] }
];

const state = {
  sectorId: sectors[0].id,
  subjectId: sectors[0].subjects[0].id,
  hypothesisId: sectors[0].subjects[0].calculator.hypotheses[0].id,
  quantities: {}
};

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const sectorSelect = document.querySelector("#sectorSelect");
const subjectSelect = document.querySelector("#subjectSelect");
const hypothesisTabs = document.querySelector("#hypothesisTabs");
const hypothesisSummary = document.querySelector("#hypothesisSummary");
const itemsBody = document.querySelector("#itemsBody");
const grandTotal = document.querySelector("#grandTotal");
const activeSector = document.querySelector("#activeSector");
const calcTitle = document.querySelector("#calc-title");
const calculatorView = document.querySelector("#calculatorView");
const placeholderView = document.querySelector("#placeholderView");
const resetButton = document.querySelector("#resetButton");

function consumable(name, unitValue, monthlyQuantity) {
  return {
    id: slugify(name),
    name,
    unitValue,
    quantity: monthlyQuantity,
    type: "consumable",
    editable: true
  };
}

function permanent(name, unitValue) {
  return {
    id: slugify(name),
    name,
    unitValue,
    quantity: 1,
    type: "permanent",
    editable: false
  };
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function currentSector() {
  return sectors.find((sector) => sector.id === state.sectorId);
}

function currentSubject() {
  return currentSector()?.subjects.find((subject) => subject.id === state.subjectId);
}

function currentCalculator() {
  return currentSubject()?.calculator;
}

function currentHypothesis() {
  return currentCalculator()?.hypotheses.find((hypothesis) => hypothesis.id === state.hypothesisId);
}

function quantityKey(hypothesisId, itemId) {
  return `${hypothesisId}:${itemId}`;
}

function getQuantity(hypothesis, item) {
  if (!item.editable) {
    return 1;
  }

  const key = quantityKey(hypothesis.id, item.id);
  return state.quantities[key] ?? item.quantity;
}

function setDefaultQuantities() {
  for (const sector of sectors) {
    for (const subject of sector.subjects) {
      const hypotheses = subject.calculator?.hypotheses ?? [];
      for (const hypothesis of hypotheses) {
        for (const item of hypothesis.items) {
          if (item.editable) {
            state.quantities[quantityKey(hypothesis.id, item.id)] = item.quantity;
          }
        }
      }
    }
  }
}

function calculateAnnual(hypothesis, item) {
  const quantity = getQuantity(hypothesis, item);
  return item.type === "permanent" ? item.unitValue * 1 : item.unitValue * quantity * 12;
}

function calculateTotal(hypothesis) {
  return hypothesis.items.reduce((total, item) => total + calculateAnnual(hypothesis, item), 0);
}

function parseDecimal(value) {
  const normalized = value.replace(",", ".").trim();
  if (normalized === "") {
    return NaN;
  }
  return Number(normalized);
}

function formatQuantity(value) {
  return numberFormatter.format(value);
}

function renderSectors() {
  sectorSelect.innerHTML = sectors
    .map((sector) => `<option value="${sector.id}">${sector.name}</option>`)
    .join("");
  sectorSelect.value = state.sectorId;
}

function renderSubjects() {
  const sector = currentSector();
  const subjects = sector?.subjects ?? [];

  if (subjects.length === 0) {
    subjectSelect.innerHTML = '<option value="">Nenhum assunto cadastrado nesta fase</option>';
    subjectSelect.disabled = true;
    state.subjectId = "";
    state.hypothesisId = "";
    return;
  }

  subjectSelect.disabled = false;
  subjectSelect.innerHTML = subjects
    .map((subject) => `<option value="${subject.id}">${subject.name}</option>`)
    .join("");

  if (!subjects.some((subject) => subject.id === state.subjectId)) {
    state.subjectId = subjects[0].id;
  }

  subjectSelect.value = state.subjectId;
}

function renderHypotheses() {
  const calculator = currentCalculator();

  if (!calculator) {
    hypothesisTabs.innerHTML = "";
    hypothesisSummary.textContent = "";
    return;
  }

  if (!calculator.hypotheses.some((hypothesis) => hypothesis.id === state.hypothesisId)) {
    state.hypothesisId = calculator.hypotheses[0].id;
  }

  hypothesisTabs.innerHTML = calculator.hypotheses
    .map((hypothesis) => {
      const selected = hypothesis.id === state.hypothesisId;
      return `
        <button class="hypothesis-button" type="button" role="tab" aria-selected="${selected}" data-hypothesis-id="${hypothesis.id}">
          ${hypothesis.name}
        </button>
      `;
    })
    .join("");
}

function renderItems() {
  const hypothesis = currentHypothesis();

  if (!hypothesis) {
    itemsBody.innerHTML = "";
    grandTotal.textContent = moneyFormatter.format(0);
    return;
  }

  hypothesisSummary.textContent = hypothesis.summary;
  itemsBody.innerHTML = hypothesis.items.map((item) => renderItemRow(hypothesis, item)).join("");
  grandTotal.textContent = moneyFormatter.format(calculateTotal(hypothesis));
}

function renderItemRow(hypothesis, item) {
  const quantity = getQuantity(hypothesis, item);
  const annual = calculateAnnual(hypothesis, item);
  const note = item.type === "permanent" ? "Aquisição única" : "Multiplicado por 12 meses";
  const quantityCell = item.editable
    ? `
      <td class="editable-cell">
        <input
          class="quantity-input"
          type="number"
          min="0"
          step="0.01"
          inputmode="decimal"
          value="${quantity}"
          aria-label="Quantitativo mensal de ${item.name}"
          data-item-id="${item.id}">
      </td>
    `
    : `
      <td class="fixed-cell">
        <span class="fixed-quantity">${formatQuantity(quantity)}</span>
      </td>
    `;

  return `
    <tr>
      <td class="item-name">${item.name}<span class="row-note">${note}</span></td>
      <td class="fixed-cell money">${moneyFormatter.format(item.unitValue)}</td>
      ${quantityCell}
      <td class="fixed-cell annual-value">${moneyFormatter.format(annual)}</td>
    </tr>
  `;
}

function renderCalculatorVisibility() {
  const subject = currentSubject();
  const hasCalculator = Boolean(subject?.calculator);
  calculatorView.hidden = !hasCalculator;
  placeholderView.hidden = hasCalculator;

  if (hasCalculator) {
    activeSector.textContent = currentSector().name;
    calcTitle.textContent = subject.name;
  } else {
    activeSector.textContent = "";
    calcTitle.textContent = "";
  }
}

function renderAll() {
  renderSubjects();
  renderCalculatorVisibility();
  renderHypotheses();
  renderItems();
}

function handleSectorChange(event) {
  state.sectorId = event.target.value;
  const firstSubject = currentSector()?.subjects[0];
  state.subjectId = firstSubject?.id ?? "";
  state.hypothesisId = firstSubject?.calculator?.hypotheses[0]?.id ?? "";
  renderAll();
}

function handleSubjectChange(event) {
  state.subjectId = event.target.value;
  state.hypothesisId = currentCalculator()?.hypotheses[0]?.id ?? "";
  renderAll();
}

function handleHypothesisClick(event) {
  const button = event.target.closest("[data-hypothesis-id]");
  if (!button) {
    return;
  }

  state.hypothesisId = button.dataset.hypothesisId;
  renderHypotheses();
  renderItems();
}

function handleQuantityInput(event) {
  const input = event.target.closest("[data-item-id]");
  if (!input) {
    return;
  }

  const value = parseDecimal(input.value);
  const valid = Number.isFinite(value) && value >= 0;
  input.setAttribute("aria-invalid", String(!valid));

  if (!valid) {
    return;
  }

  const hypothesis = currentHypothesis();
  state.quantities[quantityKey(hypothesis.id, input.dataset.itemId)] = value;
  renderItems();
}

function resetCurrentHypothesis() {
  const hypothesis = currentHypothesis();
  if (!hypothesis) {
    return;
  }

  for (const item of hypothesis.items) {
    if (item.editable) {
      state.quantities[quantityKey(hypothesis.id, item.id)] = item.quantity;
    }
  }

  renderItems();
}

setDefaultQuantities();
renderSectors();
renderAll();

sectorSelect.addEventListener("change", handleSectorChange);
subjectSelect.addEventListener("change", handleSubjectChange);
hypothesisTabs.addEventListener("click", handleHypothesisClick);
itemsBody.addEventListener("input", handleQuantityInput);
resetButton.addEventListener("click", resetCurrentHypothesis);
