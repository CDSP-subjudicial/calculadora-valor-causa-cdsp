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
                consumable("Lancetas de teste para medidas de glicose (caixa c/ 204 lancetas)", 99.9, 1),
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
const downloadPdfButton = document.querySelector("#downloadPdfButton");

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

function formatMoney(value) {
  return moneyFormatter.format(value).replace(/\u00a0/g, " ");
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
    grandTotal.textContent = formatMoney(0);
    return;
  }

  hypothesisSummary.textContent = hypothesis.summary;
  itemsBody.innerHTML = hypothesis.items.map((item) => renderItemRow(hypothesis, item)).join("");
  grandTotal.textContent = formatMoney(calculateTotal(hypothesis));
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
      <td class="fixed-cell money">${formatMoney(item.unitValue)}</td>
      ${quantityCell}
      <td class="fixed-cell annual-value">${formatMoney(annual)}</td>
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
    downloadPdfButton.disabled = false;
  } else {
    activeSector.textContent = "";
    calcTitle.textContent = "";
    downloadPdfButton.disabled = true;
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

async function generatePdfReport() {
  const subject = currentSubject();
  const hypothesis = currentHypothesis();

  if (!subject?.calculator || !hypothesis) {
    return;
  }

  const jspdf = window.jspdf;
  if (!jspdf?.jsPDF) {
    alert("Não foi possível carregar o gerador de PDF. Confira se a pasta vendor foi enviada ao site.");
    return;
  }

  downloadPdfButton.disabled = true;
  downloadPdfButton.textContent = "Gerando PDF...";

  try {
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const brandbar = await loadImageDataUrl("assets/cdsp-brandbar.png").catch(() => null);
    const logo = await loadImageDataUrl("assets/cdsp-logo.png").catch(() => null);
    const page = {
      width: 210,
      height: 297,
      margin: 14,
      bottom: 276
    };
    const colors = {
      ink: [24, 36, 52],
      muted: [82, 104, 122],
      primary: [37, 44, 120],
      teal: [47, 97, 112],
      line: [214, 225, 237],
      soft: [247, 251, 255],
      ok: [15, 124, 98]
    };
    let y = 0;

    const drawHeader = () => {
      const headerHeight = 25.2;

      if (brandbar) {
        doc.addImage(brandbar, "PNG", 0, 0, page.width, headerHeight);
      } else {
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, page.width, headerHeight, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("COORDENADORIA DE DEFESA DA SAÚDE PÚBLICA", page.margin, 11);
        doc.setFont("helvetica", "normal");
        doc.text("PGE-MT", page.width - page.margin, 11, { align: "right" });

        if (logo) {
          const logoX = page.width - page.margin - 45;
          const logoY = 5.5;
          doc.setFillColor(85, 117, 125);
          doc.roundedRect(logoX - 2, logoY - 2, 47, 16.5, 2, 2, "F");
          doc.addImage(logo, "PNG", logoX, logoY, 43, 12.5);
        }
      }

      y = headerHeight + 16;
      doc.setTextColor(...colors.primary);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("Demonstrativo de Cálculo do Valor da Causa", page.margin, y);
      y += 8;
      doc.setFontSize(12);
      doc.setTextColor(...colors.teal);
      doc.text(subject.name, page.margin, y);
      y += 10;
    };

    const ensureSpace = (height) => {
      if (y + height <= page.bottom) {
        return;
      }

      doc.addPage();
      drawHeader();
    };

    drawHeader();

    y = drawTableHeader(doc, page, colors, y);
    for (const item of hypothesis.items) {
      const quantity = getQuantity(hypothesis, item);
      const annual = calculateAnnual(hypothesis, item);
      const formula = item.type === "permanent"
        ? `${formatMoney(item.unitValue)} x 1`
        : `${formatMoney(item.unitValue)} x ${formatQuantity(quantity)} x 12`;
      const row = [
        item.name,
        formatMoney(item.unitValue),
        item.type === "permanent" ? "1 unidade" : `${formatQuantity(quantity)} / mês`,
        formula,
        formatMoney(annual)
      ];
      const rowHeight = measureTableRow(doc, row);
      ensureSpace(rowHeight + 6);

      if (y < 50) {
        y = drawTableHeader(doc, page, colors, y);
      }

      y = drawTableRow(doc, page, colors, row, y, rowHeight);
    }

    ensureSpace(34);
    y += 4;
    doc.setFillColor(...colors.primary);
    doc.roundedRect(page.margin, y, page.width - page.margin * 2, 22, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TOTAL DA CAUSA", page.margin + 6, y + 8);
    doc.setFontSize(18);
    doc.text(formatMoney(calculateTotal(hypothesis)), page.width - page.margin - 6, y + 16, { align: "right" });
    y += 30;

    ensureSpace(22);
    doc.setTextColor(...colors.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const rule = "Regra aplicada: consumíveis = valor unitário x quantitativo mensal x 12; permanentes = valor unitário x 1.";
    doc.text(doc.splitTextToSize(rule, page.width - page.margin * 2), page.margin, y);
    y += 10;

    ensureSpace(12);
    doc.setTextColor(...colors.muted);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("O cálculo do valor da causa foi elaborado em estrita consonância com a documentação probatória acostada aos autos.", page.margin, y);

    addPageNumbers(doc, page, colors);
    doc.save(`${slugify(`demonstrativo-calculo-${subject.name}-${hypothesis.name}`)}.pdf`);
  } finally {
    downloadPdfButton.disabled = false;
    downloadPdfButton.textContent = "Gerar demonstrativo PDF";
  }
}

async function loadImageDataUrl(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function drawTableHeader(doc, page, colors, y) {
  const columns = tableColumns(page);
  doc.setFillColor(...colors.primary);
  doc.rect(page.margin, y, page.width - page.margin * 2, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  columns.forEach((column) => doc.text(column.label, column.x + 2, y + 6.5));
  return y + 10;
}

function drawTableRow(doc, page, colors, row, y, rowHeight) {
  const columns = tableColumns(page);
  doc.setDrawColor(...colors.line);
  doc.setFillColor(255, 255, 255);
  doc.rect(page.margin, y, page.width - page.margin * 2, rowHeight, "FD");
  doc.setTextColor(...colors.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  row.forEach((value, index) => {
    const column = columns[index];
    const lines = doc.splitTextToSize(String(value), column.width - 4);
    doc.text(lines, column.x + 2, y + 5);
  });

  return y + rowHeight;
}

function measureTableRow(doc, row) {
  const widths = [58, 28, 27, 42, 27];
  const maxLines = row.reduce((max, value, index) => {
    const lines = doc.splitTextToSize(String(value), widths[index] - 4).length;
    return Math.max(max, lines);
  }, 1);
  return Math.max(12, maxLines * 4 + 6);
}

function tableColumns(page) {
  const widths = [58, 28, 27, 42, 27];
  let x = page.margin;
  return ["Insumo", "Unitário", "Qtd.", "Cálculo", "Valor anual"].map((label, index) => {
    const column = { label, x, width: widths[index] };
    x += widths[index];
    return column;
  });
}

function addPageNumbers(doc, page, colors) {
  const pageCount = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setTextColor(...colors.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Página ${pageNumber} de ${pageCount}`, page.width - page.margin, 287, { align: "right" });
  }
}

setDefaultQuantities();
renderSectors();
renderAll();

sectorSelect.addEventListener("change", handleSectorChange);
subjectSelect.addEventListener("change", handleSubjectChange);
hypothesisTabs.addEventListener("click", handleHypothesisClick);
itemsBody.addEventListener("input", handleQuantityInput);
resetButton.addEventListener("click", resetCurrentHypothesis);
downloadPdfButton.addEventListener("click", generatePdfReport);
